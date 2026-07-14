function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

// Subtle, frameless status row pinned at the top of the centered layout: the
// challenge counter, elapsed timer, and Restart. Kept muted so it stays out of
// the way of the editor and the (future) Arena visuals below it.
export function Hud({
  challengeCount,
  elapsedSeconds,
  onRestart,
}: {
  challengeCount: number;
  elapsedSeconds: number;
  onRestart: () => void;
}) {
  return (
    <div className="flex-none flex items-center justify-center gap-6 px-6 py-3 font-mono text-xs uppercase tracking-widest text-zinc-500">
      <span>Challenge #{challengeCount}</span>
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
