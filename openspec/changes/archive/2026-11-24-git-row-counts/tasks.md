# Tasks

## 1. Prioritized readable row metadata and compact bylines

- [x] 1.1 Replace the shared row's weighted metadata allocation with stable width-dependent reservations prioritizing full check icon/count, assigned review-label pills and then task wording; verify empty/present optional groups retain every existing no-shift anchor.
- [x] 1.2 Add whole compact task and relative-time display forms with full tooltips for ordinary/coordinator/live/ghost rows; verify untouched/partial/done tasks and opened/closed/merged times, including 27m ago, without mid-word task/time cuts or lone-ellipsis cells.
- [x] 1.3 Extend the geometry helper and regression matrix to 280/320/360/480px at 75/100/125/150/200% zoom with full horizontal checks containment for 1/1, 3/10, 10/10, 11/11 and 99/99 and all check states; preserve three-digit, no-shift, label and numeric-line-height mutation coverage and verify targeted geometry/label/pin regressions pass.
- [x] 1.4 Update README and docs/TESTING.md to describe the priority/compact presentation and fixture limits; verify examples match the row tests and line heights remain explicit px strings.

## 2. Completion-driven checks freshness and documented latency

- [x] 2.1 Add completion, partial failure/success and rerun regression sequences through real ordinary and aggregate webhook paths, including an event during an older in-flight read; verify the full latest count reaches pinned, unpinned, older linked and coordinator rows with a coalesced follow-up.
- [x] 2.2 Repair any stale-count invalidation/aggregation defect demonstrated by those sequences and add the approved 45-second pending/unknown-only repository fallback with exponential/rate-limit backoff while retaining enrolled-event-only, hide/disable/offline and stale-context boundaries; verify fake-clock settlement/stop, failure retention/backoff and queue coalescing plus focused pagination/fleet/webhook tests.
- [x] 2.3 Document event dispatch, single-flight/page queue and GitHub read timing plus unenrolled/offline/missed-event/failed-read/stale-coordinator conditions in the applicable Git docs; verify each source-derived timing statement against code and distinguish it from any measured live evidence, without changing enrollment or PRs #40/#41.
- [x] 2.4 When no other suite is running, execute CI=true npm run test:ci once with a long timeout and retain its actual output/exit status; record concrete failures and their focused repairs without weakening checks.

## Workflow follow-up

- Plan approved by the coordinator, including the bounded fallback addition; implement in the same PR.
- Do not modify, label, close, refresh-branch or otherwise mutate PRs #40 and #41.
- Wait for required checks on the final head and report success, pending, skipped or failure honestly; never mark ready or merge.
- Write the task report to the requested Crew report path and run crew done git-row-counts at handoff.
