import React from "react";
import { 
  Sparkles, 
  BrainCircuit, 
  Compass, 
  ArrowRight,
  Loader2,
  Tag,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  KeyRound
} from "lucide-react";

interface LandingPageProps {
  onSignIn: () => void;
  onEmailSignIn: (email: string, pass: string) => Promise<void>;
  onEmailSignUp: (email: string, pass: string, name?: string) => Promise<void>;
  onGuestSignIn?: () => void;
  onOpenAuthModal?: (title?: string, description?: string) => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onGuestSignIn,
  onOpenAuthModal,
  isLoading,
  errorMessage,
}) => {
  return (
    <div id="landing-page-container" className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center space-y-8 pt-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold tracking-wide shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>AI-Powered Mindful Journaling</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl mx-auto leading-tight">
          Reflect deeper, think clearer, and capture your growth.
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          Your personal space for mindful self-reflection. Write freely, engage in guided thought-provoking dialogue, and transform daily reflections into lasting clarity.
        </p>

        {/* Authentication Options Section */}
        <div className="pt-2 max-w-md mx-auto w-full space-y-4">
          {/* Main Action Card */}
          <div id="auth-main-container" className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-6 space-y-4 text-left">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Welcome to Gemini Journal
                </h2>
                <p className="text-xs text-slate-500">Sign in to sync your reflections to Cloud Firestore</p>
              </div>
              <span className="text-[11px] text-indigo-600 bg-indigo-50 font-semibold px-2 py-0.5 rounded-full border border-indigo-100">
                Cloud Synced
              </span>
            </div>

            {/* Google Sign-In Primary Action */}
            <button
              id="btn-google-sign-in"
              onClick={onSignIn}
              disabled={isLoading}
              className="w-full h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
                </>
              )}
            </button>

            {/* Email Login / Signup Trigger Button */}
            <button
              id="btn-open-email-login-modal"
              onClick={() => onOpenAuthModal?.(
                "Sign In with Email & Password",
                "Log into your account or register to save reflections, unlock AI growth summaries, and manage history."
              )}
              className="w-full h-11 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Sign In or Register with Email</span>
            </button>

            {/* Error Banner */}
            {errorMessage && (
              <div
                id="landing-auth-error-banner"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-center font-medium shadow-2xs space-y-0.5"
              >
                <p>{errorMessage}</p>
              </div>
            )}
          </div>

          {/* Separated Always-Visible Guest Session Container */}
          {onGuestSignIn && (
            <div
              id="guest-session-container"
              className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-4 text-left shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="text-xs font-bold text-slate-800">No account required</h3>
                </div>
                <p className="text-[11px] text-slate-500">
                  Try all features immediately in private local guest mode.
                </p>
              </div>

              <button
                type="button"
                id="btn-guest-sign-in"
                onClick={onGuestSignIn}
                disabled={isLoading}
                className="w-full sm:w-auto shrink-0 h-9 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-semibold text-xs border border-slate-300/80 shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>Continue as Guest</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 text-xs text-slate-500 pt-2 font-medium">
            <span className="flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
              Interactive Dialogue
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-sky-600" />
              Action Summaries
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              Smart Tagging
            </span>
          </div>
        </div>
      </div>

      {/* Top 3 Core Features Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 my-16 w-full">
        {/* Feature 1 */}
        <div id="feature-card-dialogue" className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Guided Multi-Turn Reflection</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Engage in back-and-forth reflective dialogue. The AI asks thoughtful follow-up questions to help you uncover deeper motivations, process emotions, and overcome mental blocks.
          </p>
        </div>

        {/* Feature 2 */}
        <div id="feature-card-synthesis" className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Automated Growth Synthesis</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Instantly turn stream-of-consciousness journaling into organized takeaways, emotional highlights, and clear, realistic action steps for your day ahead.
          </p>
        </div>

        {/* Feature 3 */}
        <div id="feature-card-tagging" className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Smart Tagging & Searchable Archive</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Automatic thematic categorization tags your entries by topic and mood, making it effortless to filter, search, favorite, and revisit your personal growth journey over time.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto text-center border-t border-slate-200 pt-6 text-xs text-slate-500 font-medium">
        <p>Personal Reflective Journal & Thought Companion</p>
      </div>
    </div>
  );
};


