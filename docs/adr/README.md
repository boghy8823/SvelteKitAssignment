# Architecture decision records

One file per decision that would otherwise be re-litigated in review. Each record states the
context, the decision, what it costs, and what was rejected. Records are immutable once accepted:
a reversal gets a new record that supersedes the old one, so the reasoning stays legible.

| #                                                | Decision                                                  | Status   |
| ------------------------------------------------ | --------------------------------------------------------- | -------- |
| [0001](0001-rendering-and-runtime-boundaries.md) | Rendering strategy and runtime split per route            | Accepted |
| [0002](0002-data-layer-and-mutation-boundary.md) | Data layer, validation boundary, and mutation persistence | Accepted |
