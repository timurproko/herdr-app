# Tasks

## 1. Prioritized readable row metadata and compact bylines

- [x] 1.1 Replace the shared row's weighted metadata allocation with native-measured natural lower-line runs; retain complete checks, constant separator gaps, trailing free space, fixed title/state/agent slots and unchanged vertical line/block geometry.
- [x] 1.2 Keep full task/time wording whenever the complete line fits; select whole task fractions and compact relative time only on measured overflow before secondary clipping, retaining full tooltips in ordinary/coordinator/live/ghost rows.
- [x] 1.3 Extend the geometry helper and regression matrix to 280/320/360/390/480px at 75/100/125/150/200% zoom with full horizontal checks containment for 1/1, 3/10, 10/10, 11/11 and 99/99 and all check states; preserve three-digit, title/vertical no-shift, label and numeric-line-height mutations while asserting natural widths, constant gaps, trailing space and exact whole-line shortening thresholds and verify targeted geometry/label/pin regressions pass.
- [x] 1.4 Update README and docs/TESTING.md to describe the priority/compact presentation and fixture limits; verify examples match the row tests and line heights remain explicit px strings.

## 2. Completion-driven checks freshness and documented latency

- [x] 2.1 Add completion, partial failure/success and rerun regression sequences through real ordinary and aggregate webhook paths, including an event during an older in-flight read; verify the full latest count reaches pinned, unpinned, older linked and coordinator rows with a coalesced follow-up.
- [x] 2.2 Repair any stale-count invalidation/aggregation defect demonstrated by those sequences and add the approved 45-second pending/unknown-only repository fallback with exponential/rate-limit backoff while retaining enrolled-event-only, hide/disable/offline and stale-context boundaries; verify fake-clock settlement/stop, failure retention/backoff and queue coalescing plus focused pagination/fleet/webhook tests.
- [x] 2.3 Document event dispatch, single-flight/page queue and GitHub read timing plus unenrolled/offline/missed-event/failed-read/stale-coordinator conditions in the applicable Git docs; verify each source-derived timing statement against code and distinguish it from any measured live evidence, without changing enrollment or PRs #40/#41.
- [x] 2.4 When no other suite is running, execute CI=true npm run test:ci once with a long timeout and retain its actual output/exit status; record concrete failures and their focused repairs without weakening checks.

## Approved display amendment

- [x] Both lower lines flow left with natural content widths, no absent-group reservations and unused space only at the end; fitting 390px rows retain full task/time wording.
- [x] Native-size callbacks converge after layout without render-time notifications; full/compact probes are invisible and clipped outside the visible run. Geometry measurements survive data resets and reject obsolete-context callbacks.
- [x] Current proposal/design/spec delta and canonical requirements plus README/testing guidance reflect the amended horizontal-flow contract; freshness source paths remain unchanged.

## Workflow follow-up

- Plan approved by the coordinator, including the bounded fallback addition; implement in the same PR.
- Do not modify, label, close, refresh-branch or otherwise mutate PRs #40 and #41.
- Wait for required checks on the final head and report success, pending, skipped or failure honestly; never mark ready or merge.
- Write the task report to the requested Crew report path and run crew done git-row-counts at handoff.
