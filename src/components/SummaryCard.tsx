import React, { useState } from "react";
import { ReflectionSummary } from "../types";
import { 
  Sparkles, 
  CheckSquare, 
  Square, 
  Lightbulb, 
  Heart, 
  Compass, 
  Copy, 
  Check, 
  FileText 
} from "lucide-react";

interface SummaryCardProps {
  summary: ReflectionSummary;
  onRefresh?: () => void;
  isGenerating?: boolean;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  summary,
  onRefresh,
  isGenerating,
}) => {
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  const toggleAction = (idx: number) => {
    setCompletedActions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleCopy = () => {
    const text = `
# ${summary.title}
Tone: ${summary.emotionalTone}

## Overview
${summary.overview}

## Key Takeaways
${summary.keyTakeaways?.map((t) => `- ${t}`).join("\n")}

## Growth Insights
${summary.growthInsights}

## Action Items
${summary.actionItems?.map((a, i) => `[${completedActions[i] ? "x" : " "}] ${a}`).join("\n")}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="reflection-summary-card"
      className="p-6 sm:p-7 rounded-2xl bg-slate-900 text-slate-50 border border-slate-800 shadow-xl space-y-5 ring-1 ring-slate-800/80"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-indigo-500/15 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Gemini Synthesis & Action Plan
            </span>
            {summary.emotionalTone && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-indigo-300 border border-slate-700">
                <Heart className="w-3 h-3 text-rose-400" />
                {summary.emotionalTone}
              </span>
            )}
          </div>
          <h3 className="text-xl font-extrabold tracking-tight text-white">
            {summary.title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-copy-summary"
            onClick={handleCopy}
            title="Copy Synthesis Markdown"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Overview */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-indigo-400" />
          Executive Overview
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed">
          {summary.overview}
        </p>
      </div>

      {/* Key Takeaways & Growth Insights Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Takeaways */}
        <div className="p-4.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
            Key Takeaways
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {summary.keyTakeaways?.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="text-indigo-400 mt-0.5 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Growth Insights */}
        <div className="p-4.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Growth Insight
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed italic">
            "{summary.growthInsights}"
          </p>
        </div>
      </div>

      {/* Action Items Checklist */}
      {summary.actionItems && summary.actionItems.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            Mindful Next Steps & Action Items
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {summary.actionItems.map((action, idx) => {
              const isChecked = Boolean(completedActions[idx]);
              return (
                <button
                  key={idx}
                  id={`action-item-check-${idx}`}
                  onClick={() => toggleAction(idx)}
                  className={`text-left p-3.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    isChecked
                      ? "bg-slate-800/30 border-slate-700/40 text-slate-500 line-through"
                      : "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:border-indigo-500/50 hover:bg-slate-800"
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <span className="text-xs leading-relaxed font-medium">{action}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
