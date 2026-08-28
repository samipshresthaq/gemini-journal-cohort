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
import { db } from "../firebase";
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

  const entryRef = doc(db, "users", userId, "entries", entry.id);
  const sanitized = sanitizeForFirestore({
    ...entry,
    userId,
    updatedAt: Date.now(),
  });

  await setDoc(entryRef, sanitized, { merge: true });
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
  const entryRef = doc(db, "users", userId, "entries", entryId);
  await updateDoc(entryRef, {
    isFavorite,
    updatedAt: Date.now(),
  });
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
