# Vim Survivor

A high-intensity, web-based survival game where you fight off an advancing monster by executing Vim commands in a code editor. Every second the monster gets closer. The only way to push it back is to fix the buggy code in front of you using real Vim motions - the faster and more fluent you are, the longer you survive.

Think of it as typing-of-the-dead for Vim: a drill trainer disguised as a game.

## How it works

- A **Monster** advances toward you continuously. Its distance runs from `100` (far) down to `0` (contact).
- The editor shows a **Challenge**: buggy code with the broken part highlighted. Your job is to transform it into the target using Vim motions.
- Solving a Challenge **repels** the Monster - its distance snaps back to `100` and your **Score** goes up by one.
- If the Monster reaches you (a **Collision**), you lose 20 **Player Health**. You start at 100, so five collisions end the run.
- Every 30 seconds the **Wave** increments, speeding the Monster up. The ramp never caps - the game is endless and ends only when your health is depleted.
- Completion is gated on being in **Normal mode**, so the game quietly trains the `<Esc>` habit.

## In-editor guidance

You are never left guessing what to change:

- **Bug Highlights** - red decorations mark every span that still differs from the target.
- **Active Goal** - the earliest remaining difference (top-to-bottom, then left-to-right) is singled out as your unambiguous next step.
- **Hint Chip** - a floating label above the Active Goal shows the exact text you need to produce.
- **Target Snippet** - a muted, read-only reference of the goal state sits below the editor.
- **Mode Chip** - a status pill reflects your current Vim mode (Normal / Insert / Visual).

## Challenge library

Challenges are drawn from a shuffled bag (no immediate repeats) spanning eight categories of core Vim skills:

| Category | Example skills |
| --- | --- |
| `delete` | `x`, `dd`, `diw`, `daw`, `dw`, `D` |
| `change` | `r`, `ciw`, `cw`, `ci"` |
| `yank-paste` | `yy`/`p`, `dd`/`p`, `yiw`/`P`, counts |
| `visual` | `v`, `V`, `<C-v>` block edits |
| `line` | `J`, `o`, `O` |
| `search` | `f`, `t`, `/`, `<CR>` |
| `count` | `3x`, `2dd`, `3dw` |
| `case` | `~`, `gUiw`, `<C-a>` |

## Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router) + **React 19**
- **TypeScript**
- **[Tailwind CSS 4](https://tailwindcss.com)**
- **[CodeMirror 6](https://codemirror.dev)** with **[@replit/codemirror-vim](https://github.com/replit/codemirror-vim)** for the editor and Vim bindings

The CodeMirror binding is hand-rolled (constructing `EditorState`/`EditorView` directly) rather than using a React wrapper, to keep tight control over extension ordering and Vim's mode transitions in this latency-sensitive loop. The survival mechanics live in a standalone `useGameLoop` hook that owns only the game numbers and a `requestAnimationFrame` loop - it reacts to the editor's success signal but never reaches into it. See [`docs/adr`](docs/adr) for the reasoning behind these choices.

## Getting started

Requires [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), press **Start**, and survive.

### Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |

## Project layout

```
app/                     Next.js App Router entry (renders GameLayout)
components/
  GameLayout.tsx         Central state holder; wires HUD, Arena, and Editor
  Arena.tsx              The zone where the Monster advances and is fought
  Hud.tsx                Score and run timer
  useGameLoop.ts         Standalone survival layer (health, distance, wave, score)
  Editor/                CodeMirror + Vim editor, guidance, and challenge bag
lib/
  challenges.ts          The Challenge library and shuffled-bag serving
docs/
  adr/                   Architecture decision records
  plans/                 Implementation plans
CONTEXT.md               Glossary / ubiquitous language for the project
```

## Learn more

- [`CONTEXT.md`](CONTEXT.md) - the project's shared vocabulary (Monster, Repel, Wave, Challenge, and more)
- [`docs/adr`](docs/adr) - why the editor binding, hint chips, and game loop are built the way they are
