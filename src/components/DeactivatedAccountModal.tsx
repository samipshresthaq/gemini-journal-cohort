import React, { useState } from "react";
import {
  ShieldAlert,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  HelpCircle,
  ArrowRight,
  Shield,
  MessageSquare,
} from "lucide-react";
import { AuthUser, UserProfile } from "../types";

interface DeactivatedAccountModalProps {
  isOpen: boolean;
  user: AuthUser;
  profile: UserProfile | null;
  onSignOut: () => void;
  onClose?: () => void;
}

export const DeactivatedAccountModal: React.FC<DeactivatedAccountModalProps> = ({
  isOpen,
  user,
  profile,
  onSignOut,
}) => {
  const [subject, setSubject] = useState("Request for Account Reactivation");
  const [message, setMessage] = useState(
    `Hello Administrator,\n\nMy account (${user.email || user.displayName || user.uid}) has been deactivated. I would like to request a review to reactivate my account so I can continue my reflection journal.\n\nThank you.`
  );
  const [isSending, setIsSending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>("");

  // Fetch administrator contact email
  React.useEffect(() => {
    fetch("/api/admin/info")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.adminEmail) {
          setAdminEmail(data.adminEmail);
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/support/contact-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: user.email || user.uid,
          userName: user.displayName || "Journal User",
          userId: user.uid,
          subject: subject.trim(),
          message: message.trim(),
          deactivationReason: profile?.deactivationReason || "Administrative hold",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to deliver contact request to the administrator.");
      }

      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Failed to contact admin:", err);
      setErrorMessage(err.message || "Failed to deliver message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const mailtoLink = `mailto:${encodeURIComponent(adminEmail)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(
    `User Email: ${user.email || user.uid}\nReason: ${profile?.deactivationReason || "None specified"}\n\n${message}`
  )}`;

  return (
    <div
      id="deactivated-account-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="deactivated-account-card"
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/60 overflow-hidden text-left relative"
      >
        {/* Top Danger Accent Header */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 p-6 text-white text-center sm:text-left relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider mb-1">
                <Shield className="w-3 h-3" /> Account Suspended
              </div>
              <h3 className="text-xl font-black tracking-tight text-white">
                Account Is Deactivated
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                Access to this journal account has been paused by the administrator.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Deactivation Notice Card */}
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-rose-900 dark:text-rose-200 block">
                  Suspension Details:
                </span>
                <p className="text-rose-700 dark:text-rose-300 leading-relaxed">
                  {profile?.deactivationReason ? (
                    <span>&ldquo;{profile.deactivationReason}&rdquo;</span>
                  ) : (
                    "This account has been deactivated as part of routine system maintenance or administrative security review."
                  )}
                </p>
                {profile?.deactivatedAt && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 opacity-90">
                    Effective date: {new Date(profile.deactivatedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* If already submitted */}
          {isSubmitted ? (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 space-y-3 text-center animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Request Dispatched to Administrator
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed max-w-sm mx-auto">
                  Your reactivation appeal has been sent directly to the administrator (<strong className="underline">{adminEmail}</strong>). You will receive an email notification when your account status is updated.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <a
                  href={mailtoLink}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Open in Mail Client</span>
                </a>
                <button
                  onClick={onSignOut}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* Contact Admin Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Contact Administrator for Reactivation</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    To: {adminEmail}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Submit an appeal to request immediate review and reactivation of your journal entries.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Line
                </label>
                <input
                  id="input-contact-admin-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Your Message to Admin
                </label>
                <textarea
                  id="textarea-contact-admin-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Explain why your account should be reviewed or reactivated..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-sans leading-relaxed transition-all"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="submit"
                  id="btn-send-admin-contact"
                  disabled={isSending || !message.trim()}
                  className="w-full sm:flex-1 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Sending Appeal...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Message to Admin</span>
                    </>
                  )}
                </button>

                <a
                  href={mailtoLink}
                  id="link-open-direct-email"
                  className="w-full sm:w-auto h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Open in your default email application"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Direct Email</span>
                </a>

                <button
                  type="button"
                  id="btn-deactivated-signout"
                  onClick={onSignOut}
                  className="w-full sm:w-auto h-10 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
