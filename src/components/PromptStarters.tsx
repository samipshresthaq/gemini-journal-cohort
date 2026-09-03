import React from "react";
import { PromptStarter } from "../types";
import { Sparkles, Sun, Compass, Lightbulb, HeartHandshake, Target, Lock } from "lucide-react";

interface PromptStartersProps {
  onSelectPrompt: (starter: PromptStarter) => void;
  disabled?: boolean;
  onRequireAuth?: () => void;
}

export const PROMPT_STARTERS: PromptStarter[] = [
  {
    title: "Daily Reflection & Wind-Down",
    topic: "Daily Review",
    iconName: "Sun",
    prompt: "Today felt full. I want to reflect on what went well, what gave me energy, and one thing I can let go of before tomorrow.",
  },
  {
    title: "Decision & Dilemma Matrix",
    topic: "Decision Clarity",
    iconName: "Compass",
    prompt: "I'm wrestling with an important decision. Help me weigh the core trade-offs, potential blind spots, and what aligns best with my long-term goals.",
  },
  {
    title: "Creative Brainstorming",
    topic: "Creative Ideation",
    iconName: "Lightbulb",
    prompt: "I have a rough spark for a project or solution. Let's bounce ideas back and forth to refine and expand this concept.",
  },
  {
    title: "Overcoming Stress & Calibrating",
    topic: "Mindful Calibrations",
    iconName: "HeartHandshake",
    prompt: "I've been feeling a bit overwhelmed by recent demands. Help me break down what is within my control and find a grounded next step.",
  },
  {
    title: "Goal Alignment & Habits",
    topic: "Growth & Focus",
    iconName: "Target",
    prompt: "I want to review my progress on my key goals. Where am I seeing real momentum, and what friction can I eliminate this week?",
  },
];

export const PromptStarters: React.FC<PromptStartersProps> = ({
  onSelectPrompt,
  disabled = false,
  onRequireAuth,
}) => {
  const getIcon = (name: string) => {
    switch (name) {
      case "Sun":
        return <Sun className="w-4 h-4 text-amber-500" />;
      case "Compass":
        return <Compass className="w-4 h-4 text-indigo-500" />;
      case "Lightbulb":
        return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case "HeartHandshake":
        return <HeartHandshake className="w-4 h-4 text-emerald-500" />;
      case "Target":
        return <Target className="w-4 h-4 text-rose-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-500" />;
    }
  };

  const handleClick = (starter: PromptStarter) => {
    if (disabled) {
      onRequireAuth?.();
      return;
    }
    onSelectPrompt(starter);
  };

  return (
    <div id="prompt-starters-section" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Reflection Starters
          </h3>
        </div>
        {disabled && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            <Lock className="w-3 h-3" /> Account Required
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PROMPT_STARTERS.map((starter, idx) => (
          <button
            key={idx}
            id={`prompt-starter-btn-${idx}`}
            onClick={() => handleClick(starter)}
            disabled={disabled}
            className={`group text-left p-4 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 shadow-xs ${
              disabled
                ? "border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 opacity-50 cursor-not-allowed"
                : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md cursor-pointer"
            }`}
          >
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs transition-all ${!disabled && "group-hover:scale-105 group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-950/50"}`}>
                  {getIcon(starter.iconName)}
                </div>
                <span className={`text-xs font-bold line-clamp-1 transition-colors ${disabled ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"}`}>
                  {starter.title}
                </span>
              </div>
              {disabled && <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              "{starter.prompt}"
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
