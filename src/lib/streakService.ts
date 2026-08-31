import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { UserStreak } from "../types";
import { sanitizeForFirestore } from "./firestoreService";

const STREAK_STORAGE_PREFIX = "gemini_journal_streak_";

/**
 * Returns YYYY-MM-DD for a given date in local time
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates calendar day difference between dateStr1 and dateStr2 (dateStr2 - dateStr1)
 */
export function getDaysBetweenDates(dateStr1: string, dateStr2: string): number {
  if (!dateStr1 || !dateStr2) return 0;
  const [y1, m1, d1] = dateStr1.split("-").map(Number);
  const [y2, m2, d2] = dateStr2.split("-").map(Number);
  const date1 = new Date(y1, m1 - 1, d1).getTime();
  const date2 = new Date(y2, m2 - 1, d2).getTime();
  return Math.round((date2 - date1) / (1000 * 60 * 60 * 24));
}

/**
 * Core streak calculation pure function:
 * - Counted from day 2 as 1 day streak (Day 1 login = 0 streak count).
 * - For first day login, currentStreak is 0 (no streak count shown).
 * - If skipped a day, streak is broken and restarts from 0.
 */
export function calculateStreak(
  existing: UserStreak | null,
  todayStr: string = getLocalDateString()
): UserStreak {
  const now = Date.now();

  // 1. Initial login / no previous streak recorded:
  // First day login -> streak starts at 0 (counts from day 2 as 1 day streak)
  if (!existing || !existing.lastLoginDate || typeof existing.currentStreak !== "number") {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastLoginDate: todayStr,
      streakBroken: false,
      lastCalculatedAt: now,
    };
  }

  // 2. Already recorded login today
  if (existing.lastLoginDate === todayStr) {
    return {
      ...existing,
      currentStreak: existing.currentStreak || 0,
      longestStreak: Math.max(existing.longestStreak || 0, existing.currentStreak || 0),
      streakBroken: Boolean(existing.streakBroken),
      lastCalculatedAt: now,
    };
  }

  const daysDiff = getDaysBetweenDates(existing.lastLoginDate, todayStr);

  // 3. Consecutive day login (continuous login on the next day -> increments streak)
  // Day 1 to Day 2 transition gives currentStreak = 1 (1 day streak)
  if (daysDiff === 1) {
    const nextStreak = (existing.currentStreak || 0) + 1;
    const nextLongest = Math.max(existing.longestStreak || 0, nextStreak);
    return {
      currentStreak: nextStreak,
      longestStreak: nextLongest,
      lastLoginDate: todayStr,
      streakBroken: false,
      lastCalculatedAt: now,
    };
  }

  // 4. Skipped day(s) (daysDiff > 1): streak is broken and restarts from 0 (Day 1 after break has 0 streak)
  if (daysDiff > 1) {
    return {
      currentStreak: 0, // Reset to 0 (First day of new cycle)
      longestStreak: Math.max(existing.longestStreak || 0, existing.currentStreak || 0),
      lastLoginDate: todayStr,
      streakBroken: true, // Marker for UI feedback
      lastCalculatedAt: now,
    };
  }

  // Clock adjustment fallback (daysDiff < 0)
  return {
    ...existing,
    lastLoginDate: todayStr,
    lastCalculatedAt: now,
  };
}

/**
 * Read streak from local storage
 */
export function getStoredUserStreak(userId: string): UserStreak | null {
  if (!userId || userId.startsWith("guest_")) return null;
  try {
    const raw = localStorage.getItem(`${STREAK_STORAGE_PREFIX}${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Could not load streak from localStorage:", err);
  }
  return null;
}

/**
 * Save streak to local storage and trigger cross-component updates
 */
export function saveStoredUserStreak(userId: string, streak: UserStreak): void {
  if (!userId || userId.startsWith("guest_")) return;
  try {
    localStorage.setItem(`${STREAK_STORAGE_PREFIX}${userId}`, JSON.stringify(streak));
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(`user_streak_updated_${userId}`, { detail: streak })
      );
    }, 0);
  } catch (err) {
    console.warn("Could not save streak to localStorage:", err);
  }
}

/**
 * Record and sync user login streak across Firestore for authenticated users.
 * Streaks are not available for guest users.
 */
export async function recordUserLoginStreak(userId: string): Promise<UserStreak | null> {
  if (!userId || userId.startsWith("guest_")) {
    return null;
  }

  const today = getLocalDateString();
  const cached = getStoredUserStreak(userId);

  // Authenticated Cloud Firestore users
  try {
    const streakDocRef = doc(db, "users", userId, "profile", "streak");
    const snap = await getDoc(streakDocRef);
    let remoteStreak: UserStreak | null = null;

    if (snap.exists()) {
      const data = snap.data();
      remoteStreak = {
        currentStreak: data.currentStreak || 0,
        longestStreak: data.longestStreak || 0,
        lastLoginDate: data.lastLoginDate || "",
        streakBroken: data.streakBroken || false,
        lastCalculatedAt: data.lastCalculatedAt || Date.now(),
      };
    }

    const baseline = remoteStreak || cached;
    const updated = calculateStreak(baseline, today);

    // Save to Firestore with strict undefined-stripping
    await setDoc(streakDocRef, sanitizeForFirestore(updated), { merge: true });

    // Cache locally for instant next load
    saveStoredUserStreak(userId, updated);
    return updated;
  } catch (err) {
    console.warn("Could not sync streak to Firestore, falling back to local cache:", err);
    const fallback = calculateStreak(cached, today);
    saveStoredUserStreak(userId, fallback);
    return fallback;
  }
}

/**
 * Subscribe to streak updates for a specific authenticated user
 */
export function subscribeToUserStreak(
  userId: string,
  onUpdate: (streak: UserStreak | null) => void
): () => void {
  if (!userId || userId.startsWith("guest_")) {
    onUpdate(null);
    return () => {};
  }

  // Initial read
  const current = getStoredUserStreak(userId);
  if (current) {
    onUpdate(current);
  }

  const listener = (event: Event) => {
    const custom = event as CustomEvent<UserStreak>;
    if (custom.detail) {
      onUpdate(custom.detail);
    }
  };

  window.addEventListener(`user_streak_updated_${userId}`, listener);
  return () => {
    window.removeEventListener(`user_streak_updated_${userId}`, listener);
  };
}

/**
 * Migrate guest streak to an authenticated user upon sign-in
 */
export async function migrateGuestStreakToFirestore(
  guestUserId: string,
  authUserId: string
): Promise<void> {
  if (!guestUserId || !authUserId || guestUserId === authUserId) return;
  try {
    const guestStreak = getStoredUserStreak(guestUserId);
    if (guestStreak && guestStreak.currentStreak > 0) {
      const today = getLocalDateString();
      const authStreak = calculateStreak(guestStreak, today);
      const streakDocRef = doc(db, "users", authUserId, "profile", "streak");
      await setDoc(streakDocRef, sanitizeForFirestore(authStreak), { merge: true });
      saveStoredUserStreak(authUserId, authStreak);
    }
    // Clean up guest streak
    localStorage.removeItem(`${STREAK_STORAGE_PREFIX}${guestUserId}`);
  } catch (err) {
    console.warn("Could not migrate guest streak:", err);
  }
}
