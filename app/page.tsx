"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { ModePills } from "./components/ModePills";
import { StudyHeader } from "./components/StudyHeader";
import { getQuestionBank } from "./lib/questionBank";
import type { Question, QuestionMode, SchedulerState } from "./lib/types";
import {
  getQueueOrder,
  getStats,
  loadSchedulerState,
  saveSchedulerState,
} from "./lib/spacedRepetition";
import { MCQMode } from "./components/MCQMode";
import { FlashcardMode } from "./components/FlashcardMode";
import { TheoryMode } from "./components/TheoryMode";

const FRAMEWORK_FILTERS = ["all", "predictive", "agile", "hybrid"] as const;
type FrameworkFilter = (typeof FRAMEWORK_FILTERS)[number];

const DOMAIN_FILTERS = ["all", "people", "process", "business"] as const;
type DomainFilter = (typeof DOMAIN_FILTERS)[number];

function isFrameworkFilter(x: string): x is FrameworkFilter {
  return (FRAMEWORK_FILTERS as readonly string[]).includes(x);
}

function isDomainFilter(x: string): x is DomainFilter {
  return (DOMAIN_FILTERS as readonly string[]).includes(x);
}

export default function Home() {
  const mummyName = "Mummy Chi";
  const bank = useMemo(() => getQuestionBank(), []);

  const [mode, setMode] = useState<QuestionMode>("mcq");
  const [framework, setFramework] = useState<FrameworkFilter>("all");
  const [domain, setDomain] = useState<DomainFilter>("all");

  const [schedulerState, setSchedulerState] = useState<SchedulerState>({
    version: 1,
    lastStudiedAt: null,
    items: {},
  });

  // load LocalStorage on mount
  useEffect(() => {
    const loaded = loadSchedulerState();
    startTransition(() => {
      setSchedulerState(loaded);
    });
  }, []);

  // persist on change
  useEffect(() => {
    saveSchedulerState(schedulerState);
  }, [schedulerState]);

  const filtered = useMemo(() => {
    return bank.filter((q) => {
      if (q.mode !== mode) return false;
      if (framework !== "all" && q.framework !== framework) return false;
      if (domain !== "all" && q.domain !== domain) return false;
      return true;
    });
  }, [bank, mode, framework, domain]);

  const ids = useMemo(() => filtered.map((q) => q.id), [filtered]);

  const referenceTimeMs = schedulerState.lastStudiedAt ?? 0;
  const queue = useMemo(
    () => getQueueOrder(schedulerState, ids, referenceTimeMs),
    [schedulerState, ids, referenceTimeMs]
  );
  const stats = useMemo(
    () => getStats(schedulerState, ids, referenceTimeMs),
    [schedulerState, ids, referenceTimeMs]
  );

  const [cursor, setCursor] = useState(0);
  useEffect(() => {
    startTransition(() => {
      setCursor(0);
    });
  }, [mode, framework, domain]);

  const current: Question | null = useMemo(() => {
    if (filtered.length === 0) return null;
    const id = queue[cursor % queue.length];
    return filtered.find((q) => q.id === id) ?? filtered[0];
  }, [filtered, queue, cursor]);

  function next() {
    setCursor((c) => c + 1);
  }

  return (
    <div className="min-h-full text-zinc-950 dark:text-white">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
        <StudyHeader
          mummyName={mummyName}
          dueNow={stats.dueNow}
          flagged={stats.flagged}
          mastered={stats.mastered}
          total={stats.total}
        />

        <ModePills mode={mode} onChange={setMode} />

        <section className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-[0_16px_60px_rgba(11,11,16,0.06)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60 dark:shadow-[0_22px_70px_rgba(0,0,0,0.42)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Choose your focus</div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                You can study Predictive, Agile, or Hybrid—across People, Process, and Business.
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div>
                <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  Framework
                </div>
                <select
                  value={framework}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (isFrameworkFilter(v)) setFramework(v);
                  }}
                  className="mt-1 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 shadow-[0_10px_35px_rgba(11,11,16,0.05)] outline-none focus:border-rose-300 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-white dark:focus:border-rose-900/60"
                >
                  <option value="all">All</option>
                  <option value="predictive">Predictive</option>
                  <option value="agile">Agile</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  Domain
                </div>
                <select
                  value={domain}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (isDomainFilter(v)) setDomain(v);
                  }}
                  className="mt-1 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 shadow-[0_10px_35px_rgba(11,11,16,0.05)] outline-none focus:border-rose-300 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-white dark:focus:border-rose-900/60"
                >
                  <option value="all">All</option>
                  <option value="people">People</option>
                  <option value="process">Process</option>
                  <option value="business">Business</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {current ? (
          <>
            {current.mode === "mcq" ? (
              <MCQMode question={current} state={schedulerState} setState={setSchedulerState} onNext={next} />
            ) : null}
            {current.mode === "flashcard" ? (
              <FlashcardMode card={current} state={schedulerState} setState={setSchedulerState} onNext={next} />
            ) : null}
            {current.mode === "theory" ? (
              <TheoryMode question={current} state={schedulerState} setState={setSchedulerState} onNext={next} />
            ) : null}
          </>
        ) : (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            No questions match your filters yet. Try selecting “All” for framework and domain.
          </div>
        )}

        <footer className="pb-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Built for {mummyName}. Your revision is working—even on the days it feels slow.
        </footer>
      </main>
    </div>
  );
}
