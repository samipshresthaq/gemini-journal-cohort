import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Send,
  Trash2,
  Eye,
  Mail,
  Check,
  Copy,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { AuthUser, DeactivationAppeal, AppealStatus, UserProfile, AppealReply } from "../../types";
import {
  updateAppealStatus,
  replyToAppeal,
  deleteAppeal,
  fetchAppealById,
} from "../../lib/adminService";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebase";

interface AdminAppealDetailProps {
  currentUser: AuthUser;
  appeal: DeactivationAppeal;
  liveUsers?: UserProfile[];
  onBackToList: () => void;
  onNavigateToUsers?: (filterUserEmail?: string) => void;
  onAppealUpdated?: (updated: DeactivationAppeal) => void;
  onAppealDeleted?: (appealId: string) => void;
}

const QUICK_REPLY_TEMPLATES = [
  {
    label: "Approval & Reactivation Notice",
    text: (userName: string) =>
      `Hello ${userName},\n\nWe have carefully reviewed your appeal and are pleased to inform you that your account has been approved and reactivated. You may now log in to the Gemini Reflection Journal and resume your entries.\n\nBest regards,\nGemini Journal Administration`,
  },
  {
    label: "Request Additional Information",
    text: (userName: string) =>
      `Hello ${userName},\n\nThank you for reaching out regarding your account status. To assist us in evaluating your appeal, could you please provide any additional context or clarification regarding recent activity on your account?\n\nWe look forward to your response.\n\nBest regards,\nGemini Journal Administration`,
  },
  {
    label: "Under Detailed Review",
    text: (userName: string) =>
      `Hello ${userName},\n\nYour appeal is currently under detailed review by our administration team. We will inspect the security logs and reach back out to you as soon as a final determination has been made.\n\nThank you for your patience,\nGemini Journal Administration`,
  },
  {
    label: "Appeal Denial Notice",
    text: (userName: string) =>
      `Hello ${userName},\n\nAfter reviewing your account history and the details of your appeal, our administration team has determined that the account deactivation must remain in effect in accordance with our terms of service.\n\nRespectfully,\nGemini Journal Administration`,
  },
];

export const AdminAppealDetail: React.FC<AdminAppealDetailProps> = ({
  currentUser,
  appeal: initialAppeal,
  liveUsers = [],
  onBackToList,
  onNavigateToUsers,
  onAppealUpdated,
  onAppealDeleted,
}) => {
  const [appeal, setAppeal] = useState<DeactivationAppeal>(initialAppeal);
  const [replyInput, setReplyInput] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [feedbackToast, setFeedbackToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Subscribe to real-time updates for this specific appeal document
  useEffect(() => {
    if (!appeal.id) return;

    // Only attach live Firestore snapshot if authenticated in Firebase Auth
    if (!auth.currentUser) return;

    try {
      const appealRef = doc(db, "appeals", appeal.id);
      const unsub = onSnapshot(
        appealRef,
        (snap) => {
          if (snap.exists()) {
            const updated = { ...snap.data(), id: snap.id } as DeactivationAppeal;
            setAppeal(updated);
            onAppealUpdated?.(updated);
          }
        },
        (err) => {
          console.warn("[AdminAppealDetail] Appeal stream notice:", err.message);
        }
      );
      return () => unsub();
    } catch (err: any) {
      console.warn("[AdminAppealDetail] Live listener setup notice:", err?.message);
    }
  }, [appeal.id, onAppealUpdated]);

  const showToast = (type: "success" | "error", message: string) => {
    setFeedbackToast({ type, message });
    setTimeout(() => setFeedbackToast(null), 4500);
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Find matching user from live user directory
  const matchedUser = liveUsers.find(
    (u) =>
      u.uid === appeal.userId ||
      u.email.toLowerCase() === appeal.userEmail.toLowerCase()
  );

  const isPending = appeal.status === "pending";
  const isApproved = appeal.status === "approved";
  const isRejected = appeal.status === "rejected";
  const isReviewed = appeal.status === "reviewed";

  // Action: Approve & Reactivate User
  const handleApproveAndReactivate = async () => {
    setIsProcessingAction(true);
    try {
      const note = "Appeal reviewed and approved. Account reactivated by administrator.";
      await updateAppealStatus(currentUser, appeal, "approved", note);
      
      const updated: DeactivationAppeal = {
        ...appeal,
        status: "approved",
        adminNotes: note,
        reviewedBy: currentUser.email || currentUser.displayName || "Admin",
        reviewedAt: Date.now(),
        updatedAt: Date.now(),
      };
      setAppeal(updated);
      onAppealUpdated?.(updated);

      showToast(
        "success",
        `Account reactivated! A reactivation confirmation email has been dispatched to ${appeal.userEmail}.`
      );
    } catch (err: any) {
      showToast("error", err?.message || "Failed to approve appeal and reactivate user.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Action: Reject Appeal
  const handleRejectAppeal = async () => {
    setIsProcessingAction(true);
    try {
      const note = rejectReason.trim() || "Appeal reviewed. Account deactivation sustained.";
      await updateAppealStatus(currentUser, appeal, "rejected", note);

      const updated: DeactivationAppeal = {
        ...appeal,
        status: "rejected",
        adminNotes: note,
        reviewedBy: currentUser.email || currentUser.displayName || "Admin",
        reviewedAt: Date.now(),
        updatedAt: Date.now(),
      };
      setAppeal(updated);
      onAppealUpdated?.(updated);
      setShowRejectModal(false);

      showToast("success", `Appeal marked as rejected.`);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to reject appeal.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Action: Mark as Reviewed
  const handleMarkReviewed = async () => {
    setIsProcessingAction(true);
    try {
      const note = "Appeal acknowledged and placed in review.";
      await updateAppealStatus(currentUser, appeal, "reviewed", note);

      const updated: DeactivationAppeal = {
        ...appeal,
        status: "reviewed",
        adminNotes: note,
        reviewedBy: currentUser.email || currentUser.displayName || "Admin",
        reviewedAt: Date.now(),
        updatedAt: Date.now(),
      };
      setAppeal(updated);
      onAppealUpdated?.(updated);

      showToast("success", `Appeal marked as under review.`);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update appeal status.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Action: Delete Appeal
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this appeal record? This action cannot be undone.")) {
      return;
    }
    setIsProcessingAction(true);
    try {
      await deleteAppeal(appeal.id);
      showToast("success", "Appeal record permanently deleted.");
      onAppealDeleted?.(appeal.id);
      onBackToList();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to delete appeal.");
      setIsProcessingAction(false);
    }
  };

  // Action: Send Reply to User via Email
  const handleSendReply = async () => {
    if (!replyInput.trim()) return;
    setIsSendingReply(true);
    try {
      const newReply = await replyToAppeal(currentUser, appeal, replyInput.trim());

      const updatedReplies = [...(appeal.replies || []), newReply];
      const updated: DeactivationAppeal = {
        ...appeal,
        replies: updatedReplies,
        status: appeal.status === "pending" ? "reviewed" : appeal.status,
        updatedAt: Date.now(),
      };
      setAppeal(updated);
      onAppealUpdated?.(updated);
      setReplyInput("");

      showToast(
        "success",
        `Reply recorded and dispatched via email to ${appeal.userEmail}!`
      );
    } catch (err: any) {
      showToast("error", err?.message || "Failed to dispatch reply.");
    } finally {
      setIsSendingReply(false);
    }
  };

  const applyTemplate = (templateGenerator: (name: string) => string) => {
    const text = templateGenerator(appeal.userName || appeal.userEmail.split("@")[0]);
    setReplyInput(text);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {feedbackToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 transition-all animate-in slide-in-from-bottom-4 duration-200 ${
            feedbackToast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          {feedbackToast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          )}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Navigation Breadcrumb Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          id="btn-back-to-appeals-list"
          onClick={onBackToList}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to All Appeals</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Appeals</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-mono text-slate-700 dark:text-slate-300">
            Case #{appeal.id.slice(-8)}
          </span>
        </div>
      </div>

      {/* Main Appeal Case Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xl flex items-center justify-center shadow-sm shrink-0">
              {appeal.userName
                ? appeal.userName.charAt(0).toUpperCase()
                : appeal.userEmail.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  {appeal.userName || "Journal User"}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    isPending
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      : isApproved
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : isRejected
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  }`}
                >
                  {isPending && <AlertTriangle className="w-3.5 h-3.5" />}
                  {isApproved && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {isRejected && <XCircle className="w-3.5 h-3.5" />}
                  {isReviewed && <Eye className="w-3.5 h-3.5" />}
                  <span className="capitalize">{appeal.status === "approved" ? "Approved & Reactivated" : appeal.status}</span>
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <a
                    href={`mailto:${appeal.userEmail}`}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium underline"
                  >
                    {appeal.userEmail}
                  </a>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  UID: {appeal.userId}
                  <button
                    onClick={() => handleCopy(appeal.userId, "uid")}
                    title="Copy UID"
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  >
                    {copiedField === "uid" ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Submitted: {new Date(appeal.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Account Jump */}
          {onNavigateToUsers && (
            <button
              onClick={() => onNavigateToUsers(appeal.userEmail)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer self-start lg:self-auto"
            >
              <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Inspect User Record</span>
            </button>
          )}
        </div>

        {/* Account Status Indicator Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Current Directory Status
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  matchedUser?.status === "active" ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              <span className="font-bold text-slate-900 dark:text-white capitalize">
                {matchedUser?.status || (isApproved ? "active" : "deactivated")}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Reviewer
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">
              {appeal.reviewedBy || "Pending Review"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Email Notifications
            </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Automated Email Delivery Active
            </span>
          </div>
        </div>
      </div>

      {/* Split Grid: Left Column (Appeal Details & Replies), Right Column (Actions & Context) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (Span 2): Statement, Reason, Replies Thread, Reply Box */}
        <div className="lg:col-span-2 space-y-6">
          {/* Suspension Reason (if any) */}
          {appeal.deactivationReason && (
            <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 text-xs space-y-1">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Original Account Deactivation Reason:</span>
              </div>
              <p className="text-rose-950 dark:text-rose-200 pl-6 leading-relaxed">
                {appeal.deactivationReason}
              </p>
            </div>
          )}

          {/* User's Appeal Statement */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  User Appeal Statement
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Submitted {new Date(appeal.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Subject
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {appeal.subject}
              </h4>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Verbatim Message Content:
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {appeal.message}
              </p>
            </div>
          </div>

          {/* Threaded Admin Replies & Communication History */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Communication History & Replies
                </h3>
              </div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {appeal.replies?.length || 0} {(appeal.replies?.length === 1 ? "Message Sent" : "Messages Sent")}
              </span>
            </div>

            {(!appeal.replies || appeal.replies.length === 0) ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <Mail className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  No replies sent to this user yet.
                </p>
                <p className="text-[11px] text-slate-400">
                  Use the composer below to send an official response directly to {appeal.userEmail}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {appeal.replies.map((reply) => {
                  const isUser = reply.senderRole === "user";
                  return (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-2xl border space-y-2 ${
                        isUser
                          ? "bg-amber-50/50 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-900/50"
                          : "bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              isUser
                                ? "text-amber-900 dark:text-amber-200"
                                : "text-indigo-900 dark:text-indigo-200"
                            }`}
                          >
                            {reply.senderName || (isUser ? "User" : "System Administrator")}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            ({reply.senderEmail})
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isUser
                                ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300"
                                : "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300"
                            }`}
                          >
                            {isUser ? "User Follow-up" : "Admin Reply"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                          <span>{new Date(reply.sentAt).toLocaleString()}</span>
                          {!isUser && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                              <Check className="w-3 h-3" />
                              Sent to User Email
                            </span>
                          )}
                        </div>
                      </div>
                      <p
                        className={`text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line pl-2 border-l-2 ${
                          isUser
                            ? "border-amber-400 dark:border-amber-600"
                            : "border-indigo-400 dark:border-indigo-600"
                        }`}
                      >
                        {reply.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Admin Reply Composer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-indigo-600" />
                  Reply to User via Email
                </label>
                <span className="text-[11px] text-slate-400">
                  Recipient: <strong className="text-slate-700 dark:text-slate-200">{appeal.userEmail}</strong>
                </span>
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Quick Response Templates:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {QUICK_REPLY_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyTemplate(tmpl.text)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                id="textarea-appeal-reply"
                rows={4}
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                placeholder={`Write your response to ${appeal.userName || appeal.userEmail}... This will be sent directly to their email address.`}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
              />

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Dispatched immediately via secure system mail transport.</span>
                </div>

                <button
                  id="btn-send-appeal-reply"
                  onClick={handleSendReply}
                  disabled={isSendingReply || !replyInput.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${isSendingReply ? "animate-spin" : ""}`} />
                  <span>{isSendingReply ? "Sending to User..." : "Send Reply to User Email"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Span 1): Administrative Decision Box & Actions */}
        <div className="space-y-6">
          {/* Primary Decision Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Administrative Actions
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Take decisive action on this appeal. Approving will automatically re-activate the user account and dispatch a reactivation email.
            </p>

            {/* Main Action: Approve & Reactivate */}
            <div className="space-y-2 pt-2">
              <button
                id="btn-detail-approve-reactivate"
                disabled={isProcessingAction}
                onClick={handleApproveAndReactivate}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black tracking-wide shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isProcessingAction ? "Processing Reactivation..." : "Approve & Reactivate Account"}
                </span>
              </button>
              <span className="text-[11px] text-slate-400 text-center block">
                Restores login access & dispatches reactivation email to user.
              </span>
            </div>

            {/* Secondary Actions */}
            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                id="btn-detail-reject-appeal"
                disabled={isProcessingAction}
                onClick={() => setShowRejectModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/70 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Appeal</span>
              </button>

              <button
                id="btn-detail-mark-reviewed"
                disabled={isProcessingAction}
                onClick={handleMarkReviewed}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Mark as Reviewed</span>
              </button>
            </div>

            {/* Delete Appeal */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleDelete}
                disabled={isProcessingAction}
                className="w-full py-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Appeal Record</span>
              </button>
            </div>
          </div>

          {/* Admin Decision History Note Card */}
          {appeal.adminNotes && (
            <div className="bg-indigo-50/50 dark:bg-indigo-950/30 rounded-3xl border border-indigo-200/70 dark:border-indigo-800/70 p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <span>Recorded Decision Notes:</span>
                {appeal.reviewedAt && (
                  <span className="text-[10px] font-normal opacity-80">
                    {new Date(appeal.reviewedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed whitespace-pre-line">
                {appeal.adminNotes}
              </p>
              {appeal.reviewedBy && (
                <div className="text-[10px] text-indigo-700 dark:text-indigo-300 pt-1">
                  Recorded by: {appeal.reviewedBy}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <XCircle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Reject Appeal for {appeal.userName || appeal.userEmail}
                </h3>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Please enter the justification for declining this reactivation request. This will be stored in the admin audit log.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Account suspended for severe terms of service violations. Appeal declined."
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:bg-white dark:focus:bg-slate-800"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isProcessingAction}
                onClick={handleRejectAppeal}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
