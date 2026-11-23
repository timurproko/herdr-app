# Tasks

## 1. Reviewed Core 0.1.22 tab moves and actionable compatibility failures

- [x] 1.1 Complete and record the pinned 0.1.21-to-0.1.22 Core contract review in the tab-move ADR/compatibility docs, including CAS persistence, doc event filtering, remote forwarding, label errors and source hashes; verify every approval claim against the immutable sources and retain the native continuity caveat.
- [x] 1.2 Explicitly allow reviewed Core 0.1.22 without weakening any other gate, and include detected App/Core/generation versus reviewed facts in profile refusals; verify the exact reviewed matrix and unknown/missing-method/generation/identity refusal cases in the synthetic adapter suite.
- [x] 1.3 Cover 0.1.22 local moves and routing to reviewed remote 0.1.19, opaque document preservation, failed persistence/conflicts, unknown write outcomes and unavailable-label partial success/repair; verify with `node tests/tab-move.test.mjs` and replace the former 0.1.22-rejection case with an unreviewed version.
- [x] 1.4 Connect real contract preflight results to a menu fixture rather than an always-ready stub; verify supported destinations/click handoff and unsupported inert refusal with `node --experimental-vm-modules tests/tab-move-ui.test.mjs`.

## 2. Matching leading navigation chevrons

- [x] 2.1 Replace the parent Move to Layers icon with the existing 14 px theme-muted right-chevron SVG in Back's centered 16 px left icon slot and remove the trailing text arrow; verify asset, size, color, slot, label alignment and no duplicate hint in menu render-tree assertions.
- [x] 2.2 Keep Back's left-chevron, actual destination badges and keyboard behavior unchanged; update the obsolete Spaces-icon ADR/test assertions and verify the focused menu suite and relevant existing space-color menu fixture.

## 3. Readable wrapping submenu explanations

- [ ] 3.1 Render refusal/empty explanations as inert wrapping content without label ellipsis and budget their actual height within the bounded scrolling viewport, leaving ordinary menu rows unchanged; verify long/version-specific text, no action on click/Enter, multiline geometry and scrolling in menu fixtures.
- [ ] 3.2 Preserve Back/Left/Escape behavior, destination layout and no loading text/tooltips; document the new explanation behavior and verification limits, and verify the focused adapter/menu suites plus OpenSpec validation without deploying or mutating live sessions.
