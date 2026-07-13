/**
 * Combos @replit/codemirror-vim binds by default. Any Ctrl/Cmd-modified key
 * NOT in this set gets preventDefault'd so the browser's own shortcut
 * (close tab, reload, etc.) never fires while the editor is focused.
 */
const VIM_ALLOWED_KEYS = new Set([
  "r", // redo
  "v", // visual block
  "w", // insert-mode delete-word-backward
  "d", // scroll half-page down
  "u", // scroll half-page up
  "o", // jump list back
  "i", // jump list forward
  "a", // increment number
  "x", // decrement number
  "c", // acts as Escape
  "n", // insert-mode completion next
  "p", // insert-mode completion prev
]);

export function installKeyboardGuard(dom: HTMLElement): () => void {
  const handler = (event: KeyboardEvent) => {
    const isModified = event.ctrlKey || event.metaKey;
    if (!isModified) return;

    const key = event.key.toLowerCase();
    if (VIM_ALLOWED_KEYS.has(key)) return;

    event.preventDefault();
    event.stopPropagation();
  };

  dom.addEventListener("keydown", handler, { capture: true });
  return () => dom.removeEventListener("keydown", handler, { capture: true });
}
