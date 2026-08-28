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
  HelpCircle
} from "lucide-react";

interface NavbarProps {
  user: AuthUser | null;
  onSignOut: () => void;
  onNewEntry: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  saveStatus: SaveStatus;
  onRetrySave?: () => void;
  onToggleWalkthrough: () => void;
  isWalkthroughOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  onNewEntry,
  onToggleHistory,
  isHistoryOpen,
  saveStatus,
  onRetrySave,
  onToggleWalkthrough,
  isWalkthroughOpen,
}) => {
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
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100/90 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200/80">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Firestore Isolated
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden md:block">
              Private AI-Assisted Journal & Growth Synthesis
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cloud Persistence State Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border border-slate-200 bg-slate-50/80">
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
              onClick={onNewEntry}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>

            {/* User Profile and Sign Out */}
            <div className="flex items-center pl-2 border-l border-slate-200 gap-2">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover ring-2 ring-slate-100"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                  {(user.displayName || user.email || "U")[0].toUpperCase()}
                </div>
              )}

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
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline font-medium">
              Powered by Google GenAI SDK & Cloud Firestore
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
