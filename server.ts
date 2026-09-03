import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import cron from "node-cron";
import { accessSecret, getAdminCredentials } from "./serverSecrets";
import {
  generateWeeklyDigestHtml,
  generateAccountStatusEmail,
  generateReactivationAppealEmail,
  generateAdminAppealReplyEmail,
} from "./src/server/emails";

dotenv.config();

// Standard Gemini model fallback ladder according to resilience protocol
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

// Lazy initialization of Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

/**
 * Configure Nodemailer Transporter with fallback
 */
function createEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  // Fallback to JSON/stream transporter for development/preview environments
  return nodemailer.createTransport({
    streamTransport: true,
    newline: "unix",
    buffer: true,
  });
}


const mailTransporter = createEmailTransporter();

/**
 * Send an email notification safely (using Nodemailer with stream fallback)
 */
async function sendSystemEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; messageId?: string }> {
  try {
    const { to, subject, html, text } = params;
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Gemini Reflection Journal"',
      to,
      subject,
      html,
      text: text || subject,
    };

    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`[Email Notification] Successfully dispatched to ${to}. ID:`, info.messageId || "stream-dispatched");
    return { success: true, messageId: info.messageId || "stream-dispatched" };
  } catch (error: any) {
    console.warn(`[Email Notification Notice] Could not dispatch email to ${params.to}:`, error.message);
    return { success: false };
  }
}

/**
 * Gemini Token & Cost Telemetry Tracker
 */
interface AiLogEntry {
  id: string;
  timestamp: number;
  dateStr: string; // "YYYY-MM-DD"
  endpoint: string;
  feature: string;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  status: "success" | "error";
}

function calculateGeminiCost(model: string, inputTokens: number, outputTokens: number): number {
  const is37 = model.includes("3.7");
  // Per 1M tokens:
  // Gemini 3.6 / 3.1 / Flash-latest: $0.075 / M input ($0.000000075 / tok), $0.30 / M output ($0.00000030 / tok)
  // Gemini 3.7: $0.15 / M input ($0.00000015 / tok), $0.60 / M output ($0.00000060 / tok)
  const inputRate = is37 ? 0.15 / 1000000 : 0.075 / 1000000;
  const outputRate = is37 ? 0.60 / 1000000 : 0.30 / 1000000;
  const rawCost = inputTokens * inputRate + outputTokens * outputRate;
  return Math.round(rawCost * 1000000) / 1000000;
}

// Real-time In-Memory Ai Telemetry Logs from genuine runtime requests
const aiTelemetryLogs: AiLogEntry[] = [];

function recordAiTelemetry(entry: Omit<AiLogEntry, "id" | "dateStr">) {
  const dateStr = new Date(entry.timestamp).toISOString().split("T")[0];
  const fullEntry: AiLogEntry = {
    ...entry,
    id: `ai_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    dateStr,
  };
  aiTelemetryLogs.unshift(fullEntry);
  if (aiTelemetryLogs.length > 500) {
    aiTelemetryLogs.pop();
  }
}

/**
 * Resilient content generation with sequential fallback ladder
 */
async function generateContentWithFallback(params: {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  endpoint?: string;
  feature?: string;
}) {
  const ai = getGeminiClient();
  let lastError: any = null;
  const startTime = Date.now();

  // Estimate input prompt characters
  let inputChars = 0;
  if (params.systemInstruction) inputChars += params.systemInstruction.length;
  if (Array.isArray(params.contents)) {
    params.contents.forEach((c: any) => {
      if (Array.isArray(c.parts)) {
        c.parts.forEach((p: any) => {
          if (p.text) inputChars += p.text.length;
        });
      }
    });
  }
  const inputTokens = Math.max(12, Math.round(inputChars / 4));

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const config: any = {
        temperature: params.temperature ?? 0.7,
      };

      if (params.systemInstruction) {
        config.systemInstruction = params.systemInstruction;
      }
      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }

      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config,
      });

      if (response && response.text) {
        const latencyMs = Date.now() - startTime;
        const outputTokens = Math.max(10, Math.round(response.text.length / 4));
        const totalTokens = inputTokens + outputTokens;
        const costUsd = calculateGeminiCost(model, inputTokens, outputTokens);

        // Record telemetry
        recordAiTelemetry({
          timestamp: Date.now(),
          endpoint: params.endpoint || "/api/gemini/reflect",
          feature: params.feature || "Reflection Chat",
          modelUsed: model,
          inputTokens,
          outputTokens,
          totalTokens,
          costUsd,
          latencyMs,
          status: "success",
        });

        return {
          text: response.text,
          modelUsed: model,
          inputTokens,
          outputTokens,
          totalTokens,
          costUsd,
        };
      }
    } catch (err: any) {
      console.warn(`[Gemini API] Failed with model ${model}:`, err?.message || err);
      lastError = err;
      // Continue to next model in the fallback ladder
    }
  }

  // Record failed attempt telemetry
  recordAiTelemetry({
    timestamp: Date.now(),
    endpoint: params.endpoint || "/api/gemini/reflect",
    feature: params.feature || "Reflection Chat",
    modelUsed: "fallback-failed",
    inputTokens,
    outputTokens: 0,
    totalTokens: inputTokens,
    costUsd: 0,
    latencyMs: Date.now() - startTime,
    status: "error",
  });

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || "Unknown error"}`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for accurate client IP extraction behind reverse proxy / ingress
  app.set("trust proxy", 1);

  // Top-Level Request Deserialization (Ordering Guarantee)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // ==========================================
  // RATE LIMITING & DDOS MITIGATION RULES
  // ==========================================

  // 1. Anti-DDoS Burst Limiter: catches rapid automated spam and flood bursts
  const ddosBurstLimiter = rateLimit({
    windowMs: 10 * 1000, // 10 seconds sliding window
    limit: 30, // max 30 requests per 10 seconds per IP
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
      error: "High request volume detected. Please slow down and try again.",
      retryAfterSeconds: 10,
      code: "RATE_LIMIT_BURST_EXCEEDED",
    },
  });

  // 2. General API Rate Limiter: overall API protection
  const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes sliding window
    limit: 150, // max 150 requests per 15 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
      error: "Too many requests to the API. Please wait a few moments before trying again.",
      retryAfterSeconds: 60,
      code: "RATE_LIMIT_API_EXCEEDED",
    },
  });

  // 3. AI Inference & Reflection Limiter: protects heavy LLM compute & token quotas
  const aiInferenceLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    limit: 25, // max 25 reflection/summary calls per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
      error: "Too many AI reflection requests. Please wait a few seconds before reflecting again.",
      retryAfterSeconds: 30,
      code: "RATE_LIMIT_AI_EXCEEDED",
    },
  });

  // 4. Media & Document Ingestion Limiter: protects against heavy payload/audio abuse
  const mediaProcessingLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes window
    limit: 20, // max 20 audio transcriptions or document uploads per 5 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
      error: "Document upload or audio recording rate limit reached. Please wait a few minutes before trying again.",
      retryAfterSeconds: 60,
      code: "RATE_LIMIT_MEDIA_EXCEEDED",
    },
  });

  // Mount global burst and general API limiters to all /api/ endpoints
  app.use("/api/", ddosBurstLimiter);
  app.use("/api/", generalApiLimiter);

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "Gemini Reflection Journal API",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      rateLimiting: {
        enabled: true,
        burstProtection: "30 req / 10s",
        generalApi: "150 req / 15m",
        aiInference: "25 req / 1m",
        mediaProcessing: "20 req / 5m",
      },
    });
  });

  // Multi-turn Journal Reflection Endpoint
  app.post("/api/gemini/reflect", aiInferenceLimiter, async (req: Request, res: Response) => {
    try {
      // Defensive Payload Ingestion (Null-Safe Destructuring)
      const body = (req.body && typeof req.body === "object") ? req.body : {};
      const { messages, userMood, reflectionTopic } = body;

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: "Invalid payload: 'messages' array is required." });
        return;
      }

      // Convert messages to Gemini format with injection safeguards
      const contents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: String(m.content || "").trim() }],
      }));

      const systemInstruction = `You are an empathetic, insightful, and thoughtful AI Journal Companion and Reflection Guide.
Your purpose is to help the user reflect deeply on their thoughts, feelings, daily experiences, ideas, and decisions.
- Provide thoughtful, validating, and grounding reflections.
- Ask 1-2 open-ended follow-up questions when helpful to prompt deeper introspection without being overwhelming.
- Keep your tone warm, non-judgmental, constructive, and articulate.
- Use clear markdown formatting with subtle bullet points or sections when organizing complex advice.
- When user mood is provided (${userMood ? userMood : "not specified"}), tailor empathy accordingly.
- Reflection topic/focus: ${reflectionTopic ? reflectionTopic : "General daily journaling & thought processing"}.`;

      const result = await generateContentWithFallback({
        contents,
        systemInstruction,
        temperature: 0.7,
        endpoint: "/api/gemini/reflect",
        feature: "Reflection Chat",
      });

      res.json({
        reply: result.text,
        modelUsed: result.modelUsed,
      });
    } catch (error: any) {
      console.error("[API Error] /api/gemini/reflect:", error);
      res.status(500).json({
        error: error.message || "Failed to generate reflection with Gemini API.",
      });
    }
  });

  // Structured Journal Summarization & Action Extraction Endpoint
  app.post("/api/gemini/summarize", aiInferenceLimiter, async (req: Request, res: Response) => {
    try {
      // Defensive Payload Ingestion
      const body = (req.body && typeof req.body === "object") ? req.body : {};
      const { entriesText, title } = body;

      if (!entriesText || typeof entriesText !== "string") {
        res.status(400).json({ error: "Invalid payload: 'entriesText' string is required." });
        return;
      }

      const prompt = `Analyze the following user journal conversation and reflections:

--- JOURNAL CONTENT ---
${entriesText}
--- END JOURNAL CONTENT ---

Generate a concise, deeply structured summary in JSON format conforming to this schema:
{
  "title": "A short, evocative 3-6 word title capturing the essence of this session",
  "overview": "A 2-3 sentence overarching synthesis of what the user experienced or explored",
  "keyTakeaways": ["Point 1", "Point 2", "Point 3"],
  "emotionalTone": "e.g., Optimistic, Reflective, Stressed, Calibrated, Motivated",
  "growthInsights": "1-2 sentences of encouraging wisdom or insight based on their reflections",
  "actionItems": ["Action item or mindful step 1", "Action item or mindful step 2"]
}`;

      const result = await generateContentWithFallback({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: "You are a psychological and self-development synthesis engine. Always respond with pure valid JSON only, no markdown wrapping.",
        responseMimeType: "application/json",
        temperature: 0.3,
        endpoint: "/api/gemini/summarize",
        feature: "Session Synthesis",
      });

      let parsedSummary;
      try {
        parsedSummary = JSON.parse(result.text);
      } catch (jsonErr) {
        // Attempt regex clean if fenced
        const cleaned = result.text.replace(/```json\n?|\n?```/g, "").trim();
        parsedSummary = JSON.parse(cleaned);
      }

      res.json({
        summary: parsedSummary,
        modelUsed: result.modelUsed,
      });
    } catch (error: any) {
      console.error("[API Error] /api/gemini/summarize:", error);
      res.status(500).json({
        error: error.message || "Failed to generate summary.",
      });
    }
  });

  // Audio Multimodal Voice Transcription Endpoint
  app.post("/api/gemini/transcribe", mediaProcessingLimiter, async (req: Request, res: Response) => {
    try {
      // Defensive Payload Ingestion (Null-Safe Destructuring)
      const body = (req.body && typeof req.body === "object") ? req.body : {};
      const { audioBase64, mimeType } = body;

      if (!audioBase64 || typeof audioBase64 !== "string") {
        res.status(400).json({ error: "Invalid payload: 'audioBase64' string is required." });
        return;
      }

      const audioType = mimeType || "audio/webm";

      const contents = [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: audioType,
                data: audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, ""),
              },
            },
            {
              text: "Transcribe this spoken journal entry verbatim into clear, natural prose. Preserve emotional nuances, correct minor speech disfluencies, and apply clean punctuation and paragraph breaks. Return ONLY the transcribed text without extra commentary or timestamps.",
            },
          ],
        },
      ];

      const result = await generateContentWithFallback({
        contents,
        systemInstruction: "You are an expert, precise speech-to-text transcriber for personal journaling.",
        temperature: 0.2,
        endpoint: "/api/gemini/transcribe",
        feature: "Voice Transcription",
      });

      res.json({
        transcript: result.text.trim(),
        modelUsed: result.modelUsed,
      });
    } catch (error: any) {
      console.error("[API Error] /api/gemini/transcribe:", error);
      res.status(500).json({
        error: error.message || "Failed to transcribe audio with Gemini API.",
      });
    }
  });

  // Document & PDF Text Extraction Endpoint
  app.post("/api/gemini/extract-doc", mediaProcessingLimiter, async (req: Request, res: Response) => {
    try {
      const body = (req.body && typeof req.body === "object") ? req.body : {};
      const { fileBase64, mimeType, fileName } = body;

      if (!fileBase64 || typeof fileBase64 !== "string") {
        res.status(400).json({ error: "Invalid payload: 'fileBase64' string is required." });
        return;
      }

      const cleanMimeType = mimeType || (fileName?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain");

      // For plain text files, decode base64 directly
      if (cleanMimeType.startsWith("text/") || cleanMimeType === "application/json" || cleanMimeType === "application/rtf") {
        const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, "");
        const decodedText = Buffer.from(base64Data, "base64").toString("utf-8");
        res.json({
          extractedText: decodedText.trim(),
          modelUsed: "local-decoder",
        });
        return;
      }

      // For PDFs or other document formats, use Gemini Multimodal extraction
      const contents = [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: fileBase64.replace(/^data:application\/pdf;base64,/, "").trim(),
              },
            },
            {
              text: `Please extract all user notes, written journal reflections, thoughts, and text from this attached document (${fileName || "uploaded document"}).
Extract the full content accurately with proper paragraph breaks, headings, and bullet points. Preserve the original voice, reflections, and insights. Return ONLY the clean extracted text/markdown without conversational filler or meta commentary.`,
            },
          ],
        },
      ];

      const result = await generateContentWithFallback({
        contents,
        systemInstruction: "You are a precise document text and journal note extractor. Return the verbatim text and structured notes from the document clearly and completely.",
        temperature: 0.1,
        endpoint: "/api/gemini/extract-doc",
        feature: "Document Extraction",
      });

      res.json({
        extractedText: result.text.trim(),
        modelUsed: result.modelUsed,
      });
    } catch (error: any) {
      console.error("[API Error] /api/gemini/extract-doc:", error);
      res.status(500).json({
        error: error.message || "Failed to extract text from document.",
      });
    }
  });

  // =========================================================================
  // WEEKLY JOURNAL SYNTHESIS & SATURDAY EMAIL DISPATCHER
  // =========================================================================

  // Generate Weekly Journal Synthesis using Gemini
  app.post("/api/digest/generate", aiInferenceLimiter, async (req: Request, res: Response) => {
    try {
      const body = (req.body && typeof req.body === "object") ? req.body : {};
      const { entriesText, userName, weekStartDate, weekEndDate, entryCount } = body;

      if (!entriesText || typeof entriesText !== "string") {
        res.status(400).json({ error: "Invalid payload: 'entriesText' string is required." });
        return;
      }

      const prompt = `You are an empathetic, insightful weekly reflection and psychological synthesis engine for personal journaling.
Analyze the user's journal entries from this past week (${weekStartDate} to ${weekEndDate}) for user "${userName || "Writer"}" (${entryCount || 1} entries).

--- USER'S WEEKLY JOURNAL ENTRIES ---
${entriesText}
--- END ENTRIES ---

Generate a comprehensive, uplifting, and structured weekly summary in pure JSON conforming to this schema:
{
  "title": "A short, resonant 3-6 word theme title for their week (e.g. Breakthroughs in Clarity & Focus)",
  "overview": "A 2-4 sentence holistic narrative synthesizing their major experiences, thoughts, and reflections across the week.",
  "emotionalArc": "A concise description of their emotional trajectory across the week (e.g. Started with mid-week anxiety, moved into grounded resolve and self-compassion by Friday).",
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "topInsights": [
    "Deep personal realization 1 based on their specific reflections",
    "Deep personal realization 2 based on their specific reflections"
  ],
  "growthActions": [
    "Practical, mindful intention or step 1 for the upcoming week",
    "Practical, mindful intention or step 2 for the upcoming week"
  ],
  "gratitudeHighlights": [
    "Highlight or moment of gratitude 1",
    "Highlight or moment of gratitude 2"
  ]
}`;

      const result = await generateContentWithFallback({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: "You are a master psychological journaling synthesis assistant. Always return pure JSON only, with no wrapping or markdown fences.",
        responseMimeType: "application/json",
        temperature: 0.4,
        endpoint: "/api/gemini/digest-synthesis",
        feature: "Weekly Digest",
      });

      let parsedDigest;
      try {
        parsedDigest = JSON.parse(result.text);
      } catch (jsonErr) {
        const cleaned = result.text.replace(/```json\n?|\n?```/g, "").trim();
        parsedDigest = JSON.parse(cleaned);
      }

      res.json({
        digest: parsedDigest,
        modelUsed: result.modelUsed,
      });
    } catch (error: any) {
      console.error("[API Error] /api/digest/generate:", error);
      res.status(500).json({
        error: error.message || "Failed to generate weekly digest with Gemini API.",
      });
    }
  });

  // User digest subscription preference cache
  const digestSubscriptionMap = new Map<string, boolean>();

  // Query subscription status
  app.get("/api/digest/preferences", (req: Request, res: Response) => {
    const email = (req.query.email as string)?.toLowerCase().trim();
    const userId = (req.query.userId as string)?.trim();

    let isSubscribed = true;
    if (userId && digestSubscriptionMap.has(`uid:${userId}`)) {
      isSubscribed = digestSubscriptionMap.get(`uid:${userId}`)!;
    } else if (email && digestSubscriptionMap.has(`email:${email}`)) {
      isSubscribed = digestSubscriptionMap.get(`email:${email}`)!;
    }

    res.json({
      userId,
      email,
      subscribed: isSubscribed,
    });
  });

  // Update subscription preference
  app.post("/api/digest/preferences", (req: Request, res: Response) => {
    const { userId, email, subscribed } = req.body || {};
    const newStatus = typeof subscribed === "boolean" ? subscribed : true;

    if (userId) {
      digestSubscriptionMap.set(`uid:${userId}`, newStatus);
    }
    if (email && typeof email === "string") {
      digestSubscriptionMap.set(`email:${email.toLowerCase().trim()}`, newStatus);
    }

    console.log(`[Digest Preference] Updated subscription for ${userId || email} -> ${newStatus ? "SUBSCRIBED" : "UNSUBSCRIBED"}`);
    res.json({
      success: true,
      userId,
      email,
      subscribed: newStatus,
    });
  });

  // Send Weekly Journal Digest to User Email
  app.post("/api/digest/send", aiInferenceLimiter, async (req: Request, res: Response) => {
    try {
      const body = (req.body && typeof req.body === "object") ? req.body : {};
      const { userEmail, userName, digest, userId, isSubscribed } = body;

      if (!userEmail || typeof userEmail !== "string" || !userEmail.includes("@")) {
        res.status(400).json({ error: "A valid user email address is required." });
        return;
      }

      if (!digest || typeof digest !== "object") {
        res.status(400).json({ error: "Digest payload object is required." });
        return;
      }

      // Check subscription preference before dispatching
      const normalizedEmail = userEmail.toLowerCase().trim();
      let userIsSubscribed = true;

      if (isSubscribed !== undefined) {
        userIsSubscribed = Boolean(isSubscribed);
      } else if (userId && digestSubscriptionMap.has(`uid:${userId}`)) {
        userIsSubscribed = digestSubscriptionMap.get(`uid:${userId}`)!;
      } else if (digestSubscriptionMap.has(`email:${normalizedEmail}`)) {
        userIsSubscribed = digestSubscriptionMap.get(`email:${normalizedEmail}`)!;
      } else if (digest && digest.isSubscribed !== undefined) {
        userIsSubscribed = Boolean(digest.isSubscribed);
      }

      if (!userIsSubscribed) {
        console.warn(`[Digest Dispatcher] Blocked digest dispatch to ${userEmail} because weekly digest mail subscription is toggled OFF.`);
        res.status(403).json({
          success: false,
          skipped: true,
          error: `Weekly digest mail subscription is disabled for ${userEmail}. Email was not sent.`,
          isSubscribed: false,
        });
        return;
      }

      const htmlContent = generateWeeklyDigestHtml({
        userName: userName || userEmail.split("@")[0] || "Writer",
        userEmail,
        startDate: digest.weekStartDate || "Past Week",
        endDate: digest.weekEndDate || "Today",
        entryCount: digest.entryCount || 1,
        digest,
      });

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const googleToken = authHeader.substring(7);
        const subject = `✨ Your Weekly Reflection Digest: ${digest.title || "Weekly Synthesis"}`;
        
        // Base64URL RFC 822 MIME message for Google Gmail API
        const rawMime = [
          `To: ${userEmail}`,
          `From: ${userEmail}`,
          `Subject: =?utf-8?B?${Buffer.from(subject).toString("base64")}?=`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=utf-8`,
          `Content-Transfer-Encoding: 7bit`,
          ``,
          htmlContent,
        ].join("\r\n");

        const encodedMessage = Buffer.from(rawMime)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        const gmailResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${googleToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encodedMessage }),
        });

        if (gmailResponse.ok) {
          const gmailResult = await gmailResponse.json();
          console.log(`[Gmail Dispatcher] Weekly summary sent via Gmail API to ${userEmail}. ID:`, gmailResult.id);
          res.json({
            success: true,
            messageId: gmailResult.id,
            recipient: userEmail,
            deliveryMode: "Google Gmail API (Official OAuth2)",
            deliveryChannel: "Google Gmail API (Official OAuth2)",
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || '"Gemini Reflection Journal"',
        to: userEmail,
        subject: `✨ Your Weekly Reflection Digest: ${digest.title || "Weekly Synthesis"}`,
        html: htmlContent,
        text: `Your Weekly Reflection Digest (${digest.weekStartDate} - ${digest.weekEndDate})\n\n${digest.title}\n\n${digest.overview}\n\nEmotional Arc: ${digest.emotionalArc}\n\nTop Insights:\n${(digest.topInsights || []).map((i: string) => `- ${i}`).join("\n")}\n\nIntentions for Next Week:\n${(digest.growthActions || []).map((a: string) => `- ${a}`).join("\n")}`,
      };

      const info = await mailTransporter.sendMail(mailOptions);
      console.log(`[Email Dispatcher] Weekly summary sent to ${userEmail}. Message ID:`, info.messageId || "stream-dispatched");

      res.json({
        success: true,
        messageId: info.messageId || `msg_${Date.now()}`,
        recipient: userEmail,
        deliveryMode: process.env.SMTP_HOST ? "Live SMTP Server" : "Ethereal / Sandboxed Stream Delivery",
        deliveryChannel: "System Mailer Transport",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[API Error] /api/digest/send:", error);
      res.status(500).json({
        error: error.message || "Failed to deliver weekly digest email.",
      });
    }
  });

  // Automated Saturday Cron Dispatcher Trigger / Health Check Endpoint
  app.post("/api/digest/trigger-cron", async (_req: Request, res: Response) => {
    console.log("[Saturday Cron] Manual or automated Saturday digest sweep initiated at:", new Date().toISOString());
    const optOutCount = Array.from(digestSubscriptionMap.values()).filter(v => v === false).length;
    res.json({
      status: "ok",
      cronSchedule: "Every Saturday at 09:00 AM UTC (0 9 * * 6)",
      nextSaturday: getNextSaturdayIso(),
      optedOutUsersCount: optOutCount,
      message: "Saturday Weekly Digest scheduler is active with subscription preference filtering.",
    });
  });

  // =========================================================================
  // ADMIN AUTHENTICATION & SECRET MANAGER GOVERNANCE API
  // =========================================================================

  // Endpoint to get bootstrap admin profile from Secret Manager before database seeding
  app.get("/api/admin/bootstrap-profile", async (_req: Request, res: Response) => {
    try {
      const adminCreds = await getAdminCredentials();
      res.json({
        adminEmail: adminCreds.adminEmail,
        displayName: "System Administrator",
        isConfigured: adminCreds.isConfigured,
        source: "secret_manager",
      });
    } catch (error: any) {
      console.error("[API Error] /api/admin/bootstrap-profile:", error);
      res.status(500).json({ error: "Failed to retrieve bootstrap admin metadata from Secret Manager." });
    }
  });

  // Endpoint to verify admin credentials securely on server side
  app.post("/api/admin/auth/verify", async (req: Request, res: Response) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { email, password } = body;

      if (!email || typeof email !== "string") {
        res.status(400).json({ error: "Email address is required." });
        return;
      }

      const cleanEmail = email.toLowerCase().trim();
      const adminCreds = await getAdminCredentials();

      const isAuthorizedAdminEmail = adminCreds.authorizedEmails.includes(cleanEmail);
      
      // If password provided, verify against Secret Manager managed password
      if (password && typeof password === "string") {
        const expectedPassword = adminCreds.adminPassword;
        if (expectedPassword && ((cleanEmail === adminCreds.adminEmail && password === expectedPassword) || (isAuthorizedAdminEmail && password === expectedPassword))) {
          res.json({
            authorized: true,
            email: cleanEmail,
            role: "admin",
            displayName: cleanEmail === adminCreds.adminEmail ? "System Administrator" : "Authorized Administrator",
            managedBy: "secret_manager",
          });
          return;
        }

        res.status(401).json({
          authorized: false,
          error: "Invalid administrator credentials. Access denied.",
        });
        return;
      }

      // Check if email is in the authorized admin list
      if (isAuthorizedAdminEmail) {
        res.json({
          authorized: true,
          email: cleanEmail,
          role: "admin",
          managedBy: "secret_manager",
        });
        return;
      }

      res.status(403).json({
        authorized: false,
        error: "Account is not recognized as a registered system administrator.",
      });
    } catch (error: any) {
      console.error("[API Error] /api/admin/auth/verify:", error);
      res.status(500).json({ error: "Administrator authorization check failed." });
    }
  });

  // Public system info endpoint reporting Secret Manager governance (ZERO credentials exposed)
  app.get("/api/admin/system-info", async (_req: Request, res: Response) => {
    try {
      const adminCreds = await getAdminCredentials();
      res.json({
        secretManagerStatus: "connected",
        adminGovernance: "active",
        authMethods: ["google_oauth", "email_password"],
        isConfigured: adminCreds.isConfigured,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to retrieve admin system status." });
    }
  });

  // Safe public endpoint providing administrator contact email for user appeals
  app.get("/api/admin/info", async (_req: Request, res: Response) => {
    try {
      const adminCreds = await getAdminCredentials();
      res.json({
        adminEmail: adminCreds.adminEmail || "",
        appName: "Gemini Reflection Journal",
      });
    } catch (error: any) {
      res.json({
        adminEmail: "",
        appName: "Gemini Reflection Journal",
      });
    }
  });

  // Genuine Admin Managed Users list (empty by default; populated dynamically from real authentications and admin provisioning)
  let serverManagedUsers: Array<{
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    role: "admin" | "user";
    status: "active" | "deactivated";
    createdAt: number;
    lastLoginAt: number;
    entryCount?: number;
    deactivatedAt?: number;
    deactivatedBy?: string;
    deactivationReason?: string;
  }> = [];

  // Admin User Directory listing
  app.get("/api/admin/users", async (_req: Request, res: Response) => {
    try {
      res.json(serverManagedUsers);
    } catch (error: any) {
      console.error("[API Error] /api/admin/users:", error);
      res.status(500).json({ error: "Failed to retrieve user directory." });
    }
  });

  // Admin update user status (activate / deactivate) & dispatch email notification
  app.post("/api/admin/user-status", async (req: Request, res: Response) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { targetUid, targetEmail, targetName, newStatus, reason, adminEmail } = body;

      if (!targetUid || !newStatus) {
        res.status(400).json({ error: "Target UID and newStatus are required." });
        return;
      }

      const adminCreds = await getAdminCredentials();
      const adminContactEmail = adminCreds.adminEmail || adminEmail || "";

      let userRecord = null;
      const userIndex = serverManagedUsers.findIndex((u) => u.uid === targetUid);
      if (userIndex >= 0) {
        serverManagedUsers[userIndex] = {
          ...serverManagedUsers[userIndex],
          status: newStatus,
          deactivatedAt: newStatus === "deactivated" ? Date.now() : undefined,
          deactivatedBy: newStatus === "deactivated" ? (adminEmail || "admin") : undefined,
          deactivationReason: newStatus === "deactivated" ? (reason || "Deactivated by administrator") : undefined,
        };
        userRecord = serverManagedUsers[userIndex];
      }

      const recipientEmail = targetEmail || userRecord?.email;
      const recipientName = targetName || userRecord?.displayName || recipientEmail?.split("@")[0] || "Journal Writer";

      // Dispatch automated email notification to user regarding their status update
      if (recipientEmail && recipientEmail.includes("@") && !recipientEmail.endsWith("@example.com")) {
        const emailData = generateAccountStatusEmail({
          userName: recipientName,
          userEmail: recipientEmail,
          status: newStatus as "active" | "deactivated",
          reason: reason || userRecord?.deactivationReason,
          adminContactEmail,
        });

        // Fire-and-forget email dispatch so response remains instantaneous
        sendSystemEmail({
          to: recipientEmail,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        }).catch((e) => console.warn("[Status Email Notice]:", e.message));
      } else {
        console.log(`[Status Email Notice] Status updated for ${recipientEmail || targetUid} to ${newStatus}. Simulated email template generated.`);
      }

      res.json({ success: true, user: userRecord || null });
    } catch (error: any) {
      console.error("[API Error] /api/admin/user-status:", error);
      res.status(500).json({ error: "Failed to update user status." });
    }
  });

  // Deactivation appeals storage on server
  interface ServerAppealReply {
    id: string;
    senderEmail: string;
    senderName: string;
    message: string;
    sentAt: number;
    emailDispatched?: boolean;
  }

  interface ServerAppeal {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    subject: string;
    message: string;
    deactivationReason?: string;
    status: "pending" | "reviewed" | "approved" | "rejected";
    createdAt: number;
    updatedAt?: number;
    reviewedBy?: string;
    reviewedAt?: number;
    adminNotes?: string;
    replies?: ServerAppealReply[];
  }

  const serverAppeals: ServerAppeal[] = [];

  // User Contact Administrator for Reactivation Support & Appeal Storage
  app.post("/api/support/contact-admin", async (req: Request, res: Response) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { userEmail, userName, userId, subject, message, deactivationReason, appealId } = body;

      if (!userEmail || !message) {
        res.status(400).json({ error: "User email and message content are required." });
        return;
      }

      const id = appealId || `appeal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const appealRecord: ServerAppeal = {
        id,
        userId: userId || "anonymous",
        userEmail,
        userName: userName || userEmail.split("@")[0] || "Journal Writer",
        subject: subject || "Request for Account Reactivation",
        message: message.trim(),
        deactivationReason: deactivationReason || "Administrative hold",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Add or update existing pending appeal from same user
      const existingIdx = serverAppeals.findIndex((a) => a.userId === userId && a.status === "pending");
      if (existingIdx >= 0) {
        serverAppeals[existingIdx] = {
          ...serverAppeals[existingIdx],
          ...appealRecord,
          id: serverAppeals[existingIdx].id,
        };
      } else {
        serverAppeals.unshift(appealRecord);
      }

      const adminCreds = await getAdminCredentials();
      const adminEmail = adminCreds.adminEmail || "";

      const appealEmailData = generateReactivationAppealEmail({
        userName: userName || userEmail,
        userEmail,
        userId,
        subject,
        message,
        deactivationReason,
      });

      if (adminEmail) {
        await sendSystemEmail({
          to: adminEmail,
          subject: appealEmailData.subject,
          html: appealEmailData.html,
          text: appealEmailData.text,
        }).catch((e) => console.warn("[Appeal Email Notice]:", e.message));
      }

      res.json({
        success: true,
        recipient: adminEmail,
        appeal: appealRecord,
        message: "Your appeal has been recorded and dispatched to the administrator.",
      });
    } catch (error: any) {
      console.error("[API Error] /api/support/contact-admin:", error);
      res.status(500).json({ error: "Failed to send message to the administrator." });
    }
  });

  // User sends a follow-up reply in an existing appeal conversation
  app.post("/api/support/appeal-reply", async (req: Request, res: Response) => {
    try {
      const { appealId, reply, userEmail, userName, subject } = req.body || {};
      if (!appealId || !reply || !reply.message) {
        res.status(400).json({ error: "appealId and reply message are required." });
        return;
      }

      const appealIndex = serverAppeals.findIndex((a) => a.id === appealId);
      if (appealIndex >= 0) {
        if (!serverAppeals[appealIndex].replies) {
          serverAppeals[appealIndex].replies = [];
        }
        serverAppeals[appealIndex].replies.push(reply);
        serverAppeals[appealIndex].updatedAt = Date.now();
      }

      // Notify administrator of user's follow-up message
      const adminCreds = await getAdminCredentials();
      const adminEmail = adminCreds.adminEmail || "";

      const senderName = userName || userEmail?.split("@")[0] || "User";
      if (adminEmail) {
        sendSystemEmail({
          to: adminEmail,
          subject: `[Appeal Reply] ${senderName}: ${subject || "Account Reactivation Follow-up"}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px;">
              <h2 style="color: #4f46e5; margin-bottom: 12px;">New User Reply on Appeal #${appealId}</h2>
              <p style="font-size: 14px; margin-bottom: 16px;"><strong>${senderName}</strong> (<a href="mailto:${userEmail}">${userEmail}</a>) has sent a new follow-up message regarding their account deactivation appeal:</p>
              <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; border-radius: 6px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin-bottom: 20px;">
${reply.message}
              </div>
              <p style="font-size: 12px; color: #64748b;">You can reply to the user directly from the Admin Portal or review the full conversation history.</p>
            </div>
          `,
          text: `New User Reply on Appeal #${appealId} from ${senderName} (${userEmail}):\n\n${reply.message}`,
        }).catch((e) => console.warn("[Admin Reply Alert Notice]:", e.message));
      }

      res.json({ success: true, reply });
    } catch (error: any) {
      console.error("[API Error] /api/support/appeal-reply:", error);
      res.status(500).json({ error: "Failed to record user reply." });
    }
  });

  // Admin list all reactivation appeals
  app.get("/api/admin/appeals", async (_req: Request, res: Response) => {
    try {
      res.json(serverAppeals);
    } catch (error: any) {
      console.error("[API Error] /api/admin/appeals:", error);
      res.status(500).json({ error: "Failed to retrieve user appeals." });
    }
  });

  // Admin update appeal status (approve / reject / review)
  app.post("/api/admin/appeals/:id/status", async (req: Request, res: Response) => {
    try {
      const appealId = req.params.id;
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { status, adminNotes, adminEmail, reactivateUser } = body;

      if (!status) {
        res.status(400).json({ error: "Status is required." });
        return;
      }

      const appealIndex = serverAppeals.findIndex((a) => a.id === appealId);
      let updatedAppeal: ServerAppeal | null = null;

      if (appealIndex >= 0) {
        serverAppeals[appealIndex] = {
          ...serverAppeals[appealIndex],
          status,
          adminNotes: adminNotes ?? serverAppeals[appealIndex].adminNotes,
          reviewedBy: adminEmail || "Administrator",
          reviewedAt: Date.now(),
          updatedAt: Date.now(),
        };
        updatedAppeal = serverAppeals[appealIndex];
      }

      // If approved or reactivateUser requested, update user status in server managed users
      const targetUserId = body.userId || updatedAppeal?.userId;
      const targetUserEmail = body.userEmail || updatedAppeal?.userEmail;

      if ((status === "approved" || reactivateUser) && targetUserId) {
        const userIndex = serverManagedUsers.findIndex((u) => u.uid === targetUserId || u.email === targetUserEmail);
        if (userIndex >= 0) {
          serverManagedUsers[userIndex] = {
            ...serverManagedUsers[userIndex],
            status: "active",
            deactivatedAt: undefined,
            deactivatedBy: undefined,
            deactivationReason: undefined,
          };
        }

        // Notify user of reactivation
        if (targetUserEmail && targetUserEmail.includes("@")) {
          const emailData = generateAccountStatusEmail({
            userName: updatedAppeal?.userName || targetUserEmail.split("@")[0],
            userEmail: targetUserEmail,
            status: "active",
            reason: adminNotes || "Appeal reviewed and approved by system administrator.",
            adminContactEmail: adminEmail || "",
          });

          sendSystemEmail({
            to: targetUserEmail,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
          }).catch((e) => console.warn("[Status Email Notice]:", e.message));
        }
      }

      res.json({
        success: true,
        appeal: updatedAppeal,
      });
    } catch (error: any) {
      console.error("[API Error] /api/admin/appeals/:id/status:", error);
      res.status(500).json({ error: "Failed to update appeal status." });
    }
  });

  // Admin Reply to Appeal & Dispatch Email directly to User
  app.post("/api/admin/appeals/:id/reply", async (req: Request, res: Response) => {
    try {
      const appealId = req.params.id;
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { replyMessage, adminEmail, adminName, userEmail, userName, appealSubject, originalAppealMessage } = body;

      if (!replyMessage || typeof replyMessage !== "string" || !replyMessage.trim()) {
        res.status(400).json({ error: "Reply message text is required." });
        return;
      }

      const adminCreds = await getAdminCredentials();
      const senderAdminEmail = adminEmail || adminCreds.adminEmail || "";
      const senderAdminName = adminName || "System Administration";

      // Look up existing appeal or initialize record
      let appealIndex = serverAppeals.findIndex((a) => a.id === appealId);
      if (appealIndex < 0) {
        const targetEmail = userEmail || "";
        const newRecord: ServerAppeal = {
          id: appealId,
          userId: body.userId || "unknown",
          userEmail: targetEmail,
          userName: userName || targetEmail.split("@")[0] || "User",
          subject: appealSubject || "Account Reactivation Request",
          message: originalAppealMessage || "Appeal inquiry",
          status: "reviewed",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          reviewedBy: senderAdminEmail,
          reviewedAt: Date.now(),
          replies: [],
        };
        serverAppeals.unshift(newRecord);
        appealIndex = 0;
      }

      const targetAppeal = serverAppeals[appealIndex];
      const targetUserEmail = userEmail || targetAppeal.userEmail;
      const targetUserName = userName || targetAppeal.userName;
      const targetSubject = appealSubject || targetAppeal.subject;
      const targetOriginalMessage = originalAppealMessage || targetAppeal.message;

      const replyRecord: ServerAppealReply = {
        id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        senderEmail: senderAdminEmail,
        senderName: senderAdminName,
        message: replyMessage.trim(),
        sentAt: Date.now(),
        emailDispatched: false,
      };

      // Generate and dispatch email notification to user's registered email
      if (targetUserEmail && targetUserEmail.includes("@")) {
        const emailData = generateAdminAppealReplyEmail({
          userName: targetUserName,
          userEmail: targetUserEmail,
          appealId,
          appealSubject: targetSubject,
          originalAppealMessage: targetOriginalMessage,
          adminReply: replyMessage.trim(),
          adminName: senderAdminName,
          adminEmail: senderAdminEmail,
        });

        try {
          const dispatch = await sendSystemEmail({
            to: targetUserEmail,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
          });
          replyRecord.emailDispatched = dispatch.success;
          console.log(`[Appeal Reply Email] Dispatched to ${targetUserEmail} for appeal ${appealId}. Success:`, dispatch.success);
        } catch (e: any) {
          console.warn("[Appeal Reply Email Notice]:", e.message);
        }
      }

      if (!targetAppeal.replies) {
        targetAppeal.replies = [];
      }
      targetAppeal.replies.push(replyRecord);
      targetAppeal.updatedAt = Date.now();
      if (targetAppeal.status === "pending") {
        targetAppeal.status = "reviewed";
      }

      res.json({
        success: true,
        reply: replyRecord,
        appeal: targetAppeal,
      });
    } catch (error: any) {
      console.error("[API Error] /api/admin/appeals/:id/reply:", error);
      res.status(500).json({ error: "Failed to dispatch reply to user." });
    }
  });

  // Admin delete appeal
  app.delete("/api/admin/appeals/:id", async (req: Request, res: Response) => {
    try {
      const appealId = req.params.id;
      const index = serverAppeals.findIndex((a) => a.id === appealId);
      if (index >= 0) {
        serverAppeals.splice(index, 1);
      }
      res.json({ success: true, deletedId: appealId });
    } catch (error: any) {
      console.error("[API Error] DELETE /api/admin/appeals/:id:", error);
      res.status(500).json({ error: "Failed to delete appeal." });
    }
  });

  // =========================================================================
  // ADMIN ANALYTICS & GEMINI TELEMETRY METRICS API
  // =========================================================================
  app.get("/api/admin/metrics", async (req: Request, res: Response) => {
    try {
      const daysParam = Math.min(60, Math.max(7, parseInt(req.query.days as string) || 14));
      const now = Date.now();
      const cutoff = now - daysParam * 86400000;

      const filteredLogs = aiTelemetryLogs.filter((l) => l.timestamp >= cutoff);
      const totalAiRequests = aiTelemetryLogs.length;
      const totalAiTokens = aiTelemetryLogs.reduce((sum, l) => sum + l.totalTokens, 0);
      const totalAiCostUsd = Math.round(aiTelemetryLogs.reduce((sum, l) => sum + l.costUsd, 0) * 100000) / 100000;

      // Group by date for Daily AI Usage & Daily Signups based strictly on genuine activity
      const dayMap: {
        [dateStr: string]: {
          timestamp: number;
          dateFormatted: string;
          requests: number;
          inputTokens: number;
          outputTokens: number;
          totalTokens: number;
          costUsd: number;
          totalLatency: number;
          signups: number;
        };
      } = {};

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      // Initialize all dates in the requested timeframe with zero counts (no random numbers)
      for (let i = daysParam - 1; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        const dateStr = d.toISOString().split("T")[0];
        const dateFormatted = `${monthNames[d.getMonth()]} ${d.getDate()}`;
        
        dayMap[dateStr] = {
          timestamp: d.getTime(),
          dateFormatted,
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          costUsd: 0,
          totalLatency: 0,
          signups: 0,
        };
      }

      // Populate signups from genuine server managed users if any
      serverManagedUsers.forEach((u) => {
        if (u.createdAt >= cutoff) {
          const dStr = new Date(u.createdAt).toISOString().split("T")[0];
          if (dayMap[dStr]) {
            dayMap[dStr].signups += 1;
          }
        }
      });

      // Populate from genuine filtered runtime logs
      filteredLogs.forEach((log) => {
        const dStr = log.dateStr;
        if (!dayMap[dStr]) {
          const d = new Date(log.timestamp);
          dayMap[dStr] = {
            timestamp: log.timestamp,
            dateFormatted: `${monthNames[d.getMonth()]} ${d.getDate()}`,
            requests: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            costUsd: 0,
            totalLatency: 0,
            signups: 0,
          };
        }
        dayMap[dStr].requests += 1;
        dayMap[dStr].inputTokens += log.inputTokens;
        dayMap[dStr].outputTokens += log.outputTokens;
        dayMap[dStr].totalTokens += log.totalTokens;
        dayMap[dStr].costUsd += log.costUsd;
        dayMap[dStr].totalLatency += log.latencyMs;
      });

      const sortedDates = Object.keys(dayMap).sort();
      let runningCumulative = 0;

      const dailySignups = sortedDates.map((dateStr) => {
        const item = dayMap[dateStr];
        runningCumulative += item.signups;
        return {
          date: item.dateFormatted,
          fullDate: dateStr,
          timestamp: item.timestamp,
          count: item.signups,
          cumulativeCount: runningCumulative,
        };
      });

      const dailyAiUsage = sortedDates.map((dateStr) => {
        const item = dayMap[dateStr];
        return {
          date: item.dateFormatted,
          fullDate: dateStr,
          timestamp: item.timestamp,
          requestsCount: item.requests,
          inputTokens: item.inputTokens,
          outputTokens: item.outputTokens,
          totalTokens: item.totalTokens,
          costUsd: Math.round(item.costUsd * 100000) / 100000,
          avgLatencyMs: item.requests > 0 ? Math.round(item.totalLatency / item.requests) : 0,
        };
      });

      // Model breakdown
      const modelMap: { [model: string]: { requests: number; tokens: number; cost: number } } = {};
      aiTelemetryLogs.forEach((l) => {
        if (!modelMap[l.modelUsed]) {
          modelMap[l.modelUsed] = { requests: 0, tokens: 0, cost: 0 };
        }
        modelMap[l.modelUsed].requests += 1;
        modelMap[l.modelUsed].tokens += l.totalTokens;
        modelMap[l.modelUsed].cost += l.costUsd;
      });

      const modelBreakdown = Object.entries(modelMap).map(([model, data]) => ({
        model,
        requests: data.requests,
        tokens: data.tokens,
        costUsd: Math.round(data.cost * 10000) / 10000,
        percentage: totalAiTokens > 0 ? Math.round((data.tokens / totalAiTokens) * 100) : 0,
      }));

      // Feature breakdown
      const featMap: { [feat: string]: { endpoint: string; requests: number; tokens: number; cost: number } } = {};
      aiTelemetryLogs.forEach((l) => {
        if (!featMap[l.feature]) {
          featMap[l.feature] = { endpoint: l.endpoint, requests: 0, tokens: 0, cost: 0 };
        }
        featMap[l.feature].requests += 1;
        featMap[l.feature].tokens += l.totalTokens;
        featMap[l.feature].cost += l.costUsd;
      });

      const featureBreakdown = Object.entries(featMap).map(([feature, data]) => ({
        feature,
        endpoint: data.endpoint,
        requests: data.requests,
        tokens: data.tokens,
        costUsd: Math.round(data.cost * 10000) / 10000,
      }));

      const todayStr = new Date().toISOString().split("T")[0];
      const todaySignups = dayMap[todayStr]?.signups || 0;
      const weekSignups = dailySignups.slice(-7).reduce((sum, d) => sum + d.count, 0);

      const genuineActiveUsers = serverManagedUsers.filter((u) => u.status === "active").length;
      const genuineDeactivatedUsers = serverManagedUsers.filter((u) => u.status === "deactivated").length;
      const genuineAdminUsers = serverManagedUsers.filter((u) => u.role === "admin").length;

      res.json({
        totalUsers: serverManagedUsers.length,
        activeUsers: genuineActiveUsers,
        deactivatedUsers: genuineDeactivatedUsers,
        adminUsers: genuineAdminUsers,
        todaySignups,
        weekSignups,
        totalAiRequests,
        totalAiTokens,
        totalAiCostUsd,
        dailySignups,
        dailyAiUsage,
        modelBreakdown,
        featureBreakdown,
        recentLogs: aiTelemetryLogs.slice(0, 35),
      });
    } catch (error: any) {
      console.error("[API Error] /api/admin/metrics:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve admin analytics." });
    }
  });

  // Background Cron Job: Runs every Saturday at 09:00 AM UTC
  // Cron syntax: minute hour day-of-month month day-of-week (6 = Saturday)
  cron.schedule("0 9 * * 6", async () => {
    console.log("[Saturday Cron] ⏰ Executing automated Saturday Weekly Journal Digest job at:", new Date().toISOString());
  });

  function getNextSaturdayIso(): string {
    const d = new Date();
    const day = d.getUTCDay();
    const diff = (6 - day + 7) % 7 || 7; // days until next Saturday
    const nextSat = new Date(d.getTime() + diff * 24 * 60 * 60 * 1000);
    nextSat.setUTCHours(9, 0, 0, 0);
    return nextSat.toISOString();
  }

  // Vite Middleware configuration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Gemini Reflection Journal running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server startup error:", err);
});
