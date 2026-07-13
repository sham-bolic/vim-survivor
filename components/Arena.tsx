import type { VimChallenge } from "@/lib/challenges";

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

// TODO(phase-3): this panel stands in for the Monster Assault Arena until
// real combat gameplay is built. It currently shows challenge info instead.
export function Arena({
  challenge,
  challengeCount,
  elapsedSeconds,
  onRestart,
}: {
  challenge: VimChallenge | null;
  challengeCount: number;
  elapsedSeconds: number;
  onRestart: () => void;
}) {
  if (!challenge) {
    return (
      <div className="h-full w-full flex items-center justify-center border-r border-zinc-800 bg-zinc-950">
        <p className="text-zinc-600 font-mono text-sm tracking-widest uppercase">
          Monster Assault Arena - Coming Soon
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-6 border-r border-zinc-800 bg-zinc-950 font-mono px-8">
      <div className="flex items-center gap-6 text-xs text-zinc-500 tracking-widest uppercase">
        <span>Challenge #{challengeCount}</span>
        <span>{formatElapsed(elapsedSeconds)}</span>
        <button
          onClick={onRestart}
          className="text-zinc-500 hover:text-zinc-300 uppercase tracking-widest cursor-pointer"
        >
          Restart
        </button>
      </div>
    </div>
  );
}
