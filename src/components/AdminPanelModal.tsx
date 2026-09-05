import React, { useState, useEffect } from "react";
import { 
  X, 
  ShieldCheck, 
  Users, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  Copy, 
  Check, 
  RefreshCw, 
  Mail, 
  Calendar,
  Lock,
  ArrowUpDown,
  FileText,
  Sun,
  Moon,
  MailX,
} from "lucide-react";
import { AuthUser, UserProfile, AdminAuditLog, UserRole, UserAccountStatus, DeactivationAppeal } from "../types";
import { 
  subscribeToUserDirectory,
  setUserAccountStatus,
  setUserRole,
  adminCreateUser,
  adminToggleUserDigestSubscription,
  subscribeToAdminAuditLogs,
  subscribeToAppeals,
} from "../lib/adminService";
import { AdminAppeals } from "./admin/AdminAppeals";

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  theme,
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<"users" | "create" | "audit" | "appeals">("users");

  // Local theme state with graceful fallback
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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [appeals, setAppeals] = useState<DeactivationAppeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deactivated">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");

  // Deactivation confirmation modal state
  const [selectedUserToDeactivate, setSelectedUserToDeactivate] = useState<UserProfile | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // New User Creation Form state
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [newStatus, setNewStatus] = useState<UserAccountStatus>("active");
  const [newWeeklyDigestEnabled, setNewWeeklyDigestEnabled] = useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Status feedback toast
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Real-time subscription to User Directory & Audit Logs
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);

    const unsubUsers = subscribeToUserDirectory(
      (updatedUsers) => {
        setUsers(updatedUsers);
        setIsLoading(false);
      },
      (err) => {
        console.warn("Notice loading user directory:", err);
        setActionErrorMessage("Could not load user directory. Please check network connection.");
        setIsLoading(false);
      }
    );

    const unsubAudit = subscribeToAdminAuditLogs(
      (logs) => {
        setAuditLogs(logs);
      },
      (err) => {
        console.warn("Could not load audit logs:", err);
      }
    );

    const unsubAppeals = subscribeToAppeals(
      (appealsList) => {
        setAppeals(appealsList);
      },
      (err) => {
        console.warn("Could not load appeals:", err);
      }
    );

    return () => {
      unsubUsers();
      unsubAudit();
      unsubAppeals();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleStatus = async (user: UserProfile) => {
    if (user.status === "active") {
      // Open deactivation confirmation dialog
      setSelectedUserToDeactivate(user);
      setDeactivationReason("Account deactivated via administrative console");
    } else {
      // Activate immediately
      setIsProcessingAction(true);
      setActionErrorMessage(null);
      setActionSuccessMessage(null);
      try {
        await setUserAccountStatus(currentUser, user.uid, user.email, "active");
        setActionSuccessMessage(`Successfully reactivated account: ${user.email}`);
        setTimeout(() => setActionSuccessMessage(null), 4000);
      } catch (err: any) {
        setActionErrorMessage(err.message || "Failed to activate user.");
      } finally {
        setIsProcessingAction(false);
      }
    }
  };

  const handleConfirmDeactivation = async () => {
    if (!selectedUserToDeactivate) return;
    setIsProcessingAction(true);
    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    try {
      await setUserAccountStatus(
        currentUser,
        selectedUserToDeactivate.uid,
        selectedUserToDeactivate.email,
        "deactivated",
        deactivationReason.trim() || "Account deactivated via administrative console"
      );
      setActionSuccessMessage(`Successfully deactivated account: ${selectedUserToDeactivate.email}`);
      setSelectedUserToDeactivate(null);
      setDeactivationReason("");
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      setActionErrorMessage(err.message || "Failed to deactivate user.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleToggleRole = async (user: UserProfile) => {
    const newRole: UserRole = user.role === "admin" ? "user" : "admin";
    setIsProcessingAction(true);
    setActionErrorMessage(null);
    try {
      await setUserRole(currentUser, user.uid, user.email, newRole);
      setActionSuccessMessage(`Updated role for ${user.email} to ${newRole.toUpperCase()}`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      setActionErrorMessage(err.message || "Failed to update role.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleToggleDigestSubscription = async (targetUser: UserProfile) => {
    const nextSubscribed = targetUser.weeklyDigestEnabled === false ? true : false;
    setIsProcessingAction(true);
    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    try {
      await adminToggleUserDigestSubscription(
        currentUser,
        targetUser.uid,
        targetUser.email,
        nextSubscribed
      );
      targetUser.weeklyDigestEnabled = nextSubscribed;
      setActionSuccessMessage(
        `Weekly digest email for ${targetUser.email || targetUser.displayName || targetUser.uid} updated to ${
          nextSubscribed ? "Subscribed" : "Paused"
        }.`
      );
      setTimeout(() => setActionSuccessMessage(null), 3500);
    } catch (err: any) {
      setActionErrorMessage(err.message || "Failed to update digest subscription preference.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes("@")) {
      setActionErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsCreatingUser(true);
    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    try {
      await adminCreateUser(currentUser, newEmail, newName, newRole, newStatus, newWeeklyDigestEnabled);
      setActionSuccessMessage(`User ${newEmail} created and added to directory!`);
      setNewEmail("");
      setNewName("");
      setNewRole("user");
      setNewStatus("active");
      setNewWeeklyDigestEnabled(true);
      setActiveTab("users");
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      setActionErrorMessage(err.message || "Could not create user account.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.displayName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.uid.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ? true : u.status === statusFilter;

    const matchesRole =
      roleFilter === "all" ? true : u.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.status === "active").length;
  const deactivatedUsersCount = users.filter((u) => u.status === "deactivated").length;
  const adminsCount = users.filter((u) => u.role === "admin").length;

  return (
    <div
      id="admin-panel-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="admin-panel-card"
        className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-left relative"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  System Administration Portal
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <Lock className="w-3 h-3" /> Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage user directory, activate/deactivate accounts, and inspect security audit logs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-admin-modal-theme-toggle"
              onClick={handleToggleTheme}
              type="button"
              title={`Switch to ${isDarkMode ? "Light" : "Dark"} Mode`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-2xs border border-slate-200/80 dark:border-slate-700"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              )}
            </button>

            <button
              id="btn-close-admin-panel"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metrics Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:px-6 bg-slate-100/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Total Users
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {totalUsersCount}
              </span>
            </div>
            <Users className="w-5 h-5 text-slate-400" />
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                Active Users
              </span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {activeUsersCount}
              </span>
            </div>
            <UserCheck className="w-5 h-5 text-emerald-500" />
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-rose-200/80 dark:border-rose-800/60 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                Deactivated
              </span>
              <span className="text-lg font-bold text-rose-700 dark:text-rose-300">
                {deactivatedUsersCount}
              </span>
            </div>
            <UserX className="w-5 h-5 text-rose-500" />
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider block">
                Administrators
              </span>
              <span className="text-lg font-bold text-purple-700 dark:text-purple-300">
                {adminsCount}
              </span>
            </div>
            <ShieldAlert className="w-5 h-5 text-purple-500" />
          </div>
        </div>

        {/* Secret Manager Governance Notice */}
        <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <span className="font-bold">Access Governance: </span>
              <span className="text-slate-600 dark:text-slate-300">
                Credentials dynamically governed by Google Cloud Secret Manager & Role-Based Firestore Rules.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px] flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Zero Hardcoding Compliant</span>
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold shrink-0">
          <button
            id="tab-admin-users"
            onClick={() => setActiveTab("users")}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "users"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> User Directory ({users.length})
          </button>

          <button
            id="tab-admin-create"
            onClick={() => setActiveTab("create")}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "create"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Provision New User
          </button>

          <button
            id="tab-admin-audit"
            onClick={() => setActiveTab("audit")}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "audit"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Security Audit Trail ({auditLogs.length})
          </button>

          <button
            id="tab-admin-appeals"
            onClick={() => setActiveTab("appeals")}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "appeals"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Appeals</span>
            {appeals.filter((a) => a.status === "pending").length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                {appeals.filter((a) => a.status === "pending").length}
              </span>
            ) : appeals.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {appeals.length}
              </span>
            ) : null}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Notification Banners */}
          {actionSuccessMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{actionSuccessMessage}</span>
            </div>
          )}

          {actionErrorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{actionErrorMessage}</span>
            </div>
          )}

          {/* TAB 1: User Directory */}
          {activeTab === "users" && (
            <div className="space-y-4">
              
              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-admin-search-users"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users by name, email, or user ID..."
                    className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Filter */}
                  <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        statusFilter === "all"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatusFilter("active")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        statusFilter === "active"
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => setStatusFilter("deactivated")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        statusFilter === "deactivated"
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      }`}
                    >
                      Deactivated
                    </button>
                  </div>

                  {/* Role Filter */}
                  <select
                    id="select-admin-role-filter"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admins Only</option>
                    <option value="user">Standard Users</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              {isLoading ? (
                <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                  <span>Loading user directory from Cloud Firestore...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-10 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <Users className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No users match your criteria</h4>
                  <p className="text-xs text-slate-500">Try adjusting your search terms or filter selection.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-3.5 pl-4">User Details</th>
                          <th className="p-3.5">Role</th>
                          <th className="p-3.5">Account Status</th>
                          <th className="p-3.5">Weekly Digest</th>
                          <th className="p-3.5 hidden md:table-cell">Created / Last Login</th>
                          <th className="p-3.5 text-right pr-4">Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUsers.map((u) => {
                          const isCurrentAdmin = u.uid === currentUser.uid || u.email === currentUser.email;
                          const isActive = u.status === "active";

                          return (
                            <tr
                              key={u.uid}
                              className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                                !isActive ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                              }`}
                            >
                              {/* User Details */}
                              <td className="p-3.5 pl-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                    u.role === "admin" 
                                      ? "bg-purple-600 text-white" 
                                      : "bg-indigo-600 text-white"
                                  }`}>
                                    {(u.displayName || u.email || "U")[0].toUpperCase()}
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-900 dark:text-slate-100">
                                        {u.displayName || "Anonymous User"}
                                      </span>
                                      {isCurrentAdmin && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                      {u.email}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Role */}
                              <td className="p-3.5">
                                <button
                                  onClick={() => handleToggleRole(u)}
                                  disabled={isCurrentAdmin || isProcessingAction}
                                  title={isCurrentAdmin ? "Cannot change your own role" : "Click to switch role between Admin and User"}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer disabled:cursor-not-allowed ${
                                    u.role === "admin"
                                      ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                                  }`}
                                >
                                  {u.role === "admin" ? (
                                    <>
                                      <ShieldCheck className="w-3 h-3" /> Admin
                                    </>
                                  ) : (
                                    <>
                                      <Users className="w-3 h-3" /> User
                                    </>
                                  )}
                                </button>
                              </td>

                              {/* Status Badge */}
                              <td className="p-3.5">
                                <div className="space-y-1">
                                  {isActive ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                      Deactivated
                                    </span>
                                  )}

                                  {!isActive && u.deactivationReason && (
                                    <p className="text-[10px] text-rose-600 dark:text-rose-400 italic max-w-xs truncate">
                                      Reason: {u.deactivationReason}
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* Weekly Digest Subscription Toggle */}
                              <td className="p-3.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDigestSubscription(u)}
                                  disabled={isProcessingAction}
                                  title={`Click to toggle Saturday weekly digest email for ${u.email || u.displayName}`}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                                    u.weeklyDigestEnabled !== false
                                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                                  }`}
                                >
                                  {u.weeklyDigestEnabled !== false ? (
                                    <>
                                      <Mail className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                      <span>Subscribed</span>
                                    </>
                                  ) : (
                                    <>
                                      <MailX className="w-3 h-3 text-slate-400" />
                                      <span>Off</span>
                                    </>
                                  )}
                                </button>
                              </td>

                              {/* Dates */}
                              <td className="p-3.5 hidden md:table-cell text-slate-500 dark:text-slate-400">
                                <div className="space-y-0.5">
                                  <div>Joined: {new Date(u.createdAt).toLocaleDateString()}</div>
                                  <div className="text-[11px] opacity-80">
                                    Last Active: {new Date(u.lastLoginAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="p-3.5 text-right pr-4">
                                {isCurrentAdmin ? (
                                  <span className="text-[11px] text-slate-400 font-medium italic">
                                    Current Session
                                  </span>
                                ) : (
                                  <button
                                    id={`btn-toggle-status-${u.uid}`}
                                    onClick={() => handleToggleStatus(u)}
                                    disabled={isProcessingAction}
                                    className={`py-1.5 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ml-auto cursor-pointer disabled:opacity-50 ${
                                      isActive
                                        ? "bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs"
                                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20"
                                    }`}
                                  >
                                    {isActive ? (
                                      <>
                                        <UserX className="w-3.5 h-3.5" />
                                        <span>Deactivate</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="w-3.5 h-3.5" />
                                        <span>Activate</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: Provision New User */}
          {activeTab === "create" && (
            <div className="max-w-xl mx-auto p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-5">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-500" /> Provision a New System User
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Register a new account directly in the user directory with custom initial role and activation state.
                </p>
              </div>

              <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    id="input-create-user-email"
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full h-10 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="input-create-user-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Jordan Miller"
                    className="w-full h-10 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Account Role
                    </label>
                    <select
                      id="select-create-user-role"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full h-10 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                    >
                      <option value="user">Standard User</option>
                      <option value="admin">System Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Initial Status
                    </label>
                    <select
                      id="select-create-user-status"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as UserAccountStatus)}
                      className="w-full h-10 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                    >
                      <option value="active">Active</option>
                      <option value="deactivated">Deactivated</option>
                    </select>
                  </div>
                </div>

                {/* Digest Subscription Option */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                  <input
                    id="input-create-digest-opt"
                    type="checkbox"
                    checked={newWeeklyDigestEnabled}
                    onChange={(e) => setNewWeeklyDigestEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label
                    htmlFor="input-create-digest-opt"
                    className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none"
                  >
                    Subscribe user to Saturday Weekly Journal Digest emails
                  </label>
                </div>

                <button
                  type="submit"
                  id="btn-submit-create-user"
                  disabled={isCreatingUser}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isCreatingUser ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Provisioning Account...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Register User in Directory
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Audit Activity Trail */}
          {activeTab === "audit" && (
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <div className="p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No audit events recorded yet</h4>
                  <p className="text-xs text-slate-500">
                    Administrative actions like account activation and deactivation will be logged here immutably.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.action === "activate"
                              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : log.action === "deactivate"
                              ? "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              : "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                          }`}>
                            {log.action}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            Target: {log.targetEmail}
                          </span>
                        </div>
                        {log.details && (
                          <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                            {log.details}
                          </p>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono shrink-0">
                        Admin: {log.adminEmail} • {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Deactivation Appeals */}
          {activeTab === "appeals" && (
            <AdminAppeals
              currentUser={currentUser}
              liveUsers={users}
              onNavigateToUsers={() => setActiveTab("users")}
            />
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Admin session active for <strong>{currentUser.email}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close Portal
          </button>
        </div>

      </div>

      {/* Confirmation Modal for Deactivation */}
      {selectedUserToDeactivate && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900 max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
              <UserX className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Deactivate User Account?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deactivating <strong className="text-slate-800 dark:text-slate-200">{selectedUserToDeactivate.email}</strong> will immediately block their access to reflections, voice tools, and Gemini AI.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Deactivation <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="input-deactivation-reason"
                rows={2}
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                placeholder="e.g. Account flagged for administrative review"
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedUserToDeactivate(null);
                  setDeactivationReason("");
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-deactivate-user"
                onClick={handleConfirmDeactivation}
                disabled={isProcessingAction}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isProcessingAction ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deactivating...
                  </>
                ) : (
                  <>
                    <UserX className="w-3.5 h-3.5" /> Confirm Deactivation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
