import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  MessageSquare,
  Shield,
  ExternalLink,
  Clock,
  User,
  ShieldCheck,
  RefreshCw,
  XCircle,
  ArrowLeft,
  History,
  Bot,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { AuthUser, UserProfile, DeactivationAppeal, JournalEntry } from "../types";
import {
  submitDeactivationAppeal,
  sendUserAppealReply,
  subscribeToUserAppealsHistory,
  fetchUserAppealsHistory,
} from "../lib/adminService";
import { fetchUserEntriesDirectly } from "../lib/firestoreService";

interface DeactivatedUserScreenProps {
  user: AuthUser;
  profile: UserProfile | null;
  onSignOut: () => void;
}

export const DeactivatedUserScreen: React.FC<DeactivatedUserScreenProps> = ({
  user,
  profile,
  onSignOut,
}) => {
  // Navigation view mode: "notice" (default), "send-appeal", "history"
  const [viewMode, setViewMode] = useState<"notice" | "send-appeal" | "history">("notice");
  const [historyTab, setHistoryTab] = useState<"appeal" | "reflections">("appeal");
  const [selectedAppealForThread, setSelectedAppealForThread] = useState<DeactivationAppeal | null>(null);

  // Appeals and history state
  const [appealsHistory, setAppealsHistory] = useState<DeactivationAppeal[]>([]);
  const [isLoadingAppeals, setIsLoadingAppeals] = useState(true);

  // Appeal compose form state
  const [subject, setSubject] = useState("Request for Account Reactivation");
  const [message, setMessage] = useState(
    `Hello Administrator,\n\nMy account (${user.email || user.displayName || user.uid}) has been deactivated. I would like to request an administrative review to reactivate my account so I can continue my reflection journal.\n\nThank you.`
  );
  const [replyText, setReplyText] = useState("");
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [supportEmail, setSupportEmail] = useState<string>("");

  // Reflection conversations history
  const [userEntries, setUserEntries] = useState<JournalEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  // Fetch administrator and support email from backend
  useEffect(() => {
    fetch("/api/admin/info")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.supportEmail) {
          setSupportEmail(data.supportEmail);
        }
        if (data?.adminEmail) {
          setAdminEmail(data.adminEmail);
        }
      })
      .catch(() => {});
  }, []);

  // Real-time subscription to user's full appeal history
  useEffect(() => {
    if (!user.uid && !user.email) {
      setIsLoadingAppeals(false);
      return;
    }

    const unsub = subscribeToUserAppealsHistory(
      user.uid,
      user.email || "",
      (history) => {
        setAppealsHistory(history);
        setIsLoadingAppeals(false);
        // Keep selected appeal synchronized with real-time updates
        if (selectedAppealForThread) {
          const fresh = history.find((a) => a.id === selectedAppealForThread.id);
          if (fresh) setSelectedAppealForThread(fresh);
        }
      },
      (err) => {
        console.warn("[DeactivatedUserScreen] Appeals history subscription notice:", err);
        setIsLoadingAppeals(false);
      }
    );

    return () => unsub();
  }, [user.uid, user.email, selectedAppealForThread?.id]);

  // Load reflection conversations when user opens reflections tab
  const handleLoadReflections = async () => {
    if (userEntries.length > 0) return;
    setIsLoadingEntries(true);
    try {
      const entries = await fetchUserEntriesDirectly(user.uid);
      setUserEntries(entries);
      if (entries.length > 0) {
        setExpandedEntryId(entries[0].id);
      }
    } catch (err) {
      console.warn("[DeactivatedUserScreen] Could not load user reflections:", err);
    } finally {
      setIsLoadingEntries(false);
    }
  };

  // Submit a new deactivation appeal
  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmittingAppeal(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const appealRecord = await submitDeactivationAppeal({
        userId: user.uid,
        userEmail: user.email || user.uid,
        userName: user.displayName || user.email?.split("@")[0] || "Journal Writer",
        subject: subject.trim(),
        message: message.trim(),
        deactivationReason: profile?.deactivationReason || "Administrative hold",
      });

      setAppealsHistory((prev) => [appealRecord, ...prev.filter((a) => a.id !== appealRecord.id)]);
      setSelectedAppealForThread(appealRecord);
      setViewMode("history");
      setHistoryTab("appeal");
      setSuccessMessage("Your reactivation appeal has been submitted to Firestore and delivered to the administrator.");
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      console.error("Failed to submit appeal:", err);
      setErrorMessage(err.message || "Failed to deliver message. Please try again.");
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  // Submit a follow-up reply in an appeal thread
  const handleSendFollowUpReply = async (e: React.FormEvent, targetAppeal: DeactivationAppeal) => {
    e.preventDefault();
    if (!replyText.trim() || !targetAppeal) return;

    setIsSendingReply(true);
    setErrorMessage(null);

    try {
      const newReply = await sendUserAppealReply(user, targetAppeal, replyText.trim());
      const updatedReplies = [...(targetAppeal.replies || []), newReply];
      const updatedAppeal: DeactivationAppeal = {
        ...targetAppeal,
        replies: updatedReplies,
        updatedAt: Date.now(),
      };

      setAppealsHistory((prev) =>
        prev.map((a) => (a.id === targetAppeal.id ? updatedAppeal : a))
      );
      setSelectedAppealForThread(updatedAppeal);
      setReplyText("");
      setSuccessMessage("Your reply has been sent to the administrator.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error("Failed to post follow-up reply:", err);
      setErrorMessage(err.message || "Failed to deliver message. Please try again.");
    } finally {
      setIsSendingReply(false);
    }
  };

  // Restriction and reactivation evaluation logic
  const isCurrentlyDeactivated =
    profile?.status === "deactivated" || user?.status === "deactivated";
  const deactivationTimestamp = profile?.deactivatedAt || (user as any)?.deactivatedAt || 0;

  /**
   * Evaluates if a given appeal's approval is invalid because the user was subsequently restricted.
   * "Show the account is reactivated message only if the user has not been recently restricted.
   * Even if the user was reactivated before but currently deactivated, the message is not valid."
   */
  const isAppealInvalidDueToRecentRestriction = (app: DeactivationAppeal | null | undefined): boolean => {
    if (!app) return false;
    if (!isCurrentlyDeactivated) return false;

    const reviewTime = app.reviewedAt || app.updatedAt || 0;
    const createdTime = app.createdAt || 0;

    // 1. If user has a deactivation timestamp:
    if (deactivationTimestamp > 0) {
      // If deactivation happened at or after the appeal was reviewed/approved or created:
      // This means the user was restricted again AFTER this appeal was resolved!
      if (deactivationTimestamp >= reviewTime || deactivationTimestamp > createdTime) {
        return true;
      }
    }

    // 2. If currently deactivated, and appeal was marked approved in the past without a recent review after deactivation:
    if (app.status === "approved") {
      if (deactivationTimestamp > 0 && reviewTime <= deactivationTimestamp) {
        return true;
      }
      // If deactivation timestamp is not recorded, but user is currently deactivated and appeal was reviewed earlier
      if (reviewTime === 0 || reviewTime < Date.now() - 30000) {
        return true;
      }
    }

    return false;
  };

  // Find the appeal relevant to the current administrative hold (if any)
  const currentHoldAppeal = appealsHistory.find((a) => {
    if (deactivationTimestamp > 0) {
      return a.createdAt >= deactivationTimestamp;
    }
    return a.status === "pending" || a.status === "reviewed";
  }) || null;

  // The latest appeal on record
  const latestAppeal = appealsHistory.length > 0 ? appealsHistory[0] : null;

  // Check if any past appeal was approved in a previous restriction cycle
  const hasPreviouslyApprovedAppeal = appealsHistory.some((a) => a.status === "approved");

  /**
   * Strict validation for celebratory "Account Reactivated!" banner:
   * 1. Must have an appeal with status === "approved"
   * 2. Must NOT be recently restricted after the approval
   * 3. Even if reactivated before, if currently deactivated, the message is INVALID.
   */
  const isReactivationMessageValid: boolean = Boolean(
    latestAppeal &&
    latestAppeal.status === "approved" &&
    !isAppealInvalidDueToRecentRestriction(latestAppeal) &&
    (deactivationTimestamp === 0 || (latestAppeal.reviewedAt && latestAppeal.reviewedAt > deactivationTimestamp))
  );

  const contactEmail = supportEmail || adminEmail;
  const mailtoLink = `mailto:${encodeURIComponent(contactEmail)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(
    `User Email: ${user.email || user.uid}\nReason: ${profile?.deactivationReason || "None specified"}\n\n${message}`
  )}`;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 shadow-xl overflow-hidden text-left">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 p-6 sm:p-7 text-white flex flex-col sm:flex-row items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider mb-1">
              <Shield className="w-3 h-3" /> Account Suspended
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Account Deactivation Notice
            </h2>
            <p className="text-xs sm:text-sm text-rose-100 mt-0.5">
              Access to this journal account has been paused by the system administrator.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
            <button
              id="btn-deactivated-header-history"
              type="button"
              onClick={() => {
                setSelectedAppealForThread(null);
                setViewMode("history");
                setHistoryTab("appeal");
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer backdrop-blur-xs transition-colors shrink-0 shadow-2xs ${
                viewMode === "history"
                  ? "bg-white text-rose-700 font-bold shadow-sm"
                  : "bg-white/20 hover:bg-white/30 text-white"
              }`}
              title="View your past appeals and reflection history"
            >
              <History className="w-3.5 h-3.5" />
              <span>Past Appeal History</span>
              {appealsHistory.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/30 text-white font-bold ml-0.5">
                  {appealsHistory.length}
                </span>
              )}
            </button>
            <button
              id="btn-deactivated-header-send-appeal"
              type="button"
              onClick={() => {
                setSelectedAppealForThread(null);
                setViewMode("send-appeal");
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer backdrop-blur-xs transition-colors shrink-0 ${
                viewMode === "send-appeal"
                  ? "bg-white text-rose-700 font-bold shadow-sm"
                  : "bg-white/20 hover:bg-white/30 text-white"
              }`}
              title="Submit a reactivation appeal to the administrator"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Appeal</span>
            </button>
            <button
              id="btn-deactivated-header-signout"
              onClick={onSignOut}
              className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer backdrop-blur-xs transition-colors shrink-0"
              title="Sign out of current account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Suspension Reason Notice */}
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-rose-900 dark:text-rose-200 block">
                  Deactivation Reason & Details:
                </span>
                <p className="text-rose-700 dark:text-rose-300 leading-relaxed">
                  {profile?.deactivationReason ? (
                    <span>&ldquo;{profile.deactivationReason}&rdquo;</span>
                  ) : (
                    "This account was suspended as part of routine system maintenance or administrative review."
                  )}
                </p>
                <div className="text-[11px] text-rose-600 dark:text-rose-400 opacity-90 pt-0.5">
                  Account: <strong>{user.email || user.uid}</strong>
                  {profile?.deactivatedAt && ` • Deactivated on: ${new Date(profile.deactivatedAt).toLocaleDateString()}`}
                </div>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Reactivation Celebratory Banner ONLY IF valid (approved & NOT recently restricted) */}
          {isReactivationMessageValid && (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-300 dark:border-emerald-700 space-y-3 text-center animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                  Appeal Approved & Account Reactivated!
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed max-w-md mx-auto">
                  Your reactivation appeal has been reviewed and approved by the system administrator. You can now refresh your session to return to your personal reflections.
                </p>
              </div>
              <div className="pt-2 flex justify-center">
                <button
                  id="btn-reactivated-refresh-app"
                  onClick={() => window.location.reload()}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh & Enter Journal</span>
                </button>
              </div>
            </div>
          )}

          {/* If the user was reactivated before but is currently deactivated: explicit helpful clarification */}
          {isCurrentlyDeactivated && hasPreviouslyApprovedAppeal && !isReactivationMessageValid && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Notice on Prior Appeals & Recent Account Restriction</span>
              </div>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                Although an appeal was approved in a past session, your account is currently under a new administrative restriction
                {profile?.deactivatedAt ? ` (effective ${new Date(profile.deactivatedAt).toLocaleDateString()})` : ""}.
                Previous approvals do not apply to this restriction. You can view your past appeal history or submit a new appeal below.
              </p>
              <div className="pt-1 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  id="btn-prior-appeal-send-new"
                  onClick={() => setViewMode("send-appeal")}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Send className="w-3 h-3" />
                  <span>Submit New Appeal for Current Restriction</span>
                </button>
                <button
                  type="button"
                  id="btn-prior-appeal-view-history"
                  onClick={() => {
                    setSelectedAppealForThread(null);
                    setViewMode("history");
                    setHistoryTab("appeal");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-100/50 dark:hover:bg-slate-750 text-amber-900 dark:text-amber-200 text-xs font-semibold border border-amber-300 dark:border-amber-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <History className="w-3 h-3" />
                  <span>View Past Appeal History</span>
                </button>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoadingAppeals ? (
            <div className="p-8 text-center space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs text-slate-500">Checking appeal history in Firestore...</p>
            </div>
          ) : viewMode === "send-appeal" ? (
            /* ========================================================================= */
            /* PAGE 1: SEND APPEAL FORM PAGE (with Back button & Appeal History nav)     */
            /* ========================================================================= */
            <form onSubmit={handleSubmitAppeal} className="space-y-5 animate-in fade-in duration-200">
              {/* Top Navigation Bar with Back Button and View Past Appeals shortcut */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-2">
                <button
                  type="button"
                  id="btn-send-appeal-back-top"
                  onClick={() => setViewMode("notice")}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  title="Return to the Account Notice page"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Back to Notice</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-send-appeal-to-history"
                    onClick={() => {
                      setSelectedAppealForThread(null);
                      setViewMode("history");
                      setHistoryTab("appeal");
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                    title="View your past appeals and responses"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View Past Appeal History</span>
                    {appealsHistory.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 font-bold ml-1">
                        {appealsHistory.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Form Header */}
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Submit Reactivation Appeal</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Provide details to request an administrative review of your account status. Your appeal will be stored securely in Firestore and delivered to system administrators.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Line
                </label>
                <input
                  id="input-contact-admin-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Your Message to Administrator
                </label>
                <textarea
                  id="textarea-contact-admin-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Explain why your account should be reviewed or reactivated..."
                  className="w-full p-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans leading-relaxed transition-all"
                />
              </div>

              {/* Bottom Actions with Back Button & Appeal History Nav */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  id="btn-send-admin-contact"
                  disabled={isSubmittingAppeal || !message.trim()}
                  className="w-full sm:flex-1 h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmittingAppeal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Transmitting Appeal...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Appeal to Administrator</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-send-appeal-back-bottom"
                  onClick={() => setViewMode("notice")}
                  className="w-full sm:w-auto h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  id="btn-send-appeal-bottom-to-history"
                  onClick={() => {
                    setSelectedAppealForThread(null);
                    setViewMode("history");
                    setHistoryTab("appeal");
                  }}
                  className="w-full sm:w-auto h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="View past appeal history"
                >
                  <History className="w-4 h-4 text-indigo-500" />
                  <span>Past Appeals</span>
                </button>

                <a
                  href={mailtoLink}
                  id="link-open-email-app"
                  className="w-full sm:w-auto h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Open in your system email client"
                >
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span>Direct Mail</span>
                </a>
              </div>
            </form>
          ) : viewMode === "history" ? (
            /* ========================================================================= */
            /* PAGE 2: PAST APPEAL HISTORY & CONVERSATION HISTORY (with Back button)     */
            /* ========================================================================= */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Top Bar with Back Button & Send Appeal Shortcut */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-2">
                <button
                  type="button"
                  id="btn-history-back-top"
                  onClick={() => {
                    if (selectedAppealForThread) {
                      setSelectedAppealForThread(null);
                    } else {
                      setViewMode("notice");
                    }
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  title="Return to the Account Notice"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>{selectedAppealForThread ? "Back to Appeal List" : "Back to Account Notice"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-history-to-send-appeal"
                    onClick={() => {
                      setSelectedAppealForThread(null);
                      setViewMode("send-appeal");
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    title="Compose and send an appeal"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send New Appeal</span>
                  </button>
                </div>
              </div>

              {/* Thread Detail View if a specific appeal is selected */}
              {selectedAppealForThread ? (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Appeal Header & Status Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Appeal Reference #{selectedAppealForThread.id}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {selectedAppealForThread.subject}
                        </h4>
                      </div>

                      {/* Status badge with recent restriction check */}
                      {selectedAppealForThread.status === "approved" ? (
                        isAppealInvalidDueToRecentRestriction(selectedAppealForThread) ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            Previously Approved (Past Hold)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approved & Reactivated
                          </span>
                        )
                      ) : selectedAppealForThread.status === "rejected" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800">
                          <XCircle className="w-3.5 h-3.5" />
                          Appeal Declined
                        </span>
                      ) : selectedAppealForThread.status === "reviewed" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Under Active Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3.5 h-3.5" />
                          Pending Review
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex-wrap">
                      <span>Submitted: {new Date(selectedAppealForThread.createdAt).toLocaleDateString()} at {new Date(selectedAppealForThread.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {selectedAppealForThread.updatedAt && selectedAppealForThread.updatedAt !== selectedAppealForThread.createdAt && (
                        <span>• Last Updated: {new Date(selectedAppealForThread.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                    </div>

                    {isAppealInvalidDueToRecentRestriction(selectedAppealForThread) && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60">
                        This appeal was resolved during a previous session. Because your account was subsequently restricted, this approval is no longer valid for your current status.
                      </div>
                    )}
                  </div>

                  {/* Message Thread */}
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {/* User's Original Appeal */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {selectedAppealForThread.userName} (You)
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                            Original Appeal
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(selectedAppealForThread.createdAt).toLocaleString([], {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line pl-8">
                        {selectedAppealForThread.message}
                      </p>
                    </div>

                    {/* Replies */}
                    {selectedAppealForThread.replies && selectedAppealForThread.replies.length > 0 ? (
                      selectedAppealForThread.replies.map((reply) => {
                        const isAdmin = reply.senderRole === "admin" || !reply.senderRole;
                        return (
                          <div
                            key={reply.id}
                            className={`p-4 rounded-2xl border shadow-2xs space-y-2 ${
                              isAdmin
                                ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                    isAdmin
                                      ? "bg-indigo-600 text-white shadow-xs"
                                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                  }`}
                                >
                                  {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                                </div>
                                <span
                                  className={`font-bold ${
                                    isAdmin
                                      ? "text-indigo-950 dark:text-indigo-200"
                                      : "text-slate-900 dark:text-white"
                                  }`}
                                >
                                  {isAdmin ? reply.senderName || "Administrator" : "You (Follow-up)"}
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    isAdmin
                                      ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300"
                                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                  }`}
                                >
                                  {isAdmin ? "Official Response" : "Follow-up"}
                                </span>
                              </div>

                              <span className="text-slate-400 text-[11px]">
                                {new Date(reply.sentAt).toLocaleString([], {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                            </div>

                            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line pl-8 border-l-2 border-indigo-300 dark:border-indigo-700">
                              {reply.message}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-5 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                        <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Awaiting response from administrator
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Any replies from administrators will appear here in real time.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Follow-up reply input */}
                  {selectedAppealForThread.status !== "approved" && (
                    <form
                      onSubmit={(e) => handleSendFollowUpReply(e, selectedAppealForThread)}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3"
                    >
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Reply in Thread</span>
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type a follow-up reply for this appeal..."
                        className="w-full p-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400">
                          Replies sync with administrators immediately.
                        </span>
                        <button
                          type="submit"
                          disabled={isSendingReply || !replyText.trim()}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {isSendingReply ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Send Reply</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Bottom Return Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <button
                      type="button"
                      id="btn-thread-back-bottom"
                      onClick={() => setSelectedAppealForThread(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Appeal List</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="btn-thread-to-send-appeal"
                        onClick={() => {
                          setSelectedAppealForThread(null);
                          setViewMode("send-appeal");
                        }}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit New Appeal</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Appeal History Overview (Tabs: Appeals vs Reflections) */
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Account History & Records</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        View previous appeals submitted to administrators and your past reflection transcripts.
                      </p>
                    </div>
                  </div>

                  {/* Tab switchers */}
                  <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold pt-1">
                    <button
                      type="button"
                      id="tab-btn-appeals-history"
                      onClick={() => setHistoryTab("appeal")}
                      className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                        historyTab === "appeal"
                          ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                          : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Past Appeals</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                        {appealsHistory.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      id="tab-btn-reflections-history"
                      onClick={() => {
                        setHistoryTab("reflections");
                        handleLoadReflections();
                      }}
                      className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                        historyTab === "reflections"
                          ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                          : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Journal Reflections</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        {userEntries.length}
                      </span>
                    </button>
                  </div>

                  {/* Tab 1: Past Appeals */}
                  {historyTab === "appeal" && (
                    <div className="space-y-3">
                      {appealsHistory.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                          <ShieldAlert className="w-8 h-8 text-indigo-500 mx-auto" />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              No Past Appeals Found
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                              You haven't submitted any account reactivation appeals yet.
                            </p>
                          </div>
                          <button
                            type="button"
                            id="btn-empty-history-send-appeal"
                            onClick={() => setViewMode("send-appeal")}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit Your First Appeal</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {appealsHistory.map((app) => {
                            const isOldAndInvalid = isAppealInvalidDueToRecentRestriction(app);
                            const replyCount = app.replies?.length || 0;

                            return (
                              <div
                                key={app.id}
                                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 shadow-2xs space-y-3"
                              >
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                                        {app.subject}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        Ref #{app.id}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      Submitted: {new Date(app.createdAt).toLocaleDateString()} at {new Date(app.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                  </div>

                                  {/* Status badge */}
                                  <div>
                                    {app.status === "approved" ? (
                                      isOldAndInvalid ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-600">
                                          <Clock className="w-3 h-3 text-slate-500" />
                                          Previously Approved (Past Hold)
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                                          <CheckCircle2 className="w-3 h-3" />
                                          Approved & Reactivated
                                        </span>
                                      )
                                    ) : app.status === "rejected" ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800">
                                        <XCircle className="w-3 h-3" />
                                        Appeal Declined
                                      </span>
                                    ) : app.status === "reviewed" ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                                        <ShieldCheck className="w-3 h-3" />
                                        Under Review
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800">
                                        <Clock className="w-3 h-3" />
                                        Pending Review
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                  {app.message}
                                </p>

                                {isOldAndInvalid && (
                                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                                    Note: This appeal was approved prior to your recent restriction. If currently deactivated, please submit a new appeal.
                                  </p>
                                )}

                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[11px] text-slate-400">
                                    {replyCount > 0
                                      ? `${replyCount} administrator ${replyCount === 1 ? "reply" : "replies"}`
                                      : "No replies yet"}
                                  </span>

                                  <button
                                    type="button"
                                    id={`btn-view-thread-${app.id}`}
                                    onClick={() => setSelectedAppealForThread(app)}
                                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>View Thread & Replies</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Journal Reflections */}
                  {historyTab === "reflections" && (
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={historySearchQuery}
                          onChange={(e) => setHistorySearchQuery(e.target.value)}
                          placeholder="Search conversations by topic, prompt, or Gemini response..."
                          className="w-full h-10 pl-10 pr-4 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {isLoadingEntries ? (
                        <div className="p-10 text-center space-y-2">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                          <p className="text-xs text-slate-500">Loading reflection conversations...</p>
                        </div>
                      ) : userEntries.length === 0 ? (
                        <div className="p-8 text-center space-y-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                          <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                            No previous journal reflection conversations were found for this account.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {userEntries
                            .filter((entry) => {
                              if (!historySearchQuery.trim()) return true;
                              const q = historySearchQuery.toLowerCase();
                              return (
                                entry.title.toLowerCase().includes(q) ||
                                (entry.topic && entry.topic.toLowerCase().includes(q)) ||
                                entry.messages?.some((m) => m.content.toLowerCase().includes(q))
                              );
                            })
                            .map((entry) => {
                              const isExpanded = expandedEntryId === entry.id;
                              return (
                                <div
                                  key={entry.id}
                                  className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 overflow-hidden shadow-2xs"
                                >
                                  <button
                                    type="button"
                                    onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                                  >
                                    <div className="space-y-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                          {entry.title}
                                        </span>
                                        {entry.topic && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                                            {entry.topic}
                                          </span>
                                        )}
                                        {entry.mood && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                                            Mood: {entry.mood}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                        <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{entry.messages?.length || 0} messages with Gemini</span>
                                      </div>
                                    </div>
                                    <div className="text-slate-400 shrink-0">
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4" />
                                      )}
                                    </div>
                                  </button>

                                  {isExpanded && (
                                    <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-700/60 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                                      {entry.summary && (
                                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 mt-3">
                                          <strong>AI Reflection Summary:</strong> {entry.summary.keyTakeaways?.join(" • ") || entry.summary.overview}
                                        </div>
                                      )}

                                      <div className="space-y-3 pt-3 max-h-[360px] overflow-y-auto pr-1">
                                        {entry.messages && entry.messages.length > 0 ? (
                                          entry.messages.map((msg) => {
                                            const isUser = msg.role === "user";
                                            return (
                                              <div
                                                key={msg.id}
                                                className={`flex gap-3 text-xs ${
                                                  isUser ? "justify-end" : "justify-start"
                                                }`}
                                              >
                                                {!isUser && (
                                                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                                                    <Bot className="w-4 h-4" />
                                                  </div>
                                                )}
                                                <div
                                                  className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                                                    isUser
                                                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-tr-xs"
                                                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-xs shadow-2xs"
                                                  }`}
                                                >
                                                  <p className="whitespace-pre-line">{msg.content}</p>
                                                  <span
                                                    className={`block text-[10px] mt-1.5 opacity-60 ${
                                                      isUser ? "text-right" : "text-left"
                                                    }`}
                                                  >
                                                    {new Date(msg.timestamp).toLocaleTimeString([], {
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                    })}
                                                  </span>
                                                </div>
                                                {isUser && (
                                                  <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                                                    <User className="w-4 h-4" />
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <p className="text-xs text-slate-400 text-center py-2">
                                            No messages in this entry.
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bottom return bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <button
                      type="button"
                      id="btn-history-back-bottom"
                      onClick={() => setViewMode("notice")}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Account Notice</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="btn-history-bottom-send-appeal"
                        onClick={() => setViewMode("send-appeal")}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit New Appeal</span>
                      </button>

                      <button
                        type="button"
                        id="btn-history-sign-out"
                        onClick={onSignOut}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* PAGE 3: DEFAULT ACCOUNT NOTICE SCREEN                                     */
            /* ========================================================================= */
            <div className="space-y-6 animate-in fade-in duration-200">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                If you believe this deactivation was performed in error or if you have questions regarding your account status, you can submit an appeal directly to the administrator. You can also view your full past appeal history and saved reflection conversations at any time.
              </p>

              {/* If there is an active appeal for the current hold, show quick status banner */}
              {currentHoldAppeal && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        Active Appeal Pending Review
                      </span>
                    </div>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                      Ref #{currentHoldAppeal.id}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-800 dark:text-indigo-300">
                    &ldquo;{currentHoldAppeal.subject}&rdquo; &bull; Submitted {new Date(currentHoldAppeal.createdAt).toLocaleDateString()}
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      id="btn-view-current-active-appeal"
                      onClick={() => {
                        setSelectedAppealForThread(currentHoldAppeal);
                        setViewMode("history");
                        setHistoryTab("appeal");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>View Appeal Thread & Replies</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* 1. Send Appeal Button */}
                <button
                  type="button"
                  id="btn-open-contact-admin-form"
                  onClick={() => setViewMode("send-appeal")}
                  className="p-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 text-left transition-all group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Send className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Submit Appeal
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Submit an appeal for account review stored in Firestore and delivered to admin.
                    </p>
                  </div>
                </button>

                {/* 2. View Past Appeal History */}
                <button
                  type="button"
                  id="btn-open-appeal-history"
                  onClick={() => {
                    setSelectedAppealForThread(null);
                    setViewMode("history");
                    setHistoryTab("appeal");
                  }}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                        <History className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Past Appeal History
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Browse all past appeals, review statuses, and administrator follow-ups.
                    </p>
                  </div>
                </button>

                {/* 3. External Direct Email Client */}
                <a
                  href={mailtoLink}
                  id="link-external-mailto"
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Email Client
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Launch your desktop or mobile email application directly.
                    </p>
                  </div>
                </a>
              </div>

              {/* Bottom Sign Out Bar */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Ready to switch accounts?
                </span>
                <button
                  id="btn-deactivated-sign-out"
                  onClick={onSignOut}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
