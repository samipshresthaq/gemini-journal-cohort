import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  serverTimestamp,
  Unsubscribe
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { JournalEntry, JournalMessage, ReflectionSummary } from "../types";

/**
 * Strict Undefined-Stripping Utility
 * Prevents Firestore SDK runtime exceptions by recursively stripping all `undefined` values.
 */
export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (value === undefined) {
        return null;
      }
      return value;
    })
  );
}

// LocalStorage keys for Guest & Authenticated local cache
const GUEST_STORAGE_PREFIX = "gemini_journal_guest_entries_";
const USER_STORAGE_PREFIX = "gemini_journal_entries_";

/**
 * Checks if an error is caused by Firestore free tier daily quota exhaustion
 */
export function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || err.toString() || "").toLowerCase();
  const code = (err.code || "").toLowerCase();
  return (
    code === "resource-exhausted" ||
    msg.includes("quota limit exceeded") ||
    msg.includes("quota exceeded") ||
    msg.includes("free daily read units") ||
    msg.includes("free tier database") ||
    msg.includes("quota metric") ||
    msg.includes("quota checks") ||
    msg.includes("daily read units per project")
  );
}

// Global flag to track whether Cloud Firestore quota limit has been hit
let quotaExceededState = false;

// Check sessionStorage on init
try {
  if (typeof window !== "undefined" && window.sessionStorage?.getItem("firestore_quota_exceeded") === "true") {
    quotaExceededState = true;
  }
} catch {
  // Ignore storage access restrictions
}

export function getIsQuotaExceeded(): boolean {
  return quotaExceededState;
}

export function setQuotaExceeded(exceeded: boolean = true): void {
  quotaExceededState = exceeded;
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage?.setItem("firestore_quota_exceeded", exceeded ? "true" : "false");
      window.dispatchEvent(new CustomEvent("firestore_quota_state_changed", { detail: { exceeded } }));
    }
  } catch {
    // Ignore storage access restrictions
  }
}

/**
 * Read entries from local cache for a user (works for both guest and authenticated users)
 */
export function getStoredUserEntries(userId: string): JournalEntry[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${USER_STORAGE_PREFIX}${userId}`) ||
                localStorage.getItem(`${GUEST_STORAGE_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not read stored entries from localStorage:", err);
  }
  return [];
}

/**
 * Save entries to local cache and notify listeners
 */
export function saveStoredUserEntries(
  userId: string,
  entries: JournalEntry[],
  notifyListeners: boolean = true
): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${USER_STORAGE_PREFIX}${userId}`, JSON.stringify(entries));
    if (userId.startsWith("guest_")) {
      localStorage.setItem(`${GUEST_STORAGE_PREFIX}${userId}`, JSON.stringify(entries));
    }
    // Trigger custom events for reactive UI updates only when requested
    if (notifyListeners) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent(`user_entries_updated_${userId}`, { detail: entries }));
        window.dispatchEvent(new CustomEvent(`guest_entries_updated_${userId}`, { detail: entries }));
      }, 0);
    }
  } catch (err) {
    console.warn("Could not write entries to localStorage:", err);
  }
}

// Backward-compatible alias for guest entries
function getGuestEntries(userId: string): JournalEntry[] {
  return getStoredUserEntries(userId);
}

function saveGuestEntries(userId: string, entries: JournalEntry[]) {
  saveStoredUserEntries(userId, entries, true);
}

/**
 * Save or update a Journal Entry for a specific isolated user
 */
export async function saveJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId) {
    throw new Error("User ID is required to save journal entry.");
  }
  if (!entry.id) {
    throw new Error("Entry ID is required.");
  }

  // Always update local cache first so user content is never lost, even if offline or quota exceeded
  const currentEntries = getStoredUserEntries(userId);
  const updatedEntry: JournalEntry = {
    ...entry,
    userId,
    updatedAt: Date.now(),
  };
  const index = currentEntries.findIndex((e) => e.id === entry.id);
  if (index >= 0) {
    currentEntries[index] = updatedEntry;
  } else {
    currentEntries.unshift(updatedEntry);
  }
  saveStoredUserEntries(userId, currentEntries, true);

  // If user is guest, quota is exceeded, or unauthenticated session, local save is sufficient
  if (userId.startsWith("guest_") || !auth.currentUser || auth.currentUser.uid !== userId || quotaExceededState) {
    return;
  }

  try {
    const entryRef = doc(db, "users", userId, "entries", entry.id);
    const sanitized = sanitizeForFirestore(updatedEntry);
    await setDoc(entryRef, sanitized, { merge: true });
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExceeded(true);
      console.warn("[Firestore Notice] Daily write/read quota reached. Reflection saved securely to browser local storage.");
    } else {
      console.warn("Notice: Firestore entry save fallback to local storage:", err?.message || err);
    }
  }
}

/**
 * Real-time subscription to a user's isolated journal entries with local storage fallback
 */
export function subscribeToUserEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  // 1. Immediately provide cached entries from local storage for instant responsiveness
  const initialLocalEntries = getStoredUserEntries(userId);
  if (initialLocalEntries.length > 0) {
    onUpdate(initialLocalEntries);
  }

  // 2. Set up local event listener for reactive offline/quota updates
  const localListener = (event: Event) => {
    const custom = event as CustomEvent<JournalEntry[]>;
    if (custom.detail) {
      onUpdate(custom.detail);
    } else {
      onUpdate(getStoredUserEntries(userId));
    }
  };

  window.addEventListener(`user_entries_updated_${userId}`, localListener);
  window.addEventListener(`guest_entries_updated_${userId}`, localListener);

  // If Guest Mode or quota is already exceeded, operate solely in local storage mode
  if (userId.startsWith("guest_") || !auth.currentUser || auth.currentUser.uid !== userId || quotaExceededState) {
    if (initialLocalEntries.length === 0) {
      onUpdate([]);
    }
    return () => {
      window.removeEventListener(`user_entries_updated_${userId}`, localListener);
      window.removeEventListener(`guest_entries_updated_${userId}`, localListener);
    };
  }

  let unsubFirestore: Unsubscribe | null = null;

  try {
    const entriesRef = collection(db, "users", userId, "entries");
    // Limit to 50 most recent entries to prevent excessive document reads and quota exhaustion
    const q = query(entriesRef, orderBy("updatedAt", "desc"), limit(50));

    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        const entries: JournalEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          entries.push({
            id: docSnap.id,
            userId: data.userId || userId,
            title: data.title || "Untitled Reflection",
            createdAt: data.createdAt || Date.now(),
            updatedAt: data.updatedAt || Date.now(),
            mood: data.mood,
            topic: data.topic,
            messages: data.messages || [],
            summary: data.summary,
            isFavorite: data.isFavorite || false,
            tags: data.tags || [],
          });
        });
        // Cache to local storage without dispatching duplicate events back to localListener
        saveStoredUserEntries(userId, entries, false);
        onUpdate(entries);
      },
      (err) => {
        if (isQuotaExceededError(err)) {
          setQuotaExceeded(true);
          console.warn(
            "[Firestore Notice] Daily read quota limit reached for free tier database. Falling back to local offline storage cache."
          );
          const cached = getStoredUserEntries(userId);
          onUpdate(cached);
          return;
        }

        if (err?.code === "permission-denied" || err?.message?.includes("insufficient permissions")) {
          console.warn("Firestore subscription waiting for authentication sync:", err.message);
          const cached = getStoredUserEntries(userId);
          onUpdate(cached);
          return;
        }

        console.warn("[Firestore Notice] Entries subscription notice, serving local cache:", err?.message || err);
        const cached = getStoredUserEntries(userId);
        if (cached.length > 0) {
          onUpdate(cached);
        } else {
          onError(err);
        }
      }
    );
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExceeded(true);
      console.warn("[Firestore Notice] Quota exceeded during subscription init. Using local cache.");
    } else {
      console.warn("Notice: Could not subscribe to Firestore:", err?.message || err);
    }
    const cached = getStoredUserEntries(userId);
    onUpdate(cached);
  }

  return () => {
    window.removeEventListener(`user_entries_updated_${userId}`, localListener);
    window.removeEventListener(`guest_entries_updated_${userId}`, localListener);
    if (unsubFirestore) {
      try {
        unsubFirestore();
      } catch {
        // Ignore unmount error
      }
    }
  };
}

/**
 * Direct fetch of user journal entries (for history inspection by user or admin)
 */
export async function fetchUserEntriesDirectly(userId: string): Promise<JournalEntry[]> {
  if (!userId) return [];

  const localEntries = getStoredUserEntries(userId);

  try {
    const entriesRef = collection(db, "users", userId, "entries");
    const q = query(entriesRef, orderBy("updatedAt", "desc"), limit(50));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const remoteEntries: JournalEntry[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        remoteEntries.push({
          id: docSnap.id,
          userId: data.userId || userId,
          title: data.title || "Untitled Reflection",
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now(),
          mood: data.mood,
          topic: data.topic,
          messages: data.messages || [],
          summary: data.summary,
          isFavorite: data.isFavorite || false,
          tags: data.tags || [],
        });
      });
      return remoteEntries;
    }
  } catch (err: any) {
    console.warn("[Firestore] Direct user entries fetch notice:", err?.message || err);
  }

  return localEntries;
}

/**
 * Delete a specific journal entry
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) {
    throw new Error("User ID and Entry ID are required to delete entry.");
  }

  // Always remove from local cache first
  const remaining = getStoredUserEntries(userId).filter((e) => e.id !== entryId);
  saveStoredUserEntries(userId, remaining);

  if (userId.startsWith("guest_") || !auth.currentUser || auth.currentUser.uid !== userId || quotaExceededState) {
    return;
  }

  try {
    const entryRef = doc(db, "users", userId, "entries", entryId);
    await deleteDoc(entryRef);
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExceeded(true);
      console.warn("Quota exceeded on delete. Entry deleted locally.");
    } else {
      console.warn("Notice: Firestore entry delete notice:", err?.message || err);
    }
  }
}

/**
 * Toggle favorite status of a journal entry
 */
export async function toggleEntryFavorite(
  userId: string,
  entryId: string,
  isFavorite: boolean
): Promise<void> {
  if (!userId || !entryId) return;

  // Always update in local storage cache first
  const entries = getStoredUserEntries(userId);
  const target = entries.find((e) => e.id === entryId);
  if (target) {
    target.isFavorite = isFavorite;
    target.updatedAt = Date.now();
    saveStoredUserEntries(userId, entries);
  }

  if (userId.startsWith("guest_") || !auth.currentUser || auth.currentUser.uid !== userId || quotaExceededState) {
    return;
  }

  try {
    const entryRef = doc(db, "users", userId, "entries", entryId);
    await updateDoc(entryRef, {
      isFavorite,
      updatedAt: Date.now(),
    });
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      setQuotaExceeded(true);
      console.warn("Quota exceeded on favorite update. State updated locally.");
    } else {
      console.warn("Notice: Firestore favorite update notice:", err?.message || err);
    }
  }
}

/**
 * Migrate local guest entries to Cloud Firestore when a user signs in or registers
 */
export async function migrateGuestEntriesToFirestore(
  guestUserId: string,
  authenticatedUserId: string
): Promise<number> {
  if (!guestUserId || !authenticatedUserId || guestUserId === authenticatedUserId) {
    return 0;
  }
  if (!guestUserId.startsWith("guest_")) {
    return 0;
  }

  const guestEntries = getGuestEntries(guestUserId);
  if (!guestEntries || guestEntries.length === 0) {
    return 0;
  }

  // Pre-merge into authenticated user's local cache so reflections are never lost
  const existingUserEntries = getStoredUserEntries(authenticatedUserId);
  const combinedEntries = [...existingUserEntries];
  for (const entry of guestEntries) {
    const idx = combinedEntries.findIndex((e) => e.id === entry.id);
    const updated = { ...entry, userId: authenticatedUserId };
    if (idx >= 0) {
      combinedEntries[idx] = updated;
    } else {
      combinedEntries.push(updated);
    }
  }
  saveStoredUserEntries(authenticatedUserId, combinedEntries);

  let migratedCount = 0;
  if (!quotaExceededState) {
    for (const entry of guestEntries) {
      try {
        const entryRef = doc(db, "users", authenticatedUserId, "entries", entry.id);
        const sanitized = sanitizeForFirestore({
          ...entry,
          userId: authenticatedUserId,
          updatedAt: entry.updatedAt || Date.now(),
        });
        await setDoc(entryRef, sanitized, { merge: true });
        migratedCount++;
      } catch (err: any) {
        if (isQuotaExceededError(err)) {
          setQuotaExceeded(true);
          console.warn("Firestore quota reached during guest entry migration. Kept safely in local storage.");
          break;
        }
        console.warn(`Notice migrating guest entry ${entry.id}:`, err?.message || err);
      }
    }
  }

  // Clear migrated guest entries from localStorage
  try {
    localStorage.removeItem(`${GUEST_STORAGE_PREFIX}${guestUserId}`);
  } catch (err) {
    console.warn("Could not remove migrated guest entries from storage:", err);
  }

  // Record audit telemetry log for the migration
  if (migratedCount > 0) {
    await logUserInteraction(authenticatedUserId, {
      entryId: "migration",
      action: "migrate_guest_entries",
      details: { guestUserId, count: migratedCount },
    });
  }

  return migratedCount;
}

/**
 * Log individual interactions for audit and telemetry
 */
export async function logUserInteraction(
  userId: string,
  interaction: {
    entryId: string;
    action: string;
    details?: any;
    modelUsed?: string;
  }
): Promise<void> {
  if (!userId) return;
  try {
    const interactionId = `int_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const interactionRef = doc(db, "users", userId, "interactions", interactionId);
    await setDoc(
      interactionRef,
      sanitizeForFirestore({
        ...interaction,
        timestamp: Date.now(),
      })
    );
  } catch (err) {
    console.warn("Could not record telemetry interaction:", err);
  }
}

/**
 * Save user conversation explicitly in Firestore
 */
export async function saveUserConversation(
  userId: string,
  conversationId: string,
  messages: JournalMessage[],
  metadata?: { title?: string; entryId?: string }
): Promise<void> {
  if (!userId || !conversationId) return;

  try {
    const convRef = doc(db, "users", userId, "conversations", conversationId);
    await setDoc(
      convRef,
      sanitizeForFirestore({
        id: conversationId,
        userId,
        entryId: metadata?.entryId || conversationId,
        title: metadata?.title || "Reflection Conversation",
        messages,
        updatedAt: Date.now(),
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn("Could not save user conversation:", err);
  }
}
