import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Cpu,
  DollarSign,
  Activity,
  Zap,
  Clock,
  Calendar,
  Sparkles,
  RefreshCw,
  Layers,
  ArrowUpRight,
  Shield,
  BarChart3,
  PieChart as PieIcon,
  MessageSquare,
  FileText,
  Mic,
  Mail,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AdminAnalyticsData, UserProfile } from "../../types";
import { fetchAdminAnalytics } from "../../lib/adminService";

interface AdminDashboardProps {
  liveUsers: UserProfile[];
  onNavigateToUsers: () => void;
}

const MODEL_COLORS: { [key: string]: string } = {
  "gemini-3.6-flash": "#6366f1", // Indigo
  "gemini-3.1-flash-lite": "#10b981", // Emerald
  "gemini-3.7-flash": "#f59e0b", // Amber
  "gemini-flash-latest": "#8b5cf6", // Purple
  "fallback-failed": "#ef4444", // Red
};

const FEATURE_ICONS: { [key: string]: React.ReactNode } = {
  "Reflection Chat": <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />,
  "Session Synthesis": <FileText className="w-3.5 h-3.5 text-emerald-500" />,
  "Voice Transcription": <Mic className="w-3.5 h-3.5 text-amber-500" />,
  "Document Extraction": <Layers className="w-3.5 h-3.5 text-purple-500" />,
  "Weekly Digest": <Mail className="w-3.5 h-3.5 text-blue-500" />,
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ liveUsers, onNavigateToUsers }) => {
  const [timeframeDays, setTimeframeDays] = useState<number>(14);
  const [signupViewMode, setSignupViewMode] = useState<"daily" | "cumulative">("daily");
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async (days: number, showRefreshIndicator: boolean = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await fetchAdminAnalytics(days, liveUsers);
      setAnalytics(data);
    } catch (err: any) {
      console.error("Failed to load admin analytics:", err);
      setError(err.message || "Failed to load dashboard metrics.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics(timeframeDays);
  }, [timeframeDays, liveUsers]);

  // Model pie chart data formatted
  const pieChartData = useMemo(() => {
    if (!analytics || !analytics.modelBreakdown) return [];
    return analytics.modelBreakdown.map((m) => ({
      name: m.model,
      value: m.tokens,
      cost: m.costUsd,
      percentage: m.percentage,
      requests: m.requests,
    }));
  }, [analytics]);

  return (
    <div className="space-y-6">
      {/* Top Action Bar & Timeframe Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Executive Overview & AI Telemetry
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time monitoring of user registrations, daily signups, and Gemini model cost utilization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <button
              id="btn-timeframe-7d"
              onClick={() => setTimeframeDays(7)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                timeframeDays === 7
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              7 Days
            </button>
            <button
              id="btn-timeframe-14d"
              onClick={() => setTimeframeDays(14)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                timeframeDays === 14
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              14 Days
            </button>
            <button
              id="btn-timeframe-30d"
              onClick={() => setTimeframeDays(30)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                timeframeDays === 30
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              30 Days
            </button>
          </div>

          <button
            id="btn-refresh-dashboard"
            onClick={() => loadMetrics(timeframeDays, true)}
            disabled={isRefreshing}
            title="Refresh telemetry and metrics"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadMetrics(timeframeDays)}
            className="underline font-semibold hover:text-red-800 dark:hover:text-red-200 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 Core KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Users */}
        <div
          id="kpi-card-total-users"
          onClick={onNavigateToUsers}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Users
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {analytics?.totalUsers ?? "..."}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +{analytics?.weekSignups ?? 0} this week
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md font-semibold">
              <UserCheck className="w-3 h-3" />
              {analytics?.activeUsers ?? 0} Active
            </span>
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-semibold">
              <UserX className="w-3 h-3 text-red-500" />
              {analytics?.deactivatedUsers ?? 0} Deactivated
            </span>
          </div>
        </div>

        {/* Card 2: Daily Signups */}
        <div
          id="kpi-card-daily-signups"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Daily User Signups
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {analytics?.todaySignups ?? "..."}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">new today</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800/80 text-slate-500 dark:text-slate-400">
            <span>7-Day Run Rate:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              ~{Math.round(((analytics?.weekSignups ?? 14) / 7) * 10) / 10} / day
            </span>
          </div>
        </div>

        {/* Card 3: Gemini Chat Calls */}
        <div
          id="kpi-card-gemini-calls"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Gemini AI Requests
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {analytics?.totalAiRequests ?? "..."}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {(analytics?.totalAiTokens ? (analytics.totalAiTokens / 1000).toFixed(1) : "0")}k tok
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800/80 text-slate-500 dark:text-slate-400">
            <span>Model Fallback Ladder:</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">4 tiers active</span>
          </div>
        </div>

        {/* Card 4: Gemini Chat Cost */}
        <div
          id="kpi-card-gemini-cost"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Gemini Chat Cost
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              ${analytics?.totalAiCostUsd ? analytics.totalAiCostUsd.toFixed(4) : "0.0000"}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">USD</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800/80 text-slate-500 dark:text-slate-400">
            <span>Avg Cost / Session:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              $
              {analytics && analytics.totalAiRequests > 0
                ? (analytics.totalAiCostUsd / analytics.totalAiRequests).toFixed(5)
                : "0.00018"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Section (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily User Signups */}
        <div
          id="chart-user-signups-container"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Daily User Signups
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                New user registrations across the past {timeframeDays} days
              </p>
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
              <button
                onClick={() => setSignupViewMode("daily")}
                className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                  signupViewMode === "daily"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setSignupViewMode("cumulative")}
                className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                  signupViewMode === "cumulative"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Cumulative
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
                Loading signups chart...
              </div>
            ) : analytics?.dailySignups && analytics.dailySignups.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analytics.dailySignups}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "12px",
                      border: "1px solid #334155",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                    formatter={(value: any) => [
                      `${value} users`,
                      signupViewMode === "daily" ? "New Signups" : "Total Registered Users",
                    ]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey={signupViewMode === "daily" ? "count" : "cumulativeCount"}
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#signupGradient)"
                    name="Signups"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No signups data available.
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span>Range: Past {timeframeDays} days</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              +{analytics?.dailySignups.reduce((acc, d) => acc + d.count, 0) ?? 0} total new accounts
            </span>
          </div>
        </div>

        {/* Chart 2: Gemini Chat Cost Usage Chart */}
        <div
          id="chart-gemini-cost-container"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-500" />
                Gemini Chat Cost & Usage Chart
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily API inference cost ($ USD) & request volume
              </p>
            </div>

            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
              Live Token Rates
            </span>
          </div>

          <div className="h-64 w-full">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
                Loading Gemini cost chart...
              </div>
            ) : analytics?.dailyAiUsage && analytics.dailyAiUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analytics.dailyAiUsage}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "12px",
                      border: "1px solid #334155",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                    formatter={(val: any, name: string) => {
                      if (name === "Cost") return [`$${Number(val).toFixed(5)} USD`, "Estimated Cost"];
                      return [val, name];
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="costUsd"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#costGradient)"
                    name="Cost"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No Gemini usage data available.
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span>Total Window Spend:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              ${analytics?.dailyAiUsage.reduce((acc, d) => acc + d.costUsd, 0).toFixed(5) ?? "0.00000"} USD
            </span>
          </div>
        </div>
      </div>

      {/* Model Breakdown & Feature Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Distribution Donut */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-500" />
              Model Volume Distribution
            </h3>
            <span className="text-[11px] text-slate-400">By Tokens</span>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={MODEL_COLORS[entry.name] || "#6366f1"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "12px",
                      border: "1px solid #334155",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                    formatter={(val: any, name: string) => [
                      `${(Number(val) / 1000).toFixed(1)}k tokens`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No model telemetry yet</div>
            )}
          </div>

          <div className="space-y-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {analytics?.modelBreakdown.map((m) => (
              <div key={m.model} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: MODEL_COLORS[m.model] || "#6366f1" }}
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                    {m.model}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">{m.percentage}%</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ${m.costUsd.toFixed(4)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Usage Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              Gemini Feature & Endpoint Utilization
            </h3>
            <span className="text-xs text-slate-400">Past {timeframeDays} Days</span>
          </div>

          <div className="space-y-3">
            {analytics?.featureBreakdown && analytics.featureBreakdown.length > 0 ? (
              analytics.featureBreakdown.map((f) => (
                <div
                  key={f.feature}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center shadow-2xs">
                      {FEATURE_ICONS[f.feature] || <Sparkles className="w-4 h-4 text-indigo-500" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{f.feature}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {f.endpoint}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {f.requests} calls
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {(f.tokens / 1000).toFixed(1)}k tokens
                      </div>
                    </div>
                    <div className="min-w-[70px]">
                      <div className="text-xs font-black text-amber-600 dark:text-amber-400">
                        ${f.costUsd.toFixed(4)}
                      </div>
                      <div className="text-[10px] text-slate-400">est spend</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No feature calls recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Gemini Request Telemetry Stream Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Live Gemini Inference Stream (Telemetry Log)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time audit log of multi-turn chat reflections, transcriptions, and summary calls
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Stream Connected
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3.5">Time</th>
                <th className="py-2.5 px-3.5">Feature & Endpoint</th>
                <th className="py-2.5 px-3.5">Model Used</th>
                <th className="py-2.5 px-3.5 text-right">Tokens (In/Out)</th>
                <th className="py-2.5 px-3.5 text-right">Latency</th>
                <th className="py-2.5 px-3.5 text-right">Est. Cost</th>
                <th className="py-2.5 px-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
              {analytics?.recentLogs && analytics.recentLogs.length > 0 ? (
                analytics.recentLogs.slice(0, 10).map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-3.5 font-sans">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {FEATURE_ICONS[log.feature] || <Zap className="w-3.5 h-3.5 text-indigo-500" />}
                        {log.feature}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]">
                        {log.endpoint}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200 dark:border-indigo-800/60">
                        {log.modelUsed}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-slate-700 dark:text-slate-300">
                      {log.totalTokens}{" "}
                      <span className="text-[10px] text-slate-400">
                        ({log.inputTokens}/{log.outputTokens})
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-slate-600 dark:text-slate-400">
                      {log.latencyMs}ms
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-amber-600 dark:text-amber-400">
                      ${log.costUsd.toFixed(5)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-sans">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          log.status === "success"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                            : "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300"
                        }`}
                      >
                        {log.status === "success" ? "200 OK" : "ERROR"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 font-sans">
                    No recent Gemini calls recorded in this session yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
