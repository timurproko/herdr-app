# Tasks

## 1. The open Settings dialog retains its selected section across mod replacement

- [x] 1.1 Add bounded overlay-qualified runtime section storage, validation and restoration in Settings; exercise real initialization and Updates navigation in the controller VM fixture with fresh mod contexts and unchanged original props.
- [x] 1.2 Separate explicit dismissal from lifecycle teardown so replacement preserves the record without closing/reopening the overlay; cover dismissal, deliberate navigation, new-dialog destinations, invalid records and lifecycle replacement in the VM fixture.
- [x] 1.3 Keep navigation outside portable preferences and document the reload behavior briefly in README.md and docs/TESTING.md; assert preference exclusion and run the focused controller fixture.

## 2. The update row stays truthful from replacement through the runner's final result

- [ ] 2.1 Preserve bounded pending-launch feedback in the existing shared controller state before awaiting transport and reconcile authoritative status after remount; extend the row VM fixture to replace the owner before launch acknowledgement and assert disabled Updating feedback with no duplicate launch.
- [ ] 2.2 Exercise replacement while running and just finished, post-success revision/main reconciliation, failure/partial/unknown results, superseded replies and existing visible-page polling guards in row/controller VM fixtures; run both targeted suites with Node's experimental VM modules flag and document fixture-only limits.
