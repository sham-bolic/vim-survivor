import type { GameSnapshot } from "@/components/useGameLoop";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="text-zinc-600">{label}</span>
      <span className="tabular-nums text-zinc-300">{value}</span>
    </span>
  );
}

// The Monster Assault Arena occupies the visuals zone above the editor. In
// Phase 3 it renders the raw survival numbers as text (frameless, blended into
// the page), ahead of real monster visuals. Monster Distance is floored to an
// integer for display; everything else is already integral.
export function Arena({ snapshot }: { snapshot: GameSnapshot }) {
  const { playerHealth, monsterDistance, wave, score } = snapshot;
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex items-baseline gap-8 font-mono text-sm tracking-widest uppercase">
        <Stat label="Health" value={playerHealth} />
        <Stat label="Distance" value={Math.floor(monsterDistance)} />
        <Stat label="Wave" value={wave} />
        <Stat label="Score" value={score} />
      </div>
    </div>
  );
}
