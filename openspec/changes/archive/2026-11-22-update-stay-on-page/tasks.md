# Tasks

## 1. Updates resumes only for its initiating opening during the update or for two minutes afterward

- [x] 1.1 Add a fresh per-opening identity in Custom's shared Settings opener and update-only resume state in the existing controller; exercise real initialization and matching-opening replacement with original props in the VM fixture.
- [x] 1.2 Separate explicit dismissal from lifecycle teardown so replacement preserves the record without closing/reopening the overlay; cover dismissal, deliberate navigation, new-dialog destinations, invalid records and lifecycle replacement in the VM fixture.
- [x] 1.3 Keep opening identity/resume hints outside portable preferences and document update-only restoration in README.md and docs/TESTING.md; assert preference exclusion and run the focused controller fixture.
- [x] 1.4 Reproduce native/backdrop dismissal and Desktop restart with a retained shared store and reused o1, assert default and explicit destinations for active/recent jobs and missing identities, and cover two-minute expiry and helper dependency closure in targeted VM/package fixtures.

## 2. The update row stays truthful from replacement through the runner's final result

- [x] 2.1 Preserve bounded pending-launch feedback in the existing shared controller state before awaiting transport and reconcile authoritative status after remount; extend the row VM fixture to replace the owner before launch acknowledgement and assert disabled Updating feedback with no duplicate launch.
- [x] 2.2 Exercise replacement while running and just finished, post-success revision/main reconciliation, failure/partial/unknown results, superseded replies and existing visible-page polling guards in row/controller VM fixtures; run both targeted suites with Node's experimental VM modules flag and document fixture-only limits.
