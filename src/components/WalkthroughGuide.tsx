import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  Circle, 
  HelpCircle, 
  X, 
  ShieldCheck, 
  Sparkles, 
  Database, 
  Key, 
  ArrowRight,
  ExternalLink 
} from "lucide-react";

interface WalkthroughGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestCase {
  id: string;
  category: string;
  title: string;
  steps: string[];
  expected: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: "TC-01",
    category: "Authentication & Identity",
    title: "Google & Email Authentication",
    steps: [
      "On the landing page, view the unified sign-in container.",
      "Test 'Continue with Google' or toggle between 'Log In' and 'Create Account' using Email & Password.",
      "Complete sign in and notice immediate profile hydration in the navbar.",
    ],
    expected: "User profile loads with email/photo in Navbar; redirected to private dashboard.",
  },
  {
    id: "TC-02",
    category: "Guest Experience",
    title: "Guest Session: Conversation, Mood & Focus Selection (2 Max Limit)",
    steps: [
      "On the landing page, click 'Continue as Guest' in the dedicated guest container.",
      "Freely select your current Mood (e.g. Grateful, Inspired) and Focus area (e.g. Mindfulness, Gratitude).",
      "Engage in conversational reflections with Gemini (up to 2 conversations maximum).",
      "Notice gated actions (AI Summary, Voice Transcription, Favorites, Markdown Export) open the login popup on the same page with a transparent blurred backdrop overlay.",
    ],
    expected: "Guest can reflect, set mood, and choose focus area freely; gated features trigger the in-page blurred login popup.",
  },
  {
    id: "TC-03",
    category: "User Profile",
    title: "User Profile Modal & Session Stats",
    steps: [
      "Click the user avatar in the navbar to open the User Profile.",
      "Review account identifier (UID), verification badge, total reflections, AI exchanges, and mood distribution.",
      "Edit and save your display name.",
    ],
    expected: "Profile modal displays live metrics and allows updating user display name.",
  },
  {
    id: "TC-04",
    category: "Journaling & Prompts",
    title: "Reflection Starter & Metadata Selection",
    steps: [
      "On a new reflection, click one of the 'Reflection Starters' (e.g. Daily Reflection).",
      "Notice the prompt populated in the text area and the focus area automatically set.",
      "Select a mood from the dropdown (e.g. Grounded or Inspired).",
    ],
    expected: "Prompt text area and metadata tags update instantly without lag.",
  },
  {
    id: "TC-05",
    category: "AI Engine",
    title: "Multi-Turn Gemini 3.6 Flash Conversation",
    steps: [
      "Click 'Reflect' or press Cmd/Ctrl + Enter to send the reflection.",
      "Observe the thinking indicator and model execution badge.",
      "Send a follow-up reply to continue the multi-turn discussion.",
    ],
    expected: "Gemini returns empathetic, structured markdown reflection and deepens conversation.",
  },
  {
    id: "TC-06",
    category: "Synthesis & Action Plans",
    title: "Automated Growth Synthesis & Action Items",
    steps: [
      "After at least 2 messages, click 'Generate Growth Summary' (requires signed-in account).",
      "Observe the structured dark theme Synthesis Card appearance.",
      "Toggle check marks on the mindful action items.",
    ],
    expected: "Structured JSON response displays Executive Overview, Key Takeaways, Growth Insights, and interactive Action Items.",
  },
  {
    id: "TC-07",
    category: "Database & Security",
    title: "Firestore Zero-Trust Isolation & Persistence",
    steps: [
      "Check the 'Saved to Cloud' badge in the top navbar after typing or receiving messages.",
      "Reload the browser tab or switch to another entry and switch back.",
      "Verify data is strictly bound to your UID path in Firestore rules.",
    ],
    expected: "All messages, titles, moods, and summaries persist across reloads without loss.",
  },
  {
    id: "TC-08",
    category: "History & Management",
    title: "Search, Filter, Export & Delete",
    steps: [
      "Click 'Past Entries' in the navbar to open history.",
      "Type a keyword in search or toggle 'Favorites' filter.",
      "Click the Export button to download a formatted .md markdown journal file.",
      "Click the trash icon to test deletion.",
    ],
    expected: "Realtime filtered list reacts instantly; export saves file; deletion updates list in realtime.",
  },
  {
    id: "TC-09",
    category: "Voice Control & Dictation",
    title: "Hands-Free Live Speech-to-Text & Gemini HD Audio",
    steps: [
      "Click the Microphone icon on the Voice Control Panel (signed-in accounts).",
      "Speak a thought or reflection into your microphone.",
      "Observe the dynamic audio waveform equalizer and live streaming speech preview.",
    ],
    expected: "Spoken speech is accurately transcribed in realtime and appended to the reflection prompt textarea.",
  },
  {
    id: "TC-10",
    category: "Engagement & Retention",
    title: "Continuous Daily Login Streak Mechanism (Day 2+ & Auth Only)",
    steps: [
      "Log in as a Guest user and verify that streak indicators are NOT shown (streaks are exclusive to authenticated accounts).",
      "Sign in with Google / Email for the first time (Day 1) and verify no streak count badge is shown in the navbar or editor header.",
      "Open the user Profile Modal to verify the account status indicates Day 1 active (streak starts on Day 2).",
      "Log in on continuous consecutive Day 2 to verify the flame streak badge appears displaying '1 day streak'.",
      "Log in on Day 3 to watch the continuous streak increment to '2 days streak'.",
      "If a calendar day is skipped, verify streak breaks and resets from 0 (restarting at Day 1 with no badge until Day 2).",
    ],
    expected: "Streaks are authenticated-only, counted from Day 2 as a 1-day streak, hidden on Day 1, and reset to 0 upon skipped calendar days.",
  },
  {
    id: "TC-11",
    category: "Security & DDoS Defense",
    title: "Multi-Tier Express Rate Limiting",
    steps: [
      "Send consecutive API requests to test the anti-DDoS and inference limits.",
      "Verify anti-DDoS (30 req / 10s), general API (150 req / 15m), and Gemini inference rate limiters.",
      "Observe that exceeding limits returns clean HTTP 429 Too Many Requests with user-friendly retry banners.",
    ],
    expected: "Express rate limiters safeguard backend endpoints against abuse and overload without crashing.",
  },
  {
    id: "TC-12",
    category: "History & Performance",
    title: "Infinite Scroll History Pagination (10 Per Batch)",
    steps: [
      "Click 'Past Entries' in the top navbar to open the reflective journal drawer.",
      "Scroll down to the bottom of the past entries list.",
      "Observe the intersection observer automatically fetching and displaying the next batch of 10 entries smoothly.",
    ],
    expected: "Past entries load in 10-item pages on demand with a smooth loading indicator.",
  },
  {
    id: "TC-13",
    category: "Weekly Digest & Synthesis",
    title: "Weekly Journal AI Summary Synthesis (Registered Users Only)",
    steps: [
      "As a registered user, click 'Weekly Digest' in the top navbar or open it via the Profile Modal.",
      "Click 'Generate This Week's Summary' to synthesize all reflections from the past 7 days.",
      "Inspect the generated Weekly Theme title, overview narrative, emotional trajectory arc, core theme tags, breakthrough insights, and mindful action steps for the upcoming week.",
      "Verify that guest users attempting to access the digest receive an invitation to sign in or register with their email address.",
    ],
    expected: "Gemini synthesizes the week's journal entries into a rich, holistic reflection summary for registered users.",
  },
  {
    id: "TC-14",
    category: "Weekly Email Dispatcher",
    title: "Saturday Automated Email Dispatch & Responsive Newsletter Preview",
    steps: [
      "In the Weekly Digest modal, switch to the 'Email Newsletter Preview' tab to inspect the responsive HTML email template.",
      "Click 'Send to [Your Email] Now' to trigger immediate test email delivery to your registered email address.",
      "Observe the delivery confirmation banner showing successful dispatch via SMTP / Mail transport.",
      "Switch to the 'Past Saturday Digests' tab to verify the sent summary is securely archived in your Firestore collection.",
      "Check server logs to verify the Saturday 09:00 UTC automated cron dispatcher is initialized and operational.",
    ],
    expected: "HTML email newsletter is formatted, dispatched to the user's email address, and scheduled for automated Saturday delivery.",
  },
  {
    id: "TC-15",
    category: "System Administration",
    title: "Dedicated Admin Route (/admin) & Default Seeded Administrator Gateway",
    steps: [
      "Navigate to '/admin' or click the purple 'Admin' button in the top navbar.",
      "If not signed in, observe the dedicated Admin Gateway screen with Secret Manager governance status.",
      "Enter your Secret Manager configured administrator credentials into the secure login form.",
      "Observe the full-page Admin Portal render with top breadcrumb header, sub-route switcher ('Dashboard' and 'Users'), and 'Return to Journal' button.",
      "Click 'Return to Journal' to verify seamless return to '/'.",
    ],
    expected: "Admin portal is mounted on its own dedicated route (/admin) with seamless login and return navigation.",
  },
  {
    id: "TC-16",
    category: "Executive Telemetry",
    title: "Admin Dashboard: Total Users, Daily Signups & Gemini Chat Cost Usage Chart",
    steps: [
      "On the '/admin/dashboard' route, review the 4 KPI stat cards: Total Users (Active & Deactivated pills), Daily Signups, Gemini AI Requests, and Gemini Chat Cost ($ USD).",
      "Inspect the 'Daily User Signups' Recharts chart: toggle between 'Daily' and 'Cumulative' view modes, and switch timeframes between 7 Days, 14 Days, and 30 Days.",
      "Inspect the 'Gemini Chat Cost & Usage Chart' displaying daily estimated USD spend and inference volumes.",
      "Review the 'Model Volume Distribution' pie chart and 'Feature & Endpoint Utilization' list.",
      "Inspect the 'Live Gemini Inference Stream' table showing live timestamps, features, models used, tokens, latency ms, and estimated cost.",
    ],
    expected: "Executive dashboard accurately renders interactive Recharts visualizers for daily signups, total users, and Gemini chat cost metrics.",
  },
  {
    id: "TC-17",
    category: "User Access Control",
    title: "User Management: Real-Time Activation, Deactivation & Security Audit Trail",
    steps: [
      "In the Admin Portal, click the 'Users' tab to navigate to the '/admin/users' route.",
      "Search users by name, email, or user ID; filter by status (All, Active, Deactivated, Admins).",
      "Click 'Deactivate' on a test user, provide an administrative reason, and confirm.",
      "Notice the user status change to 'Deactivated' in realtime and an audit record logged in the 'Security Audit Trail' tab.",
      "Attempt to deactivate your own admin account and observe the built-in self-protection safety guard prevent self-lockout.",
      "Click 'Reactivate' to restore the user's active status immediately.",
    ],
    expected: "Admin can activate and deactivate users with safety guards, realtime state synchronization, and audit trail logging.",
  },
];


export const WalkthroughGuide: React.FC<WalkthroughGuideProps> = ({
  isOpen,
  onClose,
}) => {
  const [completedTests, setCompletedTests] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleTest = (id: string) => {
    setCompletedTests((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const progressCount = Object.values(completedTests).filter(Boolean).length;
  const progressPercent = Math.round((progressCount / TEST_CASES.length) * 100);

  return (
    <div
      id="walkthrough-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="walkthrough-modal-content"
        className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              <h2 className="font-extrabold text-slate-900 text-lg">
                Functional Stability & Verification Guide
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Interactive test cases verifying all end-to-end user flows and system directives.
            </p>
          </div>
          <button
            id="btn-close-walkthrough"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-5 py-3 bg-indigo-50/50 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Verification Progress:</span>
            <span className="text-xs font-bold text-indigo-700">
              {progressCount} of {TEST_CASES.length} Verified ({progressPercent}%)
            </span>
          </div>
          <div className="w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Test Cases List */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
          {TEST_CASES.map((tc) => {
            const isDone = Boolean(completedTests[tc.id]);
            return (
              <div
                key={tc.id}
                id={`test-case-${tc.id}`}
                className={`p-4 rounded-2xl border transition-all ${
                  isDone
                    ? "bg-emerald-50/40 border-emerald-200"
                    : "bg-white border-slate-200/80 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTest(tc.id)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {tc.category}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {tc.id}: {tc.title}
                        </span>
                      </div>

                      {/* Steps */}
                      <ol className="text-xs text-slate-600 list-decimal list-inside space-y-0.5 pt-1">
                        {tc.steps.map((step, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ol>

                      {/* Expected */}
                      <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-2 font-normal">
                        <span className="font-bold text-slate-900">Expected Outcome: </span>
                        {tc.expected}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Compliant with OWASP Top 10 & Zero-Trust Cloud Firestore Isolation</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
