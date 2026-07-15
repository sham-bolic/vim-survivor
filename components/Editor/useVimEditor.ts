"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, keymap } from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { vim, getCM } from "@replit/codemirror-vim";
import { installKeyboardGuard } from "./keyboardGuard";
import { installClickGuard } from "./clickGuard";
import { patchVimBoundaryMotions } from "./vimMotionFixes";
import { createChallengeHighlightField, wrongCount } from "./challengeField";
import { installKeyBuffer } from "./keyBuffer";
import { CHALLENGES, createShuffledBag, type VimChallenge } from "@/lib/challenges";

export interface KeystrokeComparison {
  challenge: VimChallenge;
  actualKeys: string[];
  optimalKeys: string[];
  beatOptimal: boolean;
}

export type VimMode =
  | "NORMAL"
  | "INSERT"
  | "REPLACE"
  | "VISUAL"
  | "VISUAL LINE"
  | "VISUAL BLOCK";

// The Hint Chip floats above its line, so every line reserves a band of empty
// space directly above its own text for the chip to rise into. We use per-line
// padding-top (space entirely above the text) rather than a large line-height
// (whose leading is split half-above / half-below, so it would have to be
// enormous to clear a chip). It's uniform across every line - the agreed
// trade-off for float-above (ADR 0002) - so the layout never shifts as the
// single chip moves between goals. Routed through EditorView.theme because
// CodeMirror's default .cm-content/.cm-line styles outweigh a plain override.
//
// The first line is a special case: interior chips rise into the inter-line
// leading above them, but a chip on the first line rises against `.cm-scroller`'s
// overflow edge and gets clipped there. So `.cm-content` reserves extra top
// padding - space that sits only above the first line - sized to clear the full
// chip: a ~22px chip plus the floater's 0.3rem gap needs ~27px of headroom, and
// the per-line 0.5rem (8px) alone left the first-line chip ~3px short (ADR 0002).
const hintHeadroomTheme = EditorView.theme({
  ".cm-content": { paddingTop: "1.75rem" },
  ".cm-line": { paddingTop: ".5rem", lineHeight: "1.5" },
});

// Frameless / embedded look (see the centered redesign): the editor should read
// as part of the page, not a boxed panel. There is no dark editor theme
// otherwise, so without an explicit text colour the default near-black glyphs
// would be invisible on the dark background. Transparent background + light text
// + no focus ring gives the "embedded into the background" feel; the larger
// font-size/line-height give the roomier rhythm the default 14px lacked and make
// the fixed per-line hint headroom read as proportional rather than sparse.
const embeddedTheme = EditorView.theme({
  "&": { backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-geist-mono)",
    fontSize: "1.0625rem",
    lineHeight: "1.5",
  },
  ".cm-content": { color: "#ededed", caretColor: "#ededed" },
  // one-dark's selector chain: covers the drawn selection layer (focused +
  // unfocused) and native ::selection, otherwise the default light fill shows.
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    { backgroundColor: "rgba(59, 130, 246, 0.3)" },
});

// codemirror-vim's default normal-mode block cursor (`.cm-fat-cursor`) is a
// light red/pink fill - indistinguishable from `cm-bug-highlight`'s red
// tint whenever the cursor sits on the character it's flagging as wrong,
// which is exactly the moment the player most needs to see where they are.
// White has no other use in this palette (mistakes are red, hints are
// green), so it reads clearly against either.
//
// The vim package ships that rule at `Prec.highest`, and CodeMirror mounts
// higher-precedence style modules LAST in the sheet, so an equal-specificity
// override loses the cascade. Prefixing with `&.cm-editor` raises our
// specificity enough to win. The block draws the covered glyph on top of its
// fill, so a white block needs a dark glyph color (reverse-video, like a
// terminal cursor) or the near-white content text under it vanishes.
const cursorContrastTheme = EditorView.theme({
  "&.cm-editor .cm-fat-cursor": { background: "#fff", color: "#0a0a0a" },
  "&.cm-editor:not(.cm-focused) .cm-fat-cursor": {
    background: "none",
    outline: "solid 1px #fff",
  },
  // Insert-mode caret is drawSelection's thin bar (`.cm-cursor`); its border
  // defaults to black, invisible on this dark editor.
  ".cm-cursor, .cm-cursor-primary": { borderLeftColor: "#fff" },
});

function toVimMode(mode: string, subMode: string): VimMode {
  if (mode === "insert") return "INSERT";
  if (mode === "replace") return "REPLACE";
  if (mode === "visual") {
    if (subMode === "linewise") return "VISUAL LINE";
    if (subMode === "blockwise") return "VISUAL BLOCK";
    return "VISUAL";
  }
  return "NORMAL";
}

export function useVimEditor(
  active: boolean,
  onModeChange: (mode: VimMode) => void,
  onChallengeChange: (challenge: VimChallenge, isInitial: boolean) => void,
  onUndoPromptChange: (show: boolean) => void,
  onKeystrokeComparison?: (comparison: KeystrokeComparison) => void,
  onAwaitingEscapeChange?: (awaiting: boolean) => void
) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !active) return;

    patchVimBoundaryMotions();

    const bag = createShuffledBag(CHALLENGES);
    // Reused across every challenge in this session (see keyBuffer.ts) -
    // `reset()` clears the log each time buildState starts a new challenge,
    // rather than installing a fresh listener per challenge.
    const keyBuffer = installKeyBuffer(container);

    // The live Vim mode, tracked here (not just forwarded to React) because the
    // NORMAL-mode completion gate needs it synchronously. `currentCheckCompletion`
    // always points at the active challenge's completion check so the single
    // mode-change handler can invoke it after the state swaps (it takes the view
    // as an argument, so it doesn't need to close over one that outlives it).
    let currentMode: VimMode = "NORMAL";
    let currentCheckCompletion: ((view: EditorView) => void) | null = null;

    // Each challenge gets its own freshly built EditorState (via
    // view.setState below), so undo history never crosses a challenge
    // boundary - `u` can only undo edits made within the current challenge.
    function buildState(challenge: VimChallenge): EditorState {
      // Tracks the lowest wrong-char count reached so far in this
      // challenge. The undo prompt fires - and keeps firing through
      // further mistakes - as long as the player is above this baseline,
      // and only clears once they're back at or below it, whether via
      // undo or a manual fix. A plain "clear on the next edit" rule looked
      // right on paper but was confusing in practice: typing a second
      // wrong character made the first mistake's prompt vanish even though
      // nothing had actually been fixed.
      let baseline = wrongCount(challenge.initialCode, challenge.targetCode);
      // Guards against double-firing the completion sequence. Set the instant
      // a solve is detected and never cleared for this state: the deferred
      // setState swaps in a fresh state (with its own `solved = false`), so a
      // mode change landing in the gap between detection and that swap must not
      // re-run the sequence.
      let solved = false;
      keyBuffer.reset();

      // Completion is gated on NORMAL mode and re-checked on mode change:
      // leaving insert mode is not a doc change, so pressing <Esc> after typing
      // the answer would otherwise never be noticed. Extracted into a named
      // function so both the doc-change listener and the vim-mode-change
      // handler can call it; it reads the live doc off the passed view and the
      // live mode off `currentMode`.
      function checkCompletion(view: EditorView) {
        if (solved) return;

        const matches =
          view.state.doc.toString().trim() === challenge.targetCode.trim();
        // "Awaiting escape": the answer matches but the player is still in a
        // non-NORMAL mode - the window where the Monster keeps advancing and
        // the Esc nudge shows.
        onAwaitingEscapeChange?.(matches && currentMode !== "NORMAL");
        if (!matches || currentMode !== "NORMAL") return;

        solved = true;
        console.log("Task Completed");

        const actualKeys = keyBuffer.keys();
        onKeystrokeComparison?.({
          challenge,
          actualKeys,
          optimalKeys: challenge.optimalKeys,
          beatOptimal: actualKeys.length < challenge.optimalKeys.length,
        });

        const next = bag.next();
        onChallengeChange(next, false);
        onUndoPromptChange(false);
        onAwaitingEscapeChange?.(false);

        // Defer the state swap: calling setState synchronously here
        // reenters while @replit/codemirror-vim's own key-command
        // handler is still on the call stack (this fires mid-dispatch),
        // which corrupts its internal state - observed as a stray
        // leftover keystroke leaking into the next challenge's buffer.
        // Running it after the current task finishes avoids that.
        setTimeout(() => view.setState(buildState(next)), 0);
      }
      currentCheckCompletion = checkCompletion;

      return EditorState.create({
        doc: challenge.initialCode,
        extensions: [
          vim(),
          drawSelection(),
          history(),
          EditorView.lineWrapping,
          hintHeadroomTheme,
          embeddedTheme,
          cursorContrastTheme,
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          createChallengeHighlightField(challenge),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;

            const current = wrongCount(
              update.state.doc.toString(),
              challenge.targetCode
            );
            if (current > baseline) {
              onUndoPromptChange(true);
            } else {
              baseline = current;
              onUndoPromptChange(false);
            }

            checkCompletion(update.view);
          }),
        ],
      });
    }

    const firstChallenge = bag.next();
    onChallengeChange(firstChallenge, true);

    const view = new EditorView({
      state: buildState(firstChallenge),
      parent: container,
    });
    view.focus();

    const cm = getCM(view);
    const handleModeChange = (event: { mode: string; subMode?: string }) => {
      currentMode = toVimMode(event.mode, event.subMode ?? "");
      onModeChange(currentMode);
      // Re-check completion: a correct doc only counts once the player is back
      // in NORMAL, and reaching NORMAL is a mode change, not a doc edit.
      currentCheckCompletion?.(view);
    };
    cm?.on("vim-mode-change", handleModeChange);

    const removeKeyboardGuard = installKeyboardGuard(view.dom);
    const removeClickGuard = installClickGuard(view);

    return () => {
      cm?.off("vim-mode-change", handleModeChange);
      removeKeyboardGuard();
      removeClickGuard();
      keyBuffer.dispose();
      onUndoPromptChange(false);
      onAwaitingEscapeChange?.(false);
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return containerRef;
}
