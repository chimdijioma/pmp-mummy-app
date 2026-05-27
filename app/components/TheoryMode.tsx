"use client";

import { useMemo, useState } from "react";
import type { EvaluateFeedback, SchedulerState, TheoryQuestion } from "../lib/types";
import { getOrInitItem, recordAttempt, setFlagged } from "../lib/spacedRepetition";

export function TheoryMode({
  question,
  state,
  setState,
  onNext,
}: {
  question: TheoryQuestion;
  state: SchedulerState;
  setState: (s: SchedulerState) => void;
  onNext: () => void;
}) {
  const schedule = useMemo(() => getOrInitItem(state, question.id), [state, question.id]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<EvaluateFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<"correct" | "incorrect" | null>(null);

  function toggleFlag() {
    const next = structuredClone(state) as SchedulerState;
    setFlagged(next, question.id, !schedule.flagged);
    setState(next);
  }

  async function submit() {
    setError(null);
    setFeedback(null);
    if (!text.trim()) {
      setError("Please type your answer first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          mode: "theory",
          prompt: question.prompt,
          expectedKeyPoints: question.expectedKeyPoints,
          answerText: text,
          framework: question.framework,
          domain: question.domain,
          textbookReference: question.textbookReference,
          formalDefinition: question.formalDefinition,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as EvaluateFeedback;
      setFeedback(data);
      setPendingResult(data.score >= 70 ? "correct" : "incorrect");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function nextQuestion() {
    if (pendingResult) {
      const next = structuredClone(state) as SchedulerState;
      recordAttempt(next, question.id, pendingResult);
      setState(next);
    }
    setText("");
    setFeedback(null);
    setError(null);
    setPendingResult(null);
    onNext();
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_16px_60px_rgba(11,11,16,0.06)] dark:border-zinc-800 dark:bg-zinc-950/75 dark:shadow-[0_22px_70px_rgba(0,0,0,0.42)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Theory • {question.framework.toUpperCase()} • {question.domain.toUpperCase()}
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-7 text-zinc-950 dark:text-white">
            {question.prompt}
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

      <div className="mt-5">
        <label className="text-sm font-semibold text-zinc-950 dark:text-white">
          Your answer
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="mt-2 w-full resize-y rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-950 shadow-[0_10px_35px_rgba(11,11,16,0.05)] outline-none ring-0 focus:border-rose-300 focus:shadow-[0_18px_60px_rgba(255,47,106,0.14)] dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-white dark:focus:border-rose-900/60"
          placeholder="Type your answer here…"
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-zinc-600 dark:text-zinc-300">
            Tip: mention the “why”, impacts, and next best action (PMI style).
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="rounded-2xl bg-gradient-to-r from-[#d10b3c] via-[#ff2f6a] to-[#ff7aa8] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_55px_rgba(209,11,60,0.22)] disabled:opacity-50"
            >
              {loading ? "Checking answer..." : "Check answer"}
            </button>
            <button
              type="button"
              onClick={nextQuestion}
              disabled={!feedback}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 shadow-[0_10px_35px_rgba(11,11,16,0.05)] hover:bg-rose-50/60 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-white dark:hover:bg-[#120613]"
            >
              Next question
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-zinc-950 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-white">
            {error}
          </div>
        )}

        {feedback && (
          <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_18px_60px_rgba(11,11,16,0.06)] dark:border-zinc-800 dark:bg-zinc-950/70 dark:shadow-[0_22px_70px_rgba(0,0,0,0.42)]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-950 dark:text-white">
                Examiner feedback
              </div>
              <div className="rounded-full bg-gradient-to-r from-[#d10b3c] via-[#ff2f6a] to-[#ff7aa8] px-3 py-1 text-xs font-semibold text-white shadow-[0_14px_45px_rgba(209,11,60,0.20)]">
                Score: {Math.round(feedback.score)}/100
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  What you did well
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-950 dark:text-white">
                  {feedback.whatSheDidWell.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  What you missed
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-950 dark:text-white">
                  {feedback.whatSheMissed.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-zinc-950 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-white">
              <div className="font-semibold">Next step</div>
              <div className="mt-1 opacity-90">{feedback.suggestedImprovement}</div>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Examiner rationale
              </div>
              <div className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                {feedback.examinerRationale.overallJudgement}
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-950 dark:text-white">
                {feedback.examinerRationale.rationalePoints.map((x, i) => (
                  <li key={`r-${i}`}>{x}</li>
                ))}
              </ul>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Distractor analysis
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-950 dark:text-white">
                {feedback.examinerRationale.distractorAnalysis.map((x, i) => (
                  <li key={`d-${i}`}>{x}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Textbook reference
              </div>
              <div className="mt-2 text-sm font-semibold text-zinc-950 dark:text-white">
                {feedback.textbookReference.source} - {feedback.textbookReference.section}
              </div>
              <div className="mt-1 text-sm text-zinc-950/90 dark:text-white/90">
                ({feedback.textbookReference.quoteType}) {feedback.textbookReference.quote}
              </div>
              <div className="mt-2 text-sm text-zinc-950/90 dark:text-white/90">
                {feedback.textbookReference.relevance}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

