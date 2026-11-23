# Tasks

Implementation begins only after plan approval. Groups map one-to-one to the draft PR's Implementation outcomes, in order.

## 1. Shared account-style choice presentation

- [x] 1.1 Extract the account trigger/menu presentation into a pure shared UI helper and migrate ClaudeAccount rendering without moving authentication, list loading or switching logic; existing account controller regressions must pass.
- [x] 1.2 Package the helper into workspace-status and Git using existing manifests; a clean customization build and architecture/dependency-closure fixtures must resolve all imports.
- [x] 1.3 Add actual helper/caller-output regressions for the account's unchanged 12px inherited-muted chevron, glyph/gap, upward Popover, pill shift, surface bounds, padding, row geometry, hover/highlight and fixed selected slot; include the native left-mouse-down opener contract.
- [x] 1.4 Document the shared presentation boundary in architecture/testing guidance and check that its documented source and controller ownership match the built files.

## 2. One scope-safe coordinator enrollment footer

- [x] 2.1 Derive canonical deduplicated choices from existing GitNotices decisions in rendered section order and render one non-shrinking footer after task-pulls-scroll, preserving the card icon/message/surface and global setup precedence; render fixtures must cover zero/one/multiple choices, pending/unknown membership, completion, all-folded sections and long scroll content.
- [x] 2.2 Use the shared helper for the enrollment dropdown even with one repository, removing only enrollment prompts from bodies; fixtures must compare actual account/enrollment component output and retain scoped PR errors and repository-specific diagnostics in their sections.
- [x] 2.3 Capture choices and coordinator/home/location/view plus notice generations on opening, with local keyboard focus/index and immutable callbacks; interaction fixtures must cover hover, Up/Down, Enter, Escape/backdrop, exact Settings payload, and invalidation by refresh, membership/configuration changes, tab/view/home/coordinator replacement, hide and disable.
- [x] 2.4 Prove with fixture counters that picker opening/navigation starts no membership or GitHub reads and never enrolls; retain ordinary Git card, relay render guards and shared PR row/label/separator regressions without changing the label renderer or Crew reader.
- [x] 2.5 Update README and architecture/testing guidance for the fixed footer and explicit filtered Settings navigation; ensure descriptions no longer claim coordinator enrollment prompts fold inside section bodies.

## 3. Count-free full-width repository headers

- [ ] 3.1 Remove per-repository Open/Closed count strips and computations while retaining the shared machine-style header, canonical flexible label and fold persistence; expanded/collapsed fixtures must show name plus chevron only, with unchanged top-level totals including folded repositories.
- [ ] 3.2 Give the label the released width and expose a full-name tooltip only on measured overflow; wide/narrow-panel fixtures must cover fitting/long names, conditional tooltips and unchanged header/chevron geometry without render-time effects.
- [ ] 3.3 Replace PR #18's count-in-collapsed-header assertions and documentation with count-free behavior, preserving scoped errors, local folding, aggregate history and stale-context guards; focused fleet and ordinary PR regressions must pass.
- [ ] 3.4 Complete cross-outcome integration with `CI=true npm run test:ci` on the implemented head and record its actual result and any remaining native-UI limitation; do not deploy or exercise real enrollment/accounts.

## Workflow follow-up

- Commit and push each delivered outcome with its own tests and tick its matching PR outcome before starting the next one.
- Prepare final Acceptance text and use the delivery body checker before the final outcome tick; never mark ready or merge as the agent.
- Leave OpenSpec finalization to delivery automation. Report the complete current result to the assigned crew report path, run `crew done fleet-enroll-picker`, and stop.
