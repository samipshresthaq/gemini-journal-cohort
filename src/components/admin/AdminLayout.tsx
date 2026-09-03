import React, { useState, useEffect } from "react";
import {
  Shield,
  LayoutDashboard,
  Users,
  ArrowLeft,
  Activity,
  Zap,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sun,
  Moon,
  Menu,
  X,
  Lock,
  ChevronRight,
  UserCheck,
  FileText,
  ExternalLink,
} from "lucide-react";
import { AuthUser, UserProfile, DeactivationAppeal } from "../../types";
import { AdminDashboard } from "./AdminDashboard";
import { AdminUsers } from "./AdminUsers";
import { AdminAppeals } from "./AdminAppeals";
import { subscribeToUserDirectory, subscribeToAppeals } from "../../lib/adminService";

export type AdminRoute = "dashboard" | "users" | "appeals";

interface AdminLayoutProps {
  currentUser: AuthUser;
  activeRoute: AdminRoute;
  onRouteChange: (route: AdminRoute) => void;
  onBackToJournal: () => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  activeRoute,
  onRouteChange,
  onBackToJournal,
  theme,
  onToggleTheme,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [appeals, setAppeals] = useState<DeactivationAppeal[]>([]);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Theme management with graceful fallback
  const [localTheme, setLocalTheme] = useState<"light" | "dark">(() => {
    if (theme) return theme;
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    if (theme) {
      setLocalTheme(theme);
    }
  }, [theme]);

  const currentTheme = theme || localTheme;
  const isDarkMode = currentTheme === "dark";

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      setLocalTheme(nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      try {
        localStorage.setItem("gemini_journal_theme", nextTheme);
      } catch (e) {
        console.warn("Theme storage notice:", e);
      }
    }
  };

  // Subscribe to live Firestore user list
  useEffect(() => {
    const unsub = subscribeToUserDirectory(
      (userList) => {
        setUsers(userList);
        setIsUsersLoading(false);
      },
      (err) => {
        console.warn("Failed to stream Firestore users:", err);
        setIsUsersLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Subscribe to live Firestore appeals list
  useEffect(() => {
    const unsubAppeals = subscribeToAppeals(
      (appealsList) => {
        setAppeals(appealsList);
      },
      (err) => {
        console.warn("Failed to stream appeals in AdminLayout:", err);
      }
    );

    return () => unsubAppeals();
  }, []);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const pendingAppealsCount = appeals.filter((a) => a.status === "pending").length;
  const totalAppealsCount = appeals.length;

  const handleNavClick = (route: AdminRoute) => {
    onRouteChange(route);
    setIsMobileNavOpen(false);
  };

  // Vertical Navigation Items content
  const renderNavContent = () => (
    <div className="flex flex-col h-full justify-between select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/90 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                  Admin Portal
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Gemini Reflection Journal
              </p>
            </div>
          </div>

          {/* Close mobile nav if open */}
          <button
            onClick={() => setIsMobileNavOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status indicator */}
        <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            System Online
          </span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/70 dark:border-emerald-800/60">
            Live Sync
          </span>
        </div>

        {/* Vertical Nav Buttons */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">
            Main Navigation
          </p>

          {/* 1. Dashboard Nav Button */}
          <button
            id="admin-nav-dashboard"
            onClick={() => handleNavClick("dashboard")}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group cursor-pointer text-left ${
              activeRoute === "dashboard"
                ? "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/90 dark:border-indigo-800/80 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-1.5 rounded-lg transition-colors ${
                  activeRoute === "dashboard"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <span className="text-[13px]">Dashboard</span>
            </div>
            {activeRoute === "dashboard" && (
              <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            )}
          </button>

          {/* 2. Users Nav Button */}
          <button
            id="admin-nav-users"
            onClick={() => handleNavClick("users")}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group cursor-pointer text-left ${
              activeRoute === "users"
                ? "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/90 dark:border-indigo-800/80 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-1.5 rounded-lg transition-colors ${
                  activeRoute === "users"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                }`}
              >
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[13px] block leading-tight">Users Directory</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                  {activeUsers} active
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  activeRoute === "users"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {totalUsers}
              </span>
              {activeRoute === "users" && (
                <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
          </button>

          {/* 3. Appeals Nav Button */}
          <button
            id="admin-nav-appeals"
            onClick={() => handleNavClick("appeals")}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group cursor-pointer text-left ${
              activeRoute === "appeals"
                ? "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/90 dark:border-indigo-800/80 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-1.5 rounded-lg transition-colors ${
                  activeRoute === "appeals"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[13px] block leading-tight">Appeals & Inquiries</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                  Account recovery
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {pendingAppealsCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500 text-white animate-pulse shadow-xs">
                  {pendingAppealsCount}
                </span>
              ) : totalAppealsCount > 0 ? (
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                    activeRoute === "appeals"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {totalAppealsCount}
                </span>
              ) : null}
              {activeRoute === "appeals" && (
                <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
          </button>
        </div>

        {/* System & Navigation Shortcuts */}
        <div className="space-y-1 pt-2">
          <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">
            Journal Navigation
          </p>

          <button
            id="btn-admin-back-to-journal"
            onClick={onBackToJournal}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/70 hover:bg-slate-200/80 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-all flex items-center gap-3 cursor-pointer group shadow-2xs"
          >
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:-translate-x-0.5 transition-transform shadow-2xs">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-[12px] font-bold block leading-tight">Return to Journal</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-400 font-normal">
                Back to reflection feed
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Vertical Navbar Bottom Area: Mode Toggle & Profile */}
      <div className="pt-6 mt-6 border-t border-slate-200/90 dark:border-slate-800 space-y-3.5">
        {/* Super Admin User Profile Card */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 uppercase">
              {(currentUser.displayName || currentUser.email || "A").charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser.displayName || currentUser.email?.split("@")[0] || "Administrator"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={currentUser.email || ""}>
                {currentUser.email || "System Admin"}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <Lock className="w-2.5 h-2.5" /> Admin
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-colors duration-200">
      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white block">
                Admin Portal
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                {activeRoute}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Theme Toggle Button */}
          <button
            id="admin-mobile-theme-toggle"
            onClick={handleToggleTheme}
            type="button"
            title={`Switch to ${isDarkMode ? "Light" : "Dark"} Mode`}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-2xs"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-500 fill-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          <button
            onClick={onBackToJournal}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop & Vertical Navbar */}
      {isMobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-white dark:bg-slate-900 h-full p-5 shadow-2xl flex flex-col z-10 border-r border-slate-200 dark:border-slate-800 overflow-y-auto">
            {renderNavContent()}
          </div>
        </div>
      )}

      {/* Desktop Vertical Navbar (Sidebar) */}
      <aside className="hidden md:flex flex-col w-64 xl:w-72 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 sticky top-0 h-screen p-5 overflow-y-auto z-30 transition-colors duration-200 shadow-2xs">
        {renderNavContent()}
      </aside>

      {/* Main Routed Content Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/70 dark:bg-slate-950 transition-colors duration-200">
        {/* Top Header Bar above Content (Desktop) */}
        <header className="hidden md:flex sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-6 py-3.5 items-center justify-between transition-colors">
          {/* Breadcrumb & Section title */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 dark:text-slate-500 font-medium">Admin Portal</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
            <span className="font-extrabold text-slate-900 dark:text-white capitalize">
              {activeRoute === "dashboard" && "Executive Dashboard & AI Telemetry"}
              {activeRoute === "users" && "User Governance & Directory"}
              {activeRoute === "appeals" && "Account Reactivation Appeals"}
            </span>
          </div>

          {/* Quick Header Tools: Theme Toggle, Governance Chip, Return Button */}
          <div className="flex items-center gap-3">
            {/* Header Theme Toggle */}
            <button
              id="admin-topbar-theme-toggle"
              onClick={handleToggleTheme}
              type="button"
              title={`Switch to ${isDarkMode ? "Light" : "Dark"} Mode`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs border border-slate-200/80 dark:border-slate-700"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-y-auto">
          {activeRoute === "dashboard" && (
            <AdminDashboard
              liveUsers={users}
              onNavigateToUsers={() => onRouteChange("users")}
              onNavigateToAppeals={() => onRouteChange("appeals")}
              pendingAppealsCount={pendingAppealsCount}
            />
          )}

          {activeRoute === "users" && (
            <AdminUsers
              currentUser={currentUser}
              users={users}
              isLoading={isUsersLoading}
              onNavigateToAppeals={() => onRouteChange("appeals")}
            />
          )}

          {activeRoute === "appeals" && (
            <AdminAppeals
              currentUser={currentUser}
              liveUsers={users}
              onNavigateToUsers={() => onRouteChange("users")}
            />
          )}
        </main>

        {/* Footer System Status */}
        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 py-3.5 px-4 sm:px-6 lg:px-8 mt-auto backdrop-blur-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Telemetry Server Active • 4-tier Gemini Fallback Resiliency</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Firestore Rules Verified • Zero-Hardcoded Access
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

