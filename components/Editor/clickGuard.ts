import type { EditorView } from "@codemirror/view";

/**
 * Walks up from `el` to the nearest ancestor that scrolls its overflow. That
 * ancestor - not `.cm-editor` - is the editor's real visible viewport: it's
 * the element the user perceives as "the editor box", including any padding or
 * min-height slack around the actual `.cm-editor`.
 */
function getScrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

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
 * capture-phase listener runs before any of CodeMirror's own bubble-phase
 * listeners on `contentDOM` even see the event, and its dispatcher itself
 * skips further handling once `defaultPrevented` is set - so this is the one
 * place that's guaranteed to land before CodeMirror's internal
 * mouse-selection logic runs.
 *
 * The listener goes on the editor's scroll viewport, not on `.cm-editor`
 * itself. When a snippet is short the viewport's min-height leaves an empty
 * band below `.cm-editor` but still inside the box. A mousedown in that band
 * targets the viewport and never reaches a listener bound to `.cm-editor`, so
 * its default action survives - and because `.cm-content` is contenteditable,
 * the browser drops a native caret at the nearest text (the end of the doc),
 * which CodeMirror's DOMObserver then syncs back into the editor state and the
 * cursor jumps. Guarding the whole viewport (a capture-phase listener on an
 * ancestor still runs before CodeMirror's) closes that gap too.
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

  const target = getScrollParent(view.dom) ?? view.dom;
  target.addEventListener("mousedown", handler, { capture: true });
  return () =>
    target.removeEventListener("mousedown", handler, { capture: true });
}
