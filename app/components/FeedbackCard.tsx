"use client";

import type { EvaluateFeedback } from "../lib/types";

export function FeedbackCard({
  correct,
  textbookReference,
  formalDefinition,
  nigerianAnalogy,
  aiFeedback,
}: {
  correct: boolean;
  textbookReference: string;
  formalDefinition: string;
  nigerianAnalogy: string;
  aiFeedback?: EvaluateFeedback | null;
}) {
  return (
    <div
      className={[
        "mt-4 rounded-3xl border p-5",
        correct
          ? "border-rose-200/70 bg-white text-zinc-950 shadow-[0_18px_60px_rgba(255,47,106,0.12)] dark:border-rose-900/50 dark:bg-zinc-950/70 dark:text-white"
          : "border-rose-200 bg-rose-50/70 text-zinc-950 shadow-[0_18px_60px_rgba(209,11,60,0.12)] dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-white",
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="text-sm font-semibold">
        {correct ? "🎉 Well done, Mummy Chi!" : "❤️ So close, Mummy Chi!"}
      </div>

      {correct ? (
        <div className="mt-2 text-sm">
          <div className="font-medium text-[#d10b3c] dark:text-[#ff7aa8]">Textbook reference</div>
          <div className="mt-1 text-sm opacity-90">{textbookReference}</div>
        </div>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Formal definition
            </div>
            <div className="mt-2 text-sm leading-6 opacity-95">{formalDefinition}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Nigerian analogy
            </div>
            <div className="mt-2 text-sm leading-6 opacity-95">{nigerianAnalogy}</div>
          </div>
        </div>
      )}

      {aiFeedback && (
        <div className="mt-4 grid gap-4">
          <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Examiner rationale</div>
            <div className="mt-2 text-sm font-medium">{aiFeedback.examinerRationale.overallJudgement}</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm opacity-95">
              {aiFeedback.examinerRationale.rationalePoints.map((point, i) => (
                <li key={`rationale-${i}`}>{point}</li>
              ))}
            </ul>
            <div className="mt-3 text-xs font-semibold uppercase tracking-wide opacity-80">
              Distractor analysis
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm opacity-95">
              {aiFeedback.examinerRationale.distractorAnalysis.map((point, i) => (
                <li key={`distractor-${i}`}>{point}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Textbook reference</div>
            <div className="mt-2 text-sm font-semibold">
              {aiFeedback.textbookReference.source} - {aiFeedback.textbookReference.section}
            </div>
            <div className="mt-1 text-sm opacity-95">
              ({aiFeedback.textbookReference.quoteType}) {aiFeedback.textbookReference.quote}
            </div>
            <div className="mt-2 text-sm opacity-90">{aiFeedback.textbookReference.relevance}</div>
          </div>
        </div>
      )}
    </div>
  );
}

