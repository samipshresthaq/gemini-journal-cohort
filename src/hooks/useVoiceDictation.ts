import { useState, useEffect, useRef, useCallback } from "react";
import { VoiceMode } from "../types";

// Declarations for Web Speech API
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

interface UseVoiceDictationOptions {
  onTranscriptChange: (text: string, isFinal: boolean) => void;
  onVoiceCommandSend?: () => void;
  onVoiceCommandSummary?: () => void;
  onVoiceCommandClear?: () => void;
}

export function useVoiceDictation({
  onTranscriptChange,
  onVoiceCommandSend,
  onVoiceCommandSummary,
  onVoiceCommandClear,
}: UseVoiceDictationOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [audioVolume, setAudioVolume] = useState(0);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("handsfree");
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isListeningRef = useRef(false);

  isListeningRef.current = isListening;

  // Check SpeechRecognition browser support
  useEffect(() => {
    const customWindow = window as unknown as IWindow;
    const SpeechRec = customWindow.SpeechRecognition || customWindow.webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsSupported(false);
    }
  }, []);

  // Visual audio waveform / volume analyzer
  const startAudioAnalyzer = async () => {
    try {
      if (micStreamRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioVolume(normalized);
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err: any) {
      console.warn("Could not start audio volume meter:", err);
    }
  };

  const stopAudioAnalyzer = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setAudioVolume(0);
  };

  // Process hands-free voice commands
  const processVoiceCommands = (transcript: string): boolean => {
    const clean = transcript.trim().toLowerCase();

    // Send / Reflect command
    if (
      clean.endsWith("send reflection") ||
      clean.endsWith("reflect now") ||
      clean === "reflect" ||
      clean === "send" ||
      clean.endsWith("submit reflection") ||
      clean.endsWith("send message")
    ) {
      setLastCommand("Reflect / Send");
      if (onVoiceCommandSend) {
        onVoiceCommandSend();
      }
      return true;
    }

    // Summarize command
    if (
      clean.endsWith("generate summary") ||
      clean.endsWith("synthesize reflection") ||
      clean === "summarize" ||
      clean === "growth summary"
    ) {
      setLastCommand("Generate Summary");
      if (onVoiceCommandSummary) {
        onVoiceCommandSummary();
      }
      return true;
    }

    // Clear command
    if (
      clean === "clear text" ||
      clean === "clear draft" ||
      clean === "clear input" ||
      clean === "start over"
    ) {
      setLastCommand("Clear Draft");
      if (onVoiceCommandClear) {
        onVoiceCommandClear();
      }
      return true;
    }

    // Stop listening
    if (
      clean === "stop listening" ||
      clean === "pause dictation" ||
      clean === "stop microphone"
    ) {
      setLastCommand("Stopped Listening");
      stopListening();
      return true;
    }

    return false;
  };

  // Convert natural voice punctuation to symbols
  const formatPunctuation = (text: string): string => {
    return text
      .replace(/\bnew paragraph\b/gi, "\n\n")
      .replace(/\bnew line\b/gi, "\n")
      .replace(/\bnext line\b/gi, "\n")
      .replace(/\bperiod\b/gi, ".")
      .replace(/\bfull stop\b/gi, ".")
      .replace(/\bcomma\b/gi, ",")
      .replace(/\bquestion mark\b/gi, "?")
      .replace(/\bexclamation mark\b/gi, "!")
      .replace(/\bexclamation point\b/gi, "!")
      .replace(/\bcolon\b/gi, ":")
      .replace(/\bsemicolon\b/gi, ";");
  };

  // Start live browser speech dictation
  const startListening = useCallback(async () => {
    setError(null);
    setLastCommand(null);

    const customWindow = window as unknown as IWindow;
    const SpeechRec = customWindow.SpeechRecognition || customWindow.webkitSpeechRecognition;

    if (!SpeechRec) {
      setError("Speech recognition is not natively supported in this browser. You can use 'Record Audio with Gemini' below.");
      return;
    }

    try {
      await startAudioAnalyzer();

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }

      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcriptPiece;
          } else {
            interim += transcriptPiece;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (finalChunk) {
          setInterimTranscript("");
          const isCommand = processVoiceCommands(finalChunk);
          if (!isCommand) {
            const formatted = formatPunctuation(finalChunk);
            onTranscriptChange(formatted, true);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed") {
          setError("Microphone access denied. Please allow microphone permission in your browser.");
          stopListening();
        } else if (event.error === "network") {
          setError("Network issue during speech recognition.");
        } else if (event.error !== "no-speech") {
          setError(`Speech error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // If hands-free mode is enabled and user hasn't explicitly stopped, restart recognition
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (_) {
            setIsListening(false);
            stopAudioAnalyzer();
          }
        } else {
          setIsListening(false);
          stopAudioAnalyzer();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setError(err.message || "Failed to initialize microphone.");
      setIsListening(false);
      stopAudioAnalyzer();
    }
  }, [onTranscriptChange]);

  // Stop live dictation
  const stopListening = useCallback(() => {
    setIsListening(false);
    isListeningRef.current = false;
    setInterimTranscript("");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    stopAudioAnalyzer();
  }, []);

  // Audio Recording with Gemini Multimodal Audio Transcription fallback
  const startAudioRecording = async () => {
    setError(null);
    try {
      await startAudioAnalyzer();
      audioChunksRef.current = [];

      const stream = micStreamRef.current || (await navigator.mediaDevices.getUserMedia({ audio: true }));
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstart = () => {
        setIsRecordingAudio(true);
      };

      recorder.onstop = async () => {
        setIsRecordingAudio(false);
        stopAudioAnalyzer();

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size === 0) return;

        setIsTranscribing(true);
        try {
          // Convert Blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = reader.result as string;
            const res = await fetch("/api/gemini/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioBase64: base64Data,
                mimeType: "audio/webm",
              }),
            });

            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Failed to transcribe audio.");
            }

            if (data.transcript) {
              onTranscriptChange(data.transcript, true);
              setLastCommand("Transcribed with Gemini 3.6 Flash");
            }
            setIsTranscribing(false);
          };
        } catch (transcribeErr: any) {
          console.error("Audio transcription failed:", transcribeErr);
          setError(transcribeErr.message || "Failed to transcribe audio.");
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch (err: any) {
      console.error("Failed to record audio:", err);
      setError(err.message || "Microphone access failed.");
      setIsRecordingAudio(false);
      stopAudioAnalyzer();
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      stopAudioRecording();
      stopAudioAnalyzer();
    };
  }, [stopListening]);

  return {
    isListening,
    isRecordingAudio,
    isTranscribing,
    interimTranscript,
    audioVolume,
    lastCommand,
    error,
    isSupported,
    voiceMode,
    setVoiceMode,
    startListening,
    stopListening,
    startAudioRecording,
    stopAudioRecording,
  };
}
