export type UserRole = 'admin' | 'user';
export type UserAccountStatus = 'active' | 'deactivated';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: UserRole;
  status?: UserAccountStatus;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL?: string | null;
  role: UserRole;
  status: UserAccountStatus;
  createdAt: number;
  lastLoginAt: number;
  entryCount?: number;
  deactivatedAt?: number;
  deactivatedBy?: string;
  deactivationReason?: string;
}

export interface AdminAuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  targetUid: string;
  targetEmail: string;
  action: 'activate' | 'deactivate' | 'role_change' | 'user_created';
  details?: string;
  timestamp: number;
}

export interface DailySignupMetric {
  date: string; // formatted "MMM D" e.g. "Aug 25"
  fullDate: string; // "YYYY-MM-DD"
  timestamp: number;
  count: number;
  cumulativeCount: number;
}

export interface GeminiUsageMetric {
  date: string; // formatted "MMM D" e.g. "Aug 25"
  fullDate: string; // "YYYY-MM-DD"
  timestamp: number;
  requestsCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  avgLatencyMs: number;
}

export interface ModelUsageBreakdown {
  model: string;
  requests: number;
  tokens: number;
  costUsd: number;
  percentage: number;
}

export interface FeatureUsageBreakdown {
  feature: string;
  endpoint: string;
  requests: number;
  tokens: number;
  costUsd: number;
}

export interface RecentGeminiLog {
  id: string;
  timestamp: number;
  endpoint: string;
  feature: string;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  status: 'success' | 'error';
}

export interface AdminAnalyticsData {
  totalUsers: number;
  activeUsers: number;
  deactivatedUsers: number;
  adminUsers: number;
  todaySignups: number;
  weekSignups: number;
  totalAiRequests: number;
  totalAiTokens: number;
  totalAiCostUsd: number;
  dailySignups: DailySignupMetric[];
  dailyAiUsage: GeminiUsageMetric[];
  modelBreakdown: ModelUsageBreakdown[];
  featureBreakdown: FeatureUsageBreakdown[];
  recentLogs: RecentGeminiLog[];
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

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string; // YYYY-MM-DD local format
  streakBroken?: boolean;
  lastCalculatedAt: number;
}

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

export interface WeeklyDigest {
  id: string;
  userId: string;
  userEmail: string;
  weekStartDate: string;
  weekEndDate: string;
  generatedAt: number;
  entryCount: number;
  title: string;
  overview: string;
  emotionalArc: string;
  keyThemes: string[];
  topInsights: string[];
  growthActions: string[];
  gratitudeHighlights: string[];
  status: 'sent' | 'scheduled' | 'preview';
  sentAt?: number;
  deliveryChannel?: string;
  rawHtml?: string;
}

export interface WeeklyDigestSettings {
  enabled: boolean;
  deliveryDay: 'saturday';
  deliveryHourUtc: number; // e.g. 9 for 9:00 UTC
  customEmail?: string;
  lastSentWeek?: string;
}

