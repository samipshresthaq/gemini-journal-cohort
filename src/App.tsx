import React, { useState, useEffect, useRef, useCallback } from "react";
import { AuthUser, JournalEntry, JournalMessage, SaveStatus } from "./types";
import { 
  signInWithGoogle, 
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
import { Loader2 } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);

  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // 1. Listen to Firebase Authentication state
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
      } else {
        setUser(null);
        setActiveEntry(null);
        setEntries([]);
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
        console.error("Failed to load user entries from Firestore:", err);
        setErrorMessage("Could not synchronize entries with Cloud Firestore.");
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
      console.error("Sign-in failed:", err);
      setAuthError(err?.message || "Google Sign-In was cancelled or encountered an issue.");
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // Switch to a new empty reflection
  const handleNewEntry = () => {
    if (!user) return;
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        user={user}
        onSignOut={handleSignOut}
        onNewEntry={handleNewEntry}
        onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
        isHistoryOpen={isHistoryOpen}
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
            isLoading={authLoading}
            errorMessage={authError}
          />
        ) : activeEntry ? (
          <JournalEditor
            user={user}
            entry={activeEntry}
            onUpdateEntry={handleUpdateEntry}
            onSendMessage={handleSendMessage}
            onGenerateSummary={handleGenerateSummary}
            isGeneratingReply={isGeneratingReply}
            isGeneratingSummary={isGeneratingSummary}
            saveStatus={saveStatus}
            onRetrySave={() => persistEntry(activeEntry)}
            errorMessage={errorMessage}
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
          onSelectEntry={(entry) => setActiveEntry(entry)}
          onDeleteEntry={handleDeleteEntry}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => setIsHistoryOpen(false)}
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
