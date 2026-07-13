import type { EditorView } from "@codemirror/view";

/**
 * The game is meant to be played with vim motions only - letting the mouse
 * reposition the cursor would give players a way around actually learning
 * them.
 *
 * `EditorView.domEventHandlers({ mousedown: () => true })` looks like the
 * idiomatic way to do this, but doesn't reliably stop click-to-place-cursor:
 * codemirror-vim's own view plugins sit ahead of a bare extension in the
 * handler order, so returning `true` there doesn't run early enough to beat
 * CodeMirror's built-in selection handler. Calling `preventDefault` from a
 * capture-phase listener on the outer `view.dom` runs before any of
 * CodeMirror's own bubble-phase listeners on `contentDOM` even see the
 * event, and its dispatcher itself skips further handling once
 * `defaultPrevented` is set - so this is the one place that's guaranteed to
 * land before CodeMirror's internal mouse-selection logic runs.
 *
 * Preventing the mousedown's default action also cancels the browser's
 * built-in "focus the element you clicked" behavior, so a click that lands
 * on an unfocused editor would otherwise silently do nothing. Focusing
 * `contentDOM` back explicitly keeps clicking-to-focus working while still
 * leaving the cursor exactly where vim motions last put it.
 */
export function installClickGuard(view: EditorView): () => void {
  const handler = (event: MouseEvent) => {
    event.preventDefault();
    view.contentDOM.focus();
  };

  view.dom.addEventListener("mousedown", handler, { capture: true });
  return () =>
    view.dom.removeEventListener("mousedown", handler, { capture: true });
}
