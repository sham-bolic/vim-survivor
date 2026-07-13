import type { VimMode } from "./useVimEditor";

const MODE_COLORS: Record<VimMode, string> = {
  NORMAL: "text-blue-400",
  INSERT: "text-green-400",
  REPLACE: "text-orange-400",
  VISUAL: "text-purple-400",
  "VISUAL LINE": "text-purple-400",
  "VISUAL BLOCK": "text-purple-400",
};

export function StatusBar({ mode }: { mode: VimMode }) {
  return (
    <div className="h-8 flex items-center px-3 bg-zinc-900 border-t border-zinc-800 font-mono text-xs">
      <span className={`font-bold tracking-widest ${MODE_COLORS[mode]}`}>
        {mode}
      </span>
    </div>
  );
}
