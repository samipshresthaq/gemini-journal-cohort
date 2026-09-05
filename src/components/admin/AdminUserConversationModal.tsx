import React, { useState, useEffect } from "react";
import {
  X,
  MessageSquare,
  Clock,
  User,
  Bot,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { UserProfile, DeactivationAppeal, JournalEntry } from "../../types";
import { fetchUserEntriesDirectly } from "../../lib/firestoreService";
import { fetchUserAppeal } from "../../lib/adminService";

interface AdminUserConversationModalProps {
  user: UserProfile;
  appeal?: DeactivationAppeal | null;
  onClose: () => void;
  onNavigateToAppeals?: (appealId?: string) => void;
}

export const AdminUserConversationModal: React.FC<AdminUserConversationModalProps> = ({
  user,
  appeal: initialAppeal,
  onClose,
  onNavigateToAppeals,
}) => {
  const [activeTab, setActiveTab] = useState<"appeal" | "reflections">(
    initialAppeal ? "appeal" : "reflections"
  );
  const [appeal, setAppeal] = useState<DeactivationAppeal | null>(initialAppeal || null);
  const [isLoadingAppeal, setIsLoadingAppeal] = useState(!initialAppeal);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load appeal if not provided in props
  useEffect(() => {
    let isMounted = true;
    if (!initialAppeal && user.uid) {
      setIsLoadingAppeal(true);
      fetchUserAppeal(user.uid)
        .then((app) => {
          if (isMounted) {
            setAppeal(app);
            if (app) {
              setActiveTab("appeal");
            }
            setIsLoadingAppeal(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsLoadingAppeal(false);
        });
    } else {
      setIsLoadingAppeal(false);
    }
    return () => {
      isMounted = false;
    };
  }, [user.uid, initialAppeal]);

  // Load user journal reflection entries
  useEffect(() => {
    let isMounted = true;
    setIsLoadingEntries(true);
    fetchUserEntriesDirectly(user.uid)
      .then((data) => {
        if (isMounted) {
          setEntries(data);
          if (data.length > 0 && !expandedEntryId) {
            setExpandedEntryId(data[0].id);
          }
          setIsLoadingEntries(false);
        }
      })
      .catch((err) => {
        console.warn("Failed to load user entries:", err);
        if (isMounted) setIsLoadingEntries(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchesTitle = entry.title.toLowerCase().includes(query);
    const matchesTopic = entry.topic?.toLowerCase().includes(query) || false;
    const matchesMessages = entry.messages.some((m) =>
      m.content.toLowerCase().includes(query)
    );
    return matchesTitle || matchesTopic || matchesMessages;
  });

  return (
    <div
      id="modal-user-conversation-history"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                Deactivated User
              </span>
              <span className="text-xs text-slate-400 font-mono">UID: {user.uid}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Conversation History</span>
              <span className="text-slate-400 font-normal text-sm sm:text-base">
                — {user.displayName || user.email}
              </span>
            </h2>
            {user.deactivationReason && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                Deactivation Reason: &ldquo;{user.deactivationReason}&rdquo;
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close conversation history modal"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 text-xs font-bold">
          {appeal && (
            <button
              type="button"
              onClick={() => setActiveTab("appeal")}
              className={`pb-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "appeal"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Appeal Thread</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {1 + (appeal.replies?.length || 0)}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("reflections")}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "reflections"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Journal Reflection Conversations</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {entries.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {activeTab === "appeal" && (
            <div className="space-y-4">
              {isLoadingAppeal ? (
                <div className="p-8 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                  <p className="text-xs text-slate-500">Retrieving appeal conversation...</p>
                </div>
              ) : appeal ? (
                <div className="space-y-4">
                  {/* Status Card & Actions */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Appeal #{appeal.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            appeal.status === "approved"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : appeal.status === "rejected"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : appeal.status === "reviewed"
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {appeal.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <strong>Subject:</strong> {appeal.subject}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Submitted: {new Date(appeal.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {onNavigateToAppeals && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToAppeals(appeal.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Appeals Reviewer</span>
                      </button>
                    )}
                  </div>

                  {/* Appeal Thread Messages */}
                  <div className="space-y-3">
                    {/* Original user message */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {appeal.userName || user.displayName || user.email}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                            Initial Appeal Statement
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

                    {/* Replies */}
                    {appeal.replies && appeal.replies.length > 0 ? (
                      appeal.replies.map((reply) => {
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
                                      ? "bg-indigo-600 text-white"
                                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                  }`}
                                >
                                  {isAdmin ? (
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  ) : (
                                    <User className="w-3.5 h-3.5" />
                                  )}
                                </div>
                                <span
                                  className={`font-bold ${
                                    isAdmin
                                      ? "text-indigo-950 dark:text-indigo-200"
                                      : "text-slate-900 dark:text-white"
                                  }`}
                                >
                                  {isAdmin
                                    ? reply.senderName || "Administrator"
                                    : `${user.displayName || "User"} (Follow-up)`}
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
                                <span>
                                  {new Date(reply.sentAt).toLocaleString([], {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </span>
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
                      })
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-3">
                        No replies exchanged in this appeal yet.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center space-y-2">
                  <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    This deactivated user has not submitted a formal reactivation appeal yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "reflections" && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reflection conversations by topic or message text..."
                  className="w-full h-10 pl-10 pr-4 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {isLoadingEntries ? (
                <div className="p-10 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                  <p className="text-xs text-slate-500">Loading reflection conversation history...</p>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    {searchQuery
                      ? "No reflection conversations match your search."
                      : "No reflection conversations found for this user."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEntries.map((entry) => {
                    const isExpanded = expandedEntryId === entry.id;
                    const messagesCount = entry.messages?.length || 0;

                    return (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 overflow-hidden shadow-2xs"
                      >
                        {/* Entry Header Accordion Toggle */}
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
                              <span>
                                {new Date(entry.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              <span>•</span>
                              <span>{messagesCount} conversational exchanges</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-slate-400">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Conversation Messages */}
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
                                  No conversational messages recorded in this entry.
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
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Read-only archive for administrative inspection.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
