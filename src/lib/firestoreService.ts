import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
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

// LocalStorage keys for Guest Mode
const GUEST_STORAGE_PREFIX = "gemini_journal_guest_entries_";

function getGuestEntries(userId: string): JournalEntry[] {
  try {
    const raw = localStorage.getItem(`${GUEST_STORAGE_PREFIX}${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Could not read guest entries from localStorage:", err);
  }
  return [];
}

function saveGuestEntries(userId: string, entries: JournalEntry[]) {
  try {
    localStorage.setItem(`${GUEST_STORAGE_PREFIX}${userId}`, JSON.stringify(entries));
    // Trigger custom event asynchronously for real-time reactivity in guest mode
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(`guest_entries_updated_${userId}`, { detail: entries }));
    }, 0);
  } catch (err) {
    console.warn("Could not write guest entries to localStorage:", err);
  }
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

  // Handle Guest Mode locally or unauthenticated session fallback
  if (userId.startsWith("guest_") || !auth.currentUser || auth.currentUser.uid !== userId) {
    const entries = getGuestEntries(userId);
    const updatedEntry = {
      ...entry,
      userId,
      updatedAt: Date.now(),
    };
    const index = entries.findIndex((e) => e.id === entry.id);
    if (index >= 0) {
      entries[index] = updatedEntry;
    } else {
      entries.unshift(updatedEntry);
    }
    saveGuestEntries(userId, entries);
    
    if (!auth.currentUser || auth.currentUser.uid !== userId) {
      return;
    }
  }

  try {
    const entryRef = doc(db, "users", userId, "entries", entry.id);
    const sanitized = sanitizeForFirestore({
      ...entry,
      userId,
      updatedAt: Date.now(),
    });

    await setDoc(entryRef, sanitized, { merge: true });

    // Also persist conversation thread in user conversations subcollection
    if (entry.messages && entry.messages.length > 0) {
      try {
        const convRef = doc(db, "users", userId, "conversations", entry.id);
        await setDoc(
          convRef,
          sanitizeForFirestore({
            id: entry.id,
            userId,
            entryId: entry.id,
            title: entry.title || "Reflection Conversation",
            messages: entry.messages,
            updatedAt: Date.now(),
          }),
          { merge: true }
        );
      } catch (convErr) {
        console.warn("Notice: Non-blocking conversation mirror notice:", convErr);
      }
    }
  } catch (err) {
    console.warn("Notice: Firestore entry save fallback to local:", err);
    const entries = getGuestEntries(userId);
    const index = entries.findIndex((e) => e.id === entry.id);
    if (index >= 0) {
      entries[index] = { ...entry, userId, updatedAt: Date.now() };
    } else {
      entries.unshift({ ...entry, userId, updatedAt: Date.now() });
    }
    saveGuestEntries(userId, entries);
  }
}

/**
 * Real-time subscription to a user's isolated journal entries
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

  // Handle Guest Mode or unauthenticated session with event-driven local subscriptions
  if (userId.startsWith("guest_") || !auth.currentUser || auth.currentUser.uid !== userId) {
    const initialTimer = setTimeout(() => {
      onUpdate(getGuestEntries(userId));
    }, 0);

    const listener = (event: Event) => {
      const custom = event as CustomEvent<JournalEntry[]>;
      setTimeout(() => {
        if (custom.detail) {
          onUpdate(custom.detail);
        } else {
          onUpdate(getGuestEntries(userId));
        }
      }, 0);
    };
    window.addEventListener(`guest_entries_updated_${userId}`, listener);
    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener(`guest_entries_updated_${userId}`, listener);
    };
  }

  const entriesRef = collection(db, "users", userId, "entries");
  const q = query(entriesRef, orderBy("updatedAt", "desc"));

  return onSnapshot(
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
      onUpdate(entries);
    },
    (err) => {
      if (err?.code === "permission-denied" || err?.message?.includes("insufficient permissions")) {
        console.warn("Firestore subscription waiting for authentication sync:", err.message);
        onUpdate(getGuestEntries(userId));
        return;
      }
      console.error("[Firestore Error] Failed to subscribe to entries:", err);
      onError(err);
    }
  );
}

/**
 * Delete a specific journal entry
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) {
    throw new Error("User ID and Entry ID are required to delete entry.");
  }

  if (userId.startsWith("guest_")) {
    const entries = getGuestEntries(userId).filter((e) => e.id !== entryId);
    saveGuestEntries(userId, entries);
    return;
  }

  const entryRef = doc(db, "users", userId, "entries", entryId);
  await deleteDoc(entryRef);
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

  if (userId.startsWith("guest_")) {
    const entries = getGuestEntries(userId);
    const target = entries.find((e) => e.id === entryId);
    if (target) {
      target.isFavorite = isFavorite;
      target.updatedAt = Date.now();
      saveGuestEntries(userId, entries);
    }
    return;
  }

  const entryRef = doc(db, "users", userId, "entries", entryId);
  await updateDoc(entryRef, {
    isFavorite,
    updatedAt: Date.now(),
  });
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

  let migratedCount = 0;
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
    } catch (err) {
      console.error(`Failed to migrate guest entry ${entry.id} to Firestore:`, err);
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
