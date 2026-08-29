import React from "react";
import { AuthUser, SaveStatus } from "../types";
import { 
  Sparkles, 
  LogOut, 
  Plus, 
  History, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Sun,
  Moon,
  User as UserIcon
} from "lucide-react";

interface NavbarProps {
  user: AuthUser | null;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
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
  showTestGuide?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  theme = "light",
  onToggleTheme,
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
  showTestGuide = false,
}) => {
  const handleNewEntryClick = () => {
    if (isGuest && guestEntryCount >= maxGuestEntries) {
      onOpenAuthModal?.(
        `Guest Entry Limit Reached (${maxGuestEntries} of ${maxGuestEntries} Entries)`,
        `Guest mode allows a maximum of ${maxGuestEntries} reflection entries. Sign in with an account to create unlimited reflections and sync your history to Cloud Firestore.`
      );
      return;
    }
    onNewEntry();
  };

  return (
    <header id="main-app-header" className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-900 dark:bg-slate-800 text-indigo-400 flex items-center justify-center shadow-sm ring-1 ring-slate-900/10 dark:ring-slate-700/50">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-50 tracking-tight text-lg">
                Gemini Reflections
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">
              Private AI-Assisted Journal & Growth Synthesis 
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cloud Persistence State Pill (only for authenticated cloud users) */}
            {!isGuest && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80">
                {saveStatus === "saving" && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Saving to Cloud...</span>
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Saved to Cloud</span>
                  </>
                )}
                {saveStatus === "error" && (
                  <button
                    id="btn-retry-save-pill"
                    onClick={onRetrySave}
                    className="flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 font-medium cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Retry Save</span>
                  </button>
                )}
                {saveStatus === "idle" && (
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Cloud Synced</span>
                )}
              </div>
            )}

            {isGuest && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                Guest ({guestEntryCount}/{maxGuestEntries} Entries)
              </span>
            )}

            {/* Dark / Light Theme Toggle Button */}
            {onToggleTheme && (
              <button
                id="btn-toggle-theme"
                onClick={onToggleTheme}
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-all cursor-pointer shadow-xs flex items-center justify-center"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
              </button>
            )}

            {/* Walkthrough Verification Toggle - Only shown in development mode */}
            {showTestGuide && (
              <button
                id="btn-nav-walkthrough-guide"
                onClick={onToggleWalkthrough}
                title="Test Walkthrough & Verification"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isWalkthroughOpen
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden md:inline">Test Guide</span>
              </button>
            )}

            {/* History Toggle */}
            <button
              id="btn-nav-history"
              onClick={onToggleHistory}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                isHistoryOpen
                  ? "bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600 shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Past Entries</span>
            </button>

            {/* New Entry Button */}
            <button
              id="btn-nav-new-entry"
              onClick={handleNewEntryClick}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>

            {/* User Profile Trigger and Sign Out */}
            <div className="flex items-center pl-2 border-l border-slate-200 dark:border-slate-800 gap-1.5">
              <button
                id="btn-nav-user-profile"
                onClick={onOpenProfile}
                title="View Profile & Stats"
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer text-xs font-semibold"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`w-7 h-7 rounded-full ${isGuest ? "bg-amber-600" : "bg-indigo-600"} text-white flex items-center justify-center text-xs font-bold`}>
                    {isGuest ? "G" : (user.displayName || user.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden lg:inline max-w-[100px] truncate">
                  {isGuest ? "Guest" : user.displayName || (user.email ? user.email.split("@")[0] : "User")}
                </span>
              </button>

              <button
                id="btn-nav-sign-out"
                onClick={onSignOut}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle in Unauthenticated state */}
            {onToggleTheme && (
              <button
                id="btn-toggle-theme-unauth"
                onClick={onToggleTheme}
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-all cursor-pointer shadow-xs flex items-center justify-center"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
              </button>
            )}

            {/* Walkthrough Verification Toggle - Only shown in development mode */}
            {showTestGuide && (
              <button
                id="btn-nav-walkthrough-guide-unauth"
                onClick={onToggleWalkthrough}
                title="Test Walkthrough & Verification"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Test Guide</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

