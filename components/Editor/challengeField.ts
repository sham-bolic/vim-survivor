import { StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import type { VimChallenge } from "@/lib/challenges";

class HintWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  eq(other: HintWidget): boolean {
    return other.text === this.text;
  }

  toDOM(): HTMLElement {
    const anchor = document.createElement("span");
    anchor.className = "cm-hint-anchor";

    const chip = document.createElement("span");
    chip.className = "cm-hint-chip";
    chip.textContent = this.text;

    anchor.appendChild(chip);
    return anchor;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function charDiffRange(
  current: string,
  target: string
): { from: number; to: number; hint: string } {
  const maxLen = Math.min(current.length, target.length);

  let prefix = 0;
  while (prefix < maxLen && current[prefix] === target[prefix]) prefix++;

  const maxSuffix = maxLen - prefix;
  let suffix = 0;
  while (
    suffix < maxSuffix &&
    current[current.length - 1 - suffix] === target[target.length - 1 - suffix]
  ) {
    suffix++;
  }

  return {
    from: prefix,
    to: current.length - suffix,
    hint: target.slice(prefix, target.length - suffix),
  };
}

/**
 * Diffs the live doc against the challenge's target. [from, to) is the
 * still-wrong span in `current`; `hint` is the corresponding replacement
 * slice from `target`. Recomputing this from scratch each transaction
 * (rather than tracking a hand-authored range through tr.changes) means
 * the highlight and the "what to type" hint are always in sync with
 * wherever the player's edit actually landed.
 *
 * Runs a line-level pass first, then the char-level scan on whatever's
 * left between the matched lines. A pure char-by-char prefix/suffix scan
 * (no line awareness) can drift the highlight across a line boundary it
 * shouldn't cross whenever two lines share a leading/trailing substring -
 * e.g. deleting "const debug = true;" from between two other `const`
 * lines would get "misread" as also needing to delete the next line's
 * leading "const ", since that text happens to match too.
 */
export function diffRange(
  current: string,
  target: string
): { from: number; to: number; hint: string } {
  const currentLines = current.split("\n");
  const targetLines = target.split("\n");
  const maxLines = Math.min(currentLines.length, targetLines.length);

  let prefixLines = 0;
  while (
    prefixLines < maxLines &&
    currentLines[prefixLines] === targetLines[prefixLines]
  ) {
    prefixLines++;
  }

  const maxSuffixLines = maxLines - prefixLines;
  let suffixLines = 0;
  while (
    suffixLines < maxSuffixLines &&
    currentLines[currentLines.length - 1 - suffixLines] ===
      targetLines[targetLines.length - 1 - suffixLines]
  ) {
    suffixLines++;
  }

  const maxLen = Math.min(current.length, target.length);
  const barePrefixLen = currentLines.slice(0, prefixLines).join("\n").length;
  const bareSuffixLen = currentLines
    .slice(currentLines.length - suffixLines)
    .join("\n").length;

  // A matched line's own newline only counts as shared context when both
  // sides have a further line after/before it - otherwise one side ends
  // right there and there's no newline to share.
  const from =
    barePrefixLen +
    (prefixLines > 0 &&
    prefixLines < currentLines.length &&
    prefixLines < targetLines.length
      ? 1
      : 0);

  const suffixLen = Math.min(
    bareSuffixLen +
      (suffixLines > 0 &&
      suffixLines < currentLines.length &&
      suffixLines < targetLines.length
        ? 1
        : 0),
    maxLen - from
  );

  const local = charDiffRange(
    current.slice(from, current.length - suffixLen),
    target.slice(from, target.length - suffixLen)
  );

  return {
    from: from + local.from,
    to: from + local.to,
    hint: local.hint,
  };
}

function buildDecoration(doc: string, targetCode: string): DecorationSet {
  const { from, to, hint } = diffRange(doc, targetCode);
  const decorations = [];

  if (from < to) {
    decorations.push(
      Decoration.mark({ class: "cm-bug-highlight" }).range(from, to)
    );
  }
  if (hint.length > 0) {
    decorations.push(
      Decoration.widget({ widget: new HintWidget(hint), side: 1 }).range(to)
    );
  }

  return Decoration.set(decorations, true);
}

/**
 * Each challenge gets a freshly created EditorState (see useVimEditor's
 * buildState), so this field only ever needs to track edits within a single
 * challenge - no StateEffect for switching challenges mid-state is needed.
 */
export function createChallengeHighlightField(challenge: VimChallenge) {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildDecoration(state.doc.toString(), challenge.targetCode);
    },
    update(decorations, tr) {
      if (!tr.docChanged) return decorations;
      return buildDecoration(tr.state.doc.toString(), challenge.targetCode);
    },
    provide: (field) => EditorView.decorations.from(field),
  });
}
