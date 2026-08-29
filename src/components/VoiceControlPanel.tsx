import React, { useState } from "react";
import { 
  Mic, 
  Radio, 
  Sparkles, 
  Volume2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  AudioWaveform, 
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Lock
} from "lucide-react";
import { VoiceMode } from "../types";

interface VoiceControlPanelProps {
  isGuest?: boolean;
  onRequireAuth?: (title?: string, description?: string) => void;
  isListening: boolean;
  isRecordingAudio: boolean;
  isTranscribing: boolean;
  interimTranscript: string;
  audioVolume: number;
  lastCommand: string | null;
  error: string | null;
  isSupported: boolean;
  voiceMode: VoiceMode;
  onSetVoiceMode: (mode: VoiceMode) => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onStartAudioRecording: () => void;
  onStopAudioRecording: () => void;
  onManualTriggerSend: () => void;
  onManualTriggerSummary: () => void;
}

export const VoiceControlPanel: React.FC<VoiceControlPanelProps> = ({
  isGuest = false,
  onRequireAuth,
  isListening,
  isRecordingAudio,
  isTranscribing,
  interimTranscript,
  audioVolume,
  lastCommand,
  error,
  isSupported,
  voiceMode,
  onSetVoiceMode,
  onStartListening,
  onStopListening,
  onStartAudioRecording,
  onStopAudioRecording,
  onManualTriggerSend,
  onManualTriggerSummary,
}) => {
  const [showCheatsheet, setShowCheatsheet] = useState(false);

  const isActive = isListening || isRecordingAudio;

  const handleMicClick = () => {
    if (isGuest) {
      if (onRequireAuth) {
        onRequireAuth(
          "Unlock Voice Dictation & Controls",
          "Voice transcription, Gemini audio dictation, and hands-free voice commands require an account. Sign in to enable."
        );
      }
      return;
    }
    if (isActive) {
      if (isListening) onStopListening();
      if (isRecordingAudio) onStopAudioRecording();
    } else {
      if (voiceMode === "audio-record") {
        onStartAudioRecording();
      } else {
        onStartListening();
      }
    }
  };

  const handleModeSwitch = (mode: VoiceMode) => {
    if (isGuest) {
      if (onRequireAuth) {
        onRequireAuth(
          "Unlock Voice Modes",
          "Audio recording and speech modes require an account. Sign in to unlock."
        );
      }
      return;
    }
    onSetVoiceMode(mode);
  };

  return (
    <div
      id="voice-control-panel"
      className={`rounded-2xl border transition-all duration-300 ${
        isGuest
          ? "bg-slate-100/80 text-slate-700 border-slate-200/90"
          : isActive
          ? "bg-slate-900 text-white border-indigo-500/60 shadow-lg ring-1 ring-indigo-500/30"
          : "bg-slate-50/80 text-slate-800 border-slate-200/90"
      } p-4 space-y-3 relative`}
    >
      {/* Guest Lock Indicator Banner if guest */}
      {isGuest && (
        <div className="flex items-center justify-between gap-2 pb-2 mb-1 border-b border-slate-200/70 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Voice Controls & Dictation (Account Required)</span>
          </div>
          <button
            type="button"
            onClick={() => onRequireAuth?.(
              "Unlock Voice Dictation & Controls",
              "Voice transcription, Gemini audio dictation, and hands-free voice commands require an account."
            )}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
          >
            Sign In to Unlock
          </button>
        </div>
      )}

      {/* Top Bar: Status, Mode Switcher, & Main Mic Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Status & Audio Waveform */}
        <div className="flex items-center gap-3">
          <button
            id="btn-toggle-voice-dictation"
            type="button"
            onClick={handleMicClick}
            disabled={isTranscribing}
            className={`relative p-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm ${
              isGuest
                ? "bg-white hover:bg-amber-50 text-slate-500 border border-slate-300"
                : isActive
                ? "bg-indigo-600 hover:bg-indigo-500 text-white ring-4 ring-indigo-500/30 scale-105"
                : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 hover:border-slate-300"
            }`}
            title={isGuest ? "Sign in to enable voice" : isActive ? "Stop voice listening" : "Start hands-free voice input"}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            ) : isGuest ? (
              <div className="relative">
                <Mic className="w-5 h-5 text-slate-400" />
                <Lock className="w-2.5 h-2.5 text-amber-600 absolute -bottom-1 -right-1" />
              </div>
            ) : isActive ? (
              <>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <Mic className="w-5 h-5 animate-pulse" />
              </>
            ) : (
              <Mic className="w-5 h-5 text-slate-700" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-tight">
                {isGuest
                  ? "Voice Dictation & Hands-Free Control"
                  : isTranscribing
                  ? "Transcribing with Gemini 3.6 Flash..."
                  : isActive
                  ? "Hands-Free Voice Listening"
                  : "Voice Input & Hands-Free Control"}
              </span>
              {isActive && !isGuest && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-indigo-400" />
                  Live Mic
                </span>
              )}
            </div>
            <p className={`text-xs ${isActive && !isGuest ? "text-slate-400" : "text-slate-500"}`}>
              {isGuest
                ? "Guest accounts are limited to conversation mode. Sign in to speak or dictate."
                : isActive
                ? "Speak freely. Say 'Reflect' to send, 'New paragraph' for line breaks."
                : "Click microphone to dictate or speak hands-free commands."}
            </p>
          </div>
        </div>

        {/* Right: Mode Selector & Cheatsheet Toggle */}
        <div className="flex items-center gap-2">
          {/* Mode Selector Tabs */}
          <div className="flex items-center bg-black/10 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 text-xs">
            <button
              type="button"
              onClick={() => handleModeSwitch("handsfree")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                voiceMode === "handsfree"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Hands-Free Live
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("audio-record")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                voiceMode === "audio-record"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Gemini HD Audio
            </button>
          </div>

          <button
            type="button"
            id="btn-toggle-voice-commands-help"
            onClick={() => setShowCheatsheet(!showCheatsheet)}
            className={`p-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
              isActive && !isGuest
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
            title="Spoken voice commands list"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Commands</span>
            {showCheatsheet ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Active Audio Waveform Meter */}
      {isActive && !isGuest && (
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 flex-1">
            <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="flex items-center gap-0.5 h-6 flex-1 max-w-xs">
              {[...Array(24)].map((_, i) => {
                const barHeight = Math.max(
                  15,
                  Math.min(100, (audioVolume * 1.5 * ((i % 5) + 1)) / 5)
                );
                return (
                  <div
                    key={i}
                    className="flex-1 bg-indigo-500/80 rounded-full transition-all duration-75"
                    style={{
                      height: `${barHeight}%`,
                      opacity: audioVolume > 5 ? 0.9 : 0.25,
                    }}
                  />
                );
              })}
            </div>
            <span className="text-[11px] font-mono text-indigo-300 pl-2">
              {audioVolume}% Mic
            </span>
          </div>

          {lastCommand && (
            <div className="flex items-center gap-1.5 text-xs bg-indigo-950 text-indigo-300 px-3 py-1 rounded-full border border-indigo-700/60 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Command: <strong>{lastCommand}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Real-time Interim Streaming Transcript Preview */}
      {interimTranscript && !isGuest && (
        <div
          id="voice-interim-transcript-box"
          className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs text-indigo-200 italic flex items-center gap-2 animate-pulse"
        >
          <AudioWaveform className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="line-clamp-2 font-medium">"{interimTranscript}"</span>
        </div>
      )}

      {/* Error / Warning Alert */}
      {error && !isGuest && (
        <div
          id="voice-error-banner"
          className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => onStartAudioRecording()}
            className="text-xs font-bold text-rose-900 underline hover:no-underline cursor-pointer"
          >
            Try Gemini Audio Record
          </button>
        </div>
      )}

      {/* Spoken Voice Commands Cheatsheet */}
      {showCheatsheet && (
        <div
          id="voice-commands-cheatsheet"
          className={`p-4 rounded-xl border space-y-2.5 text-xs transition-all ${
            isActive && !isGuest
              ? "bg-slate-800/80 border-slate-700/80 text-slate-300"
              : "bg-white border-slate-200 text-slate-700 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-indigo-400">
              🗣️ Hands-Free Voice Commands
            </span>
            <span className="text-[11px] text-slate-400">
              {isGuest ? "Account required" : "Speak naturally at any time"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-black/10 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-700/50 space-y-0.5">
              <span className="font-bold text-slate-900 dark:text-white">"Reflect" / "Send"</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Submits your spoken entry to Gemini without clicking.
              </p>
            </div>

            <div className="p-2 rounded-lg bg-black/10 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-700/50 space-y-0.5">
              <span className="font-bold text-slate-900 dark:text-white">"New paragraph" / "New line"</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Inserts a clean paragraph break into your reflection.
              </p>
            </div>

            <div className="p-2 rounded-lg bg-black/10 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-700/50 space-y-0.5">
              <span className="font-bold text-slate-900 dark:text-white">"Generate summary"</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Synthesizes key takeaways and growth action items.
              </p>
            </div>

            <div className="p-2 rounded-lg bg-black/10 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-700/50 space-y-0.5">
              <span className="font-bold text-slate-900 dark:text-white">"Clear draft" / "Clear input"</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Clears current text to start fresh.
              </p>
            </div>

            <div className="p-2 rounded-lg bg-black/10 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-700/50 space-y-0.5">
              <span className="font-bold text-slate-900 dark:text-white">"Stop listening" / "Stop"</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pauses the microphone and voice recognition.
              </p>
            </div>

            <div className="p-2 rounded-lg bg-black/10 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-700/50 space-y-0.5">
              <span className="font-bold text-slate-900 dark:text-white">Punctuation Words</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Say "period", "comma", "question mark", "colon".
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
