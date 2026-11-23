# Tasks

Implementation approved for recorded links only. These five groups match the PR's Implementation outcomes, in order. The separate Crew repository remains read-only; there is no external prerequisite and no deployment.

## 1. Spaces exposes a portable default-off fleet attachment setting

- [ ] 1.1 Add the optional `connectFleetToCoordinator` boolean with false as its absent/default value to the shared Spaces preference model and setters; extend preference fixtures to cover old snapshots, true/false round trips, invalid types and unchanged unrelated fields.
- [ ] 1.2 Render **Connect fleet space to coordinator** under Settings → Spaces with its accessible switch label and a concise explanation of sidebar attachment and coordinator Git scope; cover clicks, mounted updates and the default-off state in the Settings harness.
- [ ] 1.3 Update README's Spaces documentation with on/off behavior and runtime-data exclusions; verify the documented default and preference key against the new fixture expectations.

## 2. Crew contributes verified same-machine coordinator and fleet context

- [ ] 2.1 Add a Crew-owned read-only status transport/parser and binding resolver using the installed tool and exact machine-qualified owner/task terminals; cover default home, remote qualification, repeated local IDs, absent owner, conflicting labels, ambiguous fleets, stale replies and workers manually moved elsewhere with fake hc/status fixtures.
- [ ] 2.2 Add generic registry workspace-link/context contributions and only the required plugin API support, without direct feature-to-Crew imports; cover disabled/throwing providers and packaging/import boundaries with registry and architecture fixtures.
- [ ] 2.3 Publish expiring sanitized runtime context through coalesced lifecycle reads with generation and membership guards; cover one in-flight read per machine/home, timeout, replacement, reconnect, off/no-reads and exclusion of runtime identity from preference exports.
- [ ] 2.4 Document the observed role-marker versus home-tag distinction, exact ownership join and unsupported custom-home fallback in architecture guidance; compare docs with parser fixtures and run the focused plugin/packaging checks.

## 3. Linked spaces display an attachment and drag together as one block

- [ ] 3.1 Project coordinator/fleet display blocks without modifying native order on toggle; render a link glyph and child inset, suppress only the pair's Crew tags, and preserve independent selection and original native numbering; cover expanded/compact render trees, off parity, rename, colors and unrelated worktree order.
- [ ] 3.2 Adapt shared reorder source/preview support for a captured two-row block while retaining ordinary click identity and shared cancellation policy; cover dragging each member both directions, pair-edge markers, two linked blocks, cancellation and unaffected Tabs/footer consumers in deterministic fixtures.
- [ ] 3.3 Commit fresh same-machine block permutations through acknowledgement-bound public space moves, not Core-document writes; cover delayed/missing acknowledgements, concurrent native changes, disappearing members, disabled-during-drag, partial results, no replay and unchanged selection with an in-memory queued host.
- [ ] 3.4 Update the reorder component documentation and README with attached-row behavior, compact rail limits and non-atomic native ordering; run focused Spaces/reorder fixtures and confirm build mappings include the shared glyph/helper.

## 4. The coordinator Git panel groups task PRs across repositories

- [ ] 4.1 Add a generic aggregate context route keyed by selected coordinator space and owner generation, bypassing coordinator-cwd Git resolution; cover non-repository/Start coordinator tabs, fleet selection, unrelated spaces, off parity and immediate context invalidation in Git location fixtures.
- [ ] 4.2 Consume only recorded task PRs behind a source adapter and label lists as possibly incomplete for unreported tasks; fixture-test working/reported live tasks, plans, stopped/closed/failed exclusions, null links and a newly recorded PR arriving on local-context refresh. Do not call future discovery or depend on a Crew change.
- [ ] 4.3 Fetch exact linked PRs with repository-qualified identity and bounded concurrency; group/deduplicate rows, count linked Open/Closed PRs, omit the aggregate active pin and repository-wide inventory; cover same-number cross-repository PRs, shared PRs, zero links and partial repository failure with fake gh responses.
- [ ] 4.4 Reuse row/menu/check presentation and exact bound worker navigation without aggregate pin animation; cover stale menu/robot actions, removed/replaced workers, multiple related tasks and correct browser URLs without real terminal input.
- [ ] 4.5 Document aggregate task inclusion, counts, ordinary-mode restoration and recorded-link completeness limits; run the focused aggregate and existing Git pin/pagination/context-menu regression fixtures.

## 5. Coordinator Git keeps repository-scoped live updates and safe lifecycle behavior

- [ ] 5.1 Route the existing authenticated webhook subscription to the aggregate's repository index with coalesced per-repository invalidation and reconnect catch-up; cover repository collisions, irrelevant events, new/removed links and no periodic known-PR/CI refetch using fake sockets and deterministic timers.
- [ ] 5.2 Preserve scoped last-good rows/errors and render captured per-repository setup links without changing enrollment or automation authority; cover inaccessible repos, unconfigured setup, transient failure, disabled plugins, hidden panel, switched owner and obsolete completions.
- [ ] 5.3 Extend architecture/README/testing guidance for aggregate lifecycle and explicit Crew missing-link discovery limits; run the focused webhook/lifecycle, ordinary Git, preference and architecture fixture checks plus a customization-only build, recording the intentionally limited recorded-link source.

## Workflow follow-up

- Future pre-report discovery can replace the source adapter in a separately approved change; this implementation uses recorded links only and has no Crew release dependency.
- Planning validation and future fixture tests do not demonstrate native pixels, actual drag motion, remote latency or live session preservation. Separately authorize native inspection/deployment if wanted; do not start real terminals, restart agents or deploy as part of planning.
