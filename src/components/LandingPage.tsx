import React from "react";
import { 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  BrainCircuit, 
  Lock, 
  Compass, 
  ArrowRight,
  CheckCircle,
  Loader2
} from "lucide-react";

interface LandingPageProps {
  onSignIn: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  isLoading,
  errorMessage,
}) => {
  return (
    <div id="landing-page-container" className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center space-y-8 pt-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold tracking-wide shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Intelligent Journaling with Gemini 3.6 Flash & Cloud Firestore</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl mx-auto leading-tight">
          Reflect deeper, think clearer, and capture your growth.
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          A private, encrypted personal workspace. Write multi-turn journal reflections, receive mindful insights from Gemini, and automatically synthesize structured action plans.
        </p>

        {/* Authentication CTA Button */}
        <div className="pt-4 flex flex-col items-center gap-3">
          <button
            id="btn-google-sign-in"
            onClick={onSignIn}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[280px] h-13 px-7 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70 cursor-pointer ring-1 ring-slate-900/10"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-indigo-300" />
                <span>Authenticating with Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </>
            )}
          </button>

          {errorMessage && (
            <div
              id="landing-auth-error-banner"
              className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl max-w-md text-center font-medium shadow-xs"
            >
              {errorMessage}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 font-medium">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Firebase Auth
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Isolated Firestore Rules
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
              Gemini 3.6 Flash
            </span>
          </div>
        </div>
      </div>

      {/* Feature Pillar Bento */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 my-16 w-full">
        {/* Card 1 */}
        <div id="feature-card-privacy" className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Zero-Trust Data Isolation</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every entry is strictly isolated to your authenticated account ID in Cloud Firestore. Other users cannot read, query, or modify your reflections.
          </p>
        </div>

        {/* Card 2 */}
        <div id="feature-card-ai" className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 text-indigo-600 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Multi-Turn Reflective Dialogue</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Converse back-and-forth with Gemini 3.6 Flash. Brainstorm solutions, process complex feelings, and explore different angles of your daily life.
          </p>
        </div>

        {/* Card 3 */}
        <div id="feature-card-summaries" className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 text-sky-600 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Automated Growth Synthesis</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            With a single click, convert your freeform journal conversation into structured takeaways, mood insights, and clear, actionable next steps.
          </p>
        </div>
      </div>

      {/* Trust & Guarantee Footer Bar */}
      <div className="max-w-4xl mx-auto text-center border-t border-slate-200 pt-6 text-xs text-slate-500 font-medium">
        <p>Built with Google GenAI SDK (@google/genai), Cloud Firestore, and Google Cloud Run.</p>
      </div>
    </div>
  );
};
