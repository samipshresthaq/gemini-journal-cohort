import React, { useState, useMemo } from "react";
import { JournalEntry } from "../types";
import { 
  History, 
  Search, 
  Star, 
  Trash2, 
  MessageSquare, 
  Sparkles, 
  X, 
  FileDown, 
  Lock,
  Tag,
  Calendar,
  Smile,
  RotateCcw
} from "lucide-react";

interface JournalHistoryProps {
  entries: JournalEntry[];
  activeEntryId: string | null;
  isGuest?: boolean;
  maxGuestEntries?: number;
  onRequireAuth?: (title?: string, description?: string) => void;
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onToggleFavorite: (entryId: string, isFav: boolean) => Promise<void>;
  onClose: () => void;
}

const DEFAULT_FOCUS_AREAS = [
  "Daily Review",
  "Career & Projects",
  "Personal Growth",
  "Mindful Calibrations",
  "Creative Ideation",
  "Relationships & Communication",
  "Health & Habits",
];

export const JournalHistory: React.FC<JournalHistoryProps> = ({
  entries,
  activeEntryId,
  isGuest = false,
  maxGuestEntries = 2,
  onRequireAuth,
  onSelectEntry,
  onDeleteEntry,
  onToggleFavorite,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMood, setFilterMood] = useState<string>("all");
  const [filterFocus, setFilterFocus] = useState<string>("all");
  const [filterDatePreset, setFilterDatePreset] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Available moods in current entries
  const availableMoods = useMemo(() => {
    const moods = new Set<string>();
    entries.forEach((e) => {
      if (e.mood) moods.add(e.mood);
    });
    return Array.from(moods);
  }, [entries]);

  // Available focus areas (union of default focus areas and entries' actual topics)
  const availableFocusAreas = useMemo(() => {
    const topics = new Set<string>(DEFAULT_FOCUS_AREAS);
    entries.forEach((e) => {
      if (e.topic) topics.add(e.topic);
    });
    return Array.from(topics);
  }, [entries]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    filterMood !== "all" ||
    filterFocus !== "all" ||
    filterDatePreset !== "all" ||
    customStartDate ||
    customEndDate ||
    onlyFavorites
  );

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterMood("all");
    setFilterFocus("all");
    setFilterDatePreset("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setOnlyFavorites(false);
  };

  // Filtered entries
  const filteredEntries = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOf7DaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const startOf30DaysAgo = startOfToday - 29 * 24 * 60 * 60 * 1000;
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const customStartTimestamp = customStartDate ? new Date(`${customStartDate}T00:00:00`).getTime() : null;
    const customEndTimestamp = customEndDate ? new Date(`${customEndDate}T23:59:59.999`).getTime() : null;

    return entries.filter((entry) => {
      if (onlyFavorites && !entry.isFavorite) return false;
      if (filterMood !== "all" && entry.mood !== filterMood) return false;
      if (filterFocus !== "all" && entry.topic !== filterFocus) return false;

      // Date filtering
      if (filterDatePreset === "today") {
        if (entry.createdAt < startOfToday) return false;
      } else if (filterDatePreset === "7days") {
        if (entry.createdAt < startOf7DaysAgo) return false;
      } else if (filterDatePreset === "30days") {
        if (entry.createdAt < startOf30DaysAgo) return false;
      } else if (filterDatePreset === "thisMonth") {
        if (entry.createdAt < startOfThisMonth) return false;
      } else if (filterDatePreset === "custom") {
        if (customStartTimestamp && entry.createdAt < customStartTimestamp) return false;
        if (customEndTimestamp && entry.createdAt > customEndTimestamp) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = entry.title.toLowerCase().includes(q);
      const matchTopic = (entry.topic || "").toLowerCase().includes(q);
      const matchMood = (entry.mood || "").toLowerCase().includes(q);
      const matchMessages = entry.messages.some((m) => m.content.toLowerCase().includes(q));
      const matchSummary = entry.summary?.overview.toLowerCase().includes(q);
      const matchDateStr = new Date(entry.createdAt).toLocaleDateString().toLowerCase().includes(q);

      return matchTitle || matchTopic || matchMood || matchMessages || matchSummary || matchDateStr;
    });
  }, [
    entries, 
    searchQuery, 
    filterMood, 
    filterFocus, 
    filterDatePreset, 
    customStartDate, 
    customEndDate, 
    onlyFavorites
  ]);

  const handleExportMarkdown = (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      onRequireAuth?.(
        "Unlock Markdown Export",
        "Exporting reflections to Markdown documents requires an account. Sign in to download your sessions."
      );
      return;
    }
    let content = `# ${entry.title}\n\n`;
    content += `*Date:* ${new Date(entry.createdAt).toLocaleString()}\n`;
    if (entry.mood) content += `*Mood:* ${entry.mood}\n`;
    if (entry.topic) content += `*Topic:* ${entry.topic}\n\n`;
    content += `---\n\n## Journal & Reflections\n\n`;

    entry.messages.forEach((msg) => {
      content += `### ${msg.role === "user" ? "You" : "Gemini"}\n`;
      content += `*${new Date(msg.timestamp).toLocaleTimeString()}*\n\n`;
      content += `${msg.content}\n\n`;
    });

    if (entry.summary) {
      content += `---\n\n## Growth Synthesis & Action Plan\n\n`;
      content += `### ${entry.summary.title}\n`;
      content += `**Overview:** ${entry.summary.overview}\n\n`;
      content += `**Growth Insights:** ${entry.summary.growthInsights}\n\n`;
      if (entry.summary.keyTakeaways?.length) {
        content += `**Key Takeaways:**\n`;
        entry.summary.keyTakeaways.forEach((t) => (content += `- ${t}\n`));
        content += `\n`;
      }
      if (entry.summary.actionItems?.length) {
        content += `**Action Items:**\n`;
        entry.summary.actionItems.forEach((a) => (content += `- [ ] ${a}\n`));
      }
    }

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entry.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "reflection"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFavoriteClick = (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      onRequireAuth?.(
        "Unlock Favorites & Collections",
        "Starring favorites and organizing reflections into collections require an account. Sign in to save favorites."
      );
      return;
    }
    onToggleFavorite(entry.id, !entry.isFavorite);
  };

  const confirmDelete = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this reflection? This action cannot be undone.")) {
      setDeletingId(entryId);
      try {
        await onDeleteEntry(entryId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div
      id="journal-history-drawer"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col justify-between transition-colors"
    >
      {/* Header & Filter Controls */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-3.5 bg-white dark:bg-slate-900 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <h2 className="font-extrabold text-slate-900 dark:text-slate-50 text-lg">
              {isGuest ? "Guest Reflections" : "Reflection History"}
            </h2>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-semibold border border-slate-200 dark:border-slate-700">
              {filteredEntries.length === entries.length 
                ? `${entries.length}${isGuest ? `/${maxGuestEntries}` : ""} ${entries.length === 1 ? "entry" : "entries"}`
                : `${filteredEntries.length} of ${entries.length}`
              }
            </span>
          </div>
          <button
            id="btn-close-history-drawer"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guest info banner */}
        {isGuest && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-800 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>Guest session: Max {maxGuestEntries} reflection entries allowed.</span>
            </div>
            <button
              onClick={() => onRequireAuth?.(
                "Sign In for Unlimited History",
                "Sign in with Google or Email to unlock unlimited history, search filtering, markdown export, and cloud backups."
              )}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-history"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries, keywords, thoughts..."
            className="w-full pl-10 pr-12 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Controls Row 1: Focus and Mood */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Focus Area Filter */}
          <div className="relative flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500 transition-colors">
            <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-1.5 shrink-0" />
            <select
              id="select-history-focus-filter"
              value={filterFocus}
              onChange={(e) => setFilterFocus(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 font-semibold text-xs cursor-pointer truncate"
            >
              <option value="all" className="dark:bg-slate-800">All Focus Areas</option>
              {availableFocusAreas.map((f) => (
                <option key={f} value={f} className="dark:bg-slate-800">
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Mood Filter */}
          <div className="relative flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500 transition-colors">
            <Smile className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-1.5 shrink-0" />
            <select
              id="select-history-mood-filter"
              value={filterMood}
              onChange={(e) => setFilterMood(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 font-semibold text-xs cursor-pointer truncate"
            >
              <option value="all" className="dark:bg-slate-800">All Moods</option>
              {availableMoods.map((m) => (
                <option key={m} value={m} className="dark:bg-slate-800">
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Controls Row 2: Date and Favorites */}
        <div className="flex items-center justify-between gap-2 text-xs">
          {/* Date Filter Preset */}
          <div className="flex-1 relative flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-1.5 shrink-0" />
            <select
              id="select-history-date-filter"
              value={filterDatePreset}
              onChange={(e) => setFilterDatePreset(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 font-semibold text-xs cursor-pointer truncate"
            >
              <option value="all" className="dark:bg-slate-800">All Dates</option>
              <option value="today" className="dark:bg-slate-800">Today</option>
              <option value="7days" className="dark:bg-slate-800">Past 7 Days</option>
              <option value="30days" className="dark:bg-slate-800">Past 30 Days</option>
              <option value="thisMonth" className="dark:bg-slate-800">This Month</option>
              <option value="custom" className="dark:bg-slate-800">Custom Date Range...</option>
            </select>
          </div>

          {/* Favorites Filter Button */}
          <button
            id="btn-filter-favorites"
            onClick={() => {
              if (isGuest) {
                onRequireAuth?.(
                  "Unlock Favorites Filter",
                  "Favoriting and filtering saved reflections requires an account. Sign in to unlock."
                );
                return;
              }
              setOnlyFavorites(!onlyFavorites);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              onlyFavorites
                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-2xs"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? "fill-amber-400 text-amber-500" : "text-slate-400 dark:text-slate-500"}`} />
            <span>Favorites</span>
          </button>
        </div>

        {/* Custom Date Range Picker Inputs */}
        {filterDatePreset === "custom" && (
          <div className="p-2.5 bg-slate-50/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs animate-fadeIn">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <span>Filter by Date Range:</span>
              {(customStartDate || customEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                >
                  Clear dates
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="input-filter-start-date" className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 font-medium">
                  From:
                </label>
                <input
                  id="input-filter-start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="input-filter-end-date" className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 font-medium">
                  To:
                </label>
                <input
                  id="input-filter-end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Reset active filters button */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Filters active ({filteredEntries.length} results)</span>
            <button
              id="btn-reset-history-filters"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          </div>
        )}
      </div>

      {/* List Container */}
      <div id="history-entries-list" className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-16 space-y-2 text-slate-400 dark:text-slate-500">
            <History className="w-8 h-8 mx-auto stroke-1" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No reflections found</p>
            <p className="text-xs">
              {hasActiveFilters ? "Try adjusting your filters or search terms" : "Start your first reflection in the editor"}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-3 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isActive = entry.id === activeEntryId;
            const snippet =
              entry.messages.find((m) => m.role === "user")?.content ||
              entry.summary?.overview ||
              "Empty reflection session...";

            return (
              <div
                key={entry.id}
                id={`history-entry-item-${entry.id}`}
                onClick={() => {
                  onSelectEntry(entry);
                  onClose();
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 relative group ${
                  isActive
                    ? "bg-slate-900 dark:bg-indigo-950 text-white border-slate-900 dark:border-indigo-800 shadow-md ring-1 ring-slate-900 dark:ring-indigo-800"
                    : "bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs"
                }`}
              >
                {/* Top metadata */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm line-clamp-1 leading-snug">
                    {entry.title || "Untitled Reflection"}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      id={`btn-fav-entry-${entry.id}`}
                      onClick={(e) => handleFavoriteClick(entry, e)}
                      title={entry.isFavorite ? "Remove favorite" : "Mark as favorite"}
                      className="p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          entry.isFavorite
                            ? "fill-amber-400 text-amber-500"
                            : isActive
                            ? "text-slate-500"
                            : "text-slate-300 dark:text-slate-600"
                        }`}
                      />
                    </button>
                    <button
                      id={`btn-export-entry-${entry.id}`}
                      onClick={(e) => handleExportMarkdown(entry, e)}
                      title="Export as Markdown"
                      className={`p-1 transition-colors cursor-pointer ${
                        isActive ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      }`}
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`btn-delete-entry-${entry.id}`}
                      onClick={(e) => confirmDelete(entry.id, e)}
                      title="Delete reflection"
                      className={`p-1 transition-colors cursor-pointer ${
                        isActive ? "text-slate-400 hover:text-rose-400" : "text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content Snippet */}
                <p
                  className={`text-xs line-clamp-2 leading-relaxed ${
                    isActive ? "text-slate-300" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {snippet}
                </p>

                {/* Bottom Tags & Metrics */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Focus Area Tag */}
                    {entry.topic && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold ${
                          isActive
                            ? "bg-slate-800 dark:bg-indigo-900 text-indigo-200 border border-slate-700 dark:border-indigo-700"
                            : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60"
                        }`}
                      >
                        <Tag className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                        {entry.topic}
                      </span>
                    )}

                    {/* Mood Tag */}
                    {entry.mood && (
                      <span
                        className={`px-2 py-0.5 rounded-lg font-semibold ${
                          isActive
                            ? "bg-slate-800 dark:bg-slate-800 text-slate-300 border border-slate-700"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {entry.mood}
                      </span>
                    )}

                    {/* Summary Tag */}
                    {entry.summary && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold ${
                          isActive
                            ? "bg-indigo-950/60 text-indigo-300 border border-indigo-800/40"
                            : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                        Synthesized
                      </span>
                    )}
                  </div>

                  <div
                    className={`flex items-center gap-2 font-medium ml-auto ${
                      isActive ? "text-slate-400" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {entry.messages.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: new Date(entry.createdAt).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
        {isGuest ? "Guest data stored locally • Sign in for cloud backup" : "Data is isolated to your UID in Cloud Firestore"}
      </div>
    </div>
  );
};
