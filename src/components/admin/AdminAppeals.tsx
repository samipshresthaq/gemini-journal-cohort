import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  MessageSquare,
  AlertTriangle,
  Send,
  Trash2,
  Eye,
  Mail,
  Filter,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { AuthUser, DeactivationAppeal, AppealStatus, UserProfile } from "../../types";
import {
  subscribeToAppeals,
  updateAppealStatus,
  deleteAppeal,
} from "../../lib/adminService";
import { AdminAppealDetail } from "./AdminAppealDetail";

interface AdminAppealsProps {
  currentUser: AuthUser;
  liveUsers?: UserProfile[];
  onNavigateToUsers?: (filterUserEmail?: string) => void;
  initialSelectedAppealId?: string;
  onSelectedAppealChange?: (appealId: string | null) => void;
}

export const AdminAppeals: React.FC<AdminAppealsProps> = ({
  currentUser,
  liveUsers = [],
  onNavigateToUsers,
  initialSelectedAppealId,
  onSelectedAppealChange,
}) => {
  const [appeals, setAppeals] = useState<DeactivationAppeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppealStatus | "all">("all");
  const [selectedAppeal, setSelectedAppeal] = useState<DeactivationAppeal | null>(null);

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState<{ [id: string]: string }>({});
  const [activeRejectDialogId, setActiveRejectDialogId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Subscribe to real-time appeals from Firestore & backend
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToAppeals(
      (items) => {
        setAppeals(items);
        setIsLoading(false);
      },
      (err) => {
        console.warn("Real-time appeals listener notice:", err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Deep-link / sync initialSelectedAppealId if passed
  useEffect(() => {
    if (initialSelectedAppealId && appeals.length > 0 && !selectedAppeal) {
      const match = appeals.find((a) => a.id === initialSelectedAppealId);
      if (match) {
        setSelectedAppeal(match);
      }
    }
  }, [initialSelectedAppealId, appeals, selectedAppeal]);

  const handleSelectAppeal = (app: DeactivationAppeal | null) => {
    setSelectedAppeal(app);
    onSelectedAppealChange?.(app ? app.id : null);
  };

  const showToast = (type: "success" | "error", message: string) => {
    setFeedbackToast({ type, message });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleApproveAppeal = async (appeal: DeactivationAppeal) => {
    setProcessingId(appeal.id);
    try {
      const note =
        adminNoteInput[appeal.id]?.trim() ||
        "Appeal approved by administrator. Account access has been fully restored.";

      await updateAppealStatus(currentUser, appeal, "approved", note);
      showToast(
        "success",
        `Appeal approved! Account ${appeal.userEmail} has been reactivated.`
      );
      // Clean up input
      setAdminNoteInput((prev) => {
        const next = { ...prev };
        delete next[appeal.id];
        return next;
      });
    } catch (err: any) {
      showToast("error", err?.message || "Failed to approve appeal.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectAppeal = async (appeal: DeactivationAppeal) => {
    setProcessingId(appeal.id);
    try {
      const note =
        adminNoteInput[appeal.id]?.trim() ||
        "Appeal reviewed. Account suspension remains in effect.";

      await updateAppealStatus(currentUser, appeal, "rejected", note);
      showToast(
        "success",
        `Appeal for ${appeal.userEmail} marked as rejected.`
      );
      setActiveRejectDialogId(null);
      setAdminNoteInput((prev) => {
        const next = { ...prev };
        delete next[appeal.id];
        return next;
      });
    } catch (err: any) {
      showToast("error", err?.message || "Failed to reject appeal.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkReviewed = async (appeal: DeactivationAppeal) => {
    setProcessingId(appeal.id);
    try {
      const note =
        adminNoteInput[appeal.id]?.trim() ||
        "Appeal acknowledged and marked as reviewed by administration.";

      await updateAppealStatus(currentUser, appeal, "reviewed", note);
      showToast("success", `Appeal marked as reviewed.`);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update appeal.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteAppeal = async (appealId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this appeal record?")) {
      return;
    }
    setProcessingId(appealId);
    try {
      await deleteAppeal(appealId);
      setAppeals((prev) => prev.filter((a) => a.id !== appealId));
      showToast("success", "Appeal record deleted.");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to delete appeal.");
    } finally {
      setProcessingId(null);
    }
  };

  // Filtered appeals list
  const filteredAppeals = appeals.filter((appeal) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      appeal.userEmail.toLowerCase().includes(q) ||
      appeal.userName.toLowerCase().includes(q) ||
      appeal.subject.toLowerCase().includes(q) ||
      appeal.message.toLowerCase().includes(q) ||
      appeal.userId.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "all" ? true : appeal.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = appeals.filter((a) => a.status === "pending").length;
  const approvedCount = appeals.filter((a) => a.status === "approved").length;
  const rejectedCount = appeals.filter((a) => a.status === "rejected").length;
  const totalCount = appeals.length;

  // Render Dedicated Appeal Detail View when an appeal is selected
  if (selectedAppeal) {
    return (
      <AdminAppealDetail
        currentUser={currentUser}
        appeal={selectedAppeal}
        liveUsers={liveUsers}
        onBackToList={() => handleSelectAppeal(null)}
        onNavigateToUsers={onNavigateToUsers}
        onAppealUpdated={(updated) => {
          setSelectedAppeal(updated);
          setAppeals((prev) =>
            prev.map((a) => (a.id === updated.id ? updated : a))
          );
        }}
        onAppealDeleted={(deletedId) => {
          setSelectedAppeal(null);
          setAppeals((prev) => prev.filter((a) => a.id !== deletedId));
        }}
      />
    );
  }

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

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Deactivated Account Appeals
                </h2>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold border border-amber-200 dark:border-amber-800 animate-pulse">
                    {pendingCount} Pending Review
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review reinstatement requests submitted by deactivated users, examine their statement, and reactivate accounts with a single click.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                setIsLoading(true);
                subscribeToAppeals(
                  (items) => {
                    setAppeals(items);
                    setIsLoading(false);
                  },
                  (err) => {
                    console.warn("[AdminAppeals] Refresh notice:", err?.message);
                    setIsLoading(false);
                  }
                );
              }}
              disabled={isLoading}
              title="Refresh Appeals"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Appeals
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
              {totalCount}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
              Pending Review
            </span>
            <span className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1 block">
              {pendingCount}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
              Reactivated / Approved
            </span>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">
              {approvedCount}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60">
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
              Rejected
            </span>
            <span className="text-xl font-black text-rose-700 dark:text-rose-300 mt-1 block">
              {rejectedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-appeals"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search appeals by user email, name, subject, or message..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs self-stretch sm:self-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "all"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "pending"
                ? "bg-amber-500 text-white shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter("approved")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "approved"
                ? "bg-emerald-600 text-white shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "rejected"
                ? "bg-rose-600 text-white shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Rejected ({rejectedCount})
          </button>
          <button
            onClick={() => setStatusFilter("reviewed")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "reviewed"
                ? "bg-indigo-600 text-white shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Reviewed ({appeals.filter((a) => a.status === "reviewed").length})
          </button>
        </div>
      </div>

      {/* Appeals Stream List */}
      {filteredAppeals.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {appeals.length === 0 ? "No Appeals Found in Firestore" : "No Appeals Match Filter"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {appeals.length === 0
              ? "When a deactivated user submits an appeal through their account deactivation screen, it will appear here in real-time."
              : "Try adjusting your search keywords or switching status filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppeals.map((appeal) => {
            const isProcessing = processingId === appeal.id;
            const isPending = appeal.status === "pending";
            const isApproved = appeal.status === "approved";
            const isRejected = appeal.status === "rejected";
            const isReviewed = appeal.status === "reviewed";

            // Find matching live user if any
            const matchedUser = liveUsers.find(
              (u) => u.uid === appeal.userId || u.email.toLowerCase() === appeal.userEmail.toLowerCase()
            );

            return (
              <div
                key={appeal.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  isPending
                    ? "border-amber-200 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/20 via-white to-white dark:from-amber-950/10 dark:via-slate-900 dark:to-slate-900"
                    : isApproved
                    ? "border-emerald-200 dark:border-emerald-900/60"
                    : isRejected
                    ? "border-rose-200 dark:border-rose-900/50 opacity-90"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                {/* Top User & Status Bar */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-850/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                      {appeal.userName ? appeal.userName.charAt(0).toUpperCase() : appeal.userEmail.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {appeal.userName || "Journal User"}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          ({appeal.userEmail})
                        </span>
                        {matchedUser && (
                          <span
                            className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              matchedUser.status === "active"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            Account Status: {matchedUser.status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          Submitted on {new Date(appeal.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                        <span>• UID: <code className="font-mono text-[10px]">{appeal.userId}</code></span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Replies Counter */}
                  <div className="flex items-center gap-2">
                    {appeal.replies && appeal.replies.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        <Mail className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{appeal.replies.length} {appeal.replies.length === 1 ? "Reply" : "Replies"}</span>
                      </span>
                    )}
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
                      {isPending && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                      {isApproved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                      {isRejected && <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
                      {isReviewed && <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                      <span className="capitalize">{appeal.status}</span>
                    </span>
                  </div>
                </div>

                {/* Appeal Body */}
                <div className="p-5 space-y-4">
                  {/* Deactivation Reason Banner */}
                  {appeal.deactivationReason && (
                    <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Suspension Reason: </span>
                        <span>{appeal.deactivationReason}</span>
                      </div>
                    </div>
                  )}

                  {/* Appeal Statement - Clickable to open detail */}
                  <div
                    onClick={() => handleSelectAppeal(appeal)}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/40 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 space-y-2 transition-all cursor-pointer group"
                    title="Click to open full appeal detail and reply view"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Subject: {appeal.subject}
                        </h4>
                      </div>
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <span>Open Detail View</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line pl-6 line-clamp-3">
                      {appeal.message}
                    </p>
                  </div>

                  {/* Admin Review Notes (if already reviewed) */}
                  {appeal.adminNotes && (
                    <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-indigo-800 dark:text-indigo-300 font-bold">
                        <span>Admin Decision Notes:</span>
                        {appeal.reviewedBy && (
                          <span className="font-normal opacity-80">
                            By: {appeal.reviewedBy} • {appeal.reviewedAt ? new Date(appeal.reviewedAt).toLocaleDateString() : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-indigo-950 dark:text-indigo-200">{appeal.adminNotes}</p>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {onNavigateToUsers && (
                        <button
                          onClick={() => onNavigateToUsers(appeal.userEmail)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>View User in Directory</span>
                        </button>
                      )}
                    </div>

                    {/* Decision & Navigation Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                      {/* Dedicated Appeal Detail Button */}
                      <button
                        id={`btn-open-detail-${appeal.id}`}
                        onClick={() => handleSelectAppeal(appeal)}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer group"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Appeal Details & Reply</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      {isPending && (
                        <>
                          <button
                            id={`btn-approve-appeal-${appeal.id}`}
                            disabled={isProcessing}
                            onClick={() => handleApproveAppeal(appeal)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isProcessing ? "Reactivating..." : "Approve & Reactivate"}</span>
                          </button>

                          <button
                            id={`btn-reject-dialog-${appeal.id}`}
                            disabled={isProcessing}
                            onClick={() =>
                              setActiveRejectDialogId((prev) =>
                                prev === appeal.id ? null : appeal.id
                              )
                            }
                            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {!isPending && (
                        <>
                          {/* Option to re-approve if was rejected */}
                          {isRejected && (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleApproveAppeal(appeal)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Reactivate Account</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAppeal(appeal.id)}
                            disabled={isProcessing}
                            title="Delete Appeal Record"
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline Rejection Reason Dialog */}
                  {activeRejectDialogId === appeal.id && (
                    <div className="mt-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          Provide Explanation / Reason for Rejection
                        </span>
                        <button
                          onClick={() => setActiveRejectDialogId(null)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <textarea
                        rows={2}
                        value={adminNoteInput[appeal.id] || ""}
                        onChange={(e) =>
                          setAdminNoteInput((prev) => ({
                            ...prev,
                            [appeal.id]: e.target.value,
                          }))
                        }
                        placeholder="Explain why the appeal cannot be approved at this time (this will be recorded in the system)..."
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      />

                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setActiveRejectDialogId(null)}
                          className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleRejectAppeal(appeal)}
                          className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Confirm Rejection</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
