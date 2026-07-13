"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { vim, getCM } from "@replit/codemirror-vim";
import { installKeyboardGuard } from "./keyboardGuard";
import { patchVimBoundaryMotions } from "./vimMotionFixes";
import { createChallengeHighlightField } from "./challengeField";
import { CHALLENGES, createShuffledBag, type VimChallenge } from "@/lib/challenges";

export type VimMode =
  | "NORMAL"
  | "INSERT"
  | "REPLACE"
  | "VISUAL"
  | "VISUAL LINE"
  | "VISUAL BLOCK";

// The hint chip floats above its line via absolute positioning. On the
// document's first line there's otherwise no headroom before .cm-scroller's
// own top edge, which clips it - CodeMirror's default .cm-content padding
// wins any specificity fight against a plain CSS override, so this has to
// go through EditorView.theme instead.
const hintHeadroomTheme = EditorView.theme({
  ".cm-content": { paddingTop: "2.5rem" },
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
  onChallengeChange: (challenge: VimChallenge, isInitial: boolean) => void
) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !active) return;

    patchVimBoundaryMotions();

    const bag = createShuffledBag(CHALLENGES);

    // Each challenge gets its own freshly built EditorState (via
    // view.setState below), so undo history never crosses a challenge
    // boundary - `u` can only undo edits made within the current challenge.
    function buildState(challenge: VimChallenge): EditorState {
      return EditorState.create({
        doc: challenge.initialCode,
        extensions: [
          vim(),
          drawSelection(),
          history(),
          hintHeadroomTheme,
          keymap.of([...defaultKeymap, ...historyKeymap]),
          createChallengeHighlightField(challenge),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;

            const text = update.state.doc.toString().trim();
            if (text !== challenge.targetCode.trim()) return;

            console.log("Task Completed");

            const next = bag.next();
            onChallengeChange(next, false);

            // Defer the state swap: calling setState synchronously here
            // reenters while @replit/codemirror-vim's own key-command
            // handler is still on the call stack (this listener fires
            // mid-dispatch), which corrupts its internal state - observed
            // as a stray leftover keystroke leaking into the next
            // challenge's buffer. Running it after the current task
            // finishes avoids that.
            setTimeout(() => update.view.setState(buildState(next)), 0);
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
      onModeChange(toVimMode(event.mode, event.subMode ?? ""));
    };
    cm?.on("vim-mode-change", handleModeChange);

    const removeKeyboardGuard = installKeyboardGuard(view.dom);

    return () => {
      cm?.off("vim-mode-change", handleModeChange);
      removeKeyboardGuard();
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return containerRef;
}
