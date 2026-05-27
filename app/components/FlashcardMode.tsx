"use client";

import { useMemo, useState } from "react";
import type { EvaluateFeedback, FlashcardQuestion, SchedulerState } from "../lib/types";
import { FeedbackCard } from "./FeedbackCard";
import { getOrInitItem, recordAttempt, setFlagged } from "../lib/spacedRepetition";

export function FlashcardMode({
  card,
  state,
  setState,
  onNext,
}: {
  card: FlashcardQuestion;
  state: SchedulerState;
  setState: (s: SchedulerState) => void;
  onNext: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [lastResult, setLastResult] = useState<"correct" | "incorrect" | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<EvaluateFeedback | null>(null);

  const schedule = useMemo(() => getOrInitItem(state, card.id), [state, card.id]);

  async function mark(result: "correct" | "incorrect") {
    setFeedbackError(null);
    setAiFeedback(null);
    setLastResult(result);
    setLoadingFeedback(true);
    try {
      const answerText =
        result === "correct"
          ? `I understood this concept: ${card.front}`
          : `I missed this concept and could not explain: ${card.front}`;
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: card.id,
          mode: "flashcard",
          prompt: card.front,
          flashcardBack: card.back,
          expectedKeyPoints: [
            "Evaluate if learner understood core concept behind the flashcard.",
            "Provide PMI-aligned rationale and correction guidance.",
          ],
          answerText,
          framework: card.framework,
          domain: card.domain,
          textbookReference: card.textbookReference,
          formalDefinition: card.formalDefinition,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Request failed (${res.status})`);
      }
      setAiFeedback((await res.json()) as EvaluateFeedback);
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : "Unable to load examiner feedback.");
    } finally {
      setLoadingFeedback(false);
    }
  }

  function toggleFlag() {
    const next = structuredClone(state) as SchedulerState;
    setFlagged(next, card.id, !schedule.flagged);
    setState(next);
  }

  function nextCard() {
    if (lastResult) {
      const next = structuredClone(state) as SchedulerState;
      recordAttempt(next, card.id, lastResult);
      setState(next);
    }
    setFlipped(false);
    setLastResult(null);
    setFeedbackError(null);
    setAiFeedback(null);
    onNext();
  }

  const showFeedback = lastResult !== null;

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_16px_60px_rgba(11,11,16,0.06)] dark:border-zinc-800 dark:bg-zinc-950/75 dark:shadow-[0_22px_70px_rgba(0,0,0,0.42)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Flashcard • {card.framework.toUpperCase()} • {card.domain.toUpperCase()}
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-7 text-zinc-950 dark:text-white">
            {flipped ? card.back : card.front}
          </h2>
        </div>

        <button
          type="button"
          onClick={toggleFlag}
          className={[
            "shrink-0 rounded-2xl border px-3 py-2 text-xs font-semibold transition",
            schedule.flagged
              ? "border-transparent bg-gradient-to-r from-[#ff2f6a] to-[#ff7aa8] text-white shadow-[0_14px_40px_rgba(255,47,106,0.25)]"
              : "border-zinc-200 bg-white text-zinc-950 hover:bg-rose-50/60 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-white dark:hover:bg-[#120613]",
          ].join(" ")}
        >
          {schedule.flagged ? "Flagged" : "Flag"}
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {!flipped ? (
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="rounded-2xl bg-gradient-to-r from-[#d10b3c] via-[#ff2f6a] to-[#ff7aa8] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_55px_rgba(209,11,60,0.22)]"
          >
            Flip card
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void mark("correct")}
              className="rounded-2xl bg-gradient-to-r from-[#d10b3c] via-[#ff2f6a] to-[#ff7aa8] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_55px_rgba(209,11,60,0.22)]"
            >
              I knew this
            </button>
            <button
              type="button"
              onClick={() => void mark("incorrect")}
              className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-[0_12px_40px_rgba(209,11,60,0.10)] hover:bg-rose-100/70 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-white dark:hover:bg-rose-950/40"
            >
              I missed it
            </button>
          </>
        )}

        <div className="sm:ml-auto">
          <button
            type="button"
            onClick={nextCard}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 shadow-[0_10px_35px_rgba(11,11,16,0.05)] hover:bg-rose-50/60 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-white dark:hover:bg-[#120613]"
          >
            Next
          </button>
        </div>
      </div>

      {showFeedback && (
        <>
          <FeedbackCard
            correct={lastResult === "correct"}
            textbookReference={card.textbookReference}
            formalDefinition={card.formalDefinition}
            nigerianAnalogy={card.nigerianAnalogy}
            aiFeedback={aiFeedback}
          />
          {loadingFeedback && (
            <div className="mt-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
              Generating examiner-level feedback...
            </div>
          )}
          {feedbackError && (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-zinc-950 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-white">
              {feedbackError}
            </div>
          )}
        </>
      )}
    </div>
  );
}

