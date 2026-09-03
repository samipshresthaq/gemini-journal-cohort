import React, { useState, useRef, useEffect } from "react";
import { AuthUser, JournalEntry, JournalMessage, PromptStarter, SaveStatus, AttachedNote, UserStreak } from "../types";
import { PromptStarters } from "./PromptStarters";
import { SummaryCard } from "./SummaryCard";
import { VoiceControlPanel } from "./VoiceControlPanel";
import { NotePreviewModal } from "./NotePreviewModal";
import { useVoiceDictation } from "../hooks/useVoiceDictation";
import { extractDocumentNotes } from "../lib/geminiService";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Send, 
  Sparkles, 
  Loader2, 
  Bot, 
  User, 
  Calendar, 
  Tag, 
  Smile, 
  RefreshCw, 
  AlertCircle, 
  Save, 
  Check, 
  Copy,
  ChevronDown,
  Mic,
  MicOff,
  Lock,
  MessageSquare,
  Paperclip,
  FileText,
  File,
  X,
  Eye,
  PlusCircle,
  UploadCloud,
  FileCheck,
  Flame
} from "lucide-react";

interface JournalEditorProps {
  user: AuthUser;
  streak?: UserStreak | null;
  isGuest?: boolean;
  onRequireAuth?: (title?: string, description?: string) => void;
  entry: JournalEntry;
  onUpdateEntry: (entry: JournalEntry) => void;
  onSendMessage: (content: string) => Promise<void>;
  onGenerateSummary: () => Promise<void>;
  isGeneratingReply: boolean;
  isGeneratingSummary: boolean;
  saveStatus: SaveStatus;
  onRetrySave: () => void;
  errorMessage?: string | null;
  guestEntryIndex?: number;
  maxGuestEntries?: number;
  totalGuestEntries?: number;
  maxGuestConversationsPerEntry?: number;
  onNewEntry?: () => void;
}

const MOODS = [
  { label: "🌿 Grounded", value: "Grounded" },
  { label: "💡 Inspired", value: "Inspired" },
  { label: "⚡ Energized", value: "Energized" },
  { label: "🎯 Focused", value: "Focused" },
  { label: "🌊 Overwhelmed", value: "Overwhelmed" },
  { label: "🧘 Peaceful", value: "Peaceful" },
  { label: "🌱 Growth Mindset", value: "Growth Mindset" },
];

const TOPICS = [
  "Daily Review",
  "Career & Projects",
  "Personal Growth",
  "Mindful Calibrations",
  "Creative Ideation",
  "Relationships & Communication",
  "Health & Habits",
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  user,
  streak,
  isGuest = false,
  onRequireAuth,
  entry,
  onUpdateEntry,
  onSendMessage,
  onGenerateSummary,
  isGeneratingReply,
  isGeneratingSummary,
  saveStatus,
  onRetrySave,
  errorMessage,
  guestEntryIndex = 1,
  maxGuestEntries = 2,
  totalGuestEntries = 1,
  maxGuestConversationsPerEntry = 2,
  onNewEntry,
}) => {
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachedNote, setAttachedNote] = useState<AttachedNote | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasActiveAccount = Boolean(
    user && 
    !isGuest && 
    user.status !== "deactivated" && 
    !user.uid.startsWith("guest_")
  );

  const userConversationCount = entry.messages.filter((m) => m.role === "user").length;
  const isEntryConversationLimitReached = !hasActiveAccount || (isGuest && userConversationCount >= maxGuestConversationsPerEntry);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entry.messages, isGeneratingReply]);

  // File Upload & Processing Handler
  const handleProcessFile = async (file: File) => {
    if (!hasActiveAccount) {
      onRequireAuth?.(
        "Unlock Note & PDF Attachment",
        "Uploading written notes, journal drafts, and PDF documents for Gemini analysis requires an active account. Sign in to attach notes."
      );
      return;
    }

    setNoteError(null);

    // Validate size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setNoteError("File is too large. Please upload documents under 15MB.");
      return;
    }

    const noteInit: AttachedNote = {
      fileName: file.name,
      fileType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain"),
      fileSize: file.size,
      extractedText: "",
      isProcessing: true,
      error: null,
    };

    setAttachedNote(noteInit);

    try {
      const result = await extractDocumentNotes(file);
      if (!result.extractedText) {
        throw new Error("No readable text found in document.");
      }

      setAttachedNote({
        ...noteInit,
        extractedText: result.extractedText,
        isProcessing: false,
      });
    } catch (err: any) {
      console.error("Failed to process document:", err);
      const errMsg = err.message || "Failed to extract text from document.";
      setAttachedNote((prev) => prev ? { ...prev, isProcessing: false, error: errMsg } : null);
      setNoteError(errMsg);
    }
  };

  const handleAttachNoteClick = () => {
    if (!hasActiveAccount) {
      onRequireAuth?.(
        "Unlock Note & PDF Attachment",
        "Uploading written notes, journal drafts, and PDF documents for Gemini analysis requires an active account. Sign in to attach notes."
      );
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
    }
    // Reset file input value so same file can be re-selected if desired
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (!hasActiveAccount) {
      onRequireAuth?.(
        "Unlock Note & PDF Attachment",
        "Uploading written notes, journal drafts, and PDF documents for Gemini analysis requires an active account. Sign in to attach notes."
      );
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleProcessFile(file);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!hasActiveAccount) {
      onRequireAuth?.(
        "Active Account Required for Reflections",
        "Writing reflections, conversing with Gemini AI, and saving journal entries requires an active registered account."
      );
      return;
    }

    // Allow sending if there's either typed text OR an extracted attached note ready
    const hasNoteText = Boolean(attachedNote && attachedNote.extractedText && !attachedNote.isProcessing);
    if ((!inputText.trim() && !hasNoteText) || isGeneratingReply) return;

    if (isGuest && userConversationCount >= maxGuestConversationsPerEntry) {
      onRequireAuth?.(
        `Conversation Limit Reached (${maxGuestConversationsPerEntry} of ${maxGuestConversationsPerEntry} in this Entry)`,
        `Guest mode allows up to ${maxGuestConversationsPerEntry} conversations per reflection entry. Sign in with an account to continue conversing${totalGuestEntries < maxGuestEntries ? " or create your second entry." : "."}`
      );
      return;
    }

    const textToSend = inputText.trim();
    let finalMessage = textToSend;

    if (attachedNote && attachedNote.extractedText && !attachedNote.isProcessing) {
      const noteHeader = `📄 **Attached Journal Note: ${attachedNote.fileName}**`;
      const noteContentBlock = `\`\`\`\n${attachedNote.extractedText}\n\`\`\``;
      
      if (textToSend) {
        finalMessage = `${noteHeader}\n\n${noteContentBlock}\n\n**My Reflection & Thoughts:**\n${textToSend}`;
      } else {
        finalMessage = `${noteHeader}\n\n${noteContentBlock}\n\n*I wrote this note earlier for my journal. Please review it, help me reflect deeply on what I've written, identify recurring themes or emotions, and guide me with thoughtful reflection questions.*`;
      }
    }

    setInputText("");
    setAttachedNote(null);
    setNoteError(null);
    await onSendMessage(finalMessage);
  };

  const handleReflectDirectlyFromModal = async (text: string) => {
    if (!hasActiveAccount) {
      onRequireAuth?.(
        "Active Account Required",
        "Conversing with Gemini AI and analyzing documents requires an active account."
      );
      return;
    }

    const noteName = attachedNote?.fileName || "Note Document";
    const noteMessage = `📄 **Attached Journal Note: ${noteName}**\n\n\`\`\`\n${text}\n\`\`\`\n\n*I wrote this note earlier for my journal. Please review it, help me reflect deeply on what I've written, identify recurring themes or emotions, and guide me with thoughtful reflection questions.*`;
    
    setAttachedNote(null);
    setInputText("");
    await onSendMessage(noteMessage);
  };

  const handleInsertNoteIntoDraft = (text: string) => {
    if (!hasActiveAccount) {
      onRequireAuth?.(
        "Active Account Required",
        "Inserting notes into drafts requires an active registered account."
      );
      return;
    }
    setInputText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      return `${trimmed}\n\n${text}`;
    });
    setAttachedNote(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice Dictation hook
  const voice = useVoiceDictation({
    onTranscriptChange: (newChunk, isFinal) => {
      if (!hasActiveAccount) return;
      setInputText((prev) => {
        const trimmed = prev.trim();
        if (!trimmed) return newChunk.trim();
        return `${trimmed} ${newChunk.trim()}`;
      });
    },
    onVoiceCommandSend: () => {
      if (!hasActiveAccount) return;
      setInputText((currentText) => {
        if (currentText.trim()) {
          onSendMessage(currentText.trim());
          return "";
        }
        return currentText;
      });
    },
    onVoiceCommandSummary: () => {
      if (!hasActiveAccount) {
        onRequireAuth?.(
          "Unlock Growth Summaries",
          "Reflection summaries and action plans require an active account. Sign in to synthesize takeaways."
        );
        return;
      }
      onGenerateSummary();
    },
    onVoiceCommandClear: () => {
      setInputText("");
    },
  });

  const handleSelectStarter = (starter: PromptStarter) => {
    if (!hasActiveAccount) {
      onRequireAuth?.(
        "Active Account Required",
        "Sign in with an active account to use reflection prompt starters and converse with Gemini AI."
      );
      return;
    }
    setInputText(starter.prompt);
    onUpdateEntry({
      ...entry,
      topic: starter.topic,
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSummaryButtonClick = () => {
    if (!hasActiveAccount) {
      onRequireAuth?.(
        "Unlock AI Growth Summaries",
        "Reflection summaries, emotional tone analysis, and mindful action plans require an active account. Sign in to synthesize your takeaways."
      );
      return;
    }
    onGenerateSummary();
  };

  const handleQuickMicClick = () => {
    if (!hasActiveAccount) {
      onRequireAuth?.(
        "Unlock Voice Dictation",
        "Hands-free voice transcription, Gemini audio dictation, and speech commands require an active account. Sign in to enable."
      );
      return;
    }
    if (voice.isListening || voice.isRecordingAudio) {
      voice.stopListening();
      voice.stopAudioRecording();
    } else {
      if (voice.voiceMode === "audio-record") {
        voice.startAudioRecording();
      } else {
        voice.startListening();
      }
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      id="journal-editor-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="max-w-4xl mx-auto space-y-6 pb-16 relative"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div
          id="journal-dropzone-overlay"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-indigo-500 rounded-3xl p-8 max-w-md w-full flex flex-col items-center gap-3 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <UploadCloud className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Drop your note or PDF here
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              We'll extract the text and load it into your reflection session seamlessly.
            </p>
          </div>
        </div>
      )}

      {/* Guest Mode Notice Banner */}
      {isGuest && (
        <div
          id="guest-conversation-banner"
          className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/60 text-slate-800 dark:text-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Guest Mode (Entry {guestEntryIndex} of {maxGuestEntries})
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  isEntryConversationLimitReached
                    ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                    : "bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                }`}>
                  Conversations: {userConversationCount}/{maxGuestConversationsPerEntry} in this entry
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {isEntryConversationLimitReached
                  ? `You have reached the maximum of ${maxGuestConversationsPerEntry} conversations for this reflection. Sign in with an account to continue conversing without limits${totalGuestEntries < maxGuestEntries ? " or start your 2nd entry." : "."}`
                  : `Guest mode allows up to ${maxGuestConversationsPerEntry} conversations per entry and ${maxGuestEntries} total entries. Advanced features (Summaries, Voice, Note/PDF Attachments, Cloud backup) require an account.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEntryConversationLimitReached && totalGuestEntries < maxGuestEntries && onNewEntry && (
              <button
                type="button"
                id="btn-guest-banner-new-entry"
                onClick={onNewEntry}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                Start Entry 2
              </button>
            )}
            <button
              type="button"
              id="btn-guest-banner-sign-in"
              onClick={() => onRequireAuth?.(
                "Sign In to Unlock All Features",
                "Create a free account to unlock unlimited conversations, unlimited entries, AI growth summaries, voice dictation, and persistent cloud sync."
              )}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              Sign In with Account
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Metadata Controls */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        {/* Title & Date */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <input
            id="input-entry-title"
            type="text"
            value={entry.title}
            disabled={!hasActiveAccount}
            onChange={(e) => onUpdateEntry({ ...entry, title: e.target.value })}
            placeholder="Give this reflection a title..."
            className={`text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 border-none outline-none focus:ring-0 w-full placeholder:text-slate-300 dark:placeholder:text-slate-600 bg-transparent ${
              !hasActiveAccount ? "opacity-60 cursor-not-allowed" : ""
            }`}
          />
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            {hasActiveAccount && streak && streak.currentStreak > 0 && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
                streak.currentStreak > 1
                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  : "bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60"
              }`}>
                <Flame className={`w-3 h-3 ${streak.currentStreak > 1 ? "text-amber-500 fill-amber-400" : "text-amber-500 fill-amber-300"}`} />
                <span>{streak.currentStreak} {streak.currentStreak === 1 ? "Day Streak" : "Days Streak"}</span>
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>{new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>
        </div>

        {/* Mood & Topic Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mood picker */}
            <div className={`flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 ${
              !hasActiveAccount ? "opacity-60" : ""
            }`}>
              <Smile className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Mood:</span>
              <select
                id="select-entry-mood"
                value={entry.mood || ""}
                disabled={!hasActiveAccount}
                onChange={(e) => onUpdateEntry({ ...entry, mood: e.target.value })}
                className={`bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 font-semibold ${
                  !hasActiveAccount ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <option value="" className="dark:bg-slate-800">Select mood...</option>
                {MOODS.map((m) => (
                  <option key={m.value} value={m.value} className="dark:bg-slate-800">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic picker */}
            <div className={`flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 ${
              !hasActiveAccount ? "opacity-60" : ""
            }`}>
              <Tag className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Focus:</span>
              <select
                id="select-entry-topic"
                value={entry.topic || ""}
                disabled={!hasActiveAccount}
                onChange={(e) => onUpdateEntry({ ...entry, topic: e.target.value })}
                className={`bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 font-semibold ${
                  !hasActiveAccount ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <option value="" className="dark:bg-slate-800">Select focus area...</option>
                {TOPICS.map((t) => (
                  <option key={t} value={t} className="dark:bg-slate-800">
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Action: Generate Summary Button */}
          {entry.messages.length >= 2 && (
            <button
              id="btn-generate-summary"
              onClick={handleSummaryButtonClick}
              disabled={!hasActiveAccount || isGeneratingSummary}
              className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 border transition-all disabled:opacity-50 shadow-xs ${
                !hasActiveAccount
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700 cursor-not-allowed"
                  : "bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800 cursor-pointer"
              }`}
            >
              {isGeneratingSummary ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <span>Synthesizing Reflection...</span>
                </>
              ) : !hasActiveAccount ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Generate Growth Summary (Account Req.)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{entry.summary ? "Update Growth Summary" : "Generate Growth Summary"}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Structured Summary Card if present */}
      {entry.summary && (
        <SummaryCard
          summary={entry.summary}
          onRefresh={handleSummaryButtonClick}
          isGenerating={isGeneratingSummary}
        />
      )}

      {/* Prompt Starters if empty reflection */}
      {entry.messages.length === 0 && (
        <PromptStarters
          onSelectPrompt={handleSelectStarter}
          disabled={!hasActiveAccount}
          onRequireAuth={() => onRequireAuth?.(
            "Active Account Required",
            "Sign in with an active account to use reflection prompt starters."
          )}
        />
      )}

      {/* Multi-turn Messages Stream */}
      <div id="journal-messages-stream" className="space-y-4">
        {entry.messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id || index}
              id={`message-bubble-${index}`}
              className={`flex items-start gap-3.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold shadow-xs ${
                  isUser
                    ? "bg-slate-900 dark:bg-indigo-600 text-white"
                    : "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                }`}
              >
                {isUser ? (
                  user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      className="w-8 h-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )
                ) : (
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-5 space-y-2 relative group shadow-xs ${
                  isUser
                    ? "bg-slate-900 dark:bg-indigo-950 text-slate-50 border border-transparent dark:border-indigo-800/60 rounded-tr-xs"
                    : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 rounded-tl-xs"
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="font-semibold text-slate-400 dark:text-slate-400">
                    {isUser ? "You" : "Gemini 3.6 Flash"}
                  </span>
                  <div className="flex items-center gap-2">
                    {msg.modelUsed && (
                      <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                        {msg.modelUsed}
                      </span>
                    )}
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      id={`btn-copy-msg-${index}`}
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      title="Copy message"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-white dark:hover:text-slate-200 cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div
                  className={`text-sm leading-relaxed ${
                    isUser
                      ? "text-slate-100 prose prose-invert max-w-none prose-p:my-1 prose-pre:my-2 prose-pre:bg-slate-950/80 prose-pre:border prose-pre:border-slate-800 prose-pre:text-slate-200"
                      : "text-slate-800 dark:text-slate-200 prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-slate-100"
                  }`}
                >
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Gemini Generating Indicator */}
        {isGeneratingReply && (
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl rounded-tl-xs p-5 space-y-2 shadow-xs max-w-md">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>Gemini is reflecting on your entry...</span>
              </div>
              <div className="h-2 w-48 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Banner with Retry */}
      {errorMessage && (
        <div
          id="editor-error-banner"
          className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {saveStatus === "error" && (
            <button
              id="btn-error-banner-retry"
              onClick={onRetrySave}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Retry Save
            </button>
          )}
        </div>
      )}

      {/* Voice Control & Hands-Free Input Panel */}
      <VoiceControlPanel
        isGuest={!hasActiveAccount}
        onRequireAuth={onRequireAuth}
        isListening={voice.isListening}
        isRecordingAudio={voice.isRecordingAudio}
        isTranscribing={voice.isTranscribing}
        interimTranscript={voice.interimTranscript}
        audioVolume={voice.audioVolume}
        lastCommand={voice.lastCommand}
        error={voice.error}
        isSupported={voice.isSupported}
        voiceMode={voice.voiceMode}
        onSetVoiceMode={voice.setVoiceMode}
        onStartListening={voice.startListening}
        onStopListening={voice.stopListening}
        onStartAudioRecording={voice.startAudioRecording}
        onStopAudioRecording={voice.stopAudioRecording}
        onManualTriggerSend={() => {
          if (inputText.trim()) {
            handleSend();
          }
        }}
        onManualTriggerSummary={() => {
          handleSummaryButtonClick();
        }}
      />

      {/* Message Input Workspace */}
      <form
        id="journal-input-form"
        onSubmit={handleSend}
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-md ring-1 ring-slate-900/5 dark:ring-slate-800/50 space-y-3 sticky bottom-4 z-30 transition-colors"
      >
        {isEntryConversationLimitReached ? (
          <div className="bg-amber-50/95 dark:bg-amber-950/50 border border-amber-200/90 dark:border-amber-800/60 rounded-xl p-3.5 text-left space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                <Lock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>Conversation Limit Reached for this Entry ({maxGuestConversationsPerEntry}/{maxGuestConversationsPerEntry})</span>
              </div>
              <span className="text-[10px] font-semibold bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                Max 2 Per Entry
              </span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              You have used both allowed conversations in this reflection entry. Sign in with an account to continue reflecting without limits{totalGuestEntries < maxGuestEntries ? " or create your 2nd allowed guest entry." : "."}
            </p>
            <div className="flex items-center gap-2 pt-1">
              {totalGuestEntries < maxGuestEntries && onNewEntry && (
                <button
                  type="button"
                  id="btn-guest-form-new-entry"
                  onClick={onNewEntry}
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                >
                  Start Entry 2
                </button>
              )}
              <button
                type="button"
                id="btn-guest-form-sign-in"
                onClick={() => onRequireAuth?.(
                  "Unlock Unlimited Conversations",
                  "Sign in with Google or Email to continue this conversation and reflect without limits."
                )}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs"
              >
                Sign In with Account
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Attached Note Preview Pill/Card */}
            {attachedNote && (
              <div
                id="attached-note-card"
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  noteError || attachedNote.error
                    ? "bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                    : attachedNote.isProcessing
                    ? "bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-200/80 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200 animate-pulse"
                    : "bg-slate-50 dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold truncate max-w-[150px] sm:max-w-xs">
                        {attachedNote.fileName}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                        {attachedNote.fileName.toLowerCase().endsWith(".pdf") ? "PDF" : "TXT"} • {(attachedNote.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {attachedNote.isProcessing ? (
                        <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Extracting note text with Gemini...</span>
                        </span>
                      ) : noteError || attachedNote.error ? (
                        <span className="text-rose-600 dark:text-rose-400">{noteError || attachedNote.error}</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                          <FileCheck className="w-3 h-3" />
                          <span>Note extracted & attached ({attachedNote.extractedText.length} characters)</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!attachedNote.isProcessing && !attachedNote.error && !noteError && (
                    <>
                      <button
                        type="button"
                        id="btn-note-view-text"
                        onClick={() => setIsPreviewOpen(true)}
                        title="Inspect or edit extracted note text"
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Preview</span>
                      </button>
                      <button
                        type="button"
                        id="btn-note-insert-draft"
                        onClick={() => handleInsertNoteIntoDraft(attachedNote.extractedText)}
                        title="Insert text into draft prompt"
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Insert</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    id="btn-note-remove"
                    onClick={() => {
                      setAttachedNote(null);
                      setNoteError(null);
                    }}
                    title="Remove attached note"
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="relative">
              <textarea
                id="textarea-journal-prompt"
                ref={textareaRef}
                rows={3}
                value={inputText}
                disabled={!hasActiveAccount}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  !hasActiveAccount
                    ? "Active account required to write reflections, converse with Gemini AI, or attach notes. Sign in to start."
                    : attachedNote && !attachedNote.isProcessing
                    ? "Add your reflections or questions about this note (or click Reflect to analyze directly)..."
                    : entry.messages.length === 0
                    ? "Write your thoughts, attach a note/PDF, or choose a prompt starter to reflect with Gemini..."
                    : isGuest
                    ? `Continue reflection with Gemini (Conversation ${userConversationCount + 1} of ${maxGuestConversationsPerEntry})...`
                    : "Continue your conversation with Gemini, or attach a written note/PDF..."
                }
                className={`w-full bg-transparent border-none outline-none resize-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-0 leading-relaxed max-h-48 ${
                  !hasActiveAccount ? "opacity-60 cursor-not-allowed" : ""
                }`}
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="text-slate-400 dark:text-slate-500 hidden sm:block font-medium">
                {!hasActiveAccount ? (
                  <span className="text-amber-800 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200/80 dark:border-amber-800 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    Active Account Required
                  </span>
                ) : isGuest ? (
                  <span className="text-amber-800 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200/80 dark:border-amber-800">
                    Guest Conversation {userConversationCount + 1} of {maxGuestConversationsPerEntry}
                  </span>
                ) : (
                  <>
                    Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-600 dark:text-slate-300">Cmd + Enter</kbd> to send reflection
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {/* Hidden File Input for Text / Markdown / PDF */}
                <input
                  ref={fileInputRef}
                  type="file"
                  id="input-note-file"
                  disabled={!hasActiveAccount}
                  onChange={handleFileInputChange}
                  accept=".txt,.md,.markdown,.json,.csv,.rtf,.pdf,text/*,application/pdf"
                  className="hidden"
                />

                {/* Attach Note (.txt, .pdf) Button */}
                <button
                  id="btn-composer-attach-note"
                  type="button"
                  onClick={handleAttachNoteClick}
                  disabled={!hasActiveAccount}
                  title={
                    !hasActiveAccount
                      ? "Sign in with an active account to attach notes & PDFs"
                      : attachedNote
                      ? "Note attached - click to choose another"
                      : "Attach note or PDF document (.txt, .md, .pdf)"
                  }
                  className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                    !hasActiveAccount
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-50"
                      : attachedNote
                      ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 cursor-pointer"
                      : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-pointer"
                  }`}
                >
                  {!hasActiveAccount ? (
                    <>
                      <Paperclip className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs font-semibold hidden md:inline">Attach Note</span>
                      <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    </>
                  ) : (
                    <>
                      <Paperclip className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold hidden md:inline">
                        {attachedNote ? "Note Attached" : "Attach Note"}
                      </span>
                    </>
                  )}
                </button>

                {/* Quick Mic Action in Toolbar */}
                <button
                  id="btn-composer-quick-mic"
                  type="button"
                  onClick={handleQuickMicClick}
                  disabled={!hasActiveAccount}
                  title={!hasActiveAccount ? "Sign in with an active account to enable voice" : voice.isListening ? "Stop listening" : "Start hands-free voice input"}
                  className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                    !hasActiveAccount
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-50"
                      : voice.isListening || voice.isRecordingAudio
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs animate-pulse cursor-pointer"
                      : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-pointer"
                  }`}
                >
                  {!hasActiveAccount ? (
                    <>
                      <Mic className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    </>
                  ) : voice.isListening || voice.isRecordingAudio ? (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold hidden md:inline">Listening...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                      <span className="text-xs font-semibold hidden md:inline">Voice</span>
                    </>
                  )}
                </button>

                {/* Clear Draft if text present */}
                {inputText.trim() && (
                  <button
                    id="btn-composer-clear"
                    type="button"
                    onClick={() => setInputText("")}
                    className="px-3 py-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}

                <button
                  id="btn-send-reflection-prompt"
                  type="submit"
                  disabled={
                    !hasActiveAccount ||
                    (!inputText.trim() && !(attachedNote && attachedNote.extractedText && !attachedNote.isProcessing)) ||
                    isGeneratingReply ||
                    (attachedNote?.isProcessing ?? false)
                  }
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isGeneratingReply ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Thinking...</span>
                    </>
                  ) : (
                    <>
                      <span>Reflect</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </form>

      {/* Note Inspection & Preview Modal */}
      {isPreviewOpen && attachedNote && (
        <NotePreviewModal
          note={attachedNote}
          onClose={() => setIsPreviewOpen(false)}
          onUpdateText={(newText) => {
            setAttachedNote((prev) => (prev ? { ...prev, extractedText: newText } : null));
          }}
          onInsertIntoDraft={handleInsertNoteIntoDraft}
          onReflectDirectly={handleReflectDirectlyFromModal}
        />
      )}
    </div>
  );
};

