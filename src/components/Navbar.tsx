import React from "react";
import { AuthUser, SaveStatus } from "../types";
import { 
  Sparkles, 
  LogOut, 
  Plus, 
  History, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  LogIn,
  User as UserIcon
} from "lucide-react";

interface NavbarProps {
  user: AuthUser | null;
  isGuest?: boolean;
  guestEntryCount?: number;
  maxGuestEntries?: number;
  onOpenAuthModal?: (title?: string, description?: string) => void;
  onSignOut: () => void;
  onNewEntry: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  onOpenProfile: () => void;
  saveStatus: SaveStatus;
  onRetrySave?: () => void;
  onToggleWalkthrough: () => void;
  isWalkthroughOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  isGuest = false,
  guestEntryCount = 1,
  maxGuestEntries = 2,
  onOpenAuthModal,
  onSignOut,
  onNewEntry,
  onToggleHistory,
  isHistoryOpen,
  onOpenProfile,
  saveStatus,
  onRetrySave,
  onToggleWalkthrough,
  isWalkthroughOpen,
}) => {
  const handleNewEntryClick = () => {
    if (isGuest && guestEntryCount >= maxGuestEntries) {
      onOpenAuthModal?.(
        "Guest Limit Reached (2 of 2 Conversations)",
        "Guest mode allows a maximum of 2 active conversations. Sign in with an account to create unlimited reflections and sync your history to Cloud Firestore."
      );
      return;
    }
    onNewEntry();
  };

  return (
    <header id="main-app-header" className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-900 text-indigo-400 flex items-center justify-center shadow-sm ring-1 ring-slate-900/10">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-lg">
                Gemini Reflections
              </span>
              {isGuest ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Guest ({guestEntryCount}/{maxGuestEntries} Conversations)
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100/90 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200/80">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Firestore Isolated
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 hidden md:block">
              Private AI-Assisted Journal & Growth Synthesis
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Guest Upgrade Quick Trigger */}
            {isGuest && (
              <button
                id="btn-nav-guest-upgrade"
                onClick={() => onOpenAuthModal?.(
                  "Unlock Full Experience",
                  "Sign in to unlock AI growth summaries, hands-free voice control, and unlimited cloud-backed reflections."
                )}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>Sign In / Unlock</span>
              </button>
            )}

            {/* Cloud Persistence State Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border border-slate-200 bg-slate-50/80">
              {isGuest ? (
                <button
                  type="button"
                  onClick={() => onOpenAuthModal?.(
                    "Unlock Cloud Firestore Backup",
                    "Guest reflections are stored in your temporary browser session. Sign in to sync securely across devices."
                  )}
                  className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 font-medium cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Local Guest Mode</span>
                </button>
              ) : (
                <>
                  {saveStatus === "saving" && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      <span className="text-slate-600 font-medium">Saving to Cloud...</span>
                    </>
                  )}
                  {saveStatus === "saved" && (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-slate-600 font-medium">Saved to Cloud</span>
                    </>
                  )}
                  {saveStatus === "error" && (
                    <button
                      id="btn-retry-save-pill"
                      onClick={onRetrySave}
                      className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Retry Save</span>
                    </button>
                  )}
                  {saveStatus === "idle" && (
                    <span className="text-slate-500 font-medium">Cloud Synced</span>
                  )}
                </>
              )}
            </div>

            {/* Walkthrough Verification Toggle */}
            <button
              id="btn-nav-walkthrough-guide"
              onClick={onToggleWalkthrough}
              title="Test Walkthrough & Verification"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                isWalkthroughOpen
                  ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">Test Guide</span>
            </button>

            {/* History Toggle */}
            <button
              id="btn-nav-history"
              onClick={onToggleHistory}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                isHistoryOpen
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Past Entries</span>
            </button>

            {/* New Entry Button */}
            <button
              id="btn-nav-new-entry"
              onClick={handleNewEntryClick}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>

            {/* User Profile Trigger and Sign Out */}
            <div className="flex items-center pl-2 border-l border-slate-200 gap-1.5">
              <button
                id="btn-nav-user-profile"
                onClick={onOpenProfile}
                title="View Profile & Stats"
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl hover:bg-slate-100 text-slate-700 border border-transparent hover:border-slate-200 transition-all cursor-pointer text-xs font-semibold"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-7 h-7 rounded-full border border-slate-200 object-cover ring-2 ring-slate-100"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`w-7 h-7 rounded-full ${isGuest ? "bg-amber-600" : "bg-indigo-600"} text-white flex items-center justify-center text-xs font-bold`}>
                    {isGuest ? "G" : (user.displayName || user.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden lg:inline max-w-[100px] truncate">
                  {isGuest ? "Guest (Limited)" : user.displayName || (user.email ? user.email.split("@")[0] : "User")}
                </span>
              </button>

              <button
                id="btn-nav-sign-out"
                onClick={onSignOut}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="btn-nav-walkthrough-guide-unauth"
              onClick={onToggleWalkthrough}
              title="Test Walkthrough & Verification"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Test Guide</span>
            </button>

            <button
              id="btn-nav-sign-in-open-modal"
              onClick={() => onOpenAuthModal?.(
                "Sign In to Your Journal",
                "Sign in with Google or your email to access your reflections, AI growth summaries, and Firestore cloud sync."
              )}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-300" />
              <span>Sign In</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
