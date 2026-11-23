# Tasks

## 1. Capability-based local and remote tab moves with actionable incompatibility failures

- [x] 1.1 Complete and record the pinned 0.1.21-to-0.1.22 Core contract review in the tab-move ADR/compatibility docs, including CAS persistence, doc event filtering, remote forwarding, label errors and source hashes; verify every approval claim against the immutable sources and retain the native continuity caveat.
- [x] 1.2 Replace exact reviewed-version eligibility with App 0.1.15/Core 0.1.19 minimums, required methods/commands and understood generation/shape; preserve identity/CAS/expiry checks and verify newer unreviewed versions pass while missing capabilities, malformed/below-minimum versions and unknown generations explain refusals.
- [x] 1.3 Cover unknown newer local App/Core and routing/remote Core versions, missing capabilities, opaque preservation, failed persistence/conflicts, unknown writes and unavailable-label partial success/repair; verify with `node tests/tab-move.test.mjs` without requiring review-list membership.
- [x] 1.4 Connect real preflight to menu fixtures so unreviewed newer hosts expose destinations and missing methods/commands yield inert refusals; verify handoff and pre-execution command rechecks with `node --experimental-vm-modules tests/tab-move-ui.test.mjs`.

## 2. Matching leading navigation chevrons

- [x] 2.1 Replace the parent Move to Layers icon with the existing 14 px theme-muted right-chevron SVG in Back's centered 16 px left icon slot and remove the trailing text arrow; verify asset, size, color, slot, label alignment and no duplicate hint in menu render-tree assertions.
- [x] 2.2 Keep Back's left-chevron, actual destination badges and keyboard behavior unchanged; update the obsolete Spaces-icon ADR/test assertions and verify the focused menu suite and relevant existing space-color menu fixture.

## 3. Readable wrapping submenu explanations

- [ ] 3.1 Render refusal/empty explanations as inert wrapping content without label ellipsis and budget their actual height within the bounded scrolling viewport, leaving ordinary menu rows unchanged; verify long/version-specific text, no action on click/Enter, multiline geometry and scrolling in menu fixtures.
- [ ] 3.2 Preserve Back/Left/Escape, destination layout and no loading text/tooltips; document capability policy, silent doc.set semantic risk, wrapping and verification limits, inventory other exact reviewed-version gates in the report without modifying them, and verify focused suites plus OpenSpec validation with no deployment/live mutation.
