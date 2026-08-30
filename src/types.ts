export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface JournalMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  modelUsed?: string;
}

export interface ReflectionSummary {
  title: string;
  overview: string;
  keyTakeaways: string[];
  emotionalTone: string;
  growthInsights: string;
  actionItems: string[];
  generatedAt?: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mood?: string;
  topic?: string;
  messages: JournalMessage[];
  summary?: ReflectionSummary;
  isFavorite?: boolean;
  tags?: string[];
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface PromptStarter {
  title: string;
  topic: string;
  prompt: string;
  iconName: string;
}

export interface AttachedNote {
  fileName: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
  isProcessing?: boolean;
  error?: string | null;
}

export type VoiceMode = 'dictate' | 'handsfree' | 'audio-record';

export interface VoiceStatus {
  isListening: boolean;
  isRecordingAudio: boolean;
  isTranscribing: boolean;
  interimTranscript: string;
  audioVolume: number;
  lastCommand: string | null;
  error: string | null;
  isSupported: boolean;
  voiceMode: VoiceMode;
}
