# Inline markers are the primary guidance channel, with a single document-ordered Active Goal

The in-editor markers (Bug Highlights and the Hint Chip) are the authoritative source for "what to change"; the Target Snippet is kept only as a demoted, glanceable reference. Guidance focuses on one Active Goal at a time - the earliest remaining difference in document order (top-to-bottom, then left-to-right) - which is the only span that carries a Hint Chip. This replaces the earlier model of picking the hinted span by proximity to the cursor and leaning on the Target Snippet as the real goal display.

## Considered options

- **Nearest-to-cursor hint (previous choice).** The active hint flips around non-monotonically as the cursor moves, so it never reads as a stable "do this, then this" sequence.
- **Fully sequential reveal (one hunk at a time, hiding the rest).** Maximally focused, but hides how many edits remain and defeats motion-planning (e.g. a single `<C-v>` block-delete across `visual-block-delete-column`).
- **Document-ordered single Active Goal, all other diffs shown as dimmed scope Bug Highlights (chosen).** One unambiguous next step to read, while the dimmed scope reds still show the full remaining work so the player can pick an efficient motion.

## Consequences

- Because self-sufficient markers can no longer defer to the Target Snippet, each Bug Highlight must convey its operation on its own: deletes render dashed + strikethrough, replaces render solid, inserts show no red (chip only).
- The Active Goal is emphasized (full-strength red plus the pulse, which is now reserved for it) while scope reds are dimmed and static - so a chip-less delete goal still stands out as the next step.
- Keeping the Target Snippet is provisional (it currently fills otherwise-empty space); if it is later removed, the scope Bug Highlights become the only whole-task view, which this model already supports.
