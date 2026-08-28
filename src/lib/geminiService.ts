import { JournalMessage, ReflectionSummary } from "../types";

export interface ReflectResponse {
  reply: string;
  modelUsed: string;
}

export interface SummarizeResponse {
  summary: ReflectionSummary;
  modelUsed: string;
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
    throw new Error(errData.error || `Summary request failed with status ${response.status}`);
  }

  return response.json();
}
