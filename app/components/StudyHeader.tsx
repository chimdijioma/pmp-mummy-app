"use client";

export function StudyHeader({
  mummyName,
  dueNow,
  flagged,
  mastered,
  total,
}: {
  mummyName: string;
  dueNow: number;
  flagged: number;
  mastered: number;
  total: number;
}) {
  return (
    <header className="rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-[0_20px_80px_rgba(209,11,60,0.12)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60 dark:shadow-[0_24px_90px_rgba(255,47,106,0.16)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-medium tracking-wide text-zinc-600 dark:text-zinc-300">
            PMP Revision — built with love
          </div>
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-zinc-950 dark:text-white sm:text-3xl">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-[#d10b3c] via-[#ff2f6a] to-[#ff7aa8] bg-clip-text text-transparent">
              {mummyName}
            </span>
            .
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            Small steps every day. We’ll repeat what needs repeating, and celebrate every win.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Due now" value={dueNow} />
          <Stat label="Flagged" value={flagged} />
          <Stat label="Mastered" value={mastered} />
          <Stat label="Total" value={total} />
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-[0_10px_30px_rgba(11,11,16,0.06)] dark:border-zinc-800 dark:bg-zinc-950/80 dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-950 dark:text-white">{value}</div>
    </div>
  );
}

