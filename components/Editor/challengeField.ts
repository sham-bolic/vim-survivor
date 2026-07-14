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
 * Renders the single Hint Chip for the Active Goal - the text the player must
 * type - in one of two placements:
 *
 * - "above": the default for an in-place edit (a character swap, or a
 *   freshly-opened but still-blank line). The chip floats directly above the
 *   target span, in a zero-size host so it never shifts the code, with its
 *   left edge aligned to the span - the column link is what ties it to the
 *   character. See ADR 0002 for why above rather than trailing.
 * - "horizontal": reserved for a whole line that does not exist yet ("press
 *   o/O"). There's no line to float above, so the chip trails after the line
 *   above along a horizontal dashed connector toward where the new line will
 *   go - the vim-hero.com/lessons/open "jay ┄┄┄ [owl]" style.
 */
class LineHintWidget extends WidgetType {
  constructor(
    readonly text: string,
    readonly connector: "horizontal" | "above"
  ) {
    super();
  }

  eq(other: LineHintWidget): boolean {
    return other.text === this.text && other.connector === this.connector;
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement("span");
    wrap.className = `cm-line-hint cm-line-hint-${this.connector}`;

    if (this.connector === "above") {
      const floater = document.createElement("span");
      floater.className = "cm-line-hint-floater";
      for (const line of this.text.split("\n")) {
        const chip = document.createElement("span");
        chip.className = "cm-line-hint-chip";
        chip.textContent = line;
        floater.appendChild(chip);
      }
      wrap.appendChild(floater);
      return wrap;
    }

    for (const line of this.text.split("\n")) {
      const connector = document.createElement("span");
      connector.className = "cm-line-hint-connector";
      wrap.appendChild(connector);

      const chip = document.createElement("span");
      chip.className = "cm-line-hint-chip";
      chip.textContent = line;
      wrap.appendChild(chip);
    }

    return wrap;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

/**
 * True when a hunk is a pure insertion (nothing being overwritten) that
 * fills out the rest of its current line - i.e. it's completing a new
 * line (via `o`/`O`, a duplicated line, etc.) rather than inserting new
 * characters into the middle of an existing line.
 *
 * Deliberately only checks the *end* of the hunk sits on a line boundary,
 * not the start. The diff always collapses any already-correct prefix
 * into the surrounding matched (non-hunk) text, so once the player has
 * typed part of a new line - say the leading indent - the hunk's `from`
 * shifts past that prefix and no longer sits right after a "\n" itself,
 * even though the line as a whole is still a fresh one under
 * construction. Requiring both edges to land on "\n" (as an earlier
 * version of this check did) misclassified that in-progress state as a
 * same-line edit, which put the hint chip back on its old
 * absolute-positioned path and let it render on top of the line above.
 */
function isWholeLineInsertion(hunk: DiffHunk, doc: string): boolean {
  if (hunk.from !== hunk.to || hunk.hint.length === 0) return false;

  return hunk.to === doc.length || doc[hunk.to] === "\n" || hunk.hint.endsWith("\n");
}

/**
 * True once the player has already carved out the line the hunk wants
 * filled in (e.g. pressed `o`/`O`, which inserts the "\n" immediately even
 * though no text follows it yet). At that point the "line doesn't exist,
 * press o/O" framing no longer applies - there's a real row in the layout
 * already, so the hunk should be treated as an ordinary in-place edit
 * (same widget choice as any other same-line hunk) rather than the
 * connector-and-chip treatment reserved for a genuinely uncreated line.
 *
 * Checks whether the doc *already* has a "\n" sitting right at the hunk's
 * insertion point, not whether the line's text is empty - `o`/`O` writes
 * that "\n" immediately, before the player types anything, and it stays
 * put no matter how much correct text follows. A text-emptiness check
 * instead would flip back to "line not yet created" the moment the player
 * typed even one correct character, which is exactly backwards: real
 * matched characters sitting on the line are proof the row already exists.
 */
function lineAlreadyOpened(hunk: DiffHunk, doc: string): boolean {
  return doc[hunk.to] === "\n";
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

function buildDecoration(doc: string, targetCode: string): DecorationSet {
  const hunks = diffRange(doc, targetCode);
  const decorations = [];

  // The Active Goal is the earliest remaining difference in document order.
  // diffRange yields hunks left-to-right, so it's simply the first one. It is
  // the only span that gets emphasis (and, if it has text to type, the single
  // Hint Chip); every other difference is a dimmed scope Bug Highlight. See
  // ADR 0003.
  const active: DiffHunk | null = hunks[0] ?? null;

  for (const hunk of hunks) {
    if (hunk.from < hunk.to) {
      // A delete (nothing replaces the wrong text) reads as "remove me"; a
      // replace (wrong text becomes the chip's text) reads as "swap me".
      const kind = hunk.hint.length === 0 ? "cm-bug-delete" : "cm-bug-replace";
      const emphasis = hunk === active ? " cm-bug-active" : "";
      decorations.push(
        Decoration.mark({
          class: `cm-bug-highlight ${kind}${emphasis}`,
        }).range(hunk.from, hunk.to)
      );
    }
  }

  // Only the Active Goal carries a chip, and only when it has text to type -
  // a pure delete shows no chip (its pulsing red is the cue).
  if (active && active.hint.length > 0) {
    const wholeLine = isWholeLineInsertion(active, doc);
    // True only when the target line genuinely doesn't exist in the doc yet -
    // the player still needs to press o/O to create it. A whole-line hunk
    // whose line has already been opened (even if nothing's been typed into it
    // besides auto-indent) is really just an in-place edit on an existing, if
    // blank, row.
    const needsNewLine = wholeLine && !lineAlreadyOpened(active, doc);
    const text = wholeLine ? active.hint.replace(/^\n+|\n+$/g, "") : active.hint;

    if (needsNewLine) {
      // Trail the hint after the line above, since the target line itself
      // doesn't exist yet for the chip to float over.
      const anchorPos =
        active.to > 0 && doc[active.to - 1] === "\n" ? active.to - 1 : active.to;
      decorations.push(
        Decoration.widget({
          widget: new LineHintWidget(text, "horizontal"),
          side: -1,
        }).range(anchorPos)
      );
    } else {
      // Float the chip above the start of the span it refers to; the red
      // Bug Highlight underneath anchors which characters it means.
      decorations.push(
        Decoration.widget({
          widget: new LineHintWidget(text, "above"),
          side: -1,
        }).range(active.from)
      );
    }
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
      // The Active Goal is chosen by document order, not cursor proximity, so
      // decorations only need rebuilding when the document changes - cursor
      // movement no longer affects them.
      if (!tr.docChanged) return decorations;
      return buildDecoration(tr.state.doc.toString(), challenge.targetCode);
    },
    provide: (field) => EditorView.decorations.from(field),
  });
}
