/**
 * Keys that don't represent a keystroke a player "made" - they only ever
 * show up paired with the real key (e.g. Shift+w fires two keydowns: one
 * for Shift, one for w) and would otherwise double-count every combo.
 */
const IGNORED_KEYS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "OS",
  "ContextMenu",
]);

const NAMED_KEYS: Record<string, string> = {
  Escape: "<Esc>",
  Enter: "<CR>",
  Backspace: "<BS>",
  Tab: "<Tab>",
  " ": "<Space>",
};

/**
 * Normalizes a keydown into the same vim-notation token style used to
 * author `optimalKeys` in lib/challenges.ts (e.g. "<C-a>", "<Esc>"), so a
 * recorded sequence can be diffed against the authored one directly.
 * event.repeat is dropped - a key auto-repeating while held down is one
 * physical keystroke, not several distinct decisions in the player's
 * workflow.
 */
export function normalizeKey(event: KeyboardEvent): string | null {
  if (event.repeat) return null;
  if (IGNORED_KEYS.has(event.key)) return null;

  const named = NAMED_KEYS[event.key];
  if (named) return named;

  if ((event.ctrlKey || event.metaKey) && event.key.length === 1) {
    return `<C-${event.key.toLowerCase()}>`;
  }

  return event.key;
}

export interface KeyBuffer {
  reset(): void;
  keys(): string[];
}

/**
 * Records every key pressed inside `dom` from the moment it's installed.
 * `reset()` clears the log without tearing down the listener, so a single
 * buffer can be reused across a challenge's full lifetime (call it right
 * before building a fresh challenge) instead of installing a new listener
 * per challenge.
 */
export function installKeyBuffer(dom: HTMLElement): KeyBuffer & { dispose(): void } {
  let log: string[] = [];

  const handler = (event: KeyboardEvent) => {
    const token = normalizeKey(event);
    if (token) log.push(token);
  };

  dom.addEventListener("keydown", handler, { capture: true });

  return {
    reset() {
      log = [];
    },
    keys() {
      return log;
    },
    dispose() {
      dom.removeEventListener("keydown", handler, { capture: true });
    },
  };
}
