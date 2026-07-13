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
The glowing/pulsing red decoration in the Editor Panel marking the exact text a Challenge requires the player to fix (`highlightRange`). Tracks edits and disappears once its range collapses to zero-width.
_Avoid_: Error marker, red squiggle, warning

**Editor Panel**:
The right-hand panel containing the CodeMirror instance, where the player's Vim commands are the mechanism of combat.
_Avoid_: Right panel, code panel

**Vim Mode**:
The current modal state of the editor (Normal, Insert, Visual, etc.) as reported by the `vim()` extension, surfaced to the player via the status bar.
_Avoid_: Editor state, mode
