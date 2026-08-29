import React, { useState, useEffect } from "react";
import { 
  X, 
  Sparkles, 
  Mail, 
  Lock, 
  User as UserIcon, 
  KeyRound, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Lock as LockIcon
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  onSignInWithGoogle: () => Promise<void>;
  onSignInWithEmail: (email: string, pass: string) => Promise<void>;
  onSignUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  title = "Sign In to Unlock All Features",
  description = "Guest mode allows up to 2 basic conversations. Sign in with an account to unlock growth summaries, voice dictation, cloud synchronization, and unlimited history.",
  onSignInWithGoogle,
  onSignInWithEmail,
  onSignUpWithEmail,
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  const handleGoogleClick = async () => {
    setIsLoadingGoogle(true);
    setAuthError(null);
    try {
      await onSignInWithGoogle();
      onClose();
    } catch (err: any) {
      if (
        err?.code === "auth/popup-closed-by-user" || 
        err?.code === "auth/cancelled-popup-request"
      ) {
        // User closed or cancelled the popup
        setIsLoadingGoogle(false);
        return;
      }
      if (err?.code === "auth/popup-blocked") {
        setAuthError("Popup blocked by browser. Please allow popups or use Email sign in below.");
      } else {
        setAuthError(err?.message || "Google sign-in could not be completed.");
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmittingEmail(true);
    setAuthError(null);
    try {
      if (isRegistering) {
        await onSignUpWithEmail(email, password, displayName.trim() || undefined);
      } else {
        await onSignInWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      let msg = err?.message || "Authentication failed.";
      if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password") {
        msg = "Invalid email or password.";
      } else if (err?.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists.";
      } else if (err?.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      }
      setAuthError(msg);
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  return (
    <div
      id="auth-upgrade-modal-backdrop"
      className="fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto transition-all duration-300"
      onClick={onClose}
    >
      <div
        id="auth-upgrade-modal-card"
        className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 text-left relative animate-in fade-in zoom-in-95 duration-200 my-8 ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="btn-close-auth-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2 pr-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <LockIcon className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-full border border-indigo-100">
              Account Required
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Single Unified Container: Google + Email */}
        <div className="space-y-4 pt-1">
          {/* Google Sign-In */}
          <button
            id="btn-modal-google-sign-in"
            onClick={handleGoogleClick}
            disabled={isLoadingGoogle || isSubmittingEmail}
            className="w-full h-11 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-70 cursor-pointer"
          >
            {isLoadingGoogle ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                <span>Connecting with Google...</span>
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
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 ml-auto" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative flex py-0.5 items-center">
            <div className="grow border-t border-slate-200"></div>
            <span className="shrink mx-3 text-slate-400 text-[11px] font-medium uppercase tracking-wider">
              or with email
            </span>
            <div className="grow border-t border-slate-200"></div>
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="input-modal-auth-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Parker"
                    className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="input-modal-auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="input-modal-auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-modal-submit-email"
              disabled={isSubmittingEmail || isLoadingGoogle}
              className="w-full h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer mt-1"
            >
              {isSubmittingEmail ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-200" />
                  <span>{isRegistering ? "Creating Account..." : "Signing In..."}</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5 text-indigo-200" />
                  <span>{isRegistering ? "Create Free Account" : "Sign In with Email"}</span>
                </>
              )}
            </button>

            {/* Toggle sign in / register */}
            <div className="pt-1 text-center text-xs text-slate-500">
              {isRegistering ? (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    id="btn-modal-toggle-signin"
                    onClick={() => {
                      setIsRegistering(false);
                      setAuthError(null);
                    }}
                    className="text-indigo-600 hover:text-indigo-700 font-semibold underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              ) : (
                <p>
                  Need an account?{" "}
                  <button
                    type="button"
                    id="btn-modal-toggle-register"
                    onClick={() => {
                      setIsRegistering(true);
                      setAuthError(null);
                    }}
                    className="text-indigo-600 hover:text-indigo-700 font-semibold underline cursor-pointer"
                  >
                    Create Account
                  </button>
                </p>
              )}
            </div>
          </form>

          {/* Error Banner */}
          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}
        </div>

        {/* Benefits list */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs text-slate-600">
          <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
            With a Free Account:
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Unlimited conversations</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>AI Growth Summaries</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Hands-free Voice Input</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Cloud Firestore Backup</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
