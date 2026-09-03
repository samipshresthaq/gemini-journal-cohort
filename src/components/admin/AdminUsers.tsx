import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  ShieldAlert,
  Search,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Mail,
  Calendar,
  Lock,
  ChevronRight,
  Shield,
  FileText,
  X,
} from "lucide-react";
import { AuthUser, UserProfile, AdminAuditLog, UserRole, UserAccountStatus, DeactivationAppeal } from "../../types";
import {
  setUserAccountStatus,
  setUserRole,
  adminCreateUser,
  subscribeToAdminAuditLogs,
  subscribeToAppeals,
} from "../../lib/adminService";

interface AdminUsersProps {
  currentUser: AuthUser;
  users: UserProfile[];
  isLoading: boolean;
  onRefresh?: () => void;
  onNavigateToAppeals?: () => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({
  currentUser,
  users,
  isLoading,
  onRefresh,
  onNavigateToAppeals,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deactivated" | "admin" | "user">("all");
  const [activeSubTab, setActiveSubTab] = useState<"directory" | "audit">("directory");
  const [appeals, setAppeals] = useState<DeactivationAppeal[]>([]);

  // Deactivation confirmation modal state
  const [deactivatingUser, setDeactivatingUser] = useState<UserProfile | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New user modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [newStatus, setNewStatus] = useState<UserAccountStatus>("active");

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(true);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Subscribe to audit logs
  useEffect(() => {
    const unsub = subscribeToAdminAuditLogs(
      (logs) => {
        setAuditLogs(logs);
        setIsAuditLoading(false);
      },
      (err) => {
        console.warn("Audit logs stream error:", err);
        setIsAuditLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Subscribe to appeals for status correlation
  useEffect(() => {
    const unsub = subscribeToAppeals(
      (appealsList) => {
        setAppeals(appealsList);
      },
      (err) => {
        console.warn("[AdminUsers] Appeals stream notice:", err?.message);
      }
    );
    return () => unsub();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.displayName && u.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        u.uid.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "active") return u.status === "active";
      if (statusFilter === "deactivated") return u.status === "deactivated";
      if (statusFilter === "admin") return u.role === "admin";
      if (statusFilter === "user") return u.role === "user";

      return true;
    });
  }, [users, searchQuery, statusFilter]);

  // Handle status toggle
  const handleToggleStatus = async (user: UserProfile) => {
    if (user.uid === currentUser.uid) {
      setActionError("Self-Protection: You cannot deactivate your own active administrator account.");
      return;
    }

    if (user.status === "active") {
      // Open modal to specify reason
      setDeactivatingUser(user);
      setDeactivationReason("");
      setActionError(null);
    } else {
      // Directly reactivate
      setIsProcessingAction(true);
      setActionError(null);
      try {
        await setUserAccountStatus(currentUser, user.uid, user.email, "active");
        setActionSuccess(`Account for ${user.email} has been reactivated.`);
        setTimeout(() => setActionSuccess(null), 3000);
      } catch (err: any) {
        setActionError(err.message || "Failed to reactivate user account.");
      } finally {
        setIsProcessingAction(false);
      }
    }
  };

  const confirmDeactivation = async () => {
    if (!deactivatingUser) return;
    setIsProcessingAction(true);
    setActionError(null);

    try {
      await setUserAccountStatus(
        currentUser,
        deactivatingUser.uid,
        deactivatingUser.email,
        "deactivated",
        deactivationReason.trim() || "Deactivated by administrator"
      );
      setActionSuccess(`Account for ${deactivatingUser.email} is now deactivated.`);
      setDeactivatingUser(null);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || "Failed to deactivate user account.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle role change
  const handleToggleRole = async (user: UserProfile) => {
    if (user.uid === currentUser.uid) {
      setActionError("Safety Guard: You cannot demote your own administrator privileges.");
      return;
    }

    const newRole: UserRole = user.role === "admin" ? "user" : "admin";
    setIsProcessingAction(true);
    setActionError(null);

    try {
      await setUserRole(currentUser, user.uid, user.email, newRole);
      setActionSuccess(`Role for ${user.email} updated to ${newRole.toUpperCase()}.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || "Failed to update user role.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle user creation
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.includes("@")) {
      setActionError("Please provide a valid email address.");
      return;
    }

    setIsProcessingAction(true);
    setActionError(null);

    try {
      await adminCreateUser(currentUser, newEmail, newName, newRole, newStatus);
      setActionSuccess(`User ${newEmail} created successfully.`);
      setIsCreateModalOpen(false);
      setNewEmail("");
      setNewName("");
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || "Failed to provision user.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="font-medium">{actionError}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        {/* Header & Subtabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              id="subtab-user-directory"
              onClick={() => setActiveSubTab("directory")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "directory"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Directory ({users.length})</span>
            </button>
            <button
              id="subtab-audit-trail"
              onClick={() => setActiveSubTab("audit")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "audit"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Security Audit Trail ({auditLogs.length})</span>
            </button>

            {onNavigateToAppeals && (
              <button
                id="subtab-admin-appeals"
                onClick={onNavigateToAppeals}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span>Appeals</span>
                {appeals.filter((a) => a.status === "pending").length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                    {appeals.filter((a) => a.status === "pending").length}
                  </span>
                )}
              </button>
            )}
          </div>

          {activeSubTab === "directory" && (
            <div className="flex items-center gap-2">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  title="Refresh Users"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-500" : ""}`} />
                </button>
              )}
              <button
                id="btn-add-user-modal"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:shadow transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Provision User</span>
              </button>
            </div>
          )}
        </div>

        {/* Directory View */}
        {activeSubTab === "directory" && (
          <>
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="input-search-users"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by name, email, or user ID..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] self-stretch sm:self-auto overflow-x-auto">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === "all"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All ({users.length})
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === "active"
                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Active ({users.filter((u) => u.status === "active").length})
                </button>
                <button
                  onClick={() => setStatusFilter("deactivated")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === "deactivated"
                      ? "bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-2xs font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Deactivated ({users.filter((u) => u.status === "deactivated").length})
                </button>
                <button
                  onClick={() => setStatusFilter("admin")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === "admin"
                      ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-2xs font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Admins ({users.filter((u) => u.role === "admin").length})
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                      const isCurrent = user.uid === currentUser.uid;
                      const isActive = user.status === "active";
                      const isAdmin = user.role === "admin";
                      const userAppeal = appeals.find(
                        (a) =>
                          a.userId === user.uid ||
                          a.userEmail.toLowerCase() === user.email.toLowerCase()
                      );

                      return (
                        <tr
                          key={user.uid}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            !isActive ? "bg-red-50/20 dark:bg-red-950/10 opacity-80" : ""
                          }`}
                        >
                          {/* User Column */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {user.photoURL ? (
                                <img
                                  src={user.photoURL}
                                  alt={user.displayName || user.email}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase text-white ${
                                    isAdmin
                                      ? "bg-gradient-to-tr from-purple-600 to-indigo-600"
                                      : "bg-slate-600"
                                  }`}
                                >
                                  {user.displayName
                                    ? user.displayName.charAt(0)
                                    : user.email.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{user.displayName || "Anonymous User"}</span>
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role Column */}
                          <td className="py-3 px-4">
                            <button
                              disabled={isCurrent || isProcessingAction}
                              onClick={() => handleToggleRole(user)}
                              title={
                                isCurrent
                                  ? "Cannot modify own role"
                                  : `Click to switch to ${isAdmin ? "User" : "Admin"}`
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                isCurrent ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:shadow-2xs"
                              } ${
                                isAdmin
                                  ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {isAdmin ? (
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              ) : (
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span className="capitalize">{user.role}</span>
                            </button>
                          </td>

                          {/* Status Column */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  isActive
                                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                                }`}
                              >
                                {isActive ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>Active</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    <span>Deactivated</span>
                                  </>
                                )}
                              </span>

                              {/* Appeal Indicator if deactivated user submitted appeal */}
                              {!isActive && userAppeal && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToAppeals?.()}
                                  title={`Appeal: "${userAppeal.subject}". Click to view appeals.`}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                    userAppeal.status === "pending"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  <span className="capitalize">Appeal {userAppeal.status}</span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Registered Column */}
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {new Date(user.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>

                          {/* Last Active Column */}
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {new Date(user.lastLoginAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </td>

                          {/* Access Actions Column */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isActive && userAppeal && userAppeal.status === "pending" && onNavigateToAppeals && (
                                <button
                                  type="button"
                                  onClick={onNavigateToAppeals}
                                  title="Review user appeal"
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                                >
                                  <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  <span>Review Appeal</span>
                                </button>
                              )}

                              {isActive ? (
                                <button
                                  id={`btn-deactivate-user-${user.uid}`}
                                  disabled={isCurrent || isProcessingAction}
                                  onClick={() => handleToggleStatus(user)}
                                  title={isCurrent ? "Cannot deactivate own account" : "Deactivate user access"}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                    isCurrent
                                      ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                                      : "bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/80 cursor-pointer shadow-2xs"
                                  }`}
                                >
                                  <span className="flex items-center gap-1">
                                    <UserX className="w-3.5 h-3.5" />
                                    Deactivate
                                  </span>
                                </button>
                              ) : (
                                <button
                                  id={`btn-activate-user-${user.uid}`}
                                  disabled={isProcessingAction}
                                  onClick={() => handleToggleStatus(user)}
                                  title="Reactivate user access"
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Reactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No users match the search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Audit Trail View */}
        {activeSubTab === "audit" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Immutable audit trail logging all administrative role assignments, user status changes, and credential activations.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target User</th>
                    <th className="py-3 px-4">Admin Performed By</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                              log.action === "activate"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                : log.action === "deactivate"
                                ? "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300"
                                : log.action === "role_change"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                            }`}
                          >
                            {log.action.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200">
                          {log.targetEmail}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {log.adminEmail}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                          {log.details || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        {isAuditLoading ? "Loading security audit records..." : "No administrative actions recorded yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Deactivation Confirmation Modal */}
      {deactivatingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Deactivate User Account
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {deactivatingUser.email}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Deactivating this account will immediately block the user from signing in and revoke active session capabilities. Their existing journal reflections will remain safely preserved in the database.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Administrative Reason (Optional)
              </label>
              <input
                type="text"
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                placeholder="e.g. Terms violation, Temporary access pause, User requested..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeactivatingUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-deactivate"
                type="button"
                disabled={isProcessingAction}
                onClick={confirmDeactivation}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                {isProcessingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Deactivation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Provision User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Provision New User
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Create and seed an account directly in the user database
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  id="input-create-email"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  id="input-create-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full Name or Alias"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    System Role
                  </label>
                  <select
                    id="select-create-role"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="user">User (Standard)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    id="select-create-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as UserAccountStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-create-user"
                  type="submit"
                  disabled={isProcessingAction}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {isProcessingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Provision Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
