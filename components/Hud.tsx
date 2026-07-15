function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

// Subtle, frameless status row pinned at the top of the centered layout: the
// challenge counter, elapsed timer, and Restart. Kept muted so it stays out of
// the way of the editor and the Arena visuals below it. The counter is derived
// from Score (the single progress number): the player is working on challenge
// `score + 1`, so #1 at the start, #2 after the first solve, and so on.
export function Hud({
  score,
  elapsedSeconds,
  onRestart,
}: {
  score: number;
  elapsedSeconds: number;
  onRestart: () => void;
}) {
  return (
    <div className="flex-none flex items-center justify-center gap-6 px-6 py-3 font-mono text-xs uppercase tracking-widest text-zinc-500">
      <span>Challenge #{score + 1}</span>
      <span>{formatElapsed(elapsedSeconds)}</span>
      <button
        onClick={onRestart}
        className="uppercase tracking-widest text-zinc-500 hover:text-zinc-300 cursor-pointer"
      >
        Restart
      </button>
    </div>
  );
}
