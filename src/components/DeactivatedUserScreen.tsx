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
  subscribeToUserAppeal,
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
  const [appeal, setAppeal] = useState<DeactivationAppeal | null>(null);
  const [isLoadingAppeal, setIsLoadingAppeal] = useState(true);
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
  const [showAppealForm, setShowAppealForm] = useState(false);

  // Conversation history state for deactivated user
  const [isViewingConversationHistory, setIsViewingConversationHistory] = useState(false);
  const [userEntries, setUserEntries] = useState<JournalEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyTab, setHistoryTab] = useState<"reflections" | "appeal">("reflections");

  // Load conversation history for the deactivated user
  const handleOpenConversationHistory = async () => {
    setIsViewingConversationHistory(true);
    setShowAppealForm(false);
    setIsLoadingEntries(true);
    try {
      const entries = await fetchUserEntriesDirectly(user.uid);
      setUserEntries(entries);
      if (entries.length > 0) {
        setExpandedEntryId(entries[0].id);
      }
    } catch (err) {
      console.warn("Could not load user conversations:", err);
    } finally {
      setIsLoadingEntries(false);
    }
  };

  // Fetch administrator email from backend
  useEffect(() => {
    fetch("/api/admin/info")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.adminEmail) {
          setAdminEmail(data.adminEmail);
        }
      })
      .catch(() => {});
  }, []);

  // Real-time subscription to user's appeal in Firestore
  useEffect(() => {
    if (!user.uid) {
      setIsLoadingAppeal(false);
      return;
    }

    const unsub = subscribeToUserAppeal(
      user.uid,
      (currentAppeal) => {
        setAppeal(currentAppeal);
        setIsLoadingAppeal(false);
      },
      (err) => {
        console.warn("[DeactivatedUserScreen] Appeal subscription error:", err);
        setIsLoadingAppeal(false);
      }
    );

    return () => unsub();
  }, [user.uid]);

  // Submit a new deactivation appeal to Firestore and backend
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

      setAppeal(appealRecord);
      setShowAppealForm(false);
      setSuccessMessage("Your reactivation appeal has been submitted to Firestore and delivered to the administrator.");
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      console.error("Failed to submit appeal:", err);
      setErrorMessage(err.message || "Failed to deliver message. Please try again.");
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  // Submit a follow-up reply in an ongoing conversation
  const handleSendFollowUpReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !appeal) return;

    setIsSendingReply(true);
    setErrorMessage(null);

    try {
      const newReply = await sendUserAppealReply(user, appeal, replyText.trim());
      setAppeal((prev) =>
        prev
          ? {
              ...prev,
              replies: [...(prev.replies || []), newReply],
              updatedAt: Date.now(),
            }
          : null
      );
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

  const mailtoLink = `mailto:${encodeURIComponent(adminEmail)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(
    `User Email: ${user.email || user.uid}\nReason: ${profile?.deactivationReason || "None specified"}\n\n${message}`
  )}`;

  const isApproved = appeal?.status === "approved";
  const isRejected = appeal?.status === "rejected";
  const isReviewed = appeal?.status === "reviewed";
  const isPending = appeal?.status === "pending";

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 shadow-xl overflow-hidden text-left">
        {/* Banner */}
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
          <div className="flex items-center gap-2">
            <button
              id="btn-deactivated-header-history"
              type="button"
              onClick={handleOpenConversationHistory}
              className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer backdrop-blur-xs transition-colors shrink-0 shadow-2xs"
              title="Directly view your conversation history and reflections"
            >
              <History className="w-3.5 h-3.5" />
              <span>Conversation History</span>
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

          {/* Reactivation Celebratory Banner if Approved */}
          {isApproved && (
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

          {/* Loading Indicator */}
          {isLoadingAppeal ? (
            <div className="p-8 text-center space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs text-slate-500">Checking appeal status in Firestore...</p>
            </div>
          ) : appeal && !showAppealForm ? (
            /* ACTIVE APPEAL CONVERSATION VIEW */
            <div className="space-y-6">
              {/* Appeal Header & Status Card */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Appeal Reference #{appeal.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {appeal.subject}
                    </h3>
                  </div>

                  {/* Status Badges */}
                  {isPending && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800">
                      <Clock className="w-3.5 h-3.5" />
                      Pending Administrator Review
                    </span>
                  )}
                  {isReviewed && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Under Active Review
                    </span>
                  )}
                  {isApproved && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approved & Reactivated
                    </span>
                  )}
                  {isRejected && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800">
                      <XCircle className="w-3.5 h-3.5" />
                      Appeal Declined
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span>Submitted: {new Date(appeal.createdAt).toLocaleDateString()} at {new Date(appeal.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {appeal.updatedAt && appeal.updatedAt !== appeal.createdAt && (
                    <span>• Last Activity: {new Date(appeal.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                </div>
              </div>

              {/* Threaded Conversation History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                    Conversation Thread ({1 + (appeal.replies?.length || 0)} messages)
                  </h4>
                  <span className="text-[11px] text-slate-400">Stored in Firestore</span>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {/* Initial Message from User */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {appeal.userName} (You)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                          Original Appeal
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(appeal.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line pl-8">
                      {appeal.message}
                    </p>
                  </div>

                  {/* Threaded Replies */}
                  {appeal.replies?.map((reply) => {
                    const isAdmin = reply.senderRole === "admin" || !reply.senderRole;
                    return (
                      <div
                        key={reply.id}
                        className={`p-4 rounded-2xl border shadow-2xs space-y-2 ${
                          isAdmin
                            ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60"
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
                              {isAdmin ? "Official Response" : "User Follow-up"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                            <span>{new Date(reply.sentAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                            {isAdmin && reply.emailDispatched && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-3 h-3" /> Emailed
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line pl-8 border-l-2 border-indigo-300 dark:border-indigo-700">
                          {reply.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Follow-up Message Reply Box (Enabled unless deactivated user is resolved) */}
              {!isApproved && (
                <form
                  onSubmit={handleSendFollowUpReply}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3"
                >
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Send Follow-up Message to Administrator</span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Add new information, respond to questions, or provide additional documentation for the administrator.
                  </p>
                  <textarea
                    id="textarea-appeal-conversation-reply"
                    rows={3}
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your message to the administrator..."
                    className="w-full p-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 resize-none font-sans"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Messages are recorded in Firestore & alert the administrator.
                    </span>
                    <button
                      type="submit"
                      id="btn-send-appeal-followup"
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
                          <span>Send Message</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Bottom Actions for Existing Appeal */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    id="btn-appeal-view-past-conversations"
                    type="button"
                    onClick={handleOpenConversationHistory}
                    className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-800"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View Conversation History</span>
                  </button>

                  <a
                    href={mailtoLink}
                    id="link-open-mail-client"
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    title="Send an email from your desktop or phone mail app"
                  >
                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Direct Email Admin</span>
                  </a>
                  {isRejected && (
                    <button
                      id="btn-submit-fresh-appeal"
                      onClick={() => setShowAppealForm(true)}
                      className="px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors"
                    >
                      Submit New Appeal
                    </button>
                  )}
                </div>

                <button
                  id="btn-deactivated-sign-out"
                  onClick={onSignOut}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : isViewingConversationHistory ? (
            /* READ-ONLY CONVERSATION HISTORY ARCHIVE VIEW */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Back to notice header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  id="btn-history-back-to-notice"
                  onClick={() => setIsViewingConversationHistory(false)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Back to Account Notice</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
                    Read-Only Conversation Archive
                  </span>
                </div>
              </div>

              {/* Subtitle & Tabs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Your Saved Conversation History</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Access your personal reflection conversations with Gemini even while account access is paused.
                    </p>
                  </div>
                </div>

                {appeal && (
                  <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold pt-2">
                    <button
                      type="button"
                      onClick={() => setHistoryTab("reflections")}
                      className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                        historyTab === "reflections"
                          ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                          : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Journal Reflections</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {userEntries.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryTab("appeal")}
                      className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                        historyTab === "appeal"
                          ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                          : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Appeal Messages</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {1 + (appeal.replies?.length || 0)}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Reflection Conversations Tab */}
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

              {/* Appeal Thread Tab */}
              {historyTab === "appeal" && appeal && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {appeal.userName} (You)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                          Original Appeal
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(appeal.createdAt).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line pl-8">
                      {appeal.message}
                    </p>
                  </div>

                  {appeal.replies?.map((reply) => {
                    const isAdmin = reply.senderRole === "admin" || !reply.senderRole;
                    return (
                      <div
                        key={reply.id}
                        className={`p-4 rounded-2xl border space-y-2 ${
                          isAdmin
                            ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60"
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
                            <span className="font-bold text-slate-900 dark:text-white">
                              {isAdmin ? reply.senderName || "Administrator" : "You (Follow-up)"}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {isAdmin ? "Official Response" : "Follow-up"}
                            </span>
                          </div>
                          <span className="text-slate-400 text-[11px]">
                            {new Date(reply.sentAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line pl-8 border-l-2 border-indigo-300 dark:border-indigo-700">
                          {reply.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom return bar */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  id="btn-bottom-back-to-notice"
                  onClick={() => setIsViewingConversationHistory(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Account Notice</span>
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
          ) : showAppealForm ? (
            /* SUBMIT NEW APPEAL FORM */
            <form onSubmit={handleSubmitAppeal} className="space-y-4 animate-in fade-in duration-200">
              {/* Back Button at top of submit appeal page */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  id="btn-appeal-form-back-top"
                  onClick={() => setShowAppealForm(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Back to Notice</span>
                </button>
                <span className="text-[11px] text-slate-400 font-mono">
                  Recipient: {adminEmail}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    <span>Appeal for Account Reactivation</span>
                  </label>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Provide details to request a review of your account status. Your appeal will be stored in Firestore and dispatched to the administrator.
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
                  className="w-full h-10 px-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 font-medium transition-all"
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
                  className="w-full p-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 resize-none font-sans leading-relaxed transition-all"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  id="btn-send-admin-contact"
                  disabled={isSubmittingAppeal || !message.trim()}
                  className="w-full sm:flex-1 h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmittingAppeal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving & Transmitting Appeal...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Appeal to Administrator</span>
                    </>
                  )}
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

                {/* Back Button in submit appeal page */}
                <button
                  type="button"
                  id="btn-appeal-form-back-bottom"
                  onClick={() => setShowAppealForm(false)}
                  className="w-full sm:w-auto h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Back</span>
                </button>
              </div>
            </form>
          ) : (
            /* DEFAULT FIRST-TIME OPTIONS (NO APPEAL YET) */
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                If you believe this deactivation was performed in error or if you have questions regarding your account status, you can submit an appeal directly to the administrator. You can also view your saved reflection conversation history at any time.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  id="btn-open-contact-admin-form"
                  onClick={() => setShowAppealForm(true)}
                  className="p-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 text-left transition-all group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
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

                <button
                  id="btn-deactivated-view-history-card"
                  type="button"
                  onClick={handleOpenConversationHistory}
                  className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 text-left transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <History className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        View History
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Directly view your past reflection conversations and Gemini chat transcripts.
                    </p>
                  </div>
                </button>

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
                      Launch your desktop or mobile mail app directly.
                    </p>
                  </div>
                </a>
              </div>

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
