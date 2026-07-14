# Float the Hint Chip above its span instead of trailing after it

The Hint Chip (the single label showing the text to type for the Active Goal) is positioned floating directly *above* its span, so its vertical column visually links it to the exact character it refers to. This reverses an earlier decision - recorded in the `LineHintWidget` comment - to trail the chip inline after the text for "shape consistency regardless of how much room the line above has." We accepted that context-dependent shape in exchange for readability: with only one chip shown at a time, a chip that sits over its character is far easier to parse than one trailing at the end of the line.

## Considered options

- **Trailing inline (previous choice).** Consistent shape, but with one-goal-at-a-time the trailing chip loses the positional link to *which* character it targets, and it reads as detached end-of-line noise.
- **Reserving a row below.** Doubles vertical cost and pushes the hint away from its anchor.
- **Floating above (chosen).** Clear column-link to the target character; the price is that headroom must be guaranteed.

## Consequences

- Every line needs headroom above it or the chip clips against `.cm-scroller`'s top edge. We use **uniform** headroom on all lines (restoring the previously-vestigial `hintHeadroomTheme`) rather than dynamic per-line headroom, to avoid layout jitter under the cursor while typing.
- Only ever one chip is shown (the Active Goal), which sidesteps two floated chips colliding over the same line (e.g. `swap-two-values`).
- This is the second time this axis has flipped. If a future change reintroduces trailing, update or supersede this ADR rather than silently re-reversing it.
