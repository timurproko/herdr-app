# Tasks

## 1. Fleet attachment updates while Settings remains open

- [x] 1.1 Reproduce the mounted-dialog boundary and trace the synchronous preference write, sidebar invalidation and Crew verification start/completion; record the demonstrated cause in design.md instead of assuming the write is deferred.
- [x] 1.2 Repair that lifecycle boundary through supported shared-state and generic plugin refresh paths, with a failing-then-passing mounted Settings/Spaces regression asserting row order, numbering, chain and badge colours in both directions without a close event.
- [x] 1.3 Preserve generation/coalescing and exact pair checks for all relevant ready machines, with targeted fixtures covering local and remote pairs and unchanged native spaces/tabs/focus.
- [x] 1.4 Audit the confirmation and close-on-last-tab switches with Settings open, fix only a demonstrated shared cause, and document findings and the live fleet behaviour in README.md with matching targeted coverage.

## 2. Mounted-dialog regression coverage rejects stale and render-phase updates

- [ ] 2.1 Extend the mounted Settings/Spaces fixture with deferred verification, failed/ambiguous evidence, rapid enable-disable and re-enable; assert no guessed attachment, no late resurrection and no close callback in each passing scenario.
- [ ] 2.2 Add render-phase guards rejecting focus-handle allocation and notifications while rendering, and run the targeted fleet preference/refresh suites to preserve persisted-display and action-authority regressions.

## Workflow follow-up

- After approval and implementation, run `CI=true npm run test:ci` once and report its actual result.
- Read required checks on the final implementation head and report their status; do not mark the PR ready or merge.
