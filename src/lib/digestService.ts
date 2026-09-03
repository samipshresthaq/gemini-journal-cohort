import { doc, setDoc, getDoc, collection, query, orderBy, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db, auth, getGoogleAccessToken, authorizeGmailAccess } from "../firebase";
import { AuthUser, JournalEntry, WeeklyDigest, WeeklyDigestSettings } from "../types";
import { sanitizeForFirestore } from "./firestoreService";

/**
 * Generate beautifully formatted, responsive HTML email template for Weekly Digest
 */
export function generateWeeklyDigestEmailHtml(digest: WeeklyDigest, userName: string): string {
  const themeBadges = (digest.keyThemes || [])
    .map(
      (theme) =>
        `<span style="display:inline-block;padding:4px 12px;margin:3px 4px 3px 0;background-color:#EEF2FF;color:#4F46E5;border-radius:16px;font-size:12px;font-weight:600;">${theme}</span>`
    )
    .join("");

  const insightsList = (digest.topInsights || [])
    .map(
      (insight) =>
        `<li style="margin-bottom:10px;line-height:1.6;color:#334155;"><strong style="color:#0F172A;">💡</strong> ${insight}</li>`
    )
    .join("");

  const actionsList = (digest.growthActions || [])
    .map(
      (action) =>
        `<li style="margin-bottom:10px;line-height:1.6;color:#334155;"><strong style="color:#10B981;">✓</strong> ${action}</li>`
    )
    .join("");

  const gratitudeList = (digest.gratitudeHighlights || [])
    .map(
      (item) =>
        `<li style="margin-bottom:8px;line-height:1.6;color:#334155;"><strong style="color:#F59E0B;">✦</strong> ${item}</li>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Reflection Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);border:1px solid #E2E8F0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #4338CA 0%, #6366F1 50%, #8B5CF6 100%);padding:36px 32px;text-align:center;color:#FFFFFF;">
              <div style="font-size:26px;font-weight:800;letter-spacing:-0.5px;margin-bottom:6px;">✨ Weekly Reflection Digest</div>
              <div style="font-size:14px;opacity:0.9;font-weight:500;">Saturday Edition • ${digest.weekStartDate} – ${digest.weekEndDate}</div>
              <div style="display:inline-block;margin-top:16px;background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:0.3px;">
                ${digest.entryCount} Reflections Synthesized This Week
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="font-size:16px;line-height:1.6;margin-top:0;color:#334155;">
                Hello <strong style="color:#0F172A;">${userName || "Writer"}</strong>,
              </p>
              <p style="font-size:15px;line-height:1.7;color:#475569;margin-bottom:24px;">
                Here is your synthesized weekly reflection digest. Taking time each Saturday to honor your journey reinforces mindful self-awareness and intentional personal growth.
              </p>

              <!-- Executive Theme Box -->
              <div style="background-color:#F8FAFC;border-left:4px solid #4F46E5;border-radius:8px;padding:20px;margin-bottom:24px;">
                <div style="font-size:11px;font-weight:700;color:#4F46E5;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                  Weekly Synthesis Theme
                </div>
                <div style="font-size:18px;font-weight:700;color:#0F172A;margin-bottom:8px;">
                  ${digest.title}
                </div>
                <p style="font-size:14px;line-height:1.6;color:#334155;margin:0;">
                  ${digest.overview}
                </p>
              </div>

              <!-- Emotional Arc -->
              <div style="background-color:#FEF3C7;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                <div style="font-size:12px;font-weight:700;color:#92400E;margin-bottom:4px;">
                  🌿 Emotional Trajectory & Mindset Arc
                </div>
                <div style="font-size:14px;color:#78350F;line-height:1.5;">
                  ${digest.emotionalArc}
                </div>
              </div>

              <!-- Key Themes -->
              <div style="margin-bottom:24px;">
                <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
                  Dominant Themes
                </div>
                <div>
                  ${themeBadges}
                </div>
              </div>

              <!-- Top Insights -->
              ${
                digest.topInsights && digest.topInsights.length > 0
                  ? `<div style="margin-bottom:24px;">
                <div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:12px;">
                  Key Breakthroughs & Realizations
                </div>
                <ul style="margin:0;padding-left:20px;font-size:14px;">
                  ${insightsList}
                </ul>
              </div>`
                  : ""
              }

              <!-- Action Items -->
              ${
                digest.growthActions && digest.growthActions.length > 0
                  ? `<div style="background-color:#ECFDF5;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #A7F3D0;">
                <div style="font-size:14px;font-weight:700;color:#065F46;margin-bottom:12px;">
                  🌱 Mindful Intentions for the Upcoming Week
                </div>
                <ul style="margin:0;padding-left:20px;font-size:14px;color:#047857;">
                  ${actionsList}
                </ul>
              </div>`
                  : ""
              }

              <!-- Gratitude Highlights -->
              ${
                digest.gratitudeHighlights && digest.gratitudeHighlights.length > 0
                  ? `<div style="margin-bottom:28px;">
                <div style="font-size:13px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
                  Moments of Gratitude
                </div>
                <ul style="margin:0;padding-left:20px;font-size:13px;">
                  ${gratitudeList}
                </ul>
              </div>`
                  : ""
              }

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F1F5F9;padding:24px 28px;text-align:center;font-size:12px;color:#64748B;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 6px 0;">
                Sent directly via <strong>Google Gmail API</strong> to <strong>${digest.userEmail}</strong>.
              </p>
              <p style="margin:0;color:#94A3B8;">
                Weekly digests are delivered automatically every Saturday.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Builds RFC 822 formatted raw email with base64url encoding for Gmail API
 */
function buildRfc822Email(to: string, from: string, subject: string, htmlBody: string): string {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  
  const rawMessage = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${utf8Subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
  ].join("\r\n");

  // base64url encoding (RFC 4648 §5)
  return btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Send Weekly Reflection Digest directly using Google Gmail API with OAuth2 token
 */
export async function sendDigestViaGmailApi(
  digest: WeeklyDigest,
  userName: string
): Promise<{
  success: boolean;
  messageId?: string;
  deliveryMode: string;
  deliveryChannel: string;
  recipient: string;
  timestamp: string;
}> {
  if (!digest.userEmail) {
    throw new Error("A valid recipient email address is required.");
  }

  // Obtain or refresh Google OAuth access token
  let token = getGoogleAccessToken();
  if (!token) {
    token = await authorizeGmailAccess();
  }

  const htmlContent = generateWeeklyDigestEmailHtml(digest, userName);
  const subject = `✨ Your Weekly Reflection Digest: ${digest.title || "Weekly Synthesis"} (${digest.weekStartDate} – ${digest.weekEndDate})`;
  const rawBase64 = buildRfc822Email(digest.userEmail, digest.userEmail, subject, htmlContent);

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: rawBase64 }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Gmail API error (${response.status})`;
    
    // If token expired, attempt re-authorization once
    if (response.status === 401) {
      const refreshedToken = await authorizeGmailAccess();
      const retryResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${refreshedToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: rawBase64 }),
      });

      if (!retryResponse.ok) {
        const retryErr = await retryResponse.json().catch(() => ({}));
        throw new Error(retryErr?.error?.message || `Gmail API dispatch failed with status ${retryResponse.status}`);
      }

      const retryResult = await retryResponse.json();
      
      const updatedDigest: WeeklyDigest = {
        ...digest,
        status: "sent",
        sentAt: Date.now(),
        deliveryChannel: "Google Gmail API (Official OAuth2)",
      };
      await saveWeeklyDigest(digest.userId, updatedDigest);

      return {
        success: true,
        messageId: retryResult.id,
        deliveryMode: "Google Gmail API",
        deliveryChannel: "Google Gmail API (Official OAuth2)",
        recipient: digest.userEmail,
        timestamp: new Date().toISOString(),
      };
    }

    throw new Error(`Gmail Dispatch Error: ${message}`);
  }

  const result = await response.json();

  const updatedDigest: WeeklyDigest = {
    ...digest,
    status: "sent",
    sentAt: Date.now(),
    deliveryChannel: "Google Gmail API (Official OAuth2)",
  };

  await saveWeeklyDigest(digest.userId, updatedDigest);

  return {
    success: true,
    messageId: result.id,
    deliveryMode: "Google Gmail API",
    deliveryChannel: "Google Gmail API (Official OAuth2)",
    recipient: digest.userEmail,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Filter journal entries created or updated in the last 7 days (or current week)
 */
export function filterPastWeekEntries(entries: JournalEntry[]): JournalEntry[] {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return entries.filter((e) => (e.updatedAt || e.createdAt) >= sevenDaysAgo);
}

/**
 * Format date range string (e.g. "Aug 24, 2026 – Aug 31, 2026")
 */
export function getWeekDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const format = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return {
    startDate: format(start),
    endDate: format(end),
  };
}

/**
 * Generate a comprehensive weekly journal summary using Gemini API backend
 */
export async function generateWeeklySummary(
  entries: JournalEntry[],
  user: AuthUser
): Promise<WeeklyDigest> {
  if (!user || !user.email || user.uid.startsWith("guest_")) {
    throw new Error("Weekly journal summaries are only available for valid registered users.");
  }

  const { startDate, endDate } = getWeekDateRange();

  if (!entries || entries.length === 0) {
    // Generate an encouraging template summary for empty weeks
    return {
      id: `digest_${Date.now()}`,
      userId: user.uid,
      userEmail: user.email,
      weekStartDate: startDate,
      weekEndDate: endDate,
      generatedAt: Date.now(),
      entryCount: 0,
      title: "Quiet Reflections: A Fresh Week Ahead",
      overview: "You did not log journal reflections this week. Taking time for yourself is a gentle practice—your journal will be here whenever you are ready to write.",
      emotionalArc: "Reflective and poised for fresh beginnings.",
      keyThemes: ["Mindful Rest", "New Beginnings", "Space for Reflection"],
      topInsights: [
        "Quiet weeks offer a natural pause to reset and gather perspective.",
        "Consistency grows through small, effortless check-ins."
      ],
      growthActions: [
        "Set aside 3 minutes tomorrow morning to jot down three things on your mind.",
        "Reflect on a single moment this week that brought you unexpected calm."
      ],
      gratitudeHighlights: [
        "The gift of starting anew each Saturday."
      ],
      status: "preview",
    };
  }

  // Compile formatted journal content for the week
  const entriesText = entries
    .map((entry, idx) => {
      const dateStr = new Date(entry.updatedAt || entry.createdAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const messagesStr = entry.messages
        .map((m) => `${m.role === "user" ? "Me" : "Companion"}: ${m.content}`)
        .join("\n");
      
      const summaryNotes = entry.summary
        ? `Summary Notes: ${entry.summary.overview}\nTakeaways: ${entry.summary.keyTakeaways.join(", ")}`
        : "";

      return `=== ENTRY ${idx + 1} (${dateStr}) - Title: "${entry.title}" | Mood: ${entry.mood || "Neutral"} | Topic: ${entry.topic || "General"} ===\n${messagesStr}\n${summaryNotes}\n`;
    })
    .join("\n\n");

  const response = await fetch("/api/digest/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entriesText,
      userName: user.displayName || user.email.split("@")[0] || "Writer",
      weekStartDate: startDate,
      weekEndDate: endDate,
      entryCount: entries.length,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to generate weekly summary (HTTP ${response.status})`);
  }

  const data = await response.json();
  const summaryPayload = data.digest;

  const weeklyDigest: WeeklyDigest = {
    id: `digest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: user.uid,
    userEmail: user.email,
    weekStartDate: startDate,
    weekEndDate: endDate,
    generatedAt: Date.now(),
    entryCount: entries.length,
    title: summaryPayload.title || "Weekly Reflection Synthesis",
    overview: summaryPayload.overview || "A synthesis of your weekly reflections and personal breakthroughs.",
    emotionalArc: summaryPayload.emotionalArc || "Steady and contemplative with moments of renewed clarity.",
    keyThemes: Array.isArray(summaryPayload.keyThemes) ? summaryPayload.keyThemes : ["Self-Reflection"],
    topInsights: Array.isArray(summaryPayload.topInsights) ? summaryPayload.topInsights : [],
    growthActions: Array.isArray(summaryPayload.growthActions) ? summaryPayload.growthActions : [],
    gratitudeHighlights: Array.isArray(summaryPayload.gratitudeHighlights) ? summaryPayload.gratitudeHighlights : [],
    status: "preview",
  };

  return weeklyDigest;
}

/**
 * Dispatch the formatted weekly digest to the user's email address
 */
export async function sendWeeklySummaryEmail(
  digest: WeeklyDigest,
  userName: string
): Promise<{
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  info?: string;
  deliveryMode?: string;
  deliveryChannel?: string;
  recipient?: string;
  timestamp?: string;
}> {
  if (!digest.userEmail) {
    throw new Error("A valid recipient email address is required.");
  }

  const response = await fetch("/api/digest/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userEmail: digest.userEmail,
      userName,
      digest,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to dispatch email (HTTP ${response.status})`);
  }

  const result = await response.json();

  // Mark digest as sent and save to Firestore
  const updatedDigest: WeeklyDigest = {
    ...digest,
    status: "sent",
    sentAt: Date.now(),
    deliveryChannel: result.deliveryMode || "SMTP / Email Dispatcher",
  };

  await saveWeeklyDigest(digest.userId, updatedDigest);

  return result;
}

/**
 * Save a Weekly Digest record to the user's Firestore collection
 */
export async function saveWeeklyDigest(userId: string, digest: WeeklyDigest): Promise<void> {
  if (!userId || userId.startsWith("guest_")) return;

  const docRef = doc(db, "users", userId, "digests", digest.id);
  const sanitized = sanitizeForFirestore(digest);
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Subscribe in real-time to a user's past weekly digests
 */
export function subscribeToUserDigests(
  userId: string,
  onUpdate: (digests: WeeklyDigest[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!userId || userId.startsWith("guest_") || !auth.currentUser || auth.currentUser.uid !== userId) {
    onUpdate([]);
    return () => {};
  }

  const digestsRef = collection(db, "users", userId, "digests");
  const q = query(digestsRef, orderBy("generatedAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: WeeklyDigest[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as WeeklyDigest);
      });
      onUpdate(list);
    },
    (err) => {
      console.warn("Could not subscribe to weekly digests:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch or save weekly digest settings
 */
export async function getDigestSettings(userId: string): Promise<WeeklyDigestSettings> {
  const defaultSettings: WeeklyDigestSettings = {
    enabled: true,
    deliveryDay: "saturday",
    deliveryHourUtc: 9, // 9:00 AM UTC
  };

  if (!userId || userId.startsWith("guest_")) return defaultSettings;

  try {
    const docRef = doc(db, "users", userId, "profile", "digest_settings");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...defaultSettings, ...snap.data() } as WeeklyDigestSettings;
    }
  } catch (err) {
    console.warn("Could not load digest settings:", err);
  }
  return defaultSettings;
}

export async function saveDigestSettings(
  userId: string,
  settings: Partial<WeeklyDigestSettings>
): Promise<void> {
  if (!userId || userId.startsWith("guest_")) return;

  const docRef = doc(db, "users", userId, "profile", "digest_settings");
  const sanitized = sanitizeForFirestore({
    enabled: settings.enabled !== undefined ? settings.enabled : true,
    deliveryDay: "saturday",
    deliveryHourUtc: settings.deliveryHourUtc || 9,
    customEmail: settings.customEmail || null,
    updatedAt: Date.now(),
  });
  await setDoc(docRef, sanitized, { merge: true });
}
