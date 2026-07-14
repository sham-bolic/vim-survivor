import type { VimMode } from "./useVimEditor";

const MODE_COLORS: Record<VimMode, string> = {
  NORMAL: "text-blue-400",
  INSERT: "text-green-400",
  REPLACE: "text-orange-400",
  VISUAL: "text-purple-400",
  "VISUAL LINE": "text-purple-400",
  "VISUAL BLOCK": "text-purple-400",
};

// Compact Vim-mode indicator that sits just beneath the editor in the centered
// column - replaces the old full-width bottom status bar, which read as a framed
// panel edge against the new embedded look.
export function ModeChip({ mode }: { mode: VimMode }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-zinc-900/60 px-2.5 py-1 font-mono text-xs font-bold tracking-widest ${MODE_COLORS[mode]}`}
    >
      {mode}
    </span>
  );
}
