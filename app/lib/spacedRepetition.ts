import type { ItemSchedule, SchedulerState } from "./types";

const STORAGE_KEY = "pmp_mummychi_v1";

function now() {
  return Date.now();
}

export function loadSchedulerState(): SchedulerState {
  if (typeof window === "undefined") {
    return { version: 1, lastStudiedAt: null, items: {} };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, lastStudiedAt: now(), items: {} };
    const parsed = JSON.parse(raw) as SchedulerState;
    if (!parsed || parsed.version !== 1 || typeof parsed.items !== "object") {
      return { version: 1, lastStudiedAt: now(), items: {} };
    }
    if (parsed.lastStudiedAt === null) parsed.lastStudiedAt = now();
    return parsed;
  } catch {
    return { version: 1, lastStudiedAt: now(), items: {} };
  }
}

export function saveSchedulerState(state: SchedulerState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getItemOrDefault(state: SchedulerState, id: string): ItemSchedule {
  const existing = state.items[id];
  if (existing) return existing;
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    // unseen items should be immediately eligible without needing Date.now()
    dueAt: 0,
    consecutiveCorrect: 0,
    flagged: false,
    lastResult: null,
    mastered: false,
  };
}

export function getOrInitItem(state: SchedulerState, id: string): ItemSchedule {
  const existing = state.items[id];
  if (existing) return existing;

  const created: ItemSchedule = {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: now(),
    consecutiveCorrect: 0,
    flagged: false,
    lastResult: null,
    mastered: false,
  };
  state.items[id] = created;
  return created;
}

export function setFlagged(state: SchedulerState, id: string, flagged: boolean) {
  const item = getOrInitItem(state, id);
  item.flagged = flagged;
  // flagged items should become eligible ASAP
  if (flagged) item.dueAt = Math.min(item.dueAt, now());
}

type AttemptQuality = 0 | 1 | 2 | 3 | 4 | 5;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function qualityFromResult(result: "correct" | "incorrect" | "skipped"): AttemptQuality {
  if (result === "correct") return 4;
  if (result === "skipped") return 2;
  return 1;
}

/**
 * SM-2-like update + mastery gate:
 * - SM-2-ish interval/ease updates
 * - If item is flagged OR last attempt incorrect, it must reach 3 consecutive correct to be mastered.
 */
export function recordAttempt(
  state: SchedulerState,
  id: string,
  result: "correct" | "incorrect" | "skipped"
) {
  const item = getOrInitItem(state, id);
  const q = qualityFromResult(result);

  item.lastResult = result;

  if (result === "correct") {
    item.consecutiveCorrect += 1;
  } else if (result === "incorrect") {
    item.consecutiveCorrect = 0;
  }

  // Ease factor update (SM-2)
  // EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  item.easeFactor = clamp(item.easeFactor + delta, 1.3, 2.7);

  // Interval update (SM-2-ish)
  if (q < 3) {
    item.repetitions = 0;
    item.intervalDays = 0;
  } else {
    item.repetitions += 1;
    if (item.repetitions === 1) item.intervalDays = 1;
    else if (item.repetitions === 2) item.intervalDays = 6;
    else item.intervalDays = Math.round(item.intervalDays * item.easeFactor);
  }

  const baseDueMs = now() + item.intervalDays * 24 * 60 * 60 * 1000;

  // Immediate re-queue for incorrect/flagged
  const shortRetryMs =
    result === "incorrect"
      ? 15 * 60 * 1000
      : item.flagged && item.consecutiveCorrect < 3
        ? 60 * 60 * 1000
        : 0;

  item.dueAt = shortRetryMs ? Math.min(baseDueMs, now() + shortRetryMs) : baseDueMs;

  // Mastery logic: flagged/failed must be cleared 3 times consecutively
  const needsStreak = item.flagged || result === "incorrect" || item.consecutiveCorrect < 3;
  item.mastered = !needsStreak && item.intervalDays >= 6;

  state.lastStudiedAt = now();
}

export function isDue(item: ItemSchedule, atMs: number) {
  return item.dueAt <= atMs;
}

export function getQueueOrder(
  state: SchedulerState,
  ids: string[],
  atMs: number
): string[] {
  // Priority: due items, flagged items, earliest dueAt, then never-seen
  return [...ids].sort((a, b) => {
    const ia = getItemOrDefault(state, a);
    const ib = getItemOrDefault(state, b);

    const aDue = isDue(ia, atMs) ? 0 : 1;
    const bDue = isDue(ib, atMs) ? 0 : 1;
    if (aDue !== bDue) return aDue - bDue;

    const aFlag = ia.flagged ? 0 : 1;
    const bFlag = ib.flagged ? 0 : 1;
    if (aFlag !== bFlag) return aFlag - bFlag;

    if (ia.dueAt !== ib.dueAt) return ia.dueAt - ib.dueAt;

    const aSeen = ia.lastResult === null ? 0 : 1;
    const bSeen = ib.lastResult === null ? 0 : 1;
    if (aSeen !== bSeen) return aSeen - bSeen;

    return a.localeCompare(b);
  });
}

export function getStats(state: SchedulerState, ids: string[], atMs: number) {
  let dueNow = 0;
  let flagged = 0;
  let mastered = 0;

  for (const id of ids) {
    const item = getItemOrDefault(state, id);
    if (item.flagged) flagged += 1;
    if (item.mastered) mastered += 1;
    if (isDue(item, atMs)) dueNow += 1;
  }

  return { dueNow, flagged, mastered, total: ids.length };
}

