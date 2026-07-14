# Vim Survivor

A high-intensity, web-based survival game where the player fights off monsters by executing Vim commands in a code editor.

## Language

**Arena**:
The left-hand visual panel where monsters appear and are fought. Canonically "Monster Assault Arena," shortened to "Arena" in code and docs.
_Avoid_: Battlefield, game panel, left panel, monster panel
_Note_: During Phase 2, before monster combat exists, this panel temporarily displays challenge info (progress counter, timer) instead of monster gameplay.

**Challenge**:
A single Vim drill: the player is shown buggy `initialCode` in the Editor Panel with a Bug Highlight marking what to fix, and must use Vim motions to transform it into an exact match of `targetCode`. Modeled on VimHero's challenge format. Defined by the `VimChallenge` interface.
_Avoid_: Puzzle, level, drill (use "Challenge" consistently in code/docs)

**Target Snippet**:
The small, muted, read-only code block showing a Challenge's goal state (`targetCode`), displayed in the Editor Panel above the CodeMirror instance while a Challenge is active. Highlights the portion that differs from `initialCode`.
_Avoid_: Goal code, solution, answer

**Bug Highlight**:
A red decoration in the Editor Panel marking a span of text that still differs from `targetCode`. A Challenge may show several at once - one per differing span - which together tell the player how much remains to fix. Each Bug Highlight clears the moment its own span matches the target. (Supersedes the earlier single, hand-authored `highlightRange`, which no longer exists; differences are now derived live from `targetCode`.)
_Avoid_: Error marker, red squiggle, warning

**Active Goal**:
The single differing span the player should fix next, chosen as the earliest in document order (top-to-bottom, then left-to-right within a line). It is the only span that carries a Hint Chip; every other pending difference shows as a Bug Highlight alone. Exactly one Active Goal exists at any moment - so the player always has an unambiguous next step to read.
_Avoid_: Current hunk, nearest edit, focused fix

**Hint Chip**:
A small floating label showing the exact text the player must type to satisfy the Active Goal, positioned directly above the span rather than trailing after it. Only one is ever shown. A whole missing line is a special case: its Hint Chip trails a horizontal dashed connector reading "open a line here" (press o/O), since there is no existing line to float above yet.
_Avoid_: Hint box, tooltip, ghost text, suggestion

**Editor Panel**:
The right-hand panel containing the CodeMirror instance, where the player's Vim commands are the mechanism of combat.
_Avoid_: Right panel, code panel

**Vim Mode**:
The current modal state of the editor (Normal, Insert, Visual, etc.) as reported by the `vim()` extension, surfaced to the player via the status bar.
_Avoid_: Editor state, mode
