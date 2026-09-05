import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, Loader2, Database } from "lucide-react";

export interface AdminPaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  onFirstPage: () => void;
  itemLabel?: string;
  className?: string;
  idPrefix?: string;
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  pageSize,
  totalCount,
  hasNextPage,
  hasPrevPage,
  isLoading,
  onNextPage,
  onPrevPage,
  onFirstPage,
  itemLabel = "records",
  className = "",
  idPrefix = "admin-pagination",
}) => {
  const startIndex = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, Math.max(totalCount, startIndex));
  const estimatedTotalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;

  return (
    <div
      id={`${idPrefix}-container`}
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs ${className}`}
    >
      {/* Left side: Range information & Scalable Firestore badge */}
      <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-medium">
          {isLoading ? (
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Querying Firestore...</span>
            </span>
          ) : totalCount > 0 ? (
            <span>
              Showing <strong className="text-slate-800 dark:text-slate-200 font-semibold">{startIndex}</strong>–
              <strong className="text-slate-800 dark:text-slate-200 font-semibold">{endIndex}</strong> of{" "}
              <strong className="text-slate-800 dark:text-slate-200 font-semibold">{totalCount.toLocaleString()}</strong> {itemLabel}
            </span>
          ) : (
            <span>No {itemLabel} found</span>
          )}
        </div>

        <span className="hidden md:inline-block text-slate-300 dark:text-slate-700">•</span>

        <span className="hidden md:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
          <Database className="w-3 h-3 text-indigo-500" />
          {pageSize} per page • Cursor Query
        </span>
      </div>

      {/* Right side: Navigation buttons */}
      <div className="flex items-center gap-1.5">
        {/* First page button */}
        <button
          id={`${idPrefix}-btn-first`}
          type="button"
          onClick={onFirstPage}
          disabled={!hasPrevPage || isLoading}
          title="Jump to first page"
          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous page button */}
        <button
          id={`${idPrefix}-btn-prev`}
          type="button"
          onClick={onPrevPage}
          disabled={!hasPrevPage || isLoading}
          title="Previous page"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Current page badge */}
        <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 font-bold text-center min-w-[70px]">
          Page {currentPage}
          {totalCount > 0 && (
            <span className="text-indigo-500 dark:text-indigo-400 font-normal"> of {estimatedTotalPages}</span>
          )}
        </div>

        {/* Next page button */}
        <button
          id={`${idPrefix}-btn-next`}
          type="button"
          onClick={onNextPage}
          disabled={!hasNextPage || isLoading}
          title="Next page"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
