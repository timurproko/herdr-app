# Tasks

All tasks remain unstarted until plan approval. Groups match the four PR Implementation outcomes in order; each outcome lands its own tests and documentation before its checkbox is ticked.

## 1. Allowed-board card reads expose bounded attachment metadata, counts and IDs

- [x] 1.1 Add exact attachment-list arguments, fixed GET routes and parent-scoped metadata normalization; verify disallowed boards and forged parents refuse before unrelated attachment IO using fake transport tests.
- [x] 1.2 Include attachment IDs, metadata and explicit count/completeness in card detail; verify empty, uploaded/link, malformed, singleton-array and 100-plus-entry cases without invented totals/cursors.
- [x] 1.3 Add the loopback fake Trello server fixture with injected production-URL mapping and no live-fetch fallback; verify fake-only header/query capture, server teardown and preserved 2 MiB/request/deadline/cooldown bounds.
- [x] 1.4 Document metadata commands, optional fields and provider schema discrepancies in Trello guidance/help; verify command catalog and offline help contracts against the new read routes.

## 2. Read-only attachment downloads enforce private output, size/type limits and Trello-only header authentication with installed screenshot guidance

- [ ] 2.1 Add exact download flags and the narrow binary transport sharing authority, cooldown and command budgets; verify fake-server originals/previews succeed read-only and unknown flags, unsafe origins/paths and every redirect refuse.
- [ ] 2.2 Enforce OAuth-header-only binary auth, no link fetching and no secret-bearing output; verify fake external/link/redirect destinations receive zero requests/credentials and hostile diagnostics reveal no sentinels.
- [ ] 2.3 Enforce the 20 MiB selected-binary limit, PNG/JPEG/GIF/WebP MIME/signature defaults, explicit other-type opt-in and deterministic scaled-preview width selection; verify declared/chunked oversize, mismatches, absent previews and preview-of-large-original cases.
- [ ] 2.4 Add owner-only unique output directories, exclusive sanitized files and partial cleanup with final authority checks; verify POSIX modes/Windows ACLs, linked/reparse/checkout paths, traversal/device/ADS names, collisions, cancellation and revocation without overwrites or leaked partial files.
- [ ] 2.5 Package the helper and update installed help/offline docs with the card-to-list-to-download-to-local-image workflow; verify source-independent installed CLI fixtures, no attachment uploads/deletes and unchanged write gates.

## 3. Trello Settings uses clear save labels, one ready account row, lightweight board tabs and empty-list separators

- [ ] 3.1 Add generic optional form busyLabel support and declare Trello Add, Save and Saving plus the friendly description/link; verify all requested text and non-Trello Working defaults using real renderer and synthetic-plugin tests.
- [ ] 3.2 Separate account readiness from board count/names and add opt-in saved-row replacement with resting Ready/hover Remove; verify a single account name, zero-board All ready with CLI denial, missing account-name Check, explicit verification and captured removal/undo retirement.
- [ ] 3.3 Add generic picker-tab presentation based on the existing lightweight tab treatment and conditional scope separators; verify Active/Inactive/search/selection/Cancel semantics, empty versus populated Boards and unchanged unrelated choice settings.
- [ ] 3.4 Update plugin UI and Trello docs for the new declaration options and copy; verify contract tests keep renderer/kit free of plugin-specific switches and preserve shared status/action geometry.
- [ ] 3.5 Capture and inspect matched before/after disposable native card/picker states with fake setup, including saving and hover removal, under the crew task directory; verify native error logs and stop all fixture-owned app/Core/worker/server processes.

## 4. Unsupported Trello setup connections show one actionable explanation without duplicate failures or misleading fix counts

- [ ] 4.1 Preserve refusal codes and add generic unavailable/applicability presentation for dependent setup rows; verify injected elevated/unsupported identities produce one explanation and no numeric fix count, All ready claim or unusable controls.
- [ ] 4.2 Explain administrator SSH versus the regular Core user and offer non-elevated/local setup guidance without credential import or privilege changes; verify safe direct-SSH install/save/board actions and pre-READY credential guards remain intact in remote fixtures.
- [ ] 4.3 Cover independent Requirements/Boards completion, machine switch/disable stale replies, transient SSH failures, permission errors and unknown outcomes; verify no duplicate/old-machine guidance or false unsupported/ready projection.
- [ ] 4.4 Update remote security/help guidance and capture the injected unsupported-machine before/after state in the disposable native fixture; verify one actionable message, no credential transfer, and all started processes/servers stopped before the report.
- [ ] 4.5 Recheck current base/collisions, run focused cross-feature and installed-help checks, and record actual results plus remaining gaps with the private screenshot paths; verify no edits in the protected Git/update/deploy-all paths and no real Trello account/board in tests.

## Workflow follow-up

- This is one cumulative draft PR, not separate A/B PRs; approval is required before implementation.
- Never mark ready or merge. Preserve the brief's report format and crew completion handoff.
