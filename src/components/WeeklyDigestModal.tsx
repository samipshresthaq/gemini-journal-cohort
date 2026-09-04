import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Mail,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  FileText,
  History,
  ShieldCheck,
  ChevronRight,
  Flame,
  ArrowRight,
  Check,
  MailX,
  BellOff,
  Settings
} from "lucide-react";
import { AuthUser, JournalEntry, WeeklyDigest, WeeklyDigestSettings } from "../types";
import {
  filterPastWeekEntries,
  generateWeeklySummary,
  sendDigestViaGmailApi,
  sendWeeklySummaryEmail,
  subscribeToUserDigests,
  getDigestSettings,
  saveDigestSettings,
  subscribeToDigestSettings,
  toggleUserDigestSubscription,
  getWeekDateRange
} from "../lib/digestService";
import { getGoogleAccessToken, authorizeGmailAccess } from "../firebase";

interface WeeklyDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  entries: JournalEntry[];
  isGuest: boolean;
  onRequireAuth: () => void;
}

export const WeeklyDigestModal: React.FC<WeeklyDigestModalProps> = ({
  isOpen,
  onClose,
  user,
  entries,
  isGuest,
  onRequireAuth,
}) => {
  const [activeTab, setActiveTab] = useState<"current" | "preview" | "history" | "settings">("current");
  const [currentDigest, setCurrentDigest] = useState<WeeklyDigest | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ success: boolean; message: string; timestamp?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pastDigests, setPastDigests] = useState<WeeklyDigest[]>([]);
  const [confirmSendType, setConfirmSendType] = useState<"gmail" | "smtp" | null>(null);
  const [settings, setSettings] = useState<WeeklyDigestSettings>({
    enabled: true,
    deliveryDay: "saturday",
    deliveryHourUtc: 9,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const pastWeekEntries = filterPastWeekEntries(entries);
  const { startDate, endDate } = getWeekDateRange();

  // Load past digests & settings on modal open
  useEffect(() => {
    if (!isOpen || !user || isGuest) return;

    // Real-time subscribe to settings
    const unsubSettings = subscribeToDigestSettings(user.uid, (s) => {
      setSettings(s);
    });

    // Subscribe to past digests
    const unsubDigests = subscribeToUserDigests(user.uid, (list) => {
      setPastDigests(list);
    });

    return () => {
      unsubSettings();
      unsubDigests();
    };
  }, [isOpen, user, isGuest]);

  // Handle subscription preference toggle
  const handleToggleSubscription = async () => {
    if (!user || isGuest) return;
    setSavingSettings(true);
    setError(null);
    try {
      const nextState = !settings.enabled;
      await saveDigestSettings(user.uid, { enabled: nextState });
      setSettings((prev) => ({ ...prev, enabled: nextState }));
      setSendStatus({
        success: true,
        message: nextState
          ? "Weekly email digest subscription is now ON. You will receive syntheses every Saturday!"
          : "Weekly email digest subscription is now PAUSED. Automated emails will not be sent.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      setTimeout(() => setSendStatus(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to update subscription preference.");
    } finally {
      setSavingSettings(false);
    }
  };

  if (!isOpen) return null;

  // If Guest User tries to open Weekly Digest
  if (isGuest || !user || !user.email) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/20">
            <Mail className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Weekly Journal Digest
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            Every Saturday, registered users receive an AI-synthesized reflection newsletter summarizing their weekly breakthrough moments, emotional arc, and actionable intentions.
          </p>

          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-left mb-6 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Registered User Feature
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Sign in with your Google or Email account to connect your Gmail, activate automated Saturday deliveries, and review personalized weekly summaries.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onRequireAuth();
              }}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Sign In to Enable Saturday Digest
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle generating weekly summary
  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const digest = await generateWeeklySummary(pastWeekEntries, user);
      setCurrentDigest(digest);
    } catch (err: any) {
      setError(err.message || "Failed to generate weekly digest.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Perform confirmed email dispatch (Gmail API or SMTP)
  const executeSendEmail = async (type: "gmail" | "smtp") => {
    if (!currentDigest) return;
    setConfirmSendType(null);
    setIsSending(true);
    setError(null);
    setSendStatus(null);

    const userName = user.displayName || user.email?.split("@")[0] || "Writer";

    // Subscription preference enforcement
    if (settings.enabled === false) {
      setError(
        "Weekly digest email subscription is currently turned off for your account. Please enable the subscription using the toggle above or in Subscription Settings before dispatching emails."
      );
      return;
    }

    try {
      if (type === "gmail") {
        const result = await sendDigestViaGmailApi(currentDigest, userName);
        setSendStatus({
          success: true,
          message: `Weekly summary successfully dispatched via Google Gmail API directly to ${user.email}! (Message ID: ${result.messageId || "gmail-sent"})`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      } else {
        const result = await sendWeeklySummaryEmail(currentDigest, userName);
        setSendStatus({
          success: true,
          message: `Weekly summary dispatched to ${user.email} via ${result.deliveryChannel || "Mail Transport"}!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }

      setCurrentDigest({
        ...currentDigest,
        status: "sent",
        sentAt: Date.now(),
      });
    } catch (err: any) {
      setError(err.message || "Could not dispatch email. Please check your Gmail connection.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative">
        
        {/* User Confirmation Dialog (MANDATORY for Gmail Sending) */}
        {confirmSendType && (
          <div className="absolute inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
                <Mail className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {confirmSendType === "gmail" ? "Send with Google Gmail?" : "Dispatch Weekly Digest?"}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {confirmSendType === "gmail"
                    ? `This will send your weekly reflection digest directly from your authenticated Google Gmail account to ${user.email}.`
                    : `This will send your weekly reflection digest to ${user.email}.`}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200">Summary Details:</div>
                <div>• Theme: <strong>{currentDigest?.title}</strong></div>
                <div>• Timeframe: {currentDigest?.weekStartDate} – {currentDigest?.weekEndDate}</div>
                <div>• Recipient: {user.email}</div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setConfirmSendType(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeSendEmail(confirmSendType)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Confirm & Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Weekly Journal Digest
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <Calendar className="w-3 h-3" /> Every Saturday
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span>Delivered via</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Google Gmail
                </span>
                <span>to</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{user.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("current")}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "current"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> This Week's Synthesis
          </button>

          <button
            onClick={() => setActiveTab("preview")}
            disabled={!currentDigest}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              !currentDigest
                ? "opacity-40 cursor-not-allowed border-transparent text-slate-400"
                : activeTab === "preview"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 cursor-pointer"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Gmail Newsletter Preview
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "history"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <History className="w-3.5 h-3.5" /> Past Saturday Digests ({pastDigests.length})
          </button>

          <button
            id="tab-digest-settings"
            onClick={() => setActiveTab("settings")}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "settings"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Subscription Settings
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Real-time Email Subscription Preference Banner */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  settings.enabled
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}
              >
                {settings.enabled ? <Mail className="w-5 h-5" /> : <MailX className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Weekly Digest Mail Subscription
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                      settings.enabled
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${settings.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                    {settings.enabled ? "Subscribed (Active)" : "Paused / Unsubscribed"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {settings.enabled
                    ? `Automated reflection digests are scheduled for delivery to ${settings.customEmail || user.email} every Saturday at 9:00 AM UTC.`
                    : "Weekly digest mail is paused. Automated emails will not be sent to your inbox until re-enabled."}
                </p>
              </div>
            </div>

            <button
              id="btn-toggle-digest-subscription"
              type="button"
              disabled={savingSettings}
              onClick={handleToggleSubscription}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                settings.enabled
                  ? "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              }`}
            >
              {savingSettings ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : settings.enabled ? (
                <>
                  <BellOff className="w-3.5 h-3.5" />
                  <span>Pause Subscription</span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  <span>Subscribe to Digest</span>
                </>
              )}
            </button>
          </div>
          
          {/* Status Banners */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error: </span>
                {error}
              </div>
            </div>
          )}

          {sendStatus && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="font-bold">Sent Successfully: </span>
                {sendStatus.message}
              </div>
            </div>
          )}

          {/* TAB 1: Current Week Synthesis */}
          {activeTab === "current" && (
            <div className="space-y-6">
              
              {/* Schedule Info Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" /> Saturday Gmail Dispatch Schedule
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Your weekly synthesis is automatically compiled and emailed to <strong className="text-slate-900 dark:text-slate-100">{user.email}</strong> via <strong>Google Gmail</strong> every <strong>Saturday at 9:00 AM UTC</strong>.
                  </p>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Period: <span className="font-medium text-slate-700 dark:text-slate-300">{startDate} – {endDate}</span> • <span className="font-medium text-indigo-600 dark:text-indigo-400">{pastWeekEntries.length} entries</span> found
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isGenerating}
                    className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Synthesizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> {currentDigest ? "Regenerate Summary" : "Generate This Week's Summary"}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Empty state if not generated yet */}
              {!currentDigest && !isGenerating && (
                <div className="p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Ready to synthesize this week's reflections
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Click the button above to run Gemini's synthesis engine over your entries from {startDate} to {endDate}. You can inspect the summary and test instant dispatch via Google Gmail.
                    </p>
                  </div>
                </div>
              )}

              {/* Rendered Digest Content Card */}
              {currentDigest && (
                <div className="space-y-6">
                  
                  {/* Action Dispatch Bar */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Ready to Send: </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {currentDigest.status === "sent" ? "Dispatched to your inbox" : "Draft generated. Ready to send via Gmail."}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setActiveTab("preview")}
                        className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview Email
                      </button>

                      {/* Primary Send via Google Gmail Button */}
                      <button
                        onClick={() => setConfirmSendType("gmail")}
                        disabled={isSending}
                        className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSending ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                          </>
                        ) : (
                          <>
                            <Mail className="w-3.5 h-3.5 text-indigo-200" /> Send with Google Gmail
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Summary Title & Overview */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">
                        Weekly Synthesis Theme
                      </span>
                      <span className="text-xs text-slate-400">
                        {currentDigest.entryCount} {currentDigest.entryCount === 1 ? "entry" : "entries"} analyzed
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                      {currentDigest.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {currentDigest.overview}
                    </p>

                    {/* Emotional Trajectory Pill */}
                    <div className="pt-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-medium">
                        <span className="font-bold">Emotional Arc:</span> {currentDigest.emotionalArc}
                      </div>
                    </div>

                    {/* Core Themes */}
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {currentDigest.keyThemes.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 2-Column Insights & Actions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Insights */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 shadow-xs">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                        <Sparkles className="w-4 h-4 text-indigo-500" /> Breakthrough Insights
                      </div>
                      <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                        {currentDigest.topInsights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-2 leading-relaxed">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Growth Actions */}
                    <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3 shadow-xs">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Mindful Intentions for Next Week
                      </div>
                      <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                        {currentDigest.growthActions.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 leading-relaxed">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 2: HTML Email Newsletter Preview */}
          {activeTab === "preview" && currentDigest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Rendering exact HTML email dispatched via Google Gmail to {user.email}:</span>
                <button
                  onClick={() => setConfirmSendType("gmail")}
                  disabled={isSending}
                  className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Mail className="w-3 h-3" /> Send via Google Gmail
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-100 dark:bg-slate-950 overflow-x-auto">
                <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg">
                  
                  {/* Email Header */}
                  <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white p-6 text-center space-y-2">
                    <div className="text-xl font-extrabold">✨ Weekly Reflection Digest</div>
                    <div className="text-xs opacity-90">Saturday Edition • {currentDigest.weekStartDate} – {currentDigest.weekEndDate}</div>
                    <span className="inline-block px-3 py-0.5 rounded-full bg-white/20 text-[11px] font-semibold">
                      {currentDigest.entryCount} Reflections Synthesized
                    </span>
                  </div>

                  {/* Email Content Body */}
                  <div className="p-6 space-y-5 text-left">
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      Hello <strong>{user.displayName || user.email.split("@")[0]}</strong>,
                    </p>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-l-4 border-indigo-600 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Weekly Theme</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{currentDigest.title}</div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{currentDigest.overview}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs font-semibold border border-amber-200 dark:border-amber-800">
                      🌿 Emotional Arc: {currentDigest.emotionalArc}
                    </div>

                    {/* Insights List */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Key Breakthroughs & Insights</div>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pl-2">
                        {currentDigest.topInsights.map((ins, i) => (
                          <li key={i}>💡 {ins}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Items List */}
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                      <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">🌱 Mindful Intentions for Next Week</div>
                      <ul className="space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200 pl-2">
                        {currentDigest.growthActions.map((act, i) => (
                          <li key={i}>✓ {act}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Email Footer */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
                      Sent directly via Google Gmail to {user.email} • Delivered every Saturday at 9:00 AM UTC
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB 3: History of Past Saturday Summaries */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {pastDigests.length === 0 ? (
                <div className="p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <History className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Past Summaries Saved Yet</h4>
                  <p className="text-xs text-slate-500">
                    Generated and sent Saturday digests will be archived here for your records.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastDigests.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs hover:border-indigo-300 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {item.deliveryChannel || "Google Gmail"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Period: {item.weekStartDate} – {item.weekEndDate} • {item.entryCount} entries
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setCurrentDigest(item);
                          setActiveTab("current");
                        }}
                        className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        View Summary <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Subscription & Delivery Preferences */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Weekly Reflection Digest Subscription
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Configure your automated Saturday synthesis delivery preferences
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      settings.enabled
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {settings.enabled ? "Currently Subscribed" : "Subscription Inactive"}
                  </span>
                </div>

                {/* Main Toggle Row */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-0.5 max-w-md">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Email Delivery Toggle</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      When enabled, Gemini synthesizes your weekly journal reflections and delivers a personalized newsletter directly to your inbox every Saturday at 9:00 AM UTC.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.enabled}
                    disabled={savingSettings}
                    onClick={handleToggleSubscription}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      settings.enabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        settings.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Delivery Target Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 space-y-1">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      Primary Recipient
                    </span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {settings.customEmail || user.email}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Verified Google OAuth account email
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 space-y-1">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      Delivery Schedule
                    </span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Every Saturday • 09:00 UTC
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Compiled from entries in the preceding 7 days
                    </div>
                  </div>
                </div>

                {/* Note about on-demand generation */}
                <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <strong>On-Demand Generation:</strong> Even when automated email subscription is paused, you can still view and manually generate weekly syntheses anytime from the <em>This Week's Synthesis</em> tab.
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>Gmail Integration Active for <strong>{user.email}</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

