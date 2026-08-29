import React, { useState } from "react";
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
  isLoading: boolean;
  errorMessage?: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onEmailSignIn,
  onEmailSignUp,
  onGuestSignIn,
  isLoading,
  errorMessage,
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError("Please enter your email address.");
      return;
    }
    if (!password || password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmittingEmail(true);
    try {
      if (isRegistering) {
        await onEmailSignUp(email, password, displayName);
      } else {
        await onEmailSignIn(email, password);
      }
    } catch (err: any) {
      // Local error will be propagated or handled via errorMessage prop
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const activeError = localError || errorMessage;

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

        {/* Authentication Section */}
        <div className="pt-2 max-w-md mx-auto w-full space-y-4">
          {/* Main Unified Auth Card (Google + Email) */}
          <div id="auth-main-container" className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-6 space-y-5 text-left">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">
                {isRegistering ? "Create your Account" : "Sign In to Journal"}
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Cloud Synced</span>
            </div>

            {/* Google Sign-In Button */}
            <button
              id="btn-google-sign-in"
              onClick={onSignIn}
              disabled={isLoading}
              className="w-full h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-70 cursor-pointer"
            >
              {isLoading && !isSubmittingEmail ? (
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

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-slate-200"></div>
              <span className="shrink mx-3 text-slate-400 text-xs font-medium uppercase tracking-wider">
                or with email
              </span>
              <div className="grow border-t border-slate-200"></div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
              {isRegistering && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="input-auth-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Alex Parker"
                      className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="input-auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="input-auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-submit-email-auth"
                disabled={isSubmittingEmail || isLoading}
                className="w-full h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer mt-1"
              >
                {isSubmittingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                    <span>{isRegistering ? "Creating Account..." : "Signing In..."}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-indigo-200" />
                    <span>{isRegistering ? "Create Free Account" : "Sign In with Email"}</span>
                  </>
                )}
              </button>

              {/* Toggle Sign-In vs Register */}
              <div className="pt-1 text-center text-xs text-slate-500">
                {isRegistering ? (
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      id="btn-toggle-to-signin"
                      onClick={() => {
                        setIsRegistering(false);
                        setLocalError(null);
                      }}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                ) : (
                  <p>
                    New here?{" "}
                    <button
                      type="button"
                      id="btn-toggle-to-register"
                      onClick={() => {
                        setIsRegistering(true);
                        setLocalError(null);
                      }}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold underline cursor-pointer"
                    >
                      Create an account
                    </button>
                  </p>
                )}
              </div>
            </form>

            {/* Error Banner */}
            {activeError && (
              <div
                id="landing-auth-error-banner"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-center font-medium shadow-2xs space-y-0.5"
              >
                <p>{activeError}</p>
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


