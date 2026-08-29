import React, { useState, useEffect, useRef, useCallback } from "react";
import { AuthUser, JournalEntry, JournalMessage, SaveStatus } from "./types";
import { 
  signInWithGoogle, 
  signInWithEmail,
  signUpWithEmail,
  signOutUser, 
  subscribeToAuth 
} from "./firebase";
import { 
  saveJournalEntry, 
  subscribeToUserEntries, 
  deleteJournalEntry, 
  toggleEntryFavorite,
  logUserInteraction 
} from "./lib/firestoreService";
import { sendReflectionPrompt, generateReflectionSummary } from "./lib/geminiService";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { JournalEditor } from "./components/JournalEditor";
import { JournalHistory } from "./components/JournalHistory";
import { WalkthroughGuide } from "./components/WalkthroughGuide";
import { ProfileModal } from "./components/ProfileModal";
import { AuthModal } from "./components/AuthModal";
import { Loader2 } from "lucide-react";

const GUEST_SESSION_KEY = "gemini_journal_active_guest";
const MAX_GUEST_CONVERSATIONS = 2;

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Auth modal state for gating features
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalConfig, setAuthModalConfig] = useState<{ title?: string; description?: string }>({});

  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isGuest = !!user?.uid.startsWith("guest_");

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

  // 1. Listen to Firebase Authentication state & restore guest session if present
  useEffect(() => {
    const unsubscribe = subscribeToAuth((fbUser) => {
      if (fbUser) {
        const authUserData: AuthUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
        };
        setUser(authUserData);
        localStorage.removeItem(GUEST_SESSION_KEY);
      } else {
        // Check if a local guest session exists
        try {
          const storedGuest = localStorage.getItem(GUEST_SESSION_KEY);
          if (storedGuest) {
            setUser(JSON.parse(storedGuest));
          } else {
            setUser(null);
            setActiveEntry(null);
            setEntries([]);
          }
        } catch (e) {
          setUser(null);
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
    if (!user) return;

    const unsubscribe = subscribeToUserEntries(
      user.uid,
      (userEntries) => {
        setEntries(userEntries);
        // If no active entry is selected, default to latest entry or create new
        if (!activeEntryRef.current) {
          if (userEntries.length > 0) {
            setActiveEntry(userEntries[0]);
          } else {
            const fresh = createNewEmptyEntry(user.uid);
            setActiveEntry(fresh);
          }
        } else {
          // Sync any remote updates into active entry if matched
          const updated = userEntries.find((e) => e.id === activeEntryRef.current?.id);
          if (updated) {
            setActiveEntry((prev) => (prev ? { ...prev, ...updated } : updated));
          }
        }
      },
      (err) => {
        console.error("Failed to load user entries:", err);
        setErrorMessage("Could not synchronize entries.");
      }
    );

    return () => unsubscribe();
  }, [user, createNewEmptyEntry]);

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
      console.error("Email sign-in failed:", err);
      let userFriendlyMsg = "Could not sign in with provided email and password.";
      if (
        err?.code === "auth/invalid-credential" || 
        err?.code === "auth/wrong-password" || 
        err?.code === "auth/user-not-found"
      ) {
        userFriendlyMsg = "Incorrect email or password. Please verify your details or create an account.";
      } else if (err?.code === "auth/invalid-email") {
        userFriendlyMsg = "The email address is formatted incorrectly.";
      } else if (err?.code === "auth/too-many-requests") {
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
      console.error("Email sign-up failed:", err);
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
    if (isGuest && entries.length >= MAX_GUEST_CONVERSATIONS) {
      triggerAuthModal(
        "Guest Limit Reached (2 of 2 Conversations)",
        "Guest mode allows a maximum of 2 active conversations. Sign in with Google or Email to unlock unlimited reflections, history sync, and AI growth summaries."
      );
      return;
    }
    const fresh = createNewEmptyEntry(user.uid);
    setActiveEntry(fresh);
    setIsHistoryOpen(false);
    setErrorMessage(null);
  };

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
      console.error("Error saving entry to Firestore:", err);
      setSaveStatus("error");
      setErrorMessage("Failed to save reflection to Cloud Firestore. Please retry.");
    }
  };

  // Update entry metadata or title
  const handleUpdateEntry = (updated: JournalEntry) => {
    setActiveEntry(updated);
    persistEntry(updated);
  };

  // Send a reflection prompt (User & Gemini message flow)
  const handleSendMessage = async (content: string) => {
    if (!user || !activeEntry) return;

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
      console.error("Failed to delete entry:", err);
      setErrorMessage("Could not delete entry from Cloud Firestore.");
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
      console.error("Failed to update favorite status:", err);
    }
  };

  // Loading spinner during initial auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-indigo-400 flex items-center justify-center shadow-md">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-600">Initializing Gemini Reflection Journal...</p>
      </div>
    );
  }

  const currentGuestIndex = entries.findIndex((e) => e.id === activeEntry?.id);
  const activeGuestConversationIndex = currentGuestIndex >= 0 ? currentGuestIndex + 1 : Math.min(entries.length + 1, MAX_GUEST_CONVERSATIONS);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        user={user}
        isGuest={isGuest}
        guestEntryCount={entries.length}
        maxGuestEntries={MAX_GUEST_CONVERSATIONS}
        onOpenAuthModal={triggerAuthModal}
        onSignOut={handleSignOut}
        onNewEntry={handleNewEntry}
        onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
        isHistoryOpen={isHistoryOpen}
        onOpenProfile={() => setIsProfileOpen(true)}
        saveStatus={saveStatus}
        onRetrySave={() => activeEntry && persistEntry(activeEntry)}
        onToggleWalkthrough={() => setIsWalkthroughOpen((prev) => !prev)}
        isWalkthroughOpen={isWalkthroughOpen}
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
        ) : activeEntry ? (
          <JournalEditor
            user={user}
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
            guestConversationIndex={activeGuestConversationIndex}
            maxGuestConversations={MAX_GUEST_CONVERSATIONS}
          />
        ) : (
          <div className="text-center py-24 space-y-4">
            <p className="text-slate-600 text-sm">No reflection session open.</p>
            <button
              onClick={handleNewEntry}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
          maxGuestEntries={MAX_GUEST_CONVERSATIONS}
          onRequireAuth={triggerAuthModal}
          onSelectEntry={(entry) => setActiveEntry(entry)}
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
          entries={entries}
          onSignOut={handleSignOut}
          onProfileUpdated={(updated) => setUser(updated)}
          onRequireAuth={triggerAuthModal}
        />
      )}

      {/* Auth Upgrade Modal for Guest Feature Gating */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignInWithGoogle={handleSignIn}
        onSignInWithEmail={handleEmailSignIn}
        onSignUpWithEmail={handleEmailSignUp}
        title={authModalConfig.title}
        description={authModalConfig.description}
      />

      {/* Verification Walkthrough Modal */}
      <WalkthroughGuide
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
      />
    </div>
  );
}

