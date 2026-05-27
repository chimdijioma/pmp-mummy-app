"use client";

import { useMemo, useState } from "react";
import type { EvaluateFeedback, MCQQuestion, SchedulerState } from "../lib/types";
import { FeedbackCard } from "./FeedbackCard";
import { getOrInitItem, recordAttempt, setFlagged } from "../lib/spacedRepetition";

export function MCQMode({
  question,
  state,
  setState,
  onNext,
}: {
  question: MCQQuestion;
  state: SchedulerState;
  setState: (s: SchedulerState) => void;
  onNext: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pendingResult, setPendingResult] = useState<"correct" | "incorrect" | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<EvaluateFeedback | null>(null);

  const schedule = useMemo(() => getOrInitItem(state, question.id), [state, question.id]);

  const correct = submitted && selected === question.correctChoiceIndex;

  async function submit() {
    if (selected === null) return;
    const result = selected === question.correctChoiceIndex ? "correct" : "incorrect";
    setFeedbackError(null);
    setAiFeedback(null);
    setPendingResult(result);
    setSubmitted(true);

    setLoadingFeedback(true);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          mode: "mcq",
          prompt: question.prompt,
          choices: question.choices,
          selectedChoiceIndex: selected,
          correctChoiceIndex: question.correctChoiceIndex,
          expectedKeyPoints: [
            `Correct option index is ${question.correctChoiceIndex}`,
            "Explain why correct option aligns with PMI decision logic.",
            "Explain why each distractor is wrong or less appropriate.",
          ],
          answerText: question.choices[selected],
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
      setAiFeedback((await res.json()) as EvaluateFeedback);
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : "Unable to load examiner feedback.");
    } finally {
      setLoadingFeedback(false);
    }
  }

  function toggleFlag() {
    const next = structuredClone(state) as SchedulerState;
    setFlagged(next, question.id, !schedule.flagged);
    setState(next);
  }

  function nextQuestion() {
    if (pendingResult) {
      const next = structuredClone(state) as SchedulerState;
      recordAttempt(next, question.id, pendingResult);
      setState(next);
    }
    setSelected(null);
    setSubmitted(false);
    setPendingResult(null);
    setFeedbackError(null);
    setAiFeedback(null);
    onNext();
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_16px_60px_rgba(11,11,16,0.06)] dark:border-zinc-800 dark:bg-zinc-950/75 dark:shadow-[0_22px_70px_rgba(0,0,0,0.42)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Multiple Choice • {question.framework.toUpperCase()} • {question.domain.toUpperCase()}
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

      <div className="mt-5 grid gap-3">
        {question.choices.map((c, idx) => {
          const isSelected = selected === idx;
          const isCorrectChoice = question.correctChoiceIndex === idx;
          const showCorrect = submitted && isCorrectChoice;
          const showWrong = submitted && isSelected && !isCorrectChoice;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => (!submitted ? setSelected(idx) : undefined)}
              className={[
                "rounded-2xl border px-4 py-3 text-left text-sm transition",
                isSelected
                  ? "border-transparent bg-gradient-to-r from-[#d10b3c] via-[#ff2f6a] to-[#ff7aa8] text-white shadow-[0_16px_55px_rgba(209,11,60,0.22)]"
                  : "border-zinc-200 bg-white text-zinc-950 shadow-[0_10px_35px_rgba(11,11,16,0.05)] hover:bg-rose-50/60 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-white dark:hover:bg-[#120613]",
                showCorrect ? "ring-2 ring-[#ff2f6a]" : "",
                showWrong ? "ring-2 ring-[#d10b3c]" : "",
              ].join(" ")}
              aria-pressed={isSelected}
            >
              <div className="flex items-center justify-between gap-3">
                <div>{c}</div>
                {showCorrect && <div className="text-xs font-semibold">Correct</div>}
                {showWrong && <div className="text-xs font-semibold">Your pick</div>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-zinc-600 dark:text-zinc-300">
          Needs 3 correct-in-a-row to master flagged/failed items. Current streak:{" "}
          <span className="font-semibold text-zinc-900 dark:text-white">
            {schedule.consecutiveCorrect}/3
          </span>
        </div>

        <div className="flex gap-3">
          {!submitted ? (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={selected === null}
              className="rounded-2xl bg-gradient-to-r from-[#d10b3c] via-[#ff2f6a] to-[#ff7aa8] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_55px_rgba(209,11,60,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Check answer
            </button>
          ) : (
            <button
              type="button"
              onClick={nextQuestion}
              className="rounded-2xl bg-gradient-to-r from-[#d10b3c] via-[#ff2f6a] to-[#ff7aa8] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_55px_rgba(209,11,60,0.22)]"
            >
              Next question
            </button>
          )}
        </div>
      </div>

      {submitted && selected !== null && (
        <>
          <FeedbackCard
            correct={correct}
            textbookReference={question.textbookReference}
            formalDefinition={question.formalDefinition}
            nigerianAnalogy={question.nigerianAnalogy}
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

