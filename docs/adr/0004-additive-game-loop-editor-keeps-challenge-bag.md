# The Phase 3 game loop is an additive hook; the editor keeps owning the challenge bag

The survival mechanics (Player Health, Monster Distance, Wave, Score, Game State) live in a standalone `useGameLoop` hook that owns only those numbers and a `requestAnimationFrame` loop; it never reaches *into* the editor. The editor keeps owning the challenge bag and keeps advancing itself on success, exactly as before - the hook merely *reacts* to the editor's existing outward success signal (reset Monster Distance to 100, increment Score). Completion is additionally gated on NORMAL mode, re-checked on mode changes into NORMAL, to build the `<Esc>` habit.

## Considered options

- **Lift the challenge bag into the game hook; make the editor a controlled component (rejected).** This was the natural design *while* the spec required a collision to "force-load a new random challenge," because success and collision would then advance the challenge through one path. It would have meant refactoring the delicate, working CodeMirror `setState`/vim-dispatch-timing logic in `useVimEditor.ts`.
- **Additive hook; editor keeps the bag (chosen).** Once the requirement changed so that **a collision no longer changes the challenge** (the player keeps their in-progress edits; only the monster resets), the only thing that advances a challenge is a success - which the editor already detects and reports. Centralizing challenge state would then be refactoring working code for zero functional gain.

## Consequences

- Nothing flows *into* the editor from the game loop. A collision only mutates the hook's own numbers. This is what lets the player keep partial edits across a collision for free.
- The success signal is the editor's existing `onChallengeChange(next, isInitial:false)`; GameLayout turns that into `registerSolve()`. No new advancement owner is introduced.
- Because a collision cannot swap the drill, an unsolvable challenge is not a deadlock - it simply drains Health 20 at a time until Game Over. The original spec's "force-load to break deadlocks" is intentionally gone.
- The game hook publishes a snapshot ~60x/sec, so `Editor` must be memoized (with stable props) to keep those updates from re-rendering CodeMirror.
