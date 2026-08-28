import React from "react";
import { PromptStarter } from "../types";
import { Sparkles, Sun, Compass, Lightbulb, HeartHandshake, Target } from "lucide-react";

interface PromptStartersProps {
  onSelectPrompt: (starter: PromptStarter) => void;
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

export const PromptStarters: React.FC<PromptStartersProps> = ({ onSelectPrompt }) => {
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

  return (
    <div id="prompt-starters-section" className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-600" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Reflection Starters
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PROMPT_STARTERS.map((starter, idx) => (
          <button
            key={idx}
            id={`prompt-starter-btn-${idx}`}
            onClick={() => onSelectPrompt(starter)}
            className="group text-left p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between gap-2.5 cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs group-hover:scale-105 group-hover:bg-indigo-50/50 transition-all">
                {getIcon(starter.iconName)}
              </div>
              <span className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                {starter.title}
              </span>
            </div>
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              "{starter.prompt}"
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
