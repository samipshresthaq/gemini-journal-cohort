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
} from "lucide-react";
import { AuthUser, UserProfile, DeactivationAppeal } from "../types";
import {
  submitDeactivationAppeal,
  sendUserAppealReply,
  subscribeToUserAppeal,
} from "../lib/adminService";

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
                    className="w-full p-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
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
                <div className="flex items-center gap-2">
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
          ) : showAppealForm ? (
            /* SUBMIT NEW APPEAL FORM */
            <form onSubmit={handleSubmitAppeal} className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    <span>Appeal for Account Reactivation</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Recipient: {adminEmail}
                  </span>
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
                  className="w-full h-10 px-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition-all"
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
                  className="w-full p-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-sans leading-relaxed transition-all"
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

                {appeal && (
                  <button
                    type="button"
                    id="btn-deactivated-cancel-form"
                    onClick={() => setShowAppealForm(false)}
                    className="w-full sm:w-auto h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Back to Appeal
                  </button>
                )}
              </div>
            </form>
          ) : (
            /* DEFAULT FIRST-TIME OPTIONS (NO APPEAL YET) */
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                If you believe this deactivation was performed in error or if you have questions regarding your account status, you can submit an appeal directly to the administrator. Your appeal will be stored in Firestore for live tracking.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  id="btn-open-contact-admin-form"
                  onClick={() => setShowAppealForm(true)}
                  className="p-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Submit Appeal in App
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Submit an appeal for account review stored in Firestore and delivered to <span className="font-mono text-indigo-600 dark:text-indigo-400">{adminEmail}</span>.
                  </p>
                </button>

                <a
                  href={mailtoLink}
                  id="link-external-mailto"
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Send Email Client
                        </span>
                      </div>
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
