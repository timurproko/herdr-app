# Tasks

These six groups match the draft PR's Implementation outcomes in the same order. All are unimplemented. Plan approval must explicitly accept the offline-access and legacy-name limits in `proposal.md`; no production deployment or real-account/SSH testing is authorized.

## 1. Protected Windows storage and actionable diagnostics

- [ ] 1.1 Sanitize only the ACL child's case-insensitive PSModulePath keys and select absolute system Windows PowerShell; injected executor tests assert child options and unchanged parent environment.
- [ ] 1.2 Distinguish failed ACL tooling from wrong owner/overbroad permissions using fixed safe results; retain real fake-file ACL/link tests and add capability-gated PS7 CLI/owner reads plus unsafe-ACL refusal.
- [ ] 1.3 Implement typed safe storage/public-state/internal codes through credentials, setup, owner, policy and CLI catches; fake fixtures cover each category, hostile secret sentinels and unchanged write-outcome semantics.
- [ ] 1.4 Preserve configured compatibility with an explicit safe blocked/missing status, keep storage errors in board checks and suppress unusable Save state; targeted Settings tests distinguish absent setup from failed checks.
- [ ] 1.5 Update the Trello error/recovery guide and contract fixtures; verify every documented code has a constant safe message and no raw path/provider/SSH diagnostic can escape.

## 2. Durable account and board names without background requests

- [ ] 2.1 Add bounded versioned protected display metadata bound to credentials and allowed boards; owner tests cover schema, Unicode, secret echoes, stale revisions and malformed hints without inherited grants.
- [ ] 2.2 Persist account hints on verified save/check and board hints on explicit discovery/add; owner tests cover remove/rotate invalidation, incomplete inventory retention and interrupted CAS transitions.
- [ ] 2.3 Return validated persisted names in status and consume them in fresh Settings views; reopen/machine-switch tests require account/board names with zero injected provider calls.
- [ ] 2.4 Implement explicit missing-name hydration without implicit initial requests; owner/Settings fixtures cover legacy setup and headless rotation, and the Trello guide documents the one-time explicit Check limit.

## 3. Self-sufficient installed CLI help

- [ ] 3.1 Expand CLI help and offline setup/commands/errors/security/docs topics with bounded examples, access gates, exits, revocation and uncertain-write guidance; CLI contract tests assert each topic and no source-relative link.
- [ ] 3.2 Package docs/TRELLO.md as owned installed lib/trello/TRELLO.txt with useful embedded fallback; installed fixtures check full build, source-unavailable lookup and missing-doc fallback without network access.
- [ ] 3.3 Exercise installed Bash/CMD/PowerShell help in disposable bins/homes, retaining conflict/rollback/private-store protections; update installation/help guidance and confirm no hook or agent-discovery surface is added.

## 4. Identity-bound SSH owner setup and explicit runtime installation

- [ ] 4.1 Add fixed versioned public destination/probe/READY/result contracts and safe SSH/runtime codes; injected transport tests reject temporary/custom-via/replaced/untrusted/unsupported-shell and ambiguous user/home identities before payload dispatch.
- [ ] 4.2 Extend only the allowlisted local private-action bridge/API with captured-machine routing and strict SSH/stdin dispatch; fake secret sentinel spies assert no argv/env/log/file/shared-state leakage, no remote listener and no local fallback.
- [ ] 4.3 Route status/save/verify/remove/discover/add/remove-board through the selected execution-host worker; distinct fake local/remote homes verify every operation, CAS, incomplete discovery and no accidental local changes.
- [ ] 4.4 Enforce end-to-end lifetime, bounded frames, current view/identity and commit deadlines with owned-child cleanup; injected held/cancel/timeout/response-loss tests require explicit unknown-configuration reconciliation and no replay.
- [ ] 4.5 Build a deterministic Trello-only runtime/help/launcher payload and explicit installer reusing ownership locks/hash/conflict/home/rollback checks; disposable install tests prove no credentials, activation, grants, PATH edits or full-app writes.
- [ ] 4.6 Add Requirements runtime status and Install/Update fix declarations using existing patterns; Settings fixtures cover missing Node, missing/outdated runtime, off-PATH bin, unavailable target and successful fake-host installation without dangling Save.
- [ ] 4.7 Update Trello/plugin API and remote installation guidance; installed/deployment fixtures verify a Core-only fake host and an existing full home, with deploy:shell still limited to its four files.

## 5. One global Access setting enforced on execution hosts

- [ ] 5.1 Add protected explicit-consent/controller and versioned host-control records with captured identity and revision; policy tests cover invalid/missing managed records, controller conflicts and fail-closed mode selection.
- [ ] 5.2 Enforce applied control plus host-local board/write gates in CLI preflight/follow-ups; two-host fake CLI tests cover read/write, local disable precedence, headless writes-off and unchanged stale/unknown-write semantics.
- [ ] 5.3 Apply one explicit global Access operation to configured account hosts, retaining per-host acknowledgements and short pending/error facts; injected tests cover both hosts, unknown offline membership and partial application without false global success.
- [ ] 5.4 Keep import/install/check/discovery outside the grant/migration path and preserve legacy authority until explicit adoption; actual preference-export/import and owner tests prove no new board/write scope, including a newly saved host while global Read-write is selected.
- [ ] 5.5 Add conservative transition cleanup and explicit same-value retry using generic existing action controls; tests cover stale consent, failed public/controller publication, unknown cleanup outcome and no reconnect replay of Read-write grants.
- [ ] 5.6 Document global intent versus applied host rights and the last-acknowledged offline limit; two-host Settings tests show the same global value across header selection and truthful unapplied host feedback.

## 6. Crew-pattern account and Boards card

- [ ] 6.1 Extend generic declarations for requirement removable rows, captured-header machine scope, description links, explicit check reason and picker tabs; synthetic-plugin and UI contract tests require existing kit geometry with no Trello-specific renderer branches.
- [ ] 6.2 Declare the short description/admin link and exactly one account: empty masked form with Save & verify or saved name with Crew hover Remove and captured-machine confirmation; renderer tests cover save/remove and absence of Replace/Verify saved/help buttons.
- [ ] 6.3 Wire only explicit Requirements Check to verification/hint hydration, and show saved-account/no-board readiness distinctly; injected Settings tests prove opening/rechecks perform no silent Trello requests and blocked storage/runtime checks do not look absent.
- [ ] 6.4 Declare Boards with N added, selected-machine scope and named hover-removable rows; production-card tests compare Crew row/badge/scope components and preserve diagnostics with no hard-coded remote-local wording.
- [ ] 6.5 Add Active/Inactive picker tabs with Active default and tab-local search, preserving selected IDs across tabs until explicit Add; tests cover no Closed board warning, Cancel, empty/partial results and stale account/machine bindings.
- [ ] 6.6 Hide all unavailable or input-less form actions and retain transient input/undo retirement, duplicate guards and busy presentation; shared-form/production-card tests cover disable, close, machine away-and-back and late responses.
- [ ] 6.7 Update README, Trello guide, plugin declaration guidance and testing instructions to match the card and supported remote limits; targeted contract tests assert the new public wording and omitted out-of-scope features.
- [ ] 6.8 Extend and run the opt-in disposable native card fixture with fake provider/injected SSH for empty/masked/saved-hover/zero-board/Boards/both-picker-tabs/global-Access/runtime-fix/error states; retain outside-checkout screenshots and a zero-owned-process cleanup receipt before handoff.
- [ ] 6.9 Compose installed Settings/CLI/remote/global-access paths with fake homes and transports; dispatch the existing hosted CI workflow on the final reported branch head and identify successful Windows and Ubuntu matrix jobs without marking the PR ready or merging.

## Workflow follow-up

- Keep this change and PR as a plan until explicit approval; do not implement merely because all planning artifacts exist.
- After approval, land each outcome's code, focused tests and docs before ticking its corresponding tasks/PR outcome.
- Hosted checks and native proof must be complete before reporting implementation; no live Trello, credentials or remote-machine acceptance is implied by fake fixtures.
- Never mark ready or merge manually. Preserve the single PR and stop every disposable process before writing the task report and running crew done.
