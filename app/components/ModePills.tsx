"use client";

import type { QuestionMode } from "../lib/types";

const modes: { id: QuestionMode; label: string; subtitle: string }[] = [
  { id: "mcq", label: "Multiple Choice", subtitle: "Fast exam-style practice" },
  { id: "flashcard", label: "Flashcards", subtitle: "Quick memory refresh" },
  { id: "theory", label: "Theory", subtitle: "Short-answer tutoring" },
];

export function ModePills({
  mode,
  onChange,
}: {
  mode: QuestionMode;
  onChange: (m: QuestionMode) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {modes.map((m) => {
        const active = m.id === mode;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={[
              "rounded-2xl border px-4 py-4 text-left transition",
              active
                ? "border-transparent bg-gradient-to-r from-[#d10b3c] via-[#ff2f6a] to-[#ff7aa8] text-white shadow-[0_18px_60px_rgba(209,11,60,0.25)]"
                : "border-zinc-200 bg-white text-zinc-950 shadow-[0_10px_35px_rgba(11,11,16,0.06)] hover:border-zinc-300 hover:bg-rose-50/60 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-white dark:hover:bg-[#120613]",
            ].join(" ")}
          >
            <div className="text-sm font-semibold">{m.label}</div>
            <div
              className={[
                "mt-1 text-xs",
                active ? "text-white/85" : "text-zinc-600 dark:text-zinc-300",
              ].join(" ")}
            >
              {m.subtitle}
            </div>
          </button>
        );
      })}
    </div>
  );
}

