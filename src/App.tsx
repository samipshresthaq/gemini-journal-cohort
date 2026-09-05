import React, { useState, useEffect, useRef, useCallback } from "react";
import { AuthUser, JournalEntry, JournalMessage, SaveStatus, UserStreak, UserProfile } from "./types";
import { 
  signInWithGoogle, 
  signInWithEmail,
  signUpWithEmail,
  resetUserPassword,
  signOutUser, 
  subscribeToAuth 
} from "./firebase";
import { 
  saveJournalEntry, 
  subscribeToUserEntries, 
  deleteJournalEntry, 
  toggleEntryFavorite,
  migrateGuestEntriesToFirestore,
  logUserInteraction,
  isQuotaExceededError,
  getIsQuotaExceeded,
  getStoredUserEntries,
  saveStoredUserEntries
} from "./lib/firestoreService";
import { 
  recordUserLoginStreak, 
  subscribeToUserStreak, 
  migrateGuestStreakToFirestore 
} from "./lib/streakService";
import { 
  syncUserProfile, 
  isSystemAdminEmail,
  verifyAdminWithBackend,
} from "./lib/adminService";
import { sendReflectionPrompt, generateReflectionSummary } from "./lib/geminiService";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { JournalEditor } from "./components/JournalEditor";
import { JournalHistory } from "./components/JournalHistory";
import { WalkthroughGuide } from "./components/WalkthroughGuide";
import { ProfileModal } from "./components/ProfileModal";
import { AuthModal } from "./components/AuthModal";
import { WeeklyDigestModal } from "./components/WeeklyDigestModal";
import { AdminPanelModal } from "./components/AdminPanelModal";
import { AdminLayout, AdminRoute } from "./components/admin/AdminLayout";
import { DeactivatedUserScreen } from "./components/DeactivatedUserScreen";
import { Loader2, ShieldAlert, LogOut, Shield, ShieldCheck, KeyRound, ArrowLeft, Lock, ArrowRight } from "lucide-react";

const GUEST_SESSION_KEY = "gemini_journal_active_guest";
const MAX_GUEST_ENTRIES = 2;
const MAX_GUEST_CONVERSATIONS_PER_ENTRY = 2;

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("gemini_journal_theme");
      if (saved === "dark" || saved === "light") return saved;
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (_) {
      return "light";
    }
  });

  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isWeeklyDigestOpen, setIsWeeklyDigestOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Dedicated Route Navigation State
  const [currentPath, setCurrentPath] = useState<string>(() => {
    try {
      return window.location.pathname || "/";
    } catch {
      return "/";
    }
  });

  const navigate = useCallback((newPath: string) => {
    try {
      if (window.location.pathname !== newPath) {
        window.history.pushState({}, "", newPath);
      }
    } catch (_) {}
    setCurrentPath(newPath);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || "/");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const isAdminRoute = currentPath.startsWith("/admin");
  const adminSubRoute: AdminRoute = currentPath.includes("users")
    ? "users"
    : currentPath.includes("appeals")
    ? "appeals"
    : "dashboard";

  // Auth modal state for gating features
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalConfig, setAuthModalConfig] = useState<{ title?: string; description?: string }>({});

  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Admin gateway login form states
  const [adminEmailInput, setAdminEmailInput] = useState("");
  const [adminPassInput, setAdminPassInput] = useState("");
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  const isGuest = !!user?.uid.startsWith("guest_");
  const isAdmin = !isGuest && (user?.role === "admin" || userProfile?.role === "admin" || isSystemAdminEmail(user?.email));
  const isDeactivated = !isGuest && (userProfile?.status === "deactivated" || user?.status === "deactivated");

  const triggerAuthModal = useCallback((title?: string, description?: string) => {
    setAuthModalConfig({ title, description });
    setIsAuthModalOpen(true);
  }, []);

  const activeEntryRef = useRef<JournalEntry | null>(null);
  activeEntryRef.current = activeEntry;

  // Initialize a fresh new journal entry helper
  const createNewEmptyEntry = useCallback((userId: string): JournalEntry => {
    const timestamp = Date.now();
    return {
      id: `entry_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      title: "Today's Reflection",
      createdAt: timestamp,
      updatedAt: timestamp,
      mood: "Grounded",
      topic: "Daily Review",
      messages: [],
      tags: [],
    };
  }, []);

  // 1. Theme synchronization with document & local storage
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("gemini_journal_theme", theme);
    } catch (_) {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  // 2. Listen to Firebase Authentication state & restore guest session if present
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (fbUser) => {
      if (fbUser) {
        const authUserData: AuthUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
        };

        // Check if there was an active guest session to migrate
        try {
          const storedGuest = localStorage.getItem(GUEST_SESSION_KEY);
          if (storedGuest) {
            const parsedGuest = JSON.parse(storedGuest);
            if (parsedGuest?.uid?.startsWith("guest_")) {
              await migrateGuestEntriesToFirestore(parsedGuest.uid, fbUser.uid);
              await migrateGuestStreakToFirestore(parsedGuest.uid, fbUser.uid);
            }
          }

          // Also scan for any lingering guest entry keys in localStorage
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("gemini_journal_guest_entries_guest_")) {
              const guestUid = key.replace("gemini_journal_guest_entries_", "");
              if (guestUid) {
                await migrateGuestEntriesToFirestore(guestUid, fbUser.uid);
                await migrateGuestStreakToFirestore(guestUid, fbUser.uid);
              }
            }
          }
        } catch (migErr) {
          console.warn("Guest entries migration completed with notices:", migErr);
        }

        // Synchronize or load Firestore user profile (role, status)
        try {
          const profile = await syncUserProfile(authUserData);
          setUserProfile(profile);
          authUserData.role = profile.role;
          authUserData.status = profile.status;
        } catch (profErr) {
          console.warn("Profile sync notice:", profErr);
        }

        setUser(authUserData);
        localStorage.removeItem(GUEST_SESSION_KEY);
      } else {
        // Check if a local guest session exists
        try {
          const storedGuest = localStorage.getItem(GUEST_SESSION_KEY);
          if (storedGuest) {
            const parsedGuest = JSON.parse(storedGuest);
            setUser(parsedGuest);
            setUserProfile({
              uid: parsedGuest.uid,
              email: parsedGuest.email || "",
              displayName: "Guest Explorer",
              role: "user",
              status: "active",
              createdAt: Date.now(),
              lastLoginAt: Date.now(),
            });
          } else {
            setUser(null);
            setUserProfile(null);
            setActiveEntry(null);
            setEntries([]);
          }
        } catch (e) {
          setUser(null);
          setUserProfile(null);
          setActiveEntry(null);
          setEntries([]);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore entries subscription for active user
  useEffect(() => {
    if (!user?.uid) return;
    const currentUid = user.uid;

    const unsubscribe = subscribeToUserEntries(
      currentUid,
      (userEntries) => {
        setEntries(userEntries);
        // If no active entry is selected, default to latest entry or create new
        if (!activeEntryRef.current) {
          if (userEntries.length > 0) {
            setActiveEntry(userEntries[0]);
          } else {
            const fresh = createNewEmptyEntry(currentUid);
            setActiveEntry(fresh);
          }
        } else {
          // Sync remote updates into active entry only if remote is strictly newer
          const updated = userEntries.find((e) => e.id === activeEntryRef.current?.id);
          if (updated) {
            setActiveEntry((prev) => {
              if (!prev || (updated.updatedAt && updated.updatedAt > prev.updatedAt)) {
                return { ...prev, ...updated };
              }
              return prev;
            });
          }
        }
      },
      (err) => {
        if (
          err?.message?.includes("insufficient permissions") ||
          (err as any)?.code === "permission-denied" ||
          isQuotaExceededError(err)
        ) {
          console.warn("User entries subscription operating in offline/cached mode:", err?.message || err);
          return;
        }
        console.warn("Notice loading user entries:", err?.message || err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, createNewEmptyEntry]);

  // 3. Daily login streak synchronization & real-time updates (Authenticated users only)
  useEffect(() => {
    if (!user || user.uid.startsWith("guest_")) {
      setStreak(null);
      return;
    }

    let isMounted = true;
    recordUserLoginStreak(user.uid)
      .then((calculatedStreak) => {
        if (isMounted) {
          setStreak(calculatedStreak);
        }
      })
      .catch((err) => {
        console.warn("Could not record daily login streak:", err);
      });

    const unsubscribe = subscribeToUserStreak(user.uid, (updatedStreak) => {
      if (isMounted) {
        setStreak(updatedStreak);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.uid]);

  // Auth actions
  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (
        err?.code === "auth/popup-closed-by-user" || 
        err?.code === "auth/cancelled-popup-request"
      ) {
        // User voluntarily dismissed popup, no error state required
        setAuthLoading(false);
        return;
      }

      console.error("Sign-in failed:", err);
      const isPopupBlocked = err?.code === "auth/popup-blocked";
      const isNetworkError = err?.code === "auth/network-request-failed";

      if (isPopupBlocked) {
        setAuthError(
          "The Google Sign-In popup was blocked by your browser. Please allow popups or use Email & Password."
        );
      } else if (isNetworkError) {
        setAuthError(
          "Network connection issue during sign-in. Please check your internet connection and retry."
        );
      } else {
        setAuthError(err?.message || "Google Sign-In encountered an issue. Please try again or use Email & Password.");
      }
      setAuthLoading(false);
    }
  };

  const handleEmailSignIn = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await signInWithEmail(email, pass);
    } catch (err: any) {
      const code =
        err?.code ||
        (typeof err?.message === "string" ? err.message.match(/auth\/[a-z-]+/)?.[0] : undefined);

      const isExpectedAuthError = [
        "auth/invalid-credential",
        "auth/wrong-password",
        "auth/user-not-found",
        "auth/invalid-email",
        "auth/user-disabled",
        "auth/too-many-requests",
      ].includes(code as string) || (typeof err?.message === "string" && (
        err.message.includes("invalid-credential") ||
        err.message.includes("wrong-password") ||
        err.message.includes("user-not-found")
      ));

      if (isExpectedAuthError) {
        console.warn("Email sign-in notice:", code || err?.message);
      } else {
        console.warn("Email sign-in notice:", err?.message || err);
      }

      let userFriendlyMsg = "Could not sign in with provided email and password.";
      if (
        code === "auth/invalid-credential" || 
        code === "auth/wrong-password" || 
        code === "auth/user-not-found" ||
        (typeof err?.message === "string" && err.message.includes("invalid-credential"))
      ) {
        userFriendlyMsg = "Incorrect email or password. If you haven't created an account yet, please create one.";
      } else if (code === "auth/invalid-email") {
        userFriendlyMsg = "The email address is formatted incorrectly.";
      } else if (code === "auth/too-many-requests") {
        userFriendlyMsg = "Too many failed login attempts. Please wait a moment and try again.";
      } else if (err?.message) {
        userFriendlyMsg = err.message;
      }
      setAuthError(userFriendlyMsg);
      throw err;
    }
  };

  const handleEmailSignUp = async (email: string, pass: string, name?: string) => {
    setAuthError(null);
    try {
      await signUpWithEmail(email, pass, name);
    } catch (err: any) {
      const isExpectedAuthError = [
        "auth/email-already-in-use",
        "auth/weak-password",
        "auth/invalid-email",
      ].includes(err?.code);

      if (isExpectedAuthError) {
        console.warn("Email sign-up notice:", err?.code || err?.message);
      } else {
        console.error("Email sign-up failed:", err);
      }

      let userFriendlyMsg = "Could not create account with email.";
      if (err?.code === "auth/email-already-in-use") {
        userFriendlyMsg = "An account with this email address already exists. Please log in instead.";
      } else if (err?.code === "auth/weak-password") {
        userFriendlyMsg = "Password should be at least 6 characters long.";
      } else if (err?.code === "auth/invalid-email") {
        userFriendlyMsg = "Please provide a valid email address.";
      } else if (err?.message) {
        userFriendlyMsg = err.message;
      }
      setAuthError(userFriendlyMsg);
      throw err;
    }
  };

  const handleGuestSignIn = () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const guestId = `guest_${Math.random().toString(36).substring(2, 9)}`;
      const guestUser: AuthUser = {
        uid: guestId,
        email: null,
        displayName: "Guest Explorer",
        photoURL: null,
      };
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guestUser));
      setUser(guestUser);
      setAuthLoading(false);
    } catch (err: any) {
      console.error("Guest sign-in failed:", err);
      setAuthError("Guest initialization encountered an issue.");
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem(GUEST_SESSION_KEY);
      await signOutUser();
      setUser(null);
      setActiveEntry(null);
      setEntries([]);
      setIsProfileOpen(false);
    } catch (err) {
      console.error("Sign out error:", err);
      localStorage.removeItem(GUEST_SESSION_KEY);
      setUser(null);
      setActiveEntry(null);
      setEntries([]);
      setIsProfileOpen(false);
    }
  };

  // Switch to a new empty reflection
  const handleNewEntry = () => {
    if (!user) return;
    if (isGuest && entries.length >= MAX_GUEST_ENTRIES) {
      triggerAuthModal(
        `Guest Entry Limit Reached (${MAX_GUEST_ENTRIES} of ${MAX_GUEST_ENTRIES} Entries)`,
        `Guest mode allows a maximum of ${MAX_GUEST_ENTRIES} reflection entries. Sign in with Google or Email to unlock unlimited reflections, history sync, and AI growth summaries.`
      );
      return;
    }
    const fresh = createNewEmptyEntry(user.uid);
    flushPendingSave();
    setActiveEntry(fresh);
    setIsHistoryOpen(false);
    setErrorMessage(null);
  };

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flushPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Persistence handler
  const persistEntry = async (entryToSave: JournalEntry) => {
    if (!user) return;
    setSaveStatus("saving");
    setErrorMessage(null);
    try {
      await saveJournalEntry(user.uid, entryToSave);
      setSaveStatus("saved");
      setTimeout(() => {
        setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 2500);
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        console.warn("Notice: Saved reflection locally (Firestore daily quota reached).");
        setSaveStatus("saved");
      } else {
        console.warn("Notice saving entry to Firestore:", err?.message || err);
        setSaveStatus("saved");
      }
    }
  };

  // Update entry metadata or title with debounced remote persistence & instant local cache
  const handleUpdateEntry = (updated: JournalEntry) => {
    setActiveEntry(updated);

    // Save immediately to local cache so changes are never lost even on refresh
    if (user?.uid) {
      const currentEntries = getStoredUserEntries(user.uid);
      const index = currentEntries.findIndex((e) => e.id === updated.id);
      if (index >= 0) {
        currentEntries[index] = updated;
      } else {
        currentEntries.unshift(updated);
      }
      saveStoredUserEntries(user.uid, currentEntries, false);
    }

    // Debounce the remote Firestore persistence to stop excessive writes while typing
    setSaveStatus("saving");
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      persistEntry(updated);
      saveTimeoutRef.current = null;
    }, 1200);
  };

  // Send a reflection prompt (User & Gemini message flow)
  const handleSendMessage = async (content: string) => {
    if (!user || !activeEntry) return;
    flushPendingSave();

    // Enforce guest limit of max 2 conversations per entry
    if (isGuest) {
      const userMessageCount = activeEntry.messages.filter((m) => m.role === "user").length;
      if (userMessageCount >= MAX_GUEST_CONVERSATIONS_PER_ENTRY) {
        triggerAuthModal(
          `Conversation Limit Reached (${MAX_GUEST_CONVERSATIONS_PER_ENTRY} of ${MAX_GUEST_CONVERSATIONS_PER_ENTRY} in this Entry)`,
          `Guest mode allows up to ${MAX_GUEST_CONVERSATIONS_PER_ENTRY} conversations with Gemini per reflection entry. Sign in with an account to continue reflecting indefinitely${entries.length < MAX_GUEST_ENTRIES ? " or create your second entry." : "."}`
        );
        return;
      }
    }

    const userMessage: JournalMessage = {
      id: `msg_${Date.now()}_u`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    // Append user message immediately to local state
    const currentMessages = [...activeEntry.messages, userMessage];
    const updatedEntryWithUserMsg: JournalEntry = {
      ...activeEntry,
      messages: currentMessages,
      updatedAt: Date.now(),
    };

    setActiveEntry(updatedEntryWithUserMsg);
    setIsGeneratingReply(true);
    setErrorMessage(null);

    // Save user message immediately to prevent data loss
    await persistEntry(updatedEntryWithUserMsg);

    try {
      // Call Gemini 3.6 Flash reflection proxy
      const conversationPayload = currentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendReflectionPrompt({
        messages: conversationPayload,
        userMood: activeEntry.mood,
        reflectionTopic: activeEntry.topic,
      });

      const geminiMessage: JournalMessage = {
        id: `msg_${Date.now()}_m`,
        role: "model",
        content: res.reply,
        timestamp: Date.now(),
        modelUsed: res.modelUsed,
      };

      const finalEntry: JournalEntry = {
        ...updatedEntryWithUserMsg,
        messages: [...currentMessages, geminiMessage],
        updatedAt: Date.now(),
      };

      setActiveEntry(finalEntry);
      await persistEntry(finalEntry);

      // Telemetry log in Firestore
      logUserInteraction(user.uid, {
        entryId: finalEntry.id,
        action: "gemini_reflection",
        modelUsed: res.modelUsed,
      });
    } catch (err: any) {
      console.error("Error reflecting with Gemini:", err);
      setErrorMessage(err.message || "Gemini could not generate reflection. Please try again.");
    } finally {
      setIsGeneratingReply(false);
    }
  };

  // Generate deep summary & action items
  const handleGenerateSummary = async () => {
    if (!user || !activeEntry || activeEntry.messages.length === 0) return;
    flushPendingSave();
    if (isGuest) {
      triggerAuthModal(
        "Unlock AI Growth Summaries",
        "Reflection summaries, emotional analysis, and action plans require an account. Sign in to synthesize your takeaways."
      );
      return;
    }

    setIsGeneratingSummary(true);
    setErrorMessage(null);

    try {
      const fullText = activeEntry.messages
        .map((m) => `${m.role === "user" ? "User" : "Gemini"}: ${m.content}`)
        .join("\n\n");

      const res = await generateReflectionSummary({
        entriesText: fullText,
        title: activeEntry.title,
      });

      const updatedEntry: JournalEntry = {
        ...activeEntry,
        title: res.summary.title || activeEntry.title,
        summary: res.summary,
        updatedAt: Date.now(),
      };

      setActiveEntry(updatedEntry);
      await persistEntry(updatedEntry);

      logUserInteraction(user.uid, {
        entryId: updatedEntry.id,
        action: "gemini_summary",
        modelUsed: res.modelUsed,
      });
    } catch (err: any) {
      console.error("Failed to generate summary:", err);
      setErrorMessage(err.message || "Failed to generate reflection summary.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Delete entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    try {
      await deleteJournalEntry(user.uid, entryId);
      if (activeEntry?.id === entryId) {
        const remaining = entries.filter((e) => e.id !== entryId);
        if (remaining.length > 0) {
          setActiveEntry(remaining[0]);
        } else {
          setActiveEntry(createNewEmptyEntry(user.uid));
        }
      }
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        console.warn("Notice: Entry deleted locally (Firestore daily quota reached).");
      } else {
        console.warn("Could not delete entry from Cloud Firestore:", err?.message || err);
      }
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (entryId: string, isFav: boolean) => {
    if (!user) return;
    if (isGuest) {
      triggerAuthModal(
        "Unlock Favorites",
        "Starring and saving favorite reflections requires an account. Sign in to unlock."
      );
      return;
    }
    try {
      await toggleEntryFavorite(user.uid, entryId, isFav);
      if (activeEntry?.id === entryId) {
        setActiveEntry({ ...activeEntry, isFavorite: isFav });
      }
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        console.warn("Notice: Favorite toggled locally (Firestore daily quota reached).");
      } else {
        console.warn("Notice: Could not update favorite status:", err?.message || err);
      }
    }
  };

  // Loading spinner during initial auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3 transition-colors duration-200">
        <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 text-indigo-400 flex items-center justify-center shadow-md">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Initializing Gemini Reflection Journal...</p>
      </div>
    );
  }

  const currentGuestIndex = entries.findIndex((e) => e.id === activeEntry?.id);
  const activeGuestEntryIndex = currentGuestIndex >= 0 ? currentGuestIndex + 1 : Math.min(entries.length + 1, MAX_GUEST_ENTRIES);

  // Dedicated /admin Route Handling
  if (isAdminRoute) {
    if (user && isAdmin) {
      return (
        <AdminLayout
          currentUser={user}
          activeRoute={adminSubRoute}
          onRouteChange={(r) => navigate(`/admin/${r}`)}
          onBackToJournal={() => navigate("/")}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      );
    }

    if (user && !isAdmin) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Access Restricted</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Your account ({user.email}) does not have administrative permissions for this portal.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                id="btn-admin-return-home"
                onClick={() => navigate("/")}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Reflection Journal
              </button>
              <button
                id="btn-admin-switch-account"
                onClick={handleSignOut}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign In with Admin Account
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Unauthenticated user attempting to access /admin
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-sm">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admin Portal Gateway</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Restricted Access & Governance</p>
            </div>
          </div>

          {/* Secret Manager Governance Badge */}
          <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 flex items-center gap-2.5 text-xs text-purple-900 dark:text-purple-200">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-semibold">Secret Manager Enabled: </span>
              <span>Credentials and tokens are secured via Google Cloud Secret Manager.</span>
            </div>
          </div>

          {/* Secure Admin Credentials Login Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const email = adminEmailInput.trim();
              const pass = adminPassInput;
              if (!email) {
                setAdminLoginError("Please enter your administrator email.");
                return;
              }
              if (!pass) {
                setAdminLoginError("Please enter your administrator password.");
                return;
              }
              setAdminLoginLoading(true);
              setAdminLoginError(null);
              try {
                // 1. First attempt standard Firebase Auth
                try {
                  await signInWithEmail(email, pass);
                  return;
                } catch {
                  // If standard Firebase auth fails, verify against backend Secret Manager
                }

                // 2. Fallback to server-side Secret Manager verification
                const verifyRes = await verifyAdminWithBackend(email, pass);
                if (verifyRes.authorized) {
                  const adminUser: AuthUser = {
                    uid: "admin_default_master",
                    email: email,
                    displayName: verifyRes.displayName || "System Administrator",
                    photoURL: null,
                    role: "admin",
                  };
                  setUser(adminUser);
                  const profile = await syncUserProfile(adminUser);
                  setUserProfile(profile);
                } else {
                  setAdminLoginError(verifyRes.error || "Invalid administrator credentials. Access denied.");
                }
              } catch (err: any) {
                setAdminLoginError(err?.message || "Sign in failed. Verify your credentials.");
              } finally {
                setAdminLoginLoading(false);
              }
            }}
            className="space-y-4"
          >
            {adminLoginError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{adminLoginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Administrator Email
              </label>
              <input
                id="input-admin-gateway-email"
                type="email"
                required
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
                placeholder="admin@yourdomain.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Administrator Password
              </label>
              <input
                id="input-admin-gateway-password"
                type="password"
                required
                value={adminPassInput}
                onChange={(e) => setAdminPassInput(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <button
              id="btn-admin-gateway-submit"
              type="submit"
              disabled={adminLoginLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {adminLoginLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              id="btn-admin-google-signin"
              onClick={handleSignIn}
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              Sign in with Google (Authorized Admins)
            </button>
            <button
              id="btn-admin-portal-back"
              onClick={() => navigate("/")}
              className="w-full py-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Reflection Journal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar
        user={user}
        streak={streak}
        theme={theme}
        onToggleTheme={toggleTheme}
        isGuest={isGuest}
        isAdmin={isAdmin}
        guestEntryCount={entries.length}
        maxGuestEntries={MAX_GUEST_ENTRIES}
        onOpenAuthModal={triggerAuthModal}
        onSignOut={handleSignOut}
        onNewEntry={handleNewEntry}
        onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
        isHistoryOpen={isHistoryOpen}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenWeeklyDigest={() => setIsWeeklyDigestOpen(true)}
        onOpenAdminPanel={() => navigate("/admin/dashboard")}
        saveStatus={saveStatus}
        onRetrySave={() => activeEntry && persistEntry(activeEntry)}
        onToggleWalkthrough={() => setIsWalkthroughOpen((prev) => !prev)}
        isWalkthroughOpen={isWalkthroughOpen}
        showTestGuide={!import.meta.env.VITE_PROD}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!user ? (
          <LandingPage
            onSignIn={handleSignIn}
            onEmailSignIn={handleEmailSignIn}
            onEmailSignUp={handleEmailSignUp}
            onGuestSignIn={handleGuestSignIn}
            onOpenAuthModal={triggerAuthModal}
            isLoading={authLoading}
            errorMessage={authError}
          />
        ) : isDeactivated ? (
          /* Deactivated User Account Notice with Contact Administrator Appeal Flow */
          <DeactivatedUserScreen
            user={user}
            profile={userProfile}
            onSignOut={handleSignOut}
          />
        ) : activeEntry ? (
          <JournalEditor
            user={user}
            streak={streak}
            isGuest={isGuest}
            onRequireAuth={triggerAuthModal}
            entry={activeEntry}
            onUpdateEntry={handleUpdateEntry}
            onSendMessage={handleSendMessage}
            onGenerateSummary={handleGenerateSummary}
            isGeneratingReply={isGeneratingReply}
            isGeneratingSummary={isGeneratingSummary}
            saveStatus={saveStatus}
            onRetrySave={() => persistEntry(activeEntry)}
            errorMessage={errorMessage}
            guestEntryIndex={activeGuestEntryIndex}
            maxGuestEntries={MAX_GUEST_ENTRIES}
            totalGuestEntries={entries.length}
            maxGuestConversationsPerEntry={MAX_GUEST_CONVERSATIONS_PER_ENTRY}
            onNewEntry={handleNewEntry}
          />
        ) : (
          <div className="text-center py-24 space-y-4">
            <p className="text-slate-600 dark:text-slate-400 text-sm">No reflection session open.</p>
            <button
              onClick={handleNewEntry}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Start New Reflection
            </button>
          </div>
        )}
      </main>

      {/* History Drawer */}
      {user && isHistoryOpen && (
        <JournalHistory
          entries={entries}
          activeEntryId={activeEntry?.id || null}
          isGuest={isGuest}
          maxGuestEntries={MAX_GUEST_ENTRIES}
          onRequireAuth={triggerAuthModal}
          onSelectEntry={(entry) => {
            flushPendingSave();
            setActiveEntry(entry);
          }}
          onDeleteEntry={handleDeleteEntry}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}

      {/* Profile Modal */}
      {user && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          streak={streak}
          entries={entries}
          onSignOut={handleSignOut}
          onProfileUpdated={(updated) => setUser(updated)}
          onRequireAuth={triggerAuthModal}
          onOpenWeeklyDigest={() => setIsWeeklyDigestOpen(true)}
        />
      )}

      {/* Weekly Journal Digest Modal (Saturday Automated Dispatch & Preview) */}
      <WeeklyDigestModal
        isOpen={isWeeklyDigestOpen}
        onClose={() => setIsWeeklyDigestOpen(false)}
        user={user}
        entries={entries}
        isGuest={isGuest}
        onRequireAuth={() =>
          triggerAuthModal(
            "Sign In for Saturday Email Digests",
            "Sign in with Google or Email to receive your weekly reflection synthesis email newsletter every Saturday."
          )
        }
      />

      {/* Auth Upgrade Modal for Guest Feature Gating */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignInWithGoogle={handleSignIn}
        onSignInWithEmail={handleEmailSignIn}
        onSignUpWithEmail={handleEmailSignUp}
        onResetPassword={resetUserPassword}
        title={authModalConfig.title}
        description={authModalConfig.description}
      />

      {/* Admin Panel Modal (User Directory, Activation/Deactivation, Auditing) */}
      {user && isAdmin && (
        <AdminPanelModal
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          currentUser={user}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {/* Verification Walkthrough Modal */}
      <WalkthroughGuide
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
      />
    </div>
  );
}

