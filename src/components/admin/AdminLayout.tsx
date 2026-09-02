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
} from "lucide-react";
import { AuthUser, UserProfile } from "../../types";
import { AdminDashboard } from "./AdminDashboard";
import { AdminUsers } from "./AdminUsers";
import { subscribeToUserDirectory } from "../../lib/adminService";

export type AdminRoute = "dashboard" | "users";

interface AdminLayoutProps {
  currentUser: AuthUser;
  activeRoute: AdminRoute;
  onRouteChange: (route: AdminRoute) => void;
  onBackToJournal: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  activeRoute,
  onRouteChange,
  onBackToJournal,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);

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

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand & Return link */}
            <div className="flex items-center gap-4">
              <button
                id="btn-admin-back-to-journal"
                onClick={onBackToJournal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Return to Journal</span>
              </button>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                      Admin Control Portal
                    </h1>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold uppercase border border-indigo-200 dark:border-indigo-800">
                      v2.4
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Logged in as {currentUser.displayName || currentUser.email} (Super Admin)
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Route Switcher Tabs */}
            <div className="flex items-center gap-2">
              <nav className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80">
                <button
                  id="admin-route-tab-dashboard"
                  onClick={() => onRouteChange("dashboard")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeRoute === "dashboard"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>

                <button
                  id="admin-route-tab-users"
                  onClick={() => onRouteChange("users")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeRoute === "users"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Users</span>
                  {totalUsers > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        activeRoute === "users"
                          ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {totalUsers}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Routed Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeRoute === "dashboard" && (
          <AdminDashboard
            liveUsers={users}
            onNavigateToUsers={() => onRouteChange("users")}
          />
        )}

        {activeRoute === "users" && (
          <AdminUsers
            currentUser={currentUser}
            users={users}
            isLoading={isUsersLoading}
          />
        )}
      </main>

      {/* Footer System Status */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Telemetry Server Active • 4-tier Gemini Fallback Resiliency</span>
          </div>
          <div>
            <span>Firestore Owner-Bound Security Rules Enforced</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
