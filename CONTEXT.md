# Vim Survivor

A high-intensity, web-based survival game where the player fights off monsters by executing Vim commands in a code editor.

## Language

**Arena**:
The visual zone (currently the top band above the Editor Panel) where the Monster advances and is fought. Canonically "Monster Assault Arena," shortened to "Arena" in code and docs.
_Avoid_: Battlefield, game panel, left panel, monster panel
_Note_: In Phase 3 it renders the raw survival numbers (Player Health, Monster Distance, Wave, Score) as text, ahead of real monster visuals.

**Monster**:
The single advancing threat the player fights off. It has no health of its own - completing a Challenge fully Repels it (one-shot); it is never "killed." Conceptually one monster that accelerates over time rather than a succession of distinct enemies.
_Avoid_: Enemy, mob, creature

**Monster Distance**:
How close the Monster is to the player, as a percentage from 100 (far) down to 0 (contact), stored as `monsterDistance`. Decreases continuously while PLAYING at a wave-dependent speed; a Repel snaps it back to 100.
_Avoid_: Proximity, position, gap

**Repel**:
What a completed Challenge does to the Monster: instantly resets Monster Distance to 100. The player's reward for solving a drill. Not a "kill" (the Monster has no health).
_Avoid_: Kill, defeat, hit, damage

**Collision**:
The event when Monster Distance reaches 0. Costs the player 20 Player Health; if Health remains it resets Monster Distance to 100 (the current Challenge and the player's in-progress edits are untouched); if Health is depleted the Game State becomes GAME_OVER.
_Avoid_: Hit, attack, contact

**Player Health**:
The player's life total, `playerHealth`, starting at 100 and lost in 20-point steps per Collision - five Collisions end the run.
_Avoid_: HP, lives, life

**Wave**:
The escalating difficulty level, `wave`, starting at 1 and incrementing every 30 seconds of PLAYING time. It sets the Monster's speed and never caps - the game is endless, ended only by a depleted Player Health, not by a final Wave.
_Avoid_: Level, stage, round, difficulty

**Score**:
The count of Challenges the player has solved this run, `score`. The single progress number shown to the player. Collisions never advance it.
_Avoid_: Points, kills, challenge count

**Game State**:
The run's phase: `IDLE` (before the player starts), `PLAYING` (the loop and timer run, the Monster advances), or `GAME_OVER` (Player Health depleted; loop frozen, editor disabled).
_Avoid_: Status, phase, mode (reserve "mode" for Vim Mode)

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
