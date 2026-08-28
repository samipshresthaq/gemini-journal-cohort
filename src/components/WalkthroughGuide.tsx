import React, { useState } from "react";
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
    title: "Google Sign-In with Firebase Auth",
    steps: [
      "Navigate to the landing page.",
      "Click the 'Continue with Google' button.",
      "Complete the Google OAuth popup sign-in flow.",
    ],
    expected: "User profile loads with photo and name in Navbar; redirected to private dashboard.",
  },
  {
    id: "TC-02",
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
    id: "TC-03",
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
    id: "TC-04",
    category: "Synthesis & Action Plans",
    title: "Automated Growth Synthesis & Action Items",
    steps: [
      "After at least 2 messages, click 'Generate Growth Summary'.",
      "Observe the structured dark theme Synthesis Card appearance.",
      "Toggle check marks on the mindful action items.",
    ],
    expected: "Structured JSON response displays Executive Overview, Key Takeaways, Growth Insights, and interactive Action Items.",
  },
  {
    id: "TC-05",
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
    id: "TC-06",
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
];

export const WalkthroughGuide: React.FC<WalkthroughGuideProps> = ({
  isOpen,
  onClose,
}) => {
  const [completedTests, setCompletedTests] = useState<Record<string, boolean>>({});

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
