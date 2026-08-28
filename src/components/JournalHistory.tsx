import React, { useState, useMemo } from "react";
import { JournalEntry } from "../types";
import { 
  History, 
  Search, 
  Star, 
  Trash2, 
  Calendar, 
  MessageSquare, 
  Sparkles, 
  X, 
  FileDown, 
  Check, 
  Filter 
} from "lucide-react";

interface JournalHistoryProps {
  entries: JournalEntry[];
  activeEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onToggleFavorite: (entryId: string, isFav: boolean) => Promise<void>;
  onClose: () => void;
}

export const JournalHistory: React.FC<JournalHistoryProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onDeleteEntry,
  onToggleFavorite,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMood, setFilterMood] = useState<string>("all");
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

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (onlyFavorites && !entry.isFavorite) return false;
      if (filterMood !== "all" && entry.mood !== filterMood) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = entry.title.toLowerCase().includes(q);
      const matchTopic = (entry.topic || "").toLowerCase().includes(q);
      const matchMessages = entry.messages.some((m) => m.content.toLowerCase().includes(q));
      const matchSummary = entry.summary?.overview.toLowerCase().includes(q);

      return matchTitle || matchTopic || matchMessages || matchSummary;
    });
  }, [entries, searchQuery, filterMood, onlyFavorites]);

  const handleExportMarkdown = (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
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
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[450px] bg-white border-l border-slate-200/90 shadow-2xl flex flex-col justify-between"
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-100 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <History className="w-4 h-4" />
            </div>
            <h2 className="font-extrabold text-slate-900 text-lg">Reflection History</h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold border border-slate-200">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          <button
            id="btn-close-history-drawer"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-history"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries, keywords, thoughts..."
            className="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <select
              id="select-history-mood-filter"
              value={filterMood}
              onChange={(e) => setFilterMood(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs outline-none cursor-pointer"
            >
              <option value="all">All Moods</option>
              {availableMoods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <button
            id="btn-filter-favorites"
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              onlyFavorites
                ? "bg-amber-50 text-amber-900 border-amber-300"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? "fill-amber-400 text-amber-500" : "text-slate-400"}`} />
            <span>Favorites</span>
          </button>
        </div>
      </div>

      {/* List Container */}
      <div id="history-entries-list" className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-16 space-y-2 text-slate-400">
            <History className="w-8 h-8 mx-auto stroke-1" />
            <p className="text-sm font-semibold text-slate-700">No reflections found</p>
            <p className="text-xs">
              {searchQuery ? "Try refining your search terms" : "Start your first reflection in the editor"}
            </p>
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
                    ? "bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-900"
                    : "bg-white hover:bg-slate-50/80 border-slate-200/80 text-slate-900 shadow-xs"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(entry.id, !entry.isFavorite);
                      }}
                      title={entry.isFavorite ? "Remove favorite" : "Mark as favorite"}
                      className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          entry.isFavorite
                            ? "fill-amber-400 text-amber-500"
                            : isActive
                            ? "text-slate-500"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                    <button
                      id={`btn-export-entry-${entry.id}`}
                      onClick={(e) => handleExportMarkdown(entry, e)}
                      title="Export as Markdown"
                      className={`p-1 transition-colors ${
                        isActive ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`btn-delete-entry-${entry.id}`}
                      onClick={(e) => confirmDelete(entry.id, e)}
                      title="Delete reflection"
                      className={`p-1 transition-colors ${
                        isActive ? "text-slate-400 hover:text-rose-400" : "text-slate-400 hover:text-rose-600"
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content Snippet */}
                <p
                  className={`text-xs line-clamp-2 leading-relaxed ${
                    isActive ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {snippet}
                </p>

                {/* Bottom Tags & Metrics */}
                <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                  <div className="flex items-center gap-2">
                    {entry.mood && (
                      <span
                        className={`px-2 py-0.5 rounded-lg font-semibold ${
                          isActive
                            ? "bg-slate-800 text-indigo-300 border border-slate-700"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {entry.mood}
                      </span>
                    )}
                    {entry.summary && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold ${
                          isActive ? "bg-indigo-950/60 text-indigo-300 border border-indigo-800/40" : "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        Synthesized
                      </span>
                    )}
                  </div>

                  <div
                    className={`flex items-center gap-2 font-medium ${
                      isActive ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {entry.messages.length}
                    </span>
                    <span>
                      {new Date(entry.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
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
      <div className="p-4 border-t border-slate-100 bg-slate-50/80 text-xs text-slate-500 text-center font-medium">
        Data is isolated to your UID in Cloud Firestore
      </div>
    </div>
  );
};
