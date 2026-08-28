import React, { useState, useRef, useEffect } from "react";
import { AuthUser, JournalEntry, JournalMessage, PromptStarter, SaveStatus } from "../types";
import { PromptStarters } from "./PromptStarters";
import { SummaryCard } from "./SummaryCard";
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
  ChevronDown
} from "lucide-react";

interface JournalEditorProps {
  user: AuthUser;
  entry: JournalEntry;
  onUpdateEntry: (entry: JournalEntry) => void;
  onSendMessage: (content: string) => Promise<void>;
  onGenerateSummary: () => Promise<void>;
  isGeneratingReply: boolean;
  isGeneratingSummary: boolean;
  saveStatus: SaveStatus;
  onRetrySave: () => void;
  errorMessage?: string | null;
}

const MOODS = [
  { label: "🌿 Grounded", value: "Grounded" },
  { label: "💡 Inspired", value: "Inspired" },
  { label: "⚡ Energized", value: "Energized" },
  { label: "🎯 Focused", value: "Focused" },
  { label: "🌊 Overwhelmed", value: "Overwhelmed" },
  { label: "🧘 Peaceful", value: "Peaceful" },
  { label: "🌪️ Conflicted", value: "Conflicted" },
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
  entry,
  onUpdateEntry,
  onSendMessage,
  onGenerateSummary,
  isGeneratingReply,
  isGeneratingSummary,
  saveStatus,
  onRetrySave,
  errorMessage,
}) => {
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entry.messages, isGeneratingReply]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isGeneratingReply) return;
    const textToSend = inputText.trim();
    setInputText("");
    await onSendMessage(textToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectStarter = (starter: PromptStarter) => {
    setInputText(starter.prompt);
    onUpdateEntry({
      ...entry,
      topic: starter.topic,
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div id="journal-editor-container" className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Header & Metadata Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Title & Date */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <input
            id="input-entry-title"
            type="text"
            value={entry.title}
            onChange={(e) => onUpdateEntry({ ...entry, title: e.target.value })}
            placeholder="Give this reflection a title..."
            className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 border-none outline-none focus:ring-0 w-full placeholder:text-slate-300"
          />
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
        </div>

        {/* Mood & Topic Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mood picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Smile className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">Mood:</span>
              <select
                id="select-entry-mood"
                value={entry.mood || ""}
                onChange={(e) => onUpdateEntry({ ...entry, mood: e.target.value })}
                className="bg-transparent border-none outline-none text-slate-800 font-semibold cursor-pointer"
              >
                <option value="">Select mood...</option>
                {MOODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">Focus:</span>
              <select
                id="select-entry-topic"
                value={entry.topic || ""}
                onChange={(e) => onUpdateEntry({ ...entry, topic: e.target.value })}
                className="bg-transparent border-none outline-none text-slate-800 font-semibold cursor-pointer"
              >
                <option value="">Select focus area...</option>
                {TOPICS.map((t) => (
                  <option key={t} value={t}>
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
              onClick={onGenerateSummary}
              disabled={isGeneratingSummary}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 border border-indigo-200/80 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isGeneratingSummary ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Synthesizing Reflection...</span>
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
          onRefresh={onGenerateSummary}
          isGenerating={isGeneratingSummary}
        />
      )}

      {/* Prompt Starters if empty reflection */}
      {entry.messages.length === 0 && (
        <PromptStarters onSelectPrompt={handleSelectStarter} />
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
                    ? "bg-slate-900 text-white"
                    : "bg-indigo-100 text-indigo-900 border border-indigo-200"
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
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                )}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-5 space-y-2 relative group shadow-xs ${
                  isUser
                    ? "bg-slate-900 text-slate-50 rounded-tr-xs"
                    : "bg-white text-slate-900 border border-slate-200/90 rounded-tl-xs"
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-400">
                    {isUser ? "You" : "Gemini 3.6 Flash"}
                  </span>
                  <div className="flex items-center gap-2">
                    {msg.modelUsed && (
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
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
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-white cursor-pointer"
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
                      ? "text-slate-100 whitespace-pre-wrap"
                      : "text-slate-800 prose prose-slate max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-slate-900"
                  }`}
                >
                  {isUser ? (
                    msg.content
                  ) : (
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Gemini Generating Indicator */}
        {isGeneratingReply && (
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-5 space-y-2 shadow-xs max-w-md">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Gemini is reflecting on your entry...</span>
              </div>
              <div className="h-2 w-48 bg-slate-100 rounded-full animate-pulse"></div>
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
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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

      {/* Message Input Workspace */}
      <form
        id="journal-input-form"
        onSubmit={handleSend}
        className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 shadow-md ring-1 ring-slate-900/5 space-y-3 sticky bottom-4 z-30"
      >
        <div className="relative">
          <textarea
            id="textarea-journal-prompt"
            ref={textareaRef}
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              entry.messages.length === 0
                ? "Write your thoughts, feelings, daily events, or choose a starter above..."
                : "Continue your reflection, ask Gemini for advice, or explore a deeper angle..."
            }
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-slate-900 placeholder:text-slate-400 focus:ring-0 leading-relaxed max-h-48"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs">
          <div className="text-slate-400 hidden sm:block font-medium">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 font-mono text-[10px] text-slate-600">Cmd + Enter</kbd> to reflect
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              id="btn-send-reflection-prompt"
              type="submit"
              disabled={!inputText.trim() || isGeneratingReply}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-2 shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
      </form>
    </div>
  );
};
