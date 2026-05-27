"use client";

export function FeedbackCard({
  correct,
  textbookReference,
  formalDefinition,
  nigerianAnalogy,
}: {
  correct: boolean;
  textbookReference: string;
  formalDefinition: string;
  nigerianAnalogy: string;
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
    </div>
  );
}

