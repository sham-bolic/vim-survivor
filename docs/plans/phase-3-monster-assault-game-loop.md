# Phase 3 - Monster Assault Game Loop - Implementation Plan

> Handoff plan for a fresh agent. Self-contained: it assumes no memory of the design
> discussion. Read `CONTEXT.md` (glossary) and `docs/adr/0004-*.md` alongside this.

## Goal

Add the survival-pressure layer on top of the working Phase 1/2 editor: an
advancing **Monster** the player **repels** by completing Vim **Challenges**, with
**Player Health**, escalating **Waves**, a **Score**, and a **Game Over** state.

## What already exists (do not rebuild)

- **`components/GameLayout.tsx`** - the app's central state holder. Currently owns
  `hasStarted`, `challenge`, `challengeCount`, `elapsedSeconds`, `restartKey`.
  Renders `Hud`, `Arena`, `Editor`. A `Start` overlay flips `hasStarted`; a
  `Restart` button in the HUD bumps `restartKey` (remounts the editor) and resets
  the timer.
- **`components/Editor/useVimEditor.ts`** - the entire CodeMirror + vim editor,
  built inside one `useEffect` keyed on `[active]`. **It owns the challenge bag**
  (`createShuffledBag(CHALLENGES)`, a local variable) and advances itself: on
  completion it detects a match, fires `onKeystrokeComparison`, calls `bag.next()`,
  fires `onChallengeChange(next, false)`, and defers a `view.setState(...)` swap.
  Completion is detected **only inside the doc-change `updateListener`**
  (`useVimEditor.ts:160`) as `text.trim() === challenge.targetCode.trim()`.
- **`components/Arena.tsx`** - a frameless placeholder ("Monster Assault Arena -
  Coming Soon") in the top visuals zone above the editor. **This is where the
  numbers go.**
- **`components/Hud.tsx`** - muted top status row: `Challenge #N`, timer, `Restart`.
- **`lib/challenges.ts`** - `VimChallenge`, the `CHALLENGES` list, `createShuffledBag`.

## Settled design decisions (the "why" behind this plan)

1. **The game loop is an ADDITIVE hook. The editor is NOT centralized.** The editor
   keeps owning the challenge bag and keeps advancing itself on success, exactly as
   today. The new `useGameLoop` hook owns only the survival numbers and the loop; it
   never reaches *into* the editor. (See ADR 0004. The original spec's
   "collision force-loads a new challenge" was **dropped** - which removed the only
   reason to lift the bag out.)
2. **Collision does NOT change the challenge.** On collision the player **keeps their
   in-progress edits**; only the monster resets. This is what keeps the editor
   decoupled - resetting the drill would require an inbound channel we deliberately
   avoid.
3. **One-shot repel, no monster HP.** Completing a drill fully pushes the monster back
   to distance 100. There is conceptually one ever-accelerating monster. Monster HP /
   damage-per-solve is explicitly **out of scope** (Phase 4).
4. **Loop = `requestAnimationFrame` + delta-time.** Speed is `%/second` (wall-clock),
   so the monster advances at the same real rate regardless of refresh rate.
5. **Waves ramp on survival time (infinite).** `wave = 1 + floor(playingSeconds / 30)`.
   No cap, no final stage; the run ends only when Player Health hits 0. Speed rises
   linearly with wave.
6. **NORMAL-mode completion gate (habit-building).** A drill only counts as solved when
   the doc matches the target **and** the editor is in NORMAL mode - forcing the player
   to press `<Esc>`. Because leaving insert mode is not a doc change, completion must be
   re-checked on **mode changes into NORMAL**, not just on doc edits.
7. **The monster keeps advancing during the "correct-but-not-escaped" window.** No
   pause. A subtle pulsing `⎋ Esc` nudge appears only in that window. Getting hit
   before escaping is a real, intended risk. (Nudge is separable polish - see step 5.)
8. **`score` = successful solves.** Since collisions no longer load challenges, the old
   `challengeCount` is now just `1 + successes`; collapse it into `score`.
9. **`gameState` replaces the `hasStarted` boolean:** `'IDLE' | 'PLAYING' | 'GAME_OVER'`.
10. **Numbers render in the Arena** (the top visuals zone), as raw text for now:
    Health / Distance / Wave / Score. The original task said "Left Panel," but the
    layout was redesigned so that surface is now the **Arena band on top of the editor**
    (confirmed) - there is no left column. Render there.

## Tunable constants (put at the top of `useGameLoop`)

```ts
const START_HEALTH    = 100;   // Player Health at run start
const START_DISTANCE  = 100;   // Monster Distance (%) at run start / after a repel
const COLLISION_DAMAGE = 20;   // Health lost per collision -> 5 lives
const WAVE_SECONDS    = 30;    // seconds of PLAYING time per wave
const BASE_SPEED      = 8;     // %/sec at wave 1  (~12.5s to cross)
const SPEED_STEP      = 2;     // added %/sec per wave
const MAX_FRAME_DT    = 0.1;   // clamp dt (s) so a backgrounded tab can't one-frame-kill
// speed(wave) = BASE_SPEED + (wave - 1) * SPEED_STEP
```

Feel reference: wave 1 ≈ 12.5s to cross, wave 2 = 10s, wave 3 ≈ 8.3s, wave 5 ≈ 6.25s.

## Step 1 - The `useGameLoop` hook (`components/useGameLoop.ts`)

Authoritative numbers live in a **ref** (to avoid stale-closure bugs in the rAF loop);
a snapshot is mirrored to state for rendering.

```ts
type GameState = "IDLE" | "PLAYING" | "GAME_OVER";

interface GameSnapshot {
  playerHealth: number;    // integer, steps of 20
  monsterDistance: number; // float internally; DISPLAY floored to int
  wave: number;
  score: number;
  playingSeconds: number;  // drives the HUD timer too (see step 3)
}

// returns: { gameState, snapshot, start(), restart(), registerSolve() }
```

Loop (runs only while `gameState === "PLAYING"`, in a `useEffect` keyed on `gameState`):

```
loop(now):
  dt = min((now - last)/1000, MAX_FRAME_DT); last = now
  s.playingMs += dt * 1000
  s.wave = 1 + floor(s.playingMs/1000 / WAVE_SECONDS)
  s.distance -= speed(s.wave) * dt
  if s.distance <= 0:                      // COLLISION
    s.health -= COLLISION_DAMAGE
    if s.health <= 0:
      s.health = 0; s.distance = 0
      setGameState("GAME_OVER")            // loop effect tears down
      publishSnapshot(); return
    s.distance = START_DISTANCE            // repelled, same drill continues
  s.distance = clamp(s.distance, 0, 100)
  publishSnapshot()
  raf(loop)
```

- **`registerSolve()`** (called from GameLayout on a success): ignore unless
  `PLAYING`; set `s.distance = START_DISTANCE`, `s.score += 1`, publish snapshot.
- **`start()`**: from IDLE, reset the ref to start values, `setGameState("PLAYING")`.
- **`restart()`**: reset the ref to start values (health 100, distance 100, wave 1,
  score 0, playingMs 0), `setGameState("PLAYING")`.
- Always `cancelAnimationFrame` in the effect cleanup.

## Step 2 - Editor: NORMAL-mode completion gate (`useVimEditor.ts`)

The completion detection stays *inside* the editor (it needs the doc + the vim mode).
Refactor so it is gated on mode and re-checked on mode change:

1. Add a `currentModeRef` updated inside the existing `handleModeChange`
   (`useVimEditor.ts:214`).
2. Extract a `checkCompletion()` from the body of the doc-change `updateListener`.
   It fires the existing completion sequence (keystroke comparison → `bag.next()` →
   `onChallengeChange(next, false)` → deferred `setState`) **only when**
   `doc.trim() === target.trim()` **and** `currentModeRef.current === "NORMAL"`.
3. Call `checkCompletion()` from **both** the doc-change listener **and**
   `handleModeChange` (reading the live doc via `view.state.doc.toString()`), so
   pressing `<Esc>` after typing the answer triggers it.
4. Guard against double-fire: a `solvedRef` set at completion and reset in
   `buildState` (the deferred `setState` swaps in a fresh state; a mode change landing
   in the gap must not re-run the sequence).

Notes:
- Normal-mode-only drills (e.g. `dd`) still complete immediately - the player is
  already in NORMAL mode, so no extra `<Esc>` is required. This is correct.
- `optimalKeys` for insert/visual drills already end in `<Esc>`, so keystroke
  comparison stays fair.

## Step 3 - GameLayout: wire it together (`components/GameLayout.tsx`)

- Replace `hasStarted` with the hook's `gameState`. `Start` overlay → `start()`.
- Editor `active` prop = `gameState === "PLAYING"`.
- **Success signal:** in `handleChallengeChange(next, isInitial)`, when
  `isInitial === false` call `gameLoop.registerSolve()`. (That callback already fires
  exactly once per solve, now gated behind NORMAL mode by step 2.) Remove
  `challengeCount`; the HUD reads `snapshot.score`.
- **Timer consolidation:** drop the separate `setInterval` for `elapsedSeconds`; drive
  the HUD timer from `snapshot.playingSeconds` (single clock, same source as `wave`).
- **Restart:** the existing `Restart` handler now also calls `gameLoop.restart()` (in
  addition to bumping `restartKey` to remount the editor).
- **PERFORMANCE GUARDRAIL:** the snapshot updates ~60x/sec. Wrap `Editor` in
  `React.memo` and stabilize all its props with `useCallback` / stable refs so the
  high-frequency re-renders **never** re-render the CodeMirror editor. (Alternatively,
  isolate the numbers into a small stats component that owns the snapshot subscription.)

## Step 4 - Arena: render the raw numbers (`components/Arena.tsx`)

Replace the "Coming Soon" placeholder with raw text (floored distance):

```
HEALTH 100   DISTANCE 73   WAVE 2   SCORE 4
```

Keep it frameless/muted, consistent with the existing Arena styling. Distance shown as
`Math.floor(monsterDistance)`.

## Step 5 - Game Over overlay + `⎋ Esc` nudge

- **Game Over overlay** (mirror the existing Start overlay in `GameLayout.tsx:60`):
  shown when `gameState === "GAME_OVER"`. Displays final `Score` + `wave reached` and a
  `Restart` button (calls the same restart path). While GAME_OVER: loop is stopped
  (step 1) and the editor is inactive (`active` is false).
- **`⎋ Esc` nudge (separable polish):** surface an "awaiting escape" boolean from the
  editor - true when `doc.trim() === target.trim()` but mode ≠ NORMAL (compute in the
  same `checkCompletion` path, re-evaluated on doc + mode changes) via a new
  `onAwaitingEscapeChange(boolean)` callback. Render a small pulsing `⎋ Esc` chip near
  the `ModeChip` when true. Can be skipped in a first pass without affecting mechanics.

## Guardrails & edge cases (verify these)

- **Clamp** `monsterDistance` to `[0, 100]`; a collision is handled on any crossing to
  ≤ 0, then distance resets - so a single fast frame can't drive it negative/NaN.
- **Background tab:** `dt` clamped to `MAX_FRAME_DT` so returning to a backgrounded tab
  doesn't instantly drain health.
- **`registerSolve` ignored unless PLAYING** - a solve landing as GAME_OVER resolves
  must not resurrect the run.
- **rAF cleanup** on unmount and whenever `gameState` leaves PLAYING.
- **No double-collision** per crossing (reset happens synchronously in the same frame).

## Acceptance criteria (manual E2E checklist)

1. Start → `PLAYING`; distance counts down from 100 at ~8%/s (~12.5s to reach 0).
2. Solve a normal-mode drill (`dd`) → distance snaps to 100, score +1, immediately.
3. Type a `change`/insert answer correctly but stay in INSERT → nothing counts; the
   `⎋ Esc` nudge shows; monster keeps advancing. Press `<Esc>` → it completes.
4. Let the monster reach 0 → health −20, distance resets to 100, **the same drill and
   your partial edits are still there**.
5. Five collisions → health 0 → **Game Over overlay** with final score + wave; loop
   frozen; editor disabled.
6. Restart → fresh run: wave 1, health 100, distance 100, score 0, `PLAYING`; a new
   drill; editor focused.
7. Survive ~30s → wave becomes 2 and the monster is visibly faster.
8. Arena shows raw `HEALTH / DISTANCE / WAVE / SCORE` text, distance as an integer.

## Out of scope (Phase 4+)

- Monster HP / damage-per-solve / tankier "boss" monsters (one-shot repel only now).
- Real monster visuals, animation, sound.
- Difficulty tuning beyond the linear ramp (constants are the tuning surface).
