import { JournalMessage, ReflectionSummary } from "../types";

export interface ReflectResponse {
  reply: string;
  modelUsed: string;
}

export interface SummarizeResponse {
  summary: ReflectionSummary;
  modelUsed: string;
}

export interface ExtractDocResponse {
  extractedText: string;
  modelUsed: string;
}

/**
 * Extracts and processes text from uploaded note files (TXT, MD, CSV, JSON, PDF)
 */
export async function extractDocumentNotes(file: File): Promise<ExtractDocResponse> {
  const fileName = file.name;
  const mimeType = file.type || (fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain");

  // If plain text file (.txt, .md, .markdown, .json, .csv, .log, etc.), read directly on client
  const isPlainText = 
    mimeType.startsWith("text/") || 
    fileName.endsWith(".txt") || 
    fileName.endsWith(".md") || 
    fileName.endsWith(".markdown") || 
    fileName.endsWith(".json") || 
    fileName.endsWith(".csv") || 
    fileName.endsWith(".log") || 
    fileName.endsWith(".rtf");

  if (isPlainText) {
    try {
      const text = await file.text();
      return {
        extractedText: text.trim(),
        modelUsed: "local-text-reader",
      };
    } catch (err) {
      console.warn("Client-side text reading failed, falling back to server:", err);
    }
  }

  // Convert file to Base64 data URL for server & Gemini Multimodal extraction (e.g. PDF)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const fileBase64 = reader.result as string;
        const response = await fetch("/api/gemini/extract-doc", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileBase64,
            mimeType,
            fileName,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          if (response.status === 429) {
            throw new Error(errData.error || "Document extraction rate limit reached. Please wait a few minutes before uploading again.");
          }
          throw new Error(errData.error || `Document extraction failed with status ${response.status}`);
        }

        const data: ExtractDocResponse = await response.json();
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file from disk."));
    reader.readAsDataURL(file);
  });
}

/**
 * Sends conversation messages to server-side Gemini API proxy
 */
export async function sendReflectionPrompt(params: {
  messages: Array<{ role: 'user' | 'model'; content: string }>;
  userMood?: string;
  reflectionTopic?: string;
}): Promise<ReflectResponse> {
  const response = await fetch("/api/gemini/reflect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    if (response.status === 429) {
      throw new Error(errData.error || "Rate limit reached. Please wait a few seconds before reflecting again.");
    }
    throw new Error(errData.error || `Gemini API request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Requests structured summarization and action items from server-side Gemini API proxy
 */
export async function generateReflectionSummary(params: {
  entriesText: string;
  title?: string;
}): Promise<SummarizeResponse> {
  const response = await fetch("/api/gemini/summarize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    if (response.status === 429) {
      throw new Error(errData.error || "Rate limit reached for AI summaries. Please wait a few seconds before requesting another summary.");
    }
    throw new Error(errData.error || `Summary request failed with status ${response.status}`);
  }

  return response.json();
}
