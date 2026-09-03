/**
 * Email Templates Module
 * 
 * Centralized, responsive HTML & Plaintext email templates
 * for the Gemini Reflection Journal application.
 */

export function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface EmailRenderOutput {
  subject: string;
  html: string;
  text: string;
}

export interface AccountStatusEmailParams {
  userName: string;
  userEmail: string;
  status: "active" | "deactivated";
  reason?: string;
  adminContactEmail?: string;
  appUrl?: string;
}

export interface ReactivationAppealEmailParams {
  userName: string;
  userEmail: string;
  userId?: string;
  subject?: string;
  message: string;
  deactivationReason?: string;
  appUrl?: string;
}

export interface AdminAppealReplyEmailParams {
  userName: string;
  userEmail: string;
  appealId: string;
  appealSubject?: string;
  originalAppealMessage?: string;
  adminReply: string;
  adminName?: string;
  adminEmail?: string;
  appUrl?: string;
}

export interface WeeklyDigestEmailParams {
  userName: string;
  userEmail: string;
  startDate: string;
  endDate: string;
  entryCount: number;
  digest: {
    title: string;
    overview: string;
    emotionalArc: string;
    keyThemes: string[];
    topInsights: string[];
    growthActions: string[];
    gratitudeHighlights: string[];
  };
  appUrl?: string;
}

/**
 * Weekly Digest HTML & Text Template
 */
export function generateWeeklyDigestHtml(params: WeeklyDigestEmailParams): string {
  const { userName, userEmail, startDate, endDate, entryCount, digest } = params;
  const appUrl = params.appUrl || process.env.APP_URL || "https://ais-dev-cfsy4zwhedzflleyrowgf4-896719886324.asia-east1.run.app";

  const themeBadges = (digest.keyThemes || [])
    .map(
      (theme) =>
        `<span style="display:inline-block;padding:4px 12px;margin:3px 4px 3px 0;background-color:#EEF2FF;color:#4F46E5;border-radius:16px;font-size:12px;font-weight:600;">${escapeHtml(theme)}</span>`
    )
    .join("");

  const insightsList = (digest.topInsights || [])
    .map(
      (insight) =>
        `<li style="margin-bottom:10px;line-height:1.6;color:#334155;"><strong style="color:#0F172A;">💡</strong> ${escapeHtml(insight)}</li>`
    )
    .join("");

  const actionsList = (digest.growthActions || [])
    .map(
      (action) =>
        `<li style="margin-bottom:10px;line-height:1.6;color:#334155;"><strong style="color:#10B981;">✓</strong> ${escapeHtml(action)}</li>`
    )
    .join("");

  const gratitudeList = (digest.gratitudeHighlights || [])
    .map(
      (item) =>
        `<li style="margin-bottom:8px;line-height:1.6;color:#334155;"><strong style="color:#F59E0B;">✦</strong> ${escapeHtml(item)}</li>`
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
              <div style="font-size:14px;opacity:0.9;font-weight:500;">Saturday Edition • ${escapeHtml(startDate)} – ${escapeHtml(endDate)}</div>
              <div style="display:inline-block;margin-top:16px;background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:0.3px;">
                ${entryCount} Reflections Synthesized This Week
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="font-size:16px;line-height:1.6;margin-top:0;color:#334155;">
                Hello <strong>${escapeHtml(userName)}</strong>,
              </p>
              <p style="font-size:15px;line-height:1.6;color:#475569;margin-bottom:24px;">
                Every Saturday, your AI Journal analyzes your entries to surface meaningful patterns, emotional growth, and practical intentions for the week ahead. Here is your weekly synthesis:
              </p>

              <!-- Highlight Title Card -->
              <div style="background-color:#F8FAFC;border-left:4px solid #6366F1;padding:18px 20px;border-radius:12px;margin-bottom:24px;">
                <div style="font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;color:#6366F1;margin-bottom:4px;">Weekly Theme</div>
                <div style="font-size:18px;font-weight:700;color:#0F172A;margin-bottom:8px;">${escapeHtml(digest.title)}</div>
                <div style="font-size:14px;line-height:1.6;color:#475569;">${escapeHtml(digest.overview)}</div>
              </div>

              <!-- Emotional Arc & Themes -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding-bottom:12px;">
                    <div style="font-size:13px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Emotional Trajectory</div>
                    <div style="background:#FEF3C7;color:#92400E;padding:10px 14px;border-radius:10px;font-size:13px;font-weight:600;border:1px solid #FDE68A;">
                      🌿 ${escapeHtml(digest.emotionalArc)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style="font-size:13px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Core Themes Explored</div>
                    <div>${themeBadges}</div>
                  </td>
                </tr>
              </table>

              <!-- Top Insights -->
              ${
                digest.topInsights && digest.topInsights.length > 0
                  ? `
              <div style="margin-bottom:24px;">
                <div style="font-size:15px;font-weight:700;color:#0F172A;margin-bottom:12px;">
                  💡 Key Breakthroughs & Insights
                </div>
                <ul style="margin:0;padding-left:20px;font-size:14px;">
                  ${insightsList}
                </ul>
              </div>`
                  : ""
              }

              <!-- Recommended Growth Actions -->
              ${
                digest.growthActions && digest.growthActions.length > 0
                  ? `
              <div style="margin-bottom:24px;">
                <div style="font-size:15px;font-weight:700;color:#0F172A;margin-bottom:12px;">
                  🎯 Next Week's Mindful Intentions
                </div>
                <ul style="margin:0;padding-left:20px;font-size:14px;">
                  ${actionsList}
                </ul>
              </div>`
                  : ""
              }

              <!-- Gratitude Highlights -->
              ${
                digest.gratitudeHighlights && digest.gratitudeHighlights.length > 0
                  ? `
              <div style="background-color:#FFFBEB;border:1px solid #FEF3C7;border-radius:14px;padding:18px 20px;margin-bottom:28px;">
                <div style="font-size:14px;font-weight:700;color:#92400E;margin-bottom:10px;">
                  ✨ Highlights & Gratitude
                </div>
                <ul style="margin:0;padding-left:20px;font-size:13px;">
                  ${gratitudeList}
                </ul>
              </div>`
                  : ""
              }

              <!-- App Link Button -->
              <div style="text-align:center;padding:12px 0 20px 0;">
                <a href="${appUrl}" target="_blank" style="display:inline-block;background-color:#4F46E5;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px;box-shadow:0 4px 12px rgba(79,70,229,0.3);">
                  Open Your Journal & Reflect
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F1F5F9;padding:24px 28px;text-align:center;font-size:12px;color:#64748B;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 6px 0;">
                Sent to <strong>${escapeHtml(userEmail)}</strong> because you are a registered user of Gemini Reflection Journal.
              </p>
              <p style="margin:0;color:#94A3B8;">
                Weekly digests are delivered automatically every Saturday. You can update your digest settings in your profile.
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
 * Account Status Change HTML & Text Template (Activated or Deactivated)
 */
export function generateAccountStatusEmail(params: AccountStatusEmailParams): EmailRenderOutput {
  const { userName, userEmail, status, reason, adminContactEmail } = params;
  const isActivated = status === "active";
  const appUrl = params.appUrl || process.env.APP_URL || "https://ais-dev-cfsy4zwhedzflleyrowgf4-896719886324.asia-east1.run.app";
  const adminEmail = adminContactEmail || process.env.ADMIN_EMAIL || "";

  const safeUserName = escapeHtml(userName || "Journal Writer");
  const safeUserEmail = escapeHtml(userEmail);
  const safeReason = escapeHtml(reason || (isActivated ? "Account status refreshed by administrator." : "Administrative security review or maintenance."));
  const safeAdminEmail = escapeHtml(adminEmail);

  const subject = isActivated
    ? "✓ Your Gemini Reflection Journal Account Has Been Reactivated"
    : "⚠️ Notice: Your Gemini Reflection Journal Account Has Been Deactivated";

  const bannerGradient = isActivated
    ? "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)"
    : "linear-gradient(135deg, #DC2626 0%, #E11D48 50%, #F43F5E 100%)";

  const badgeText = isActivated ? "Account Status: Active" : "Account Status: Deactivated";
  const iconEmoji = isActivated ? "✨" : "🔒";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8FAFC;padding:36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid #E2E8F0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:${bannerGradient};padding:36px 32px;text-align:center;color:#FFFFFF;">
              <div style="font-size:32px;margin-bottom:8px;">${iconEmoji}</div>
              <div style="font-size:24px;font-weight:800;letter-spacing:-0.5px;margin-bottom:6px;">
                ${isActivated ? "Account Reactivated" : "Account Deactivation Notice"}
              </div>
              <div style="display:inline-block;margin-top:8px;background:rgba(255,255,255,0.22);padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.3px;">
                ${badgeText}
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="font-size:16px;line-height:1.6;margin-top:0;color:#334155;">
                Hello <strong style="color:#0F172A;">${safeUserName}</strong>,
              </p>

              ${
                isActivated
                  ? `
              <p style="font-size:15px;line-height:1.6;color:#475569;margin-bottom:20px;">
                Good news! Your account associated with <strong>${safeUserEmail}</strong> has been reactivated by the system administrator. You now have full access to your reflection journal, AI insights, voice transcription, and historical entries.
              </p>

              <div style="background-color:#ECFDF5;border-left:4px solid #10B981;border-radius:10px;padding:18px 20px;margin-bottom:26px;">
                <div style="font-size:12px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                  What you can do now:
                </div>
                <ul style="margin:0;padding-left:18px;font-size:14px;color:#065F46;line-height:1.6;">
                  <li>Log in to access all previous reflection entries and streaks</li>
                  <li>Record voice reflections with hands-free AI transcription</li>
                  <li>Receive Saturday AI weekly synthesis digests</li>
                </ul>
              </div>

              <div style="text-align:center;padding:10px 0 20px 0;">
                <a href="${appUrl}" target="_blank" style="display:inline-block;background-color:#10B981;color:#FFFFFF;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:700;font-size:14px;box-shadow:0 4px 14px rgba(16,185,129,0.35);">
                  Log In & Resume Journaling
                </a>
              </div>
              `
                  : `
              <p style="font-size:15px;line-height:1.6;color:#475569;margin-bottom:20px;">
                This email is to notify you that your Gemini Reflection Journal account (<strong>${safeUserEmail}</strong>) has been deactivated by the system administrator.
              </p>

              <div style="background-color:#FFF1F2;border-left:4px solid #F43F5E;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
                <div style="font-size:12px;font-weight:700;color:#BE123C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                  Administrative Reason:
                </div>
                <p style="font-size:14px;line-height:1.6;color:#9F1239;margin:0;font-weight:500;">
                  "${safeReason}"
                </p>
              </div>

              <p style="font-size:14px;line-height:1.6;color:#64748B;margin-bottom:24px;">
                While your account is deactivated, logging in will present an appeal form where you can submit a message directly to the administrator for reactivation review.
              </p>

              <div style="text-align:center;padding:10px 0 20px 0;">
                <a href="mailto:${safeAdminEmail}?subject=${encodeURIComponent("Account Reactivation Request: " + userEmail)}&body=${encodeURIComponent("Hello Admin,\n\nI would like to request reactivation for my account (" + userEmail + ").\n\nThank you.")}" style="display:inline-block;background-color:#E11D48;color:#FFFFFF;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:700;font-size:14px;box-shadow:0 4px 14px rgba(225,29,72,0.3);">
                  Contact Admin for Review
                </a>
              </div>
              `
              }

              <p style="font-size:13px;line-height:1.5;color:#94A3B8;margin-top:20px;border-top:1px solid #F1F5F9;padding-top:16px;">
                If you believe this status update was made in error, you can reply directly to this notification or contact our support team at <a href="mailto:${safeAdminEmail}" style="color:#4F46E5;text-decoration:none;font-weight:600;">${safeAdminEmail}</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:22px 28px;text-align:center;font-size:12px;color:#64748B;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 4px 0;">
                Gemini Reflection Journal • Security & Account Governance
              </p>
              <p style="margin:0;color:#94A3B8;">
                Automatic system notification sent to ${safeUserEmail}.
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

  const text = isActivated
    ? `Hello ${userName || "User"},\n\nYour Gemini Reflection Journal account (${userEmail}) has been reactivated by the administrator.\nYou can now log in at ${appUrl} to resume your reflections.\n\nBest regards,\nGemini Journal Team`
    : `Hello ${userName || "User"},\n\nYour Gemini Reflection Journal account (${userEmail}) has been deactivated.\nReason: ${reason || "Administrative review"}\n\nTo request reactivation, contact the administrator at ${adminEmail}.\n\nBest regards,\nGemini Journal Team`;

  return { subject, html, text };
}

/**
 * Appeal / Contact Admin Template
 */
export function generateReactivationAppealEmail(params: ReactivationAppealEmailParams): EmailRenderOutput {
  const { userName, userEmail, userId, subject: customSubject, message, deactivationReason } = params;
  const appUrl = params.appUrl || process.env.APP_URL || "https://ais-dev-cfsy4zwhedzflleyrowgf4-896719886324.asia-east1.run.app";

  const safeUserName = escapeHtml(userName || "Journal User");
  const safeUserEmail = escapeHtml(userEmail);
  const safeUserId = escapeHtml(userId || "unknown");
  const safeReason = escapeHtml(deactivationReason || "None specified");
  const safeMessage = escapeHtml(message);

  const subject = customSubject || `🚨 Account Reactivation Request: ${safeUserName} (${safeUserEmail})`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1E293B;background:#F8FAFC;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:16px;border:1px solid #E2E8F0;padding:28px;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
    <div style="background:#4F46E5;color:#FFFFFF;padding:16px 20px;border-radius:12px;margin-bottom:20px;">
      <h2 style="margin:0;font-size:18px;font-weight:700;">Appeal for Account Reactivation</h2>
      <p style="margin:4px 0 0 0;font-size:12px;opacity:0.9;">Submitted from Deactivated User Access Portal</p>
    </div>
    
    <div style="background:#F1F5F9;padding:14px 18px;border-radius:10px;margin-bottom:18px;font-size:13px;line-height:1.6;">
      <div><strong>User Name:</strong> ${safeUserName}</div>
      <div><strong>User Email:</strong> <a href="mailto:${safeUserEmail}">${safeUserEmail}</a></div>
      <div><strong>User UID:</strong> <code style="font-size:11px;background:#E2E8F0;padding:2px 6px;border-radius:4px;">${safeUserId}</code></div>
      <div><strong>Original Deactivation Reason:</strong> ${safeReason}</div>
    </div>

    <div style="border-left:4px solid #4F46E5;background:#F8FAFC;padding:16px 18px;border-radius:8px;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:6px;">User Appeal Message:</div>
      <p style="font-size:14px;line-height:1.6;color:#1E293B;margin:0;white-space:pre-wrap;">${safeMessage}</p>
    </div>

    <div style="text-align:center;">
      <a href="${appUrl}" style="display:inline-block;background:#4F46E5;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:13px;">
        Open Admin Control Portal to Reactivate
      </a>
    </div>
  </div>
</body>
</html>
  `;

  const text = `Reactivation request from ${userName} (${userEmail}):\n\nOriginal Reason: ${deactivationReason || "None"}\n\nMessage:\n${message}`;

  return { subject, html, text };
}

/**
 * Admin Reply to User Appeal Email Template
 */
export function generateAdminAppealReplyEmail(params: AdminAppealReplyEmailParams): EmailRenderOutput {
  const {
    userName,
    userEmail,
    appealId,
    appealSubject,
    originalAppealMessage,
    adminReply,
    adminName,
    adminEmail,
  } = params;

  const appUrl = params.appUrl || process.env.APP_URL || "https://ais-dev-cfsy4zwhedzflleyrowgf4-896719886324.asia-east1.run.app";
  const safeUserName = escapeHtml(userName || userEmail.split("@")[0] || "User");
  const safeUserEmail = escapeHtml(userEmail);
  const safeAdminName = escapeHtml(adminName || "System Administration");
  const safeAdminEmail = escapeHtml(adminEmail || process.env.ADMIN_EMAIL || "");
  const safeSubject = escapeHtml(appealSubject || "Account Reactivation Request");
  const safeAdminReply = escapeHtml(adminReply);
  const safeOriginalMessage = originalAppealMessage ? escapeHtml(originalAppealMessage) : null;

  const subject = `Re: [Appeal #${appealId.slice(-6)}] ${appealSubject || "Account Reactivation Request"}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8FAFC;padding:36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid #E2E8F0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #4338CA 0%, #6366F1 50%, #8B5CF6 100%);padding:32px 28px;text-align:center;color:#FFFFFF;">
              <div style="font-size:28px;margin-bottom:6px;">💬</div>
              <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;margin-bottom:6px;">
                Administrator Response to Your Appeal
              </div>
              <div style="display:inline-block;margin-top:6px;background:rgba(255,255,255,0.2);padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;">
                Appeal Case #${escapeHtml(appealId.slice(-8))}
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="font-size:15px;line-height:1.6;margin-top:0;color:#334155;">
                Hello <strong style="color:#0F172A;">${safeUserName}</strong>,
              </p>
              
              <p style="font-size:14px;line-height:1.6;color:#475569;margin-bottom:20px;">
                The administrator has reviewed your account reactivation appeal regarding <em>"${safeSubject}"</em> and replied with the following message:
              </p>

              <!-- Admin Reply Quote Box -->
              <div style="background-color:#EEF2FF;border-left:4px solid #6366F1;border-radius:12px;padding:20px;margin-bottom:24px;">
                <div style="display:flex;align-items:center;font-size:12px;font-weight:700;color:#4338CA;margin-bottom:10px;">
                  <span>Message from ${safeAdminName}</span>
                </div>
                <div style="font-size:14px;line-height:1.7;color:#1E1B4B;white-space:pre-wrap;font-weight:450;">
${safeAdminReply}
                </div>
              </div>

              ${
                safeOriginalMessage
                  ? `
              <!-- Original User Appeal Reference -->
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px;margin-bottom:24px;">
                <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
                  Reference: Your Original Appeal Statement
                </div>
                <div style="font-size:13px;line-height:1.6;color:#64748B;font-style:italic;">
                  "${safeOriginalMessage}"
                </div>
              </div>
              `
                  : ""
              }

              <!-- Actions & App Link -->
              <div style="text-align:center;padding:10px 0 16px 0;">
                <a href="${appUrl}" target="_blank" style="display:inline-block;background-color:#4F46E5;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px;box-shadow:0 4px 14px rgba(79,70,229,0.3);">
                  Open Gemini Reflection Journal
                </a>
              </div>

              <p style="font-size:12px;line-height:1.6;color:#94A3B8;margin-top:20px;border-top:1px solid #F1F5F9;padding-top:16px;">
                If you have further questions or additional documentation to submit, you can reply directly to this email or reach the administrator at <a href="mailto:${safeAdminEmail}" style="color:#4F46E5;text-decoration:none;font-weight:600;">${safeAdminEmail}</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:20px 28px;text-align:center;font-size:12px;color:#64748B;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 4px 0;">
                Gemini Reflection Journal • Trust & Account Governance
              </p>
              <p style="margin:0;color:#94A3B8;">
                Sent directly to ${safeUserEmail} regarding appeal #${escapeHtml(appealId)}.
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

  const text = `Hello ${userName || "User"},\n\nThe administrator (${adminName || "System Administrator"}) has replied to your appeal regarding "${appealSubject || "Account Reactivation Request"}":\n\n${adminReply}\n\nApp URL: ${appUrl}\n\nBest regards,\nGemini Journal Administration`;

  return { subject, html, text };
}

