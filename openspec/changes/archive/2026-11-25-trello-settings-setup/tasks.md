# Tasks

Task groups map one-to-one, in order, to the draft PR Implementation outcomes. No implementation is authorized until the plan is approved.

## 1. Declarative transient actions and private stdin handoff

- [x] 1.1 Add generic declared transient text/secret action forms to the shared Settings renderer/kit and action context; cover masking, explicit submission, no blur/Enter save, duplicate presses, clearing and generation guards in renderer fixtures and the plugin UI contract suite.
- [x] 1.2 Package a pinned reviewed WebSocket server dependency and implement the loopback-only, single-session, 60-second handoff to an allowlisted worker's stdin; fake-worker tests must cover wrong/replayed sessions, browser origins, oversize input, timeout, cancellation, output sanitization and process cleanup.
- [x] 1.3 Extend machine/current-view context without persisting transient data and document the declaration and stdin transport in docs/PLUGIN-UI.md; fake-secret probes must find no values in shared writes, preferences, argv, environment, logs or files outside the designated fake credential store.
- [x] 1.4 Exercise the installed handoff without source-checkout imports; update build mappings and any affected export fixture dependency copy lists, with targeted installed-export and preferences-home fixtures passing before this outcome is complete.

## 2. Verified Trello owner worker and protected local policy

- [x] 2.1 Add the owner-only setup worker with bounded stdin input and explicit verify/save/verify-saved operations; injected-transport tests must cover valid identity, invalid/revoked credentials, provider errors, redirects, cooldown and secret-free JSON output without live-fetch fallback.
- [x] 2.2 Add explicit replace/remove with protected-path/ACL checks, captured credential comparison and fail-closed policy reset; cover invalid-existing stores, widened permissions, links, concurrent changes, failed verification and interrupted transitions using disposable fake stores.
- [x] 2.3 Add bounded owner-visible board discovery and explicit allow/remove/write policy actions; tests must cover canonical IDs, 100-board policy limits, incomplete inventory, unseen grants, stale credential identity and empty deny-all scope.
- [x] 2.4 Keep agent routes and CLI dispatch separate from owner enumeration and preserve headless setup/rotate/policy semantics; run the existing Trello CLI/read/write suites plus tests proving agent boards list still queries only allowed boards and preference import cannot grant private authority.
- [x] 2.5 Document the worker/private-store and headless compatibility boundaries in docs/TRELLO.md alongside these changes, checking examples and sanitization assertions with the Trello contract fixture.

## 3. Complete local Trello Settings card

- [x] 3.1 Declare key/token entry, Save and verify, Verify saved, confirmed Replace/Remove, Saved/account feedback and official token help through the generic capability; fake UI/action fixtures must prove saved values never repopulate the controls.
- [x] 3.2 Compose named board checkbox selection and committed policy updates with the existing generic list kit; cover load/error/empty/incomplete states, removal of saved entries and selection refusal after credentials or view identity change.
- [x] 3.3 Wire Read-only / Read-write to private allowWrites plus public Access only on explicit acknowledgement; test imported read-write with local writes off, explicit enable/disable, partial failures and both agent write gates.
- [x] 3.4 Bind the captured Settings machine and explicitly refuse every remote Trello check/setup/discovery/policy path before local IO; fixture spies must show zero local worker/store calls and reject held replies after switching machines.
- [x] 3.5 Make readiness require saved credentials plus one allowed board and update the card description, README and docs/TRELLO.md for all-local-card onboarding and remote headless alternatives; cover missing/ready states and retain declaration-only renderer contract checks.

## 4. Self-contained installed setup and documented isolated acceptance

- [x] 4.1 Exercise the full packaged card-to-worker flow with fake credentials/transport in disposable homes and verify private files, preference export/import exclusion, launcher/headless compatibility and runtime closure; include installed-export.test.mjs and preferences-home.test.mjs explicitly.
- [x] 4.2 Add an opt-in disposable-native card fixture following docs/TESTING.md, with injected Trello responses and outside-checkout scratch/proof output; capture missing, saved/account, board-selection, local-access and remote-refusal states, and assert cleanup of every started app/Core/bridge.
- [x] 4.3 Record screenshot paths, fixture-only limitations and stopped-instance evidence in testing guidance/acceptance notes, and ensure no real credentials, account access, production deployment or agent input was used.
- [x] 4.4 Complete acceptance and obtain successful hosted Windows and Ubuntu results on the final implementation head before reporting implementation; retain any failure as a blocker and do not mark the PR ready or merge it manually.
