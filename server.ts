import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

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
 * Resilient content generation with sequential fallback ladder
 */
async function generateContentWithFallback(params: {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
}) {
  const ai = getGeminiClient();
  let lastError: any = null;

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
        return {
          text: response.text,
          modelUsed: model,
        };
      }
    } catch (err: any) {
      console.warn(`[Gemini API] Failed with model ${model}:`, err?.message || err);
      lastError = err;
      // Continue to next model in the fallback ladder
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || "Unknown error"}`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Top-Level Request Deserialization (Ordering Guarantee)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "Gemini Reflection Journal API",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Multi-turn Journal Reflection Endpoint
  app.post("/api/gemini/reflect", async (req: Request, res: Response) => {
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
  app.post("/api/gemini/summarize", async (req: Request, res: Response) => {
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
