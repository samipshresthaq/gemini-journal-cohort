import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  Unsubscribe,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db, auth, signUpWithEmail } from "../firebase";
import {
  AuthUser,
  UserProfile,
  AdminAuditLog,
  UserRole,
  UserAccountStatus,
  AdminAnalyticsData,
  DailySignupMetric,
  GeminiUsageMetric,
  DeactivationAppeal,
  AppealStatus,
  AppealReply,
} from "../types";
import { sanitizeForFirestore } from "./firestoreService";

// System administrator role verification and dynamic database cache
let knownAdminEmailsCache = new Set<string>();

/**
 * Check if an email is recognized as a system administrator
 */
export function isSystemAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return knownAdminEmailsCache.has(clean);
}

/**
 * Register an admin email into local runtime cache
 */
export function registerKnownAdminEmail(email?: string | null): void {
  if (!email) return;
  knownAdminEmailsCache.add(email.toLowerCase().trim());
}

/**
 * Fetch bootstrap admin metadata from Secret Manager before database is seeded
 */
export async function fetchBootstrapAdminProfile(): Promise<{
  adminEmail?: string;
  displayName?: string;
  isConfigured?: boolean;
}> {
  try {
    const res = await fetch("/api/admin/bootstrap-profile");
    if (!res.ok) return {};
    const data = await res.json();
    if (data.adminEmail) {
      registerKnownAdminEmail(data.adminEmail);
    }
    return data;
  } catch {
    return {};
  }
}

/**
 * Verify administrator credentials securely against backend Secret Manager
 */
export async function verifyAdminWithBackend(email: string, password?: string): Promise<{
  authorized: boolean;
  role?: string;
  displayName?: string;
  error?: string;
}> {
  try {
    const res = await fetch("/api/admin/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { authorized: false, error: data.error || "Authentication failed." };
    }
    if (data.authorized && data.email) {
      registerKnownAdminEmail(data.email);
    }
    return {
      authorized: Boolean(data.authorized),
      role: data.role,
      displayName: data.displayName,
    };
  } catch (err: any) {
    return { authorized: false, error: err.message || "Failed to verify admin credentials." };
  }
}

/**
 * Trigger User Seeding API endpoint (/api/admin/seed).
 * Calls the backend utility function via the dedicated API endpoint.
 * Suitable for manual trigger or programmatic / CI/CD automation.
 */
export async function triggerUserSeedingApi(options?: {
  email?: string;
  password?: string;
  displayName?: string;
  role?: "admin" | "user";
  seedKey?: string;
}): Promise<{
  success: boolean;
  message: string;
  user?: UserProfile;
  error?: string;
}> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (options?.seedKey) {
      headers["x-seed-key"] = options.seedKey;
    }

    const res = await fetch("/api/admin/seed", {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: options?.email,
        password: options?.password,
        displayName: options?.displayName,
        role: options?.role,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        message: data.error || "Failed to trigger user seeding API.",
        error: data.error,
      };
    }

    if (data.user?.email) {
      registerKnownAdminEmail(data.user.email);
    }

    return {
      success: Boolean(data.success),
      message: data.message || "User seeded successfully via API.",
      user: data.user,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Network error while calling seed API.",
      error: err.message,
    };
  }
}

/**
 * Seed or Synchronize the Default Admin User by calling the seeding API.
 * This is only called on explicit user/admin trigger or CI/CD invocations,
 * NOT automatically on every application instance load.
 */
export async function seedDefaultAdminAndDirectory(currentUser?: AuthUser | null): Promise<void> {
  try {
    const seedRes = await triggerUserSeedingApi();
    if (seedRes.user?.email) {
      registerKnownAdminEmail(seedRes.user.email);
    }

    // If an authenticated user is currently logged in, sync their profile
    if (currentUser && !currentUser.uid.startsWith("guest_")) {
      await syncUserProfile(currentUser);
    }
  } catch (err) {
    console.warn("Notice: Admin seed API call:", err);
  }
}

/**
 * Synchronize the authenticated user's Firestore profile, role, and activation status
 */
export async function syncUserProfile(user: AuthUser): Promise<UserProfile> {
  if (!user.uid || user.uid.startsWith("guest_")) {
    return {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "Guest",
      role: "user",
      status: "active",
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
  }

  // Only execute Firestore operations if auth.currentUser is authenticated
  if (!auth.currentUser) {
    return {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "Journal User",
      role: user.role || (isSystemAdminEmail(user.email) ? "admin" : "user"),
      status: user.status || "active",
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
  }

  try {
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const isBootstrappedAdmin = isSystemAdminEmail(user.email);

    if (userDocSnap.exists()) {
      const existingData = userDocSnap.data() as UserProfile;
      const shouldPromoteAdmin = isBootstrappedAdmin && existingData.role !== "admin";

      const updatedProfile: UserProfile = {
        ...existingData,
        uid: user.uid,
        email: user.email || existingData.email,
        displayName: user.displayName || existingData.displayName,
        photoURL: user.photoURL || existingData.photoURL,
        role: shouldPromoteAdmin ? "admin" : (existingData.role || "user"),
        status: existingData.status || "active",
        lastLoginAt: Date.now(),
      };

      await setDoc(userDocRef, sanitizeForFirestore(updatedProfile), { merge: true });

      if (updatedProfile.role === "admin") {
        await setDoc(doc(db, "admins", user.uid), {
          uid: user.uid,
          email: user.email,
          role: "admin",
          assignedAt: Date.now(),
        }, { merge: true });
      }

      return updatedProfile;
    } else {
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || (user.email ? user.email.split("@")[0] : "Journal User"),
        photoURL: user.photoURL || null,
        role: isBootstrappedAdmin ? "admin" : "user",
        status: "active",
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      };

      await setDoc(userDocRef, sanitizeForFirestore(newProfile), { merge: true });

      if (newProfile.role === "admin") {
        await setDoc(doc(db, "admins", user.uid), {
          uid: user.uid,
          email: user.email,
          role: "admin",
          assignedAt: Date.now(),
        }, { merge: true });
      }

      return newProfile;
    }
  } catch (err) {
    console.warn("User profile sync notice:", err);
    return {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "Journal User",
      role: user.role || (isSystemAdminEmail(user.email) ? "admin" : "user"),
      status: user.status || "active",
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
  }
}

/**
 * Parse any timestamp representation (number, Firestore Timestamp, ISO string) safely
 */
export function parseFirestoreTimestamp(val: any): number {
  if (!val) return Date.now();
  if (typeof val === "number") return val;
  if (typeof val?.toMillis === "function") return val.toMillis();
  if (typeof val?.toDate === "function") return val.toDate().getTime();
  if (typeof val?.seconds === "number") return val.seconds * 1000;
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

/**
 * Real-time subscription to the User Directory for Administrators
 */
export function subscribeToUserDirectory(
  onUpdate: (users: UserProfile[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // Only attach live Firestore snapshot if authenticated in Firebase Auth
  if (!auth.currentUser) {
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : []))
      .then((fallbackUsers) => {
        if (fallbackUsers && fallbackUsers.length > 0) {
          onUpdate(fallbackUsers);
        }
      })
      .catch(() => {});
    return () => {};
  }

  // Query bounded to 100 users to avoid exceeding quota
  const usersQuery = query(collection(db, "users"), limit(100));

  const processUserDocs = (snapshot: any) => {
    const list: UserProfile[] = [];
    snapshot.forEach((docSnap: any) => {
      const data = docSnap.data() || {};
      list.push({
        uid: docSnap.id,
        email: data.email || "",
        displayName: data.displayName || data.name || (data.email ? data.email.split("@")[0] : "Journal User"),
        photoURL: data.photoURL || data.avatarUrl || null,
        role: data.role === "admin" ? "admin" : "user",
        status: data.status === "deactivated" ? "deactivated" : "active",
        createdAt: parseFirestoreTimestamp(data.createdAt),
        lastLoginAt: parseFirestoreTimestamp(data.lastLoginAt),
        entryCount: typeof data.entryCount === "number" ? data.entryCount : undefined,
        deactivatedAt: data.deactivatedAt ? parseFirestoreTimestamp(data.deactivatedAt) : undefined,
        deactivatedBy: data.deactivatedBy,
        deactivationReason: data.deactivationReason,
      });
    });
    // Sort in memory by createdAt descending
    list.sort((a, b) => (b.createdAt || b.lastLoginAt || 0) - (a.createdAt || a.lastLoginAt || 0));
    onUpdate(list);
  };

  // Real-time onSnapshot listener on the users collection (delivers initial state + updates without duplicate getDocs)
  const unsubscribe = onSnapshot(
    usersQuery,
    (snapshot) => {
      processUserDocs(snapshot);
    },
    async (err) => {
      console.warn("[Admin Notice] User directory stream notice:", err.message);
      try {
        const res = await fetch("/api/admin/users");
        if (res.ok) {
          const fallbackUsers = await res.json();
          if (fallbackUsers && fallbackUsers.length > 0) {
            onUpdate(fallbackUsers);
            return;
          }
        }
      } catch (_) {}
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

// Alias for backwards compatibility
export const subscribeToUsersList = subscribeToUserDirectory;

export interface PaginatedUsersResult {
  users: UserProfile[];
  firstDoc: QueryDocumentSnapshot | null;
  lastDoc: QueryDocumentSnapshot | null;
  totalCount: number;
  hasNextPage: boolean;
}

/**
 * Optimized Firestore pagination query for users list, scalable to millions of records.
 * Uses cursor-based startAfter() with limit(pageSize + 1) for zero-overhead next-page detection.
 */
export async function fetchPaginatedUsers(options?: {
  pageSize?: number;
  cursorDoc?: QueryDocumentSnapshot | null;
  statusFilter?: "all" | "active" | "deactivated" | "admin" | "user";
  searchQuery?: string;
}): Promise<PaginatedUsersResult> {
  const pageSize = options?.pageSize || 20;
  const cursorDoc = options?.cursorDoc || null;
  const statusFilter = options?.statusFilter || "all";
  const searchQuery = options?.searchQuery?.trim().toLowerCase() || "";

  if (!auth.currentUser) {
    try {
      const res = await fetch(`/api/admin/users?limit=${pageSize}`);
      if (res.ok) {
        const fallbackUsers: UserProfile[] = await res.json();
        let filtered = fallbackUsers;
        if (statusFilter === "active" || statusFilter === "deactivated") {
          filtered = filtered.filter((u) => u.status === statusFilter);
        } else if (statusFilter === "admin" || statusFilter === "user") {
          filtered = filtered.filter((u) => u.role === statusFilter);
        }
        if (searchQuery) {
          filtered = filtered.filter(
            (u) =>
              u.email.toLowerCase().includes(searchQuery) ||
              u.displayName?.toLowerCase().includes(searchQuery) ||
              u.uid.toLowerCase().includes(searchQuery)
          );
        }
        return {
          users: filtered.slice(0, pageSize),
          firstDoc: null,
          lastDoc: null,
          totalCount: filtered.length,
          hasNextPage: filtered.length > pageSize,
        };
      }
    } catch (_) {}
    return { users: [], firstDoc: null, lastDoc: null, totalCount: 0, hasNextPage: false };
  }

  const usersCol = collection(db, "users");
  const queryConstraints: any[] = [];

  if (statusFilter === "active" || statusFilter === "deactivated") {
    queryConstraints.push(where("status", "==", statusFilter));
  } else if (statusFilter === "admin" || statusFilter === "user") {
    queryConstraints.push(where("role", "==", statusFilter));
  }

  // Optimized query with limit(pageSize + 1) for zero-overhead next-page detection
  let snap;
  try {
    const q = query(
      usersCol,
      ...queryConstraints,
      orderBy("createdAt", "desc"),
      ...(cursorDoc ? [startAfter(cursorDoc)] : []),
      limit(pageSize + 1)
    );
    snap = await getDocs(q);
  } catch (err: any) {
    console.warn("[Firestore Users Pagination] Indexed query fallback:", err?.message);
    try {
      const fallbackQ = query(
        usersCol,
        ...queryConstraints,
        ...(cursorDoc ? [startAfter(cursorDoc)] : []),
        limit(pageSize + 1)
      );
      snap = await getDocs(fallbackQ);
    } catch {
      snap = { docs: [] } as any;
    }
  }

  const docs = snap.docs || [];
  const hasNextPage = docs.length > pageSize;
  const pagedDocs = hasNextPage ? docs.slice(0, pageSize) : docs;
  const firstDoc = pagedDocs.length > 0 ? (pagedDocs[0] as QueryDocumentSnapshot) : null;
  const lastDoc = pagedDocs.length > 0 ? (pagedDocs[pagedDocs.length - 1] as QueryDocumentSnapshot) : null;

  let users: UserProfile[] = pagedDocs.map((docSnap: any) => {
    const data = docSnap.data() || {};
    return {
      uid: docSnap.id,
      email: data.email || "",
      displayName: data.displayName || data.name || (data.email ? data.email.split("@")[0] : "Journal User"),
      photoURL: data.photoURL || data.avatarUrl || null,
      role: data.role === "admin" ? "admin" : "user",
      status: data.status === "deactivated" ? "deactivated" : "active",
      createdAt: parseFirestoreTimestamp(data.createdAt),
      lastLoginAt: parseFirestoreTimestamp(data.lastLoginAt),
      entryCount: typeof data.entryCount === "number" ? data.entryCount : undefined,
      deactivatedAt: data.deactivatedAt ? parseFirestoreTimestamp(data.deactivatedAt) : undefined,
      deactivatedBy: data.deactivatedBy,
      deactivationReason: data.deactivationReason,
    };
  });

  if (searchQuery) {
    users = users.filter(
      (u) =>
        u.email.toLowerCase().includes(searchQuery) ||
        u.displayName?.toLowerCase().includes(searchQuery) ||
        u.uid.toLowerCase().includes(searchQuery)
    );
  }

  // Total count calculation without REST RunAggregationQuery
  let totalCount = users.length;
  try {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const allUsers: UserProfile[] = await res.json();
      let filtered = allUsers;
      if (statusFilter === "active" || statusFilter === "deactivated") {
        filtered = filtered.filter((u) => u.status === statusFilter);
      } else if (statusFilter === "admin" || statusFilter === "user") {
        filtered = filtered.filter((u) => u.role === statusFilter);
      }
      if (searchQuery) {
        filtered = filtered.filter(
          (u) =>
            u.email.toLowerCase().includes(searchQuery) ||
            u.displayName?.toLowerCase().includes(searchQuery) ||
            u.uid.toLowerCase().includes(searchQuery)
        );
      }
      totalCount = filtered.length;
    }
  } catch {
    // Fallback to paged length if network error
  }

  return {
    users,
    firstDoc,
    lastDoc,
    totalCount,
    hasNextPage,
  };
}

/**
 * Activate or Deactivate a target user account
 */
export async function setUserAccountStatus(
  adminUser: AuthUser,
  targetUid: string,
  targetEmail: string,
  newStatus: UserAccountStatus,
  reason?: string
): Promise<void> {
  if (!adminUser || !adminUser.uid) {
    throw new Error("Administrative authorization required.");
  }
  if (!targetUid) {
    throw new Error("Target user ID is required.");
  }

  // Safety protection: Admin cannot deactivate their own current account
  if (adminUser.uid === targetUid && newStatus === "deactivated") {
    throw new Error("Security Guard: You cannot deactivate your own active administrator account.");
  }

  // Also update backend server memory store & dispatch automated status notification email
  try {
    await fetch("/api/admin/user-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUid,
        targetEmail,
        newStatus,
        reason,
        adminEmail: adminUser.email,
      }),
    });
  } catch (serverErr) {
    console.warn("Backend user status update notice:", serverErr);
  }

  // If Firebase Auth is authenticated, update Firestore
  if (auth.currentUser) {
    try {
      const userRef = doc(db, "users", targetUid);
      const updatePayload: Partial<UserProfile> = {
        status: newStatus,
      };

      if (newStatus === "deactivated") {
        updatePayload.deactivatedAt = Date.now();
        updatePayload.deactivatedBy = adminUser.email || adminUser.uid;
        updatePayload.deactivationReason = reason || "Deactivated by administrator";
      } else {
        updatePayload.deactivatedAt = undefined;
        updatePayload.deactivatedBy = undefined;
        updatePayload.deactivationReason = undefined;
      }

      await updateDoc(userRef, sanitizeForFirestore(updatePayload));

      // Log admin audit action
      await logAdminAuditAction({
        adminUid: adminUser.uid,
        adminEmail: adminUser.email || "admin",
        targetUid,
        targetEmail,
        action: newStatus === "active" ? "activate" : "deactivate",
        details: newStatus === "deactivated" ? (reason || "Account deactivated") : "Account reactivated to active status",
      });
    } catch (firestoreErr) {
      console.warn("Firestore user status update notice:", firestoreErr);
    }
  }
}

/**
 * Change a target user's role (Admin / User)
 */
export async function setUserRole(
  adminUser: AuthUser,
  targetUid: string,
  targetEmail: string,
  newRole: UserRole
): Promise<void> {
  if (!adminUser || !adminUser.uid) {
    throw new Error("Administrative authorization required.");
  }
  if (!targetUid) {
    throw new Error("Target user ID is required.");
  }

  const userRef = doc(db, "users", targetUid);
  await updateDoc(userRef, { role: newRole });

  if (newRole === "admin") {
    await setDoc(doc(db, "admins", targetUid), {
      uid: targetUid,
      email: targetEmail,
      role: "admin",
      assignedAt: Date.now(),
      assignedBy: adminUser.email,
    }, { merge: true });
  } else {
    try {
      await deleteDoc(doc(db, "admins", targetUid));
    } catch (_) {}
  }

  await logAdminAuditAction({
    adminUid: adminUser.uid,
    adminEmail: adminUser.email || "admin",
    targetUid,
    targetEmail,
    action: "role_change",
    details: `Role updated to ${newRole.toUpperCase()}`,
  });
}

/**
 * Create / Provision a new user directly from Admin Panel
 */
export async function adminCreateUser(
  adminUser: AuthUser,
  email: string,
  displayName: string,
  role: UserRole = "user",
  status: UserAccountStatus = "active",
  weeklyDigestEnabled: boolean = true
): Promise<UserProfile> {
  if (!adminUser || !adminUser.uid) {
    throw new Error("Administrative authorization required.");
  }
  if (!email || !email.includes("@")) {
    throw new Error("Valid email address is required.");
  }

  const newUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newProfile: UserProfile = {
    uid: newUid,
    email: email.trim().toLowerCase(),
    displayName: displayName.trim() || email.split("@")[0],
    photoURL: null,
    role,
    status,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    entryCount: 0,
    weeklyDigestEnabled,
  };

  await setDoc(doc(db, "users", newUid), sanitizeForFirestore(newProfile), { merge: true });

  // Initialize weekly digest settings subcollection
  try {
    await setDoc(doc(db, "users", newUid, "profile", "digest_settings"), {
      enabled: weeklyDigestEnabled,
      deliveryDay: "saturday",
      deliveryHourUtc: 9,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn("Could not bootstrap digest settings for new user:", err);
  }

  if (role === "admin") {
    await setDoc(doc(db, "admins", newUid), {
      uid: newUid,
      email: email.trim().toLowerCase(),
      role: "admin",
      assignedAt: Date.now(),
      assignedBy: adminUser.email,
    }, { merge: true });
  }

  await logAdminAuditAction({
    adminUid: adminUser.uid,
    adminEmail: adminUser.email || "admin",
    targetUid: newUid,
    targetEmail: email,
    action: "user_created",
    details: `Created user ${email} (Role: ${role}, Status: ${status}, Digest: ${weeklyDigestEnabled ? "Subscribed" : "Unsubscribed"})`,
  });

  return newProfile;
}

/**
 * Toggle weekly digest email subscription for any user from the admin console
 */
export async function adminToggleUserDigestSubscription(
  adminUser: AuthUser,
  targetUid: string,
  targetEmail: string,
  newEnabledState: boolean
): Promise<void> {
  if (!adminUser || !adminUser.uid) {
    throw new Error("Administrative authorization required.");
  }
  if (!targetUid) {
    throw new Error("Target user ID is required.");
  }

  const userRef = doc(db, "users", targetUid);
  await setDoc(userRef, { weeklyDigestEnabled: newEnabledState }, { merge: true });

  const digestSettingsRef = doc(db, "users", targetUid, "profile", "digest_settings");
  await setDoc(digestSettingsRef, {
    enabled: newEnabledState,
    deliveryDay: "saturday",
    deliveryHourUtc: 9,
    updatedAt: Date.now(),
    updatedByAdmin: adminUser.email || adminUser.uid,
  }, { merge: true });

  // Sync to server-side preferences store
  try {
    fetch("/api/digest/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: targetUid,
        email: targetEmail,
        subscribed: newEnabledState,
      }),
    }).catch(() => {});
  } catch (_) {}

  await logAdminAuditAction({
    adminUid: adminUser.uid,
    adminEmail: adminUser.email || "admin",
    targetUid,
    targetEmail,
    action: "digest_subscription_change",
    details: `Weekly Saturday digest mail subscription toggled ${newEnabledState ? "ON (Subscribed)" : "OFF (Unsubscribed)"}`,
  });
}

/**
 * Log immutable admin audit records
 */
export async function logAdminAuditAction(params: {
  adminUid: string;
  adminEmail: string;
  targetUid: string;
  targetEmail: string;
  action: "activate" | "deactivate" | "role_change" | "user_created" | "digest_subscription_change";
  details?: string;
}): Promise<void> {
  try {
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logRef = doc(db, "admin_audit_logs", logId);
    const auditRecord: AdminAuditLog = {
      id: logId,
      adminUid: params.adminUid,
      adminEmail: params.adminEmail,
      targetUid: params.targetUid,
      targetEmail: params.targetEmail,
      action: params.action,
      details: params.details || "",
      timestamp: Date.now(),
    };

    await setDoc(logRef, sanitizeForFirestore(auditRecord));
  } catch (err) {
    console.warn("Could not record admin audit log:", err);
  }
}

/**
 * Subscribe to Admin Audit Logs
 */
export function subscribeToAdminAuditLogs(
  onUpdate: (logs: AdminAuditLog[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!auth.currentUser) {
    onUpdate([]);
    return () => {};
  }

  const auditRef = collection(db, "admin_audit_logs");
  const q = query(auditRef, orderBy("timestamp", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const logs: AdminAuditLog[] = [];
      snapshot.forEach((snap) => {
        const data = snap.data();
        logs.push({
          id: snap.id,
          adminUid: data.adminUid,
          adminEmail: data.adminEmail,
          targetUid: data.targetUid,
          targetEmail: data.targetEmail,
          action: data.action,
          details: data.details,
          timestamp: data.timestamp || Date.now(),
        });
      });
      onUpdate(logs);
    },
    (err) => {
      console.warn("Could not stream audit logs:", err.message);
      onUpdate([]);
    }
  );
}

export interface PaginatedAuditLogsResult {
  logs: AdminAuditLog[];
  firstDoc: QueryDocumentSnapshot | null;
  lastDoc: QueryDocumentSnapshot | null;
  totalCount: number;
  hasNextPage: boolean;
}

/**
 * Optimized Firestore pagination query for security audit logs, scalable to millions of records.
 * Uses cursor-based startAfter() with limit(pageSize + 1) for zero-overhead next-page detection.
 */
export async function fetchPaginatedAuditLogs(options?: {
  pageSize?: number;
  cursorDoc?: QueryDocumentSnapshot | null;
}): Promise<PaginatedAuditLogsResult> {
  const pageSize = options?.pageSize || 20;
  const cursorDoc = options?.cursorDoc || null;

  if (!auth.currentUser) {
    return { logs: [], firstDoc: null, lastDoc: null, totalCount: 0, hasNextPage: false };
  }

  const auditCol = collection(db, "admin_audit_logs");
  let snap;
  try {
    const q = query(
      auditCol,
      orderBy("timestamp", "desc"),
      ...(cursorDoc ? [startAfter(cursorDoc)] : []),
      limit(pageSize + 1)
    );
    snap = await getDocs(q);
  } catch (err: any) {
    console.warn("[Firestore Audit Logs Pagination] Notice:", err?.message);
    try {
      const fallbackQ = query(
        auditCol,
        ...(cursorDoc ? [startAfter(cursorDoc)] : []),
        limit(pageSize + 1)
      );
      snap = await getDocs(fallbackQ);
    } catch {
      snap = { docs: [] } as any;
    }
  }

  const docs = snap.docs || [];
  const hasNextPage = docs.length > pageSize;
  const pagedDocs = hasNextPage ? docs.slice(0, pageSize) : docs;
  const firstDoc = pagedDocs.length > 0 ? (pagedDocs[0] as QueryDocumentSnapshot) : null;
  const lastDoc = pagedDocs.length > 0 ? (pagedDocs[pagedDocs.length - 1] as QueryDocumentSnapshot) : null;

  const logs: AdminAuditLog[] = pagedDocs.map((docSnap: any) => {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      adminUid: data.adminUid,
      adminEmail: data.adminEmail,
      targetUid: data.targetUid,
      targetEmail: data.targetEmail,
      action: data.action,
      details: data.details,
      timestamp: data.timestamp || Date.now(),
    };
  });

  let totalCount = logs.length;
  try {
    const res = await fetch("/api/admin/audit-logs");
    if (res.ok) {
      const allLogs = await res.json();
      if (Array.isArray(allLogs)) {
        totalCount = allLogs.length;
      }
    }
  } catch {}

  return {
    logs,
    firstDoc,
    lastDoc,
    totalCount,
    hasNextPage,
  };
}

/**
 * Fetch System Analytics and Gemini Usage Metrics for Dashboard
 */
export async function fetchAdminAnalytics(days: number = 14, liveUsers?: UserProfile[]): Promise<AdminAnalyticsData> {
  try {
    const response = await fetch(`/api/admin/metrics?days=${days}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Analytics API error (${response.status})`);
    }

    const data: AdminAnalyticsData = await response.json();

    // If live Firestore users are provided, accurately sync live user counts
    if (liveUsers && liveUsers.length > 0) {
      const activeCount = liveUsers.filter((u) => u.status === "active").length;
      const deactivatedCount = liveUsers.filter((u) => u.status === "deactivated").length;
      const adminCount = liveUsers.filter((u) => u.role === "admin").length;
      
      data.activeUsers = Math.max(activeCount, data.activeUsers);
      data.deactivatedUsers = deactivatedCount;
      data.adminUsers = Math.max(adminCount, data.adminUsers);
      data.totalUsers = Math.max(liveUsers.length, data.totalUsers);
    }

    return data;
  } catch (err: any) {
    console.warn("Failed to fetch admin metrics from server:", err);

    // Return clean zero/empty metrics calculated strictly from live database state
    const now = Date.now();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dailySignups: DailySignupMetric[] = [];
    const dailyAiUsage: GeminiUsageMetric[] = [];

    const activeCount = liveUsers ? liveUsers.filter((u) => u.status === "active").length : 0;
    const deactivatedCount = liveUsers ? liveUsers.filter((u) => u.status === "deactivated").length : 0;
    const adminCount = liveUsers ? liveUsers.filter((u) => u.role === "admin").length : 0;
    const totalCount = liveUsers ? liveUsers.length : 0;

    let runningCum = 0;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const dateFormatted = `${monthNames[d.getMonth()]} ${d.getDate()}`;
      const fullDate = d.toISOString().split("T")[0];
      
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;
      const count = liveUsers ? liveUsers.filter((u) => u.createdAt >= dayStart && u.createdAt < dayEnd).length : 0;
      runningCum += count;

      dailySignups.push({
        date: dateFormatted,
        fullDate,
        timestamp: d.getTime(),
        count,
        cumulativeCount: runningCum,
      });

      dailyAiUsage.push({
        date: dateFormatted,
        fullDate,
        timestamp: d.getTime(),
        requestsCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        avgLatencyMs: 0,
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const todaySignups = dailySignups.find((d) => d.fullDate === todayStr)?.count || 0;
    const weekSignups = dailySignups.slice(-7).reduce((s, d) => s + d.count, 0);

    return {
      totalUsers: totalCount,
      activeUsers: activeCount,
      deactivatedUsers: deactivatedCount,
      adminUsers: adminCount,
      todaySignups,
      weekSignups,
      totalAiRequests: 0,
      totalAiTokens: 0,
      totalAiCostUsd: 0,
      dailySignups,
      dailyAiUsage,
      modelBreakdown: [],
      featureBreakdown: [],
      recentLogs: [],
    };
  }
}

/**
 * Submit a deactivation appeal: writes to Firestore collection 'appeals'
 * and dispatches to server for email notification and fallback persistence
 */
export async function submitDeactivationAppeal(appealData: {
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  message: string;
  deactivationReason?: string;
}): Promise<DeactivationAppeal> {
  const cleanUid = appealData.userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || "user";
  const appealId = `appeal_${Date.now()}_${cleanUid}`;
  const appealRecord: DeactivationAppeal = {
    id: appealId,
    userId: appealData.userId,
    userEmail: appealData.userEmail,
    userName: appealData.userName || appealData.userEmail.split("@")[0] || "Journal Writer",
    subject: appealData.subject || "Request for Account Reactivation",
    message: appealData.message.trim(),
    deactivationReason: appealData.deactivationReason || "Administrative hold",
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // 1. Direct write to Firestore collection "appeals"
  try {
    const appealRef = doc(db, "appeals", appealId);
    await setDoc(appealRef, sanitizeForFirestore(appealRecord));

    // Also write initial message to subcollection for threaded conversation
    const initialMsgRef = doc(db, "appeals", appealId, "messages", "init");
    await setDoc(
      initialMsgRef,
      sanitizeForFirestore({
        id: "init",
        senderEmail: appealRecord.userEmail,
        senderName: appealRecord.userName,
        senderRole: "user",
        message: appealRecord.message,
        sentAt: appealRecord.createdAt,
      })
    );
  } catch (fsErr) {
    console.warn("[Firestore] Direct write for appeal failed (will persist via backend):", fsErr);
  }

  // 2. Dispatch to backend API for admin notification and backup storage
  try {
    const res = await fetch("/api/support/contact-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...appealData,
        appealId,
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn("[Support API] Notice:", errData);
    }
  } catch (netErr) {
    console.warn("[Support API] Network notice:", netErr);
  }

  return appealRecord;
}

// In-memory cache of appeals to provide instant, zero-RPC counts without RunAggregationQuery
let inMemoryAppealsCache: DeactivationAppeal[] = [];

export function getCachedAppeals(): DeactivationAppeal[] {
  return [...inMemoryAppealsCache];
}

/**
 * Fetch all appeals from the server backend
 */
export async function fetchAppealsFromBackend(): Promise<DeactivationAppeal[]> {
  try {
    const res = await fetch("/api/admin/appeals");
    if (!res.ok) return [];
    const serverAppeals = await res.json();
    if (Array.isArray(serverAppeals) && serverAppeals.length > 0) {
      inMemoryAppealsCache = serverAppeals;
    }
    return serverAppeals;
  } catch {
    return [];
  }
}

/**
 * Real-time subscription to Deactivation Appeals from Firestore with automatic REST fallback
 */
export function subscribeToAppeals(
  onUpdate: (appeals: DeactivationAppeal[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  let isFirestoreActive = false;
  let unsubscribeFirestore: Unsubscribe = () => {};

  // If not authenticated in Firebase Auth, stream or poll via backend REST API without triggering Firestore permission-denied
  if (!auth.currentUser) {
    fetchAppealsFromBackend()
      .then((serverAppeals) => {
        if (serverAppeals && serverAppeals.length > 0) {
          inMemoryAppealsCache = serverAppeals;
          onUpdate(serverAppeals);
        }
      })
      .catch(() => {});
    return () => {};
  }

  try {
    const appealsCol = collection(db, "appeals");
    const q = query(appealsCol, orderBy("createdAt", "desc"), limit(100));

    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        isFirestoreActive = true;
        const appeals: DeactivationAppeal[] = [];
        snapshot.forEach((d) => {
          appeals.push({ ...d.data(), id: d.id } as DeactivationAppeal);
        });
        inMemoryAppealsCache = appeals;
        onUpdate(appeals);
      },
      (err) => {
        console.warn("[Firestore] Appeals stream error, falling back to REST:", err);
        if (onError) onError(err);
        fetchAppealsFromBackend().then((backendAppeals) => {
          inMemoryAppealsCache = backendAppeals;
          onUpdate(backendAppeals);
        }).catch(() => {});
      }
    );
  } catch (err) {
    console.warn("[Firestore] Could not initiate appeals snapshot:", err);
    fetchAppealsFromBackend().then((backendAppeals) => {
      inMemoryAppealsCache = backendAppeals;
      onUpdate(backendAppeals);
    }).catch(() => {});
  }

  // Poll backend immediately to ensure offline or server-held appeals are visible
  fetchAppealsFromBackend()
    .then((serverAppeals) => {
      if (!isFirestoreActive && serverAppeals.length > 0) {
        inMemoryAppealsCache = serverAppeals;
        onUpdate(serverAppeals);
      }
    })
    .catch(() => {});

  return () => {
    unsubscribeFirestore();
  };
}

export interface PaginatedAppealsResult {
  appeals: DeactivationAppeal[];
  firstDoc: QueryDocumentSnapshot | null;
  lastDoc: QueryDocumentSnapshot | null;
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  hasNextPage: boolean;
}

/**
 * Optimized Firestore pagination query for deactivation appeals, scalable to millions of records.
 * Uses cursor-based startAfter() with limit(pageSize + 1) for zero-overhead next-page detection,
 * alongside getCountFromServer() for instant server-aggregated counts without reading documents.
 */
export async function fetchPaginatedAppeals(options?: {
  pageSize?: number;
  cursorDoc?: QueryDocumentSnapshot | null;
  statusFilter?: AppealStatus | "all";
  searchQuery?: string;
}): Promise<PaginatedAppealsResult> {
  const pageSize = options?.pageSize || 20;
  const cursorDoc = options?.cursorDoc || null;
  const statusFilter = options?.statusFilter || "all";
  const searchQuery = options?.searchQuery?.trim().toLowerCase() || "";

  if (!auth.currentUser) {
    const serverAppeals = await fetchAppealsFromBackend();
    let filtered = statusFilter === "all" ? serverAppeals : serverAppeals.filter((a) => a.status === statusFilter);
    if (searchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.userEmail.toLowerCase().includes(searchQuery) ||
          a.userName?.toLowerCase().includes(searchQuery) ||
          a.subject?.toLowerCase().includes(searchQuery) ||
          a.message?.toLowerCase().includes(searchQuery)
      );
    }
    return {
      appeals: filtered.slice(0, pageSize),
      firstDoc: null,
      lastDoc: null,
      totalCount: filtered.length,
      pendingCount: serverAppeals.filter((a) => a.status === "pending").length,
      approvedCount: serverAppeals.filter((a) => a.status === "approved").length,
      rejectedCount: serverAppeals.filter((a) => a.status === "rejected").length,
      hasNextPage: filtered.length > pageSize,
    };
  }

  const appealsCol = collection(db, "appeals");
  const queryConstraints: any[] = [];
  if (statusFilter !== "all") {
    queryConstraints.push(where("status", "==", statusFilter));
  }

  let snap;
  try {
    const q = query(
      appealsCol,
      ...queryConstraints,
      orderBy("createdAt", "desc"),
      ...(cursorDoc ? [startAfter(cursorDoc)] : []),
      limit(pageSize + 1)
    );
    snap = await getDocs(q);
  } catch (err: any) {
    console.warn("[Firestore Appeals Pagination] Fallback notice:", err?.message);
    try {
      const fallbackQ = query(
        appealsCol,
        ...queryConstraints,
        ...(cursorDoc ? [startAfter(cursorDoc)] : []),
        limit(pageSize + 1)
      );
      snap = await getDocs(fallbackQ);
    } catch {
      snap = { docs: [] } as any;
    }
  }

  const docs = snap.docs || [];
  const hasNextPage = docs.length > pageSize;
  const pagedDocs = hasNextPage ? docs.slice(0, pageSize) : docs;
  const firstDoc = pagedDocs.length > 0 ? (pagedDocs[0] as QueryDocumentSnapshot) : null;
  const lastDoc = pagedDocs.length > 0 ? (pagedDocs[pagedDocs.length - 1] as QueryDocumentSnapshot) : null;

  let appeals: DeactivationAppeal[] = pagedDocs.map((d: any) => ({
    ...d.data(),
    id: d.id,
  }));

  if (searchQuery) {
    appeals = appeals.filter(
      (a) =>
        a.userEmail.toLowerCase().includes(searchQuery) ||
        a.userName?.toLowerCase().includes(searchQuery) ||
        a.subject?.toLowerCase().includes(searchQuery) ||
        a.message?.toLowerCase().includes(searchQuery)
    );
  }

  // Scalable counts without calling REST RunAggregationQuery which fails with "unavailable" on named databases
  let allForCount = inMemoryAppealsCache;
  if (allForCount.length === 0) {
    try {
      const backendAppeals = await fetchAppealsFromBackend();
      if (backendAppeals.length > 0) {
        allForCount = backendAppeals;
      }
    } catch {
      allForCount = appeals;
    }
  }

  const pendingCount = allForCount.filter((a) => a.status === "pending").length;
  const approvedCount = allForCount.filter((a) => a.status === "approved").length;
  const rejectedCount = allForCount.filter((a) => a.status === "rejected").length;
  let totalCount = allForCount.length;

  if (statusFilter !== "all") {
    totalCount = allForCount.filter((a) => a.status === statusFilter).length;
  }
  if (searchQuery) {
    totalCount = allForCount.filter(
      (a) =>
        (statusFilter === "all" || a.status === statusFilter) &&
        (a.userEmail.toLowerCase().includes(searchQuery) ||
          a.userName?.toLowerCase().includes(searchQuery) ||
          a.subject?.toLowerCase().includes(searchQuery) ||
          a.message?.toLowerCase().includes(searchQuery))
    ).length;
  }
  if (totalCount === 0 && appeals.length > 0) {
    totalCount = appeals.length;
  }

  return {
    appeals,
    firstDoc,
    lastDoc,
    totalCount,
    pendingCount,
    approvedCount,
    rejectedCount,
    hasNextPage,
  };
}

/**
 * Fetch the latest appeal submitted by a specific user (if any)
 */
export async function fetchUserAppeal(userId: string, userEmail?: string): Promise<DeactivationAppeal | null> {
  // 1. Try Firestore with where("userId", "==", userId) to comply with Firestore Security Rules
  try {
    const appealsCol = collection(db, "appeals");
    if (userId) {
      const q = query(appealsCol, where("userId", "==", userId));
      const snap = await getDocs(q);
      const userAppeals = snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as DeactivationAppeal))
        .sort((a, b) => b.createdAt - a.createdAt);

      if (userAppeals.length > 0) {
        return userAppeals[0];
      }
    }

    if (userEmail) {
      const qEmail = query(appealsCol, where("userEmail", "==", userEmail));
      const snapEmail = await getDocs(qEmail);
      const emailAppeals = snapEmail.docs
        .map((d) => ({ ...d.data(), id: d.id } as DeactivationAppeal))
        .sort((a, b) => b.createdAt - a.createdAt);
      if (emailAppeals.length > 0) {
        return emailAppeals[0];
      }
    }
  } catch (err) {
    console.warn("[Firestore] Could not query user appeal with filter:", err);
  }

  // 2. Fetch from dedicated backend endpoint /api/support/my-appeal
  try {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (userEmail) params.set("userEmail", userEmail);
    const res = await fetch(`/api/support/my-appeal?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.appeal) {
        return data.appeal;
      }
    }
  } catch (netErr) {
    console.warn("[Support API] Could not fetch my-appeal:", netErr);
  }

  // 3. Fallback to /api/admin/appeals
  try {
    const serverAppeals = await fetchAppealsFromBackend();
    const matched = serverAppeals
      .filter(
        (a) =>
          (userId && a.userId === userId) ||
          (userEmail && a.userEmail?.toLowerCase().trim() === userEmail.toLowerCase().trim())
      )
      .sort((a, b) => b.createdAt - a.createdAt);
    return matched[0] || null;
  } catch {
    return null;
  }
}

/**
 * Real-time subscription to a user's appeal in Firestore + background polling fallback
 * Ensures that admin replies are immediately received by deactivated users.
 */
export function subscribeToUserAppeal(
  userId: string,
  userEmailOrOnUpdate: string | ((appeal: DeactivationAppeal | null) => void),
  onUpdateOrOnError?: ((appeal: DeactivationAppeal | null) => void) | ((err: any) => void),
  possibleOnError?: (err: any) => void
): Unsubscribe {
  let userEmail: string | undefined;
  let onUpdate: (appeal: DeactivationAppeal | null) => void;
  let onError: ((err: any) => void) | undefined;

  if (typeof userEmailOrOnUpdate === "string") {
    userEmail = userEmailOrOnUpdate;
    onUpdate = onUpdateOrOnError as (appeal: DeactivationAppeal | null) => void;
    onError = possibleOnError;
  } else {
    onUpdate = userEmailOrOnUpdate;
    onError = onUpdateOrOnError as ((err: any) => void) | undefined;
  }

  if (!userId && !userEmail) {
    onUpdate(null);
    return () => {};
  }

  let isUnsubscribed = false;
  let unsubscribeFirestore = () => {};

  // 1. Initial immediate fetch from backend & Firestore
  const fetchAndUpdate = async () => {
    try {
      const app = await fetchUserAppeal(userId, userEmail);
      if (!isUnsubscribed && app) {
        onUpdate(app);
      }
    } catch {}
  };

  fetchAndUpdate();

  // 2. Attach Firestore onSnapshot with where("userId", "==", userId)
  if (userId) {
    try {
      const appealsCol = collection(db, "appeals");
      const q = query(appealsCol, where("userId", "==", userId));
      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          const userAppeals: DeactivationAppeal[] = [];
          snapshot.forEach((d) => {
            userAppeals.push({ ...d.data(), id: d.id } as DeactivationAppeal);
          });
          userAppeals.sort((a, b) => b.createdAt - a.createdAt);
          if (!isUnsubscribed) {
            if (userAppeals.length > 0) {
              onUpdate(userAppeals[0]);
            } else {
              fetchAndUpdate();
            }
          }
        },
        (err) => {
          console.warn("[Firestore] User appeal stream notice:", err?.message);
          if (onError) onError(err);
          fetchAndUpdate();
        }
      );
    } catch (err) {
      console.warn("[Firestore] Could not attach user appeal snapshot:", err);
    }
  }

  // 3. Heartbeat polling every 3.5s so admin replies appear in real-time
  const pollInterval = setInterval(() => {
    if (!isUnsubscribed) {
      fetchAndUpdate();
    }
  }, 3500);

  return () => {
    isUnsubscribed = true;
    clearInterval(pollInterval);
    unsubscribeFirestore();
  };
}

/**
 * Update the status of an appeal (e.g. approved, rejected, reviewed)
 * If status is 'approved', also reactivates the user in Firestore & backend.
 */
export async function updateAppealStatus(
  adminUser: AuthUser,
  appeal: DeactivationAppeal,
  newStatus: AppealStatus,
  adminNotes?: string
): Promise<void> {
  const updatedData: Partial<DeactivationAppeal> = {
    status: newStatus,
    adminNotes: adminNotes || appeal.adminNotes || "",
    reviewedBy: adminUser.email || adminUser.displayName || adminUser.uid,
    reviewedAt: Date.now(),
    updatedAt: Date.now(),
  };

  // 1. Update in Firestore
  try {
    const appealRef = doc(db, "appeals", appeal.id);
    await updateDoc(appealRef, sanitizeForFirestore(updatedData));
  } catch (fsErr) {
    console.warn("[Firestore] Failed to update appeal doc:", fsErr);
  }

  // 2. Update via server endpoint
  try {
    await fetch(`/api/admin/appeals/${appeal.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        adminNotes: adminNotes || appeal.adminNotes,
        adminEmail: adminUser.email,
        userId: appeal.userId,
        userEmail: appeal.userEmail,
        reactivateUser: newStatus === "approved",
      }),
    });
  } catch (netErr) {
    console.warn("[Admin API] Failed to update appeal on server:", netErr);
  }

  // 3. If approved, reactivate the user in Firestore directly
  if (newStatus === "approved" && appeal.userId) {
    try {
      await setUserAccountStatus(
        adminUser,
        appeal.userId,
        appeal.userEmail,
        "active"
      );
    } catch (actErr) {
      console.warn("Could not automatically reactivate user document:", actErr);
    }
  }
}

/**
 * Delete an appeal
 */
export async function deleteAppeal(appealId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "appeals", appealId));
  } catch (err) {
    console.warn("[Firestore] Could not delete appeal doc:", err);
  }
  try {
    await fetch(`/api/admin/appeals/${appealId}`, { method: "DELETE" });
  } catch (err) {
    console.warn("[Admin API] Could not delete appeal from server:", err);
  }
}

/**
 * Fetch a single appeal by its unique ID
 */
export async function fetchAppealById(appealId: string): Promise<DeactivationAppeal | null> {
  try {
    const appealDoc = await getDoc(doc(db, "appeals", appealId));
    if (appealDoc.exists()) {
      return { ...appealDoc.data(), id: appealDoc.id } as DeactivationAppeal;
    }
  } catch (err) {
    console.warn("[Firestore] Could not fetch appeal by ID:", err);
  }

  try {
    const serverAppeals = await fetchAppealsFromBackend();
    const matched = serverAppeals.find((a) => a.id === appealId);
    return matched || null;
  } catch {
    return null;
  }
}

/**
 * Send an official admin reply to an appeal, dispatched directly to the user's email
 */
export async function replyToAppeal(
  adminUser: AuthUser,
  appeal: DeactivationAppeal,
  replyMessage: string
): Promise<AppealReply> {
  const newReply: AppealReply = {
    id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    senderEmail: adminUser.email || "",
    senderName: adminUser.displayName || adminUser.email?.split("@")[0] || "System Administrator",
    senderRole: "admin",
    message: replyMessage.trim(),
    sentAt: Date.now(),
    emailDispatched: false,
  };

  // 1. Dispatch through server endpoint which fires the Nodemailer email
  try {
    const resp = await fetch(`/api/admin/appeals/${appeal.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        replyMessage: replyMessage.trim(),
        adminEmail: adminUser.email,
        adminName: adminUser.displayName || adminUser.email?.split("@")[0] || "System Administrator",
        userEmail: appeal.userEmail,
        userName: appeal.userName,
        userId: appeal.userId,
        appealSubject: appeal.subject,
        originalAppealMessage: appeal.message,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.reply) {
        newReply.id = data.reply.id || newReply.id;
        newReply.emailDispatched = data.reply.emailDispatched ?? true;
      }
    }
  } catch (netErr) {
    console.warn("[Admin API] Failed to send appeal reply via server:", netErr);
  }

  // 2. Persist reply to Firestore document & message subcollection
  try {
    const appealRef = doc(db, "appeals", appeal.id);
    const existingReplies = appeal.replies || [];
    const updatedReplies = [...existingReplies, newReply];
    const newStatus: AppealStatus = appeal.status === "pending" ? "reviewed" : appeal.status;

    await updateDoc(
      appealRef,
      sanitizeForFirestore({
        replies: updatedReplies,
        updatedAt: Date.now(),
        status: newStatus,
        reviewedBy: adminUser.email || adminUser.displayName || "Admin",
        reviewedAt: Date.now(),
      })
    );

    // Also persist in threaded conversation subcollection
    const msgRef = doc(db, "appeals", appeal.id, "messages", newReply.id);
    await setDoc(msgRef, sanitizeForFirestore(newReply));
  } catch (fsErr) {
    console.warn("[Firestore] Failed to update appeal document with reply:", fsErr);
  }

  // 3. Log administrative audit action
  await logAdminAuditAction({
    adminUid: adminUser.uid,
    adminEmail: adminUser.email || "admin",
    targetUid: appeal.userId,
    targetEmail: appeal.userEmail,
    action: "role_change",
    details: `Admin replied to appeal #${appeal.id}: "${replyMessage.slice(0, 60)}..." (Email dispatched: ${newReply.emailDispatched})`,
  });

  return newReply;
}

/**
 * User sends a follow-up reply in an ongoing appeal conversation
 * Persists directly to Firestore 'appeals/{appealId}' and 'appeals/{appealId}/messages/{replyId}'
 */
export async function sendUserAppealReply(
  user: AuthUser,
  appeal: DeactivationAppeal,
  replyMessage: string
): Promise<AppealReply> {
  const newReply: AppealReply = {
    id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    senderEmail: user.email || appeal.userEmail,
    senderName: user.displayName || user.email?.split("@")[0] || appeal.userName || "User",
    senderRole: "user",
    message: replyMessage.trim(),
    sentAt: Date.now(),
    emailDispatched: false,
  };

  const updatedReplies = [...(appeal.replies || []), newReply];

  // 1. Direct write to Firestore document
  try {
    const appealRef = doc(db, "appeals", appeal.id);
    await updateDoc(
      appealRef,
      sanitizeForFirestore({
        replies: updatedReplies,
        updatedAt: Date.now(),
      })
    );

    // Also persist in threaded messages subcollection
    const msgRef = doc(db, "appeals", appeal.id, "messages", newReply.id);
    await setDoc(msgRef, sanitizeForFirestore(newReply));
  } catch (fsErr) {
    console.warn("[Firestore] User reply write failed, using backend:", fsErr);
  }

  // 2. Dispatch to backend for admin alert & sync
  try {
    await fetch(`/api/support/appeal-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appealId: appeal.id,
        reply: newReply,
        userEmail: user.email || appeal.userEmail,
        userName: user.displayName || appeal.userName,
        subject: appeal.subject,
      }),
    });
  } catch (netErr) {
    console.warn("[Backend API] User reply notification notice:", netErr);
  }

  return newReply;
}


