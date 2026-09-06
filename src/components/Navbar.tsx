import React, { useState, useEffect } from "react";
import { AuthUser, SaveStatus, UserStreak } from "../types";
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
  User as UserIcon,
  Flame,
  ShieldCheck,
  Lock,
  LogIn,
  Menu,
  X,
  ChevronRight,
  ArrowLeft
} from "lucide-react";

interface NavbarProps {
  user: AuthUser | null;
  streak?: UserStreak | null;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  isGuest?: boolean;
  isAdmin?: boolean;
  guestEntryCount?: number;
  maxGuestEntries?: number;
  onOpenAuthModal?: (title?: string, description?: string) => void;
  onSignOut: () => void;
  onNewEntry: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  onOpenProfile: () => void;
  onOpenWeeklyDigest?: () => void;
  onOpenAdminPanel?: () => void;
  saveStatus: SaveStatus;
  onRetrySave?: () => void;
  onToggleWalkthrough: () => void;
  isWalkthroughOpen: boolean;
  showTestGuide?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  streak,
  theme = "light",
  onToggleTheme,
  isGuest = false,
  isAdmin = false,
  guestEntryCount = 1,
  maxGuestEntries = 2,
  onOpenAuthModal,
  onSignOut,
  onNewEntry,
  onToggleHistory,
  isHistoryOpen,
  onOpenProfile,
  onOpenWeeklyDigest,
  onOpenAdminPanel,
  saveStatus,
  onRetrySave,
  onToggleWalkthrough,
  isWalkthroughOpen,
  showTestGuide = false,
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileDrawerOpen(false);
      }
    };
    if (isMobileDrawerOpen) {
      window.addEventListener("keydown", handleKeyDown);
      // Prevent background scrolling while mobile drawer is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isMobileDrawerOpen]);

  const hasActiveAccount = Boolean(
    user && 
    !isGuest && 
    user.status !== "deactivated" && 
    !user.uid.startsWith("guest_")
  );

  const handleMobileAction = (action: () => void) => {
    setIsMobileDrawerOpen(false);
    action();
  };

  return (
    <>
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

          {/* ======================================================== */}
          {/* DESKTOP VIEW NAVBAR ACTIONS (hidden on mobile)            */}
          {/* ======================================================== */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            {/* Active User Feature Buttons */}
            {hasActiveAccount && (
              <>
                {/* Cloud Persistence State Pill */}
                {saveStatus && saveStatus !== "idle" && (
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
                  </div>
                )}

                {/* Streak Indicator Pill */}
                {streak && streak.currentStreak > 0 && (
                  <button
                    id="btn-nav-streak-pill"
                    onClick={onOpenProfile}
                    title={`Daily Login Streak: ${streak.currentStreak} ${streak.currentStreak === 1 ? "day" : "days"} (Longest: ${streak.longestStreak} ${streak.longestStreak === 1 ? "day" : "days"}). Click to view stats.`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/60"
                  >
                    <Flame
                      className={`w-3.5 h-3.5 ${
                        streak.currentStreak > 1
                          ? "text-amber-500 fill-amber-400 animate-pulse"
                          : "text-amber-500 fill-amber-300"
                      }`}
                    />
                    <span className="font-extrabold">{streak.currentStreak}</span>
                  </button>
                )}

                {/* Admin Portal Button */}
                {isAdmin && onOpenAdminPanel && (
                  <button
                    id="btn-nav-admin-panel"
                    onClick={onOpenAdminPanel}
                    title="System Admin Portal - Manage Users & Security"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/60"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Admin</span>
                  </button>
                )}

                {/* Weekly Saturday Digest Feature Button */}
                {onOpenWeeklyDigest && (
                  <button
                    id="btn-nav-weekly-digest"
                    onClick={onOpenWeeklyDigest}
                    title="Weekly Journal Digest (Sent Every Saturday)"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="hidden lg:inline">Weekly Digest</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-indigo-200/70 dark:bg-indigo-800/80 text-[10px] font-bold text-indigo-800 dark:text-indigo-200">
                      Sat
                    </span>
                  </button>
                )}

                {/* Past Entries Feature Button */}
                <button
                  id="btn-nav-history"
                  onClick={onToggleHistory}
                  title="View Past Journal Entries"
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isHistoryOpen
                      ? "bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Past Entries</span>
                </button>

                {/* New Entry Feature Button */}
                <button
                  id="btn-nav-new-entry"
                  onClick={onNewEntry}
                  title="Start a New Reflection"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white hover:shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Entry</span>
                </button>

                {/* Guide / Walkthrough */}
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
                    <span className="hidden lg:inline">Test Guide</span>
                  </button>
                )}
              </>
            )}
            {isGuest && onSignOut && (
              <button
                id="btn-nav-guest-back"
                type="button"
                onClick={onSignOut}
                title="Exit guest mode and return to the landing page"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <span className="hidden sm:inline">Exit</span>
              </button>
            )}
            {/* Theme Toggle (Light / Dark Mode) */}
            {onToggleTheme && (
              <button
                id="btn-toggle-theme"
                onClick={onToggleTheme}
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-all cursor-pointer shadow-xs flex items-center justify-center shrink-0"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
              </button>
            )}

            {/* Account Profile or Sign In Control */}
            {hasActiveAccount && user ? (
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
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                      {(user.displayName || user.email || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="hidden lg:inline max-w-[100px] truncate">
                    {user.displayName || (user.email ? user.email.split("@")[0] : "User")}
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
            ) : (
              <button
                id="btn-nav-sign-in"
                onClick={() => onOpenAuthModal?.(
                  "Sign In to Your Active Account",
                  "Sign in to unlock reflection sessions, weekly digests, past entries, and Cloud Firestore synchronization."
                )}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* ======================================================== */}
          {/* MOBILE VIEW NAVBAR: Streamlined Header with Drawer Button */}
          {/* ======================================================== */}
          <div className="flex md:hidden items-center gap-2">
            {/* Quick Action: New Entry (compact pill on mobile) */}
            {hasActiveAccount && (
              <button
                id="btn-nav-mobile-new-quick"
                onClick={onNewEntry}
                title="Start New Reflection"
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-transform"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            )}

            {/* Quick Streak Pill (if any) */}
            {hasActiveAccount && streak && streak.currentStreak > 0 && (
              <button
                id="btn-nav-mobile-streak-pill"
                onClick={onOpenProfile}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span>{streak.currentStreak}</span>
              </button>
            )}

            {/* Mobile Drawer Trigger (Hamburger Button) */}
            <button
              id="btn-nav-mobile-drawer-toggle"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Open User Actions Drawer"
              title="Open Navigation & User Actions"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center justify-center relative"
            >
              <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MOBILE USER ACTIONS SLIDE-OVER DRAWER                    */}
      {/* ======================================================== */}
      {isMobileDrawerOpen && (
        <div className="md:hidden">
          {/* Backdrop */}
          <div
            id="mobile-nav-backdrop"
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div
            id="mobile-user-actions-drawer"
            className="fixed inset-y-0 right-0 z-50 w-[85%] max-w-[340px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 overflow-y-auto"
          >
            {/* Top Area: Header & User Identity */}
            <div className="flex-1 flex flex-col">
              {/* Drawer Top Bar */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    User Actions
                  </span>
                </div>
                <button
                  id="btn-close-mobile-drawer"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Identity Card */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                {hasActiveAccount && user ? (
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        className="w-11 h-11 rounded-full border border-slate-200 dark:border-slate-700 object-cover ring-2 ring-indigo-500/20 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {(user.displayName || user.email || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {user.displayName || (user.email ? user.email.split("@")[0] : "User")}
                        </span>
                        {isAdmin && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                      {streak && streak.currentStreak > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          <Flame className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{streak.currentStreak} Day Login Streak</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                        G
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Guest Reflection Session
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {guestEntryCount}/{maxGuestEntries} trial reflections saved locally
                        </p>
                      </div>
                    </div>
                    <button
                      id="btn-mobile-drawer-guest-signin"
                      onClick={() => handleMobileAction(() => onOpenAuthModal?.(
                        "Sign In to Your Active Account",
                        "Sign in to unlock reflection sessions, weekly digests, past entries, and Cloud Firestore synchronization."
                      ))}
                      className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In for Full Cloud Access</span>
                    </button>
                    {isGuest && (
                      <button
                        id="btn-mobile-drawer-exit-guest"
                        type="button"
                        onClick={() => handleMobileAction(onSignOut)}
                        className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Landing Page</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation & Action Links */}
              <div className="p-3 space-y-1">
                <span className="px-3 text-[10px] font-extrabold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  Journal Actions
                </span>

                {/* New Reflection */}
                <button
                  id="btn-mobile-nav-new-entry"
                  onClick={() => handleMobileAction(onNewEntry)}
                  className="w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        New Reflection
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Start a new AI-guided entry
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                </button>

                {/* Past Entries */}
                <button
                  id="btn-mobile-nav-history"
                  onClick={() => handleMobileAction(onToggleHistory)}
                  className={`w-full p-3 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer group ${
                    isHistoryOpen
                      ? "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Past Entries</span>
                        {isHistoryOpen && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Browse saved reflections & transcripts
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                </button>

                {/* Weekly Digest */}
                {hasActiveAccount && onOpenWeeklyDigest && (
                  <button
                    id="btn-mobile-nav-weekly-digest"
                    onClick={() => handleMobileAction(onOpenWeeklyDigest)}
                    className="w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Weekly Digest</span>
                          <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                            Saturday
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          AI synthesis of your week
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                  </button>
                )}

                {/* Admin Portal (if admin) */}
                {isAdmin && onOpenAdminPanel && (
                  <button
                    id="btn-mobile-nav-admin"
                    onClick={() => handleMobileAction(onOpenAdminPanel)}
                    className="w-full p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-left transition-colors flex items-center justify-between cursor-pointer group border border-purple-100 dark:border-purple-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-purple-900 dark:text-purple-200">
                          Admin Portal
                        </div>
                        <div className="text-[11px] text-purple-600 dark:text-purple-400">
                          Users, appeals & system security
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-400 transition-colors" />
                  </button>
                )}

                {/* User Profile */}
                {hasActiveAccount && (
                  <button
                    id="btn-mobile-nav-profile"
                    onClick={() => handleMobileAction(onOpenProfile)}
                    className="w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Profile & Cloud Stats
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Account settings and daily streaks
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                  </button>
                )}

                {/* Test Walkthrough Guide */}
                {showTestGuide && (
                  <button
                    id="btn-mobile-nav-guide"
                    onClick={() => handleMobileAction(onToggleWalkthrough)}
                    className="w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Test Walkthrough Guide
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Feature verification checklist
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                  </button>
                )}

                {/* Cloud Persistence State Pill (Mobile) */}
                {hasActiveAccount && saveStatus && saveStatus !== "idle" && (
                  <div className="mt-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Cloud Sync:</span>
                    {saveStatus === "saving" && (
                      <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </span>
                    )}
                    {saveStatus === "saved" && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Saved</span>
                      </span>
                    )}
                    {saveStatus === "error" && (
                      <button
                        onClick={onRetrySave}
                        className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold hover:underline"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Retry Save</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section: Theme Switcher & Authentication */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
              {/* Appearance / Theme Toggle Row */}
              {onToggleTheme && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {theme === "dark" ? (
                      <Moon className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" />
                    )}
                    <span>Appearance</span>
                  </div>
                  <button
                    id="btn-mobile-nav-theme"
                    onClick={onToggleTheme}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                  >
                    {theme === "dark" ? "Dark Mode" : "Light Mode"}
                  </button>
                </div>
              )}

              {/* Sign In or Sign Out Button */}
              {hasActiveAccount && user ? (
                <button
                  id="btn-mobile-nav-sign-out"
                  onClick={() => handleMobileAction(onSignOut)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <div className="space-y-2">
                  {isGuest && (
                    <button
                      id="btn-mobile-nav-exit-guest"
                      type="button"
                      onClick={() => handleMobileAction(onSignOut)}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Landing Page</span>
                    </button>
                  )}
                  <button
                    id="btn-mobile-nav-sign-in"
                    onClick={() => handleMobileAction(() => onOpenAuthModal?.(
                      "Sign In to Your Active Account",
                      "Sign in to unlock reflection sessions, weekly digests, past entries, and Cloud Firestore synchronization."
                    ))}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

