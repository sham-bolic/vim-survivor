import { StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import DiffMatchPatch from "diff-match-patch";
import type { VimChallenge } from "@/lib/challenges";

const dmp = new DiffMatchPatch();

export type DiffHunk = {
  /** Wrong span in the live doc, [from, to). */
  from: number;
  to: number;
  /** Corresponding replacement span in the target, [hintFrom, hintTo). */
  hintFrom: number;
  hintTo: number;
  hint: string;
};

/**
 * Nudges a chip that's centered (via `left: 50%; transform: translateX(-50%)`
 * in CSS) back inside the editor's scroll viewport when its anchor sits near
 * the left or right edge - otherwise half the chip renders past the
 * scroller's clipped bounds and is simply invisible, unreachable by
 * scrolling. Deferred to the next frame since the widget's DOM isn't
 * attached (and therefore has no layout) until CodeMirror inserts it right
 * after `toDOM()` returns - `view.coordsAtPos` isn't an option here since
 * CodeMirror forbids reading layout while a `toDOM` call is still part of
 * the same update.
 *
 * This only stays correct because `eq()` below includes `pos`: without it,
 * CodeMirror would treat two widgets at different positions (but identical
 * text) as interchangeable and reuse the earlier one's already-measured,
 * now-wrong DOM node instead of calling `toDOM` again for the new spot.
 */
function clampChipToViewport(chip: HTMLElement) {
  requestAnimationFrame(() => {
    const scroller = chip.closest(".cm-scroller");
    if (!scroller) return;

    const chipRect = chip.getBoundingClientRect();
    const boundsRect = scroller.getBoundingClientRect();

    const overflowLeft = boundsRect.left - chipRect.left;
    const overflowRight = chipRect.right - boundsRect.right;

    let delta = 0;
    if (overflowLeft > 0) delta = overflowLeft + 4;
    else if (overflowRight > 0) delta = -(overflowRight + 4);

    // The chip's -50% centering comes from Tailwind's `-translate-x-1/2`,
    // which (in Tailwind v4) compiles to the native CSS `translate`
    // property, not `transform`. Setting `transform: translateX(-50%)`
    // here too would stack a second, redundant -50% shift on top of that
    // (the two properties apply independently), so only the corrective
    // delta belongs on `transform`.
    if (delta !== 0) {
      chip.style.transform = `translateX(${delta}px)`;
    }
  });
}

class HintWidget extends WidgetType {
  constructor(
    readonly text: string,
    readonly pos: number
  ) {
    super();
  }

  eq(other: HintWidget): boolean {
    return other.text === this.text && other.pos === this.pos;
  }

  toDOM(): HTMLElement {
    const anchor = document.createElement("span");
    anchor.className = "cm-hint-anchor";

    const chip = document.createElement("span");
    chip.className = "cm-hint-chip";
    chip.textContent = this.text;

    anchor.appendChild(chip);
    clampChipToViewport(chip);
    return anchor;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

/**
 * Diffs `a` against `b` and returns the hunks where they differ, via
 * diff-match-patch's Myers diff plus its semantic cleanup pass. A raw
 * minimal-edit-distance diff can be "more optimal" than a human wants:
 * a stray character that coincidentally matches something far away (e.g.
 * typing "asd" right before a line that also happens to contain an 's')
 * gets threaded through as a match, splitting one obvious 3-character
 * mistake into two confusing single-character highlights with unrelated
 * text "matched" between them. diff_cleanupSemantic exists specifically to
 * merge that back into the reading a person expects.
 */
function dmpHunks(a: string, b: string): DiffHunk[] {
  const diffs = dmp.diff_main(a, b);
  dmp.diff_cleanupSemantic(diffs);

  const hunks: DiffHunk[] = [];
  let i = 0;
  let j = 0;
  let pending: { from: number; hintFrom: number } | null = null;

  for (const [op, text] of diffs) {
    if (op === DiffMatchPatch.DIFF_EQUAL) {
      if (pending) {
        hunks.push({
          from: pending.from,
          to: i,
          hintFrom: pending.hintFrom,
          hintTo: j,
          hint: b.slice(pending.hintFrom, j),
        });
        pending = null;
      }
      i += text.length;
      j += text.length;
    } else if (op === DiffMatchPatch.DIFF_DELETE) {
      if (!pending) pending = { from: i, hintFrom: j };
      i += text.length;
    } else {
      if (!pending) pending = { from: i, hintFrom: j };
      j += text.length;
    }
  }
  if (pending) {
    hunks.push({
      from: pending.from,
      to: i,
      hintFrom: pending.hintFrom,
      hintTo: j,
      hint: b.slice(pending.hintFrom, j),
    });
  }

  return hunks;
}

/**
 * Diffs the live doc against the challenge's target. Returns every hunk
 * where they differ, in document order. Recomputing this from scratch each
 * transaction (rather than tracking a hand-authored range through
 * tr.changes) means the highlights and "what to type" hints are always in
 * sync with wherever the player's edits actually landed.
 *
 * Runs a line-level pass first, then the char-level diff on whatever's left
 * between the matched lines. A pure char-by-char scan (no line awareness)
 * can drift a hunk across a line boundary it shouldn't cross whenever two
 * lines share a leading/trailing substring - e.g. deleting
 * "const debug = true;" from between two other `const` lines would get
 * "misread" as also needing to delete the next line's leading "const ",
 * since that text happens to match too.
 */
export function diffRange(current: string, target: string): DiffHunk[] {
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

  const local = dmpHunks(
    current.slice(from, current.length - suffixLen),
    target.slice(from, target.length - suffixLen)
  );

  return local.map((h) => ({
    from: from + h.from,
    to: from + h.to,
    hintFrom: from + h.hintFrom,
    hintTo: from + h.hintTo,
    hint: h.hint,
  }));
}

/** Total count of currently-wrong characters in the live doc, across every hunk. */
export function wrongCount(current: string, target: string): number {
  return diffRange(current, target).reduce(
    (sum, h) => sum + (h.to - h.from),
    0
  );
}

function buildDecoration(
  doc: string,
  targetCode: string,
  cursorPos: number
): DecorationSet {
  const hunks = diffRange(doc, targetCode);
  const decorations = [];

  // Marking every hunk red is what actually fixes "whole line goes red" -
  // each mistake gets its own tight span. But showing a "type this"
  // chip for every single hunk at once got cluttered fast (two small
  // floating boxes stacked over two adjacent characters read as noise,
  // not help) - so only the hunk nearest the cursor, the one the player
  // is actually looking at, gets a hint chip.
  let nearest: DiffHunk | null = null;
  let nearestDist = Infinity;

  for (const hunk of hunks) {
    if (hunk.from < hunk.to) {
      decorations.push(
        Decoration.mark({ class: "cm-bug-highlight" }).range(
          hunk.from,
          hunk.to
        )
      );
    }
    if (hunk.hint.length === 0) continue;
    const dist = Math.min(
      Math.abs(hunk.from - cursorPos),
      Math.abs(hunk.to - cursorPos)
    );
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = hunk;
    }
  }

  if (nearest) {
    decorations.push(
      Decoration.widget({
        widget: new HintWidget(nearest.hint, nearest.to),
        side: 1,
      }).range(nearest.to)
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
      return buildDecoration(
        state.doc.toString(),
        challenge.targetCode,
        state.selection.main.head
      );
    },
    update(decorations, tr) {
      if (!tr.docChanged && !tr.selection) return decorations;
      return buildDecoration(
        tr.state.doc.toString(),
        challenge.targetCode,
        tr.state.selection.main.head
      );
    },
    provide: (field) => EditorView.decorations.from(field),
  });
}
