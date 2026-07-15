// Shown only in the "correct but not yet escaped" window: the doc matches the
// target but the player is still in a non-NORMAL mode, so the solve has not
// counted yet and the Monster keeps advancing. A subtle pulse draws the eye to
// the one key that finishes the drill. Kept compact and green (the "you're
// nearly there" cue) to sit next to the ModeChip without crowding it.
export function EscNudge() {
  return (
    <span className="pointer-events-none inline-flex animate-pulse items-center gap-1 whitespace-nowrap rounded bg-green-500/15 px-2 py-1 font-mono text-xs font-bold tracking-widest text-green-300 select-none">
      <span aria-hidden>⎋</span>
      <span>Esc</span>
    </span>
  );
}
