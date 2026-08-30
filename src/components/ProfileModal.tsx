import React, { useState, useEffect } from "react";
import { AuthUser, JournalEntry } from "../types";
import { 
  User as UserIcon, 
  Mail, 
  Key, 
  ShieldCheck, 
  X, 
  LogOut, 
  Sparkles, 
  BookOpen, 
  MessageSquare, 
  Compass, 
  Star, 
  Copy, 
  Check, 
  Edit3, 
  Loader2, 
  Calendar,
  Layers
} from "lucide-react";
import { updateUserProfile } from "../firebase";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  entries: JournalEntry[];
  onSignOut: () => void;
  onProfileUpdated: (updatedUser: AuthUser) => void;
  onRequireAuth?: (title?: string, description?: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  entries,
  onSignOut,
  onProfileUpdated,
  onRequireAuth,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(user.displayName || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

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

  const isGuest = user.uid.startsWith("guest_");
  const totalEntries = entries.length;
  const totalMessages = entries.reduce((acc, e) => acc + (e.messages?.length || 0), 0);
  const totalSummaries = entries.filter((e) => !!e.summary).length;
  const favoriteEntries = entries.filter((e) => !!e.isFavorite).length;

  // Calculate mood breakdown
  const moodCounts: Record<string, number> = {};
  entries.forEach((e) => {
    if (e.mood) {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    }
  });
  const topMoods = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const handleCopyUid = () => {
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName.trim()) return;

    setIsSavingName(true);
    setUpdateError(null);

    try {
      if (isGuest) {
        // For guest user, update local storage representation
        const updated: AuthUser = {
          ...user,
          displayName: newDisplayName.trim(),
        };
        localStorage.setItem("gemini_journal_active_guest", JSON.stringify(updated));
        onProfileUpdated(updated);
        setIsEditingName(false);
      } else {
        await updateUserProfile({ displayName: newDisplayName.trim() });
        const updated: AuthUser = {
          ...user,
          displayName: newDisplayName.trim(),
        };
        onProfileUpdated(updated);
        setIsEditingName(false);
      }
    } catch (err: any) {
      console.error("Failed to update profile name:", err);
      setUpdateError(err.message || "Failed to update profile name.");
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div
      id="profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="profile-modal-container"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 leading-none">User Profile</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Account credentials, identity, & journaling statistics</p>
            </div>
          </div>

          <button
            id="btn-close-profile-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* User Identity Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white shadow-md relative overflow-hidden border border-slate-800">
            <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-16 h-16 rounded-full border-2 border-indigo-400/40 object-cover shadow-sm ring-4 ring-slate-800 dark:ring-slate-900"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold border-2 border-indigo-400/40 shadow-sm ring-4 ring-slate-800 dark:ring-slate-900">
                  {(user.displayName || user.email || "U")[0].toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {isEditingName ? (
                    <form onSubmit={handleSaveDisplayName} className="flex items-center gap-2 w-full mt-1">
                      <input
                        type="text"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        className="px-3 py-1 text-sm bg-slate-800 dark:bg-slate-900 border border-indigo-400/50 rounded-lg text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-400 flex-1"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={isSavingName || !newDisplayName.trim()}
                        className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {isSavingName ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="px-2 py-1 text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold text-white truncate">
                        {user.displayName || (isGuest ? "Guest Explorer" : "Anonymous User")}
                      </h3>
                      <button
                        id="btn-edit-display-name"
                        onClick={() => {
                          setNewDisplayName(user.displayName || "");
                          setIsEditingName(true);
                        }}
                        title="Edit display name"
                        className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                  <span className="truncate">{user.email || (isGuest ? "Local Guest Session" : "No email linked")}</span>
                </div>

                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                    <ShieldCheck className="w-3 h-3 text-indigo-300" />
                    {isGuest ? "Guest Mode" : user.email ? "Verified Account" : "Standard Account"}
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    <Check className="w-3 h-3 text-emerald-300" />
                    Active Session
                  </span>
                </div>
              </div>
            </div>

            {updateError && (
              <p className="text-xs text-rose-300 mt-2 bg-rose-950/50 p-2 rounded-lg border border-rose-800">
                {updateError}
              </p>
            )}
          </div>

          {/* Guest Upgrade Callout */}
          {isGuest && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-slate-800 dark:text-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Upgrade to an Account</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-full">
                  {entries.length}/2 Conversations
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                You are currently in a limited guest session (max 2 conversations, conversation-only). Sign in to unlock unlimited reflections, AI growth summaries, hands-free voice transcription, and cloud backups.
              </p>
              <button
                type="button"
                id="btn-profile-guest-upgrade"
                onClick={() => {
                  onClose();
                  onRequireAuth?.(
                    "Sign In to Upgrade Account",
                    "Convert your guest session to a free permanent account to keep your reflections safely backed up and unlock all AI features."
                  );
                }}
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Sign In with Google or Email</span>
              </button>
            </div>
          )}

          {/* Account Details & Security Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Credentials</h4>
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  User Identifier (UID)
                </span>
                <div className="flex items-center gap-2">
                  <code className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                    {user.uid.length > 16 ? `${user.uid.substring(0, 16)}...` : user.uid}
                  </code>
                  <button
                    id="btn-copy-user-uid"
                    onClick={handleCopyUid}
                    title="Copy Full UID"
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                  >
                    {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Data Security & Isolation
                </span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">
                  {isGuest ? "Local Isolation" : "Isolated Cloud Firestore"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  AI Synthesis Engine
                </span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">Gemini 3.6 Flash</span>
              </div>
            </div>
          </div>

          {/* Journaling Statistics Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reflective Journal Activity</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-xl text-center space-y-1 shadow-2xs">
                <div className="w-7 h-7 mx-auto rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-50">{totalEntries}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Entries</div>
              </div>

              <div className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-xl text-center space-y-1 shadow-2xs">
                <div className="w-7 h-7 mx-auto rounded-lg bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-50">{totalMessages}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">AI Exchanges</div>
              </div>

              <div className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-xl text-center space-y-1 shadow-2xs">
                <div className="w-7 h-7 mx-auto rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Compass className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-50">{totalSummaries}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Summaries</div>
              </div>

              <div className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-xl text-center space-y-1 shadow-2xs">
                <div className="w-7 h-7 mx-auto rounded-lg bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Star className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-50">{favoriteEntries}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Starred</div>
              </div>
            </div>

            {/* Top Moods Pill Bar */}
            {topMoods.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Frequent Moods:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {topMoods.map(([mood, count]) => (
                    <span
                      key={mood}
                      className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium shadow-2xs"
                    >
                      {mood} <span className="text-slate-400 dark:text-slate-500 text-[10px]">({count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-900 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            id="btn-profile-sign-out"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="px-4 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <button
            id="btn-profile-close-done"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
