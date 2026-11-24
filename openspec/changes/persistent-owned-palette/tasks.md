# Tasks

The four groups match this draft PR's Implementation outcomes in order. Stage 1 is separately scoped in `stopgap.md`; its own implementation checklist belongs to that separate approved PR, not this replacement's completion ticks. All tasks below are unimplemented and await approval.

## 1. Owned command catalog and safe routing

- [ ] 1.1 Add the palette model and narrow installed manifest reader under owned feature/service sources, packaging every import/worker in `customization.json`; check build dependency closure and bounded metadata-only worker fixtures, including an app home outside login home.
- [ ] 1.2 Preserve host commands/layouts/themes, native manifest validation/canonical IDs/deduplication, object/shorthand shortcut matching and explicit clone args; compare catalog and dispatch against pinned real 0.1.18 stock and retained 0.1.17 originals in focused fixtures, recording source SHA/length/provenance without manufacturing native permission.
- [ ] 1.3 Reuse activation-only Custom Settings/picker/rename/close routing, explicit-target preservation and enabled-Usage policy; cover each route and plugin disablement in model/dispatch regressions and document the native command interception boundary.
- [ ] 1.4 Give owned history a stable runtime key and narrowly migrate recognized legacy recent IDs during normal installation; fixture restart/overlay-ID changes, malformed old stores and unrelated-state preservation, and document local-only history ownership.

## 2. Focused Custom palette overlay

- [ ] 2.1 Package `custom-palette` with `place:none` and host-supported popup metadata; reuse shared search/dialog/list/empty-state/fade primitives rather than copying visual helpers, and check manifest metadata/source contract plus focused overlay mounting fixtures on both host profiles.
- [ ] 2.2 Retain live theme/selection tint, fixed 408px skin/search header, pinned group/result count, virtual-list/scrollbar ordering and search/clear resets; port native-list regressions for empty/long results, wheel/drag and 100%/130% geometry, documenting fixture versus native-pixel limits.
- [ ] 2.3 Preserve Enter, Escape/backdrop, repeat-shortcut toggle, bounded arrows/pages, click invocation, close-before-dispatch and focus return; exercise key/mod.open dispatch in a disposable host-shaped harness and mark unavailable real-native interaction coverage explicitly rather than claiming it passed.
- [ ] 2.4 Route the Custom status-bar command opener and displayed shortcut to the owned overlay; update its regression expectation from app.palette and cover unchanged native behavior outside Custom.

## 3. Persistent capability-based binding and visible diagnostics

- [ ] 3.1 Extend consumed host facade/feature capability checks for required APIs, commands, input/list/focus and overlay metadata without adding exact-version permission; cover 0.1.17/0.1.18, capable future host, renamed/missing capability and direct-import boundary in targeted fixtures.
- [ ] 3.2 Add versioned host-local palette binding intent and field-aware install/remove/rollback with existing locking/recovery and compare-before-write safeguards; disposable homes cover first install, repeated normal update, missing/stock reset, unrelated keys, personal mapping conflicts and later-edit refusal, and docs identify the exact user key scope.
- [ ] 3.3 Add yielded, coalesced mounted-Custom startup/hot-reload/resume/lifecycle self-check and bounded CAS repair via the facade, suppressing checking/closed/stale generations and install races; fixtures simulate restart, in-place native defaults reset/re-registration, duplicate windows, Core update and customization replacement without user re-enabling.
- [ ] 3.4 Reconcile keys() file readback with bounded host reload diagnostics without claiming an absent installed-key-table API; cover malformed JSON, keys.error, permission denial, CAS contention and higher-priority terminal/mod conflicts, including next-shortcut owned dispatch in the supported simulated reset path.
- [ ] 3.5 Add persistent actionable Custom status-bar warning, one deduplicated notification and bounded sanitized local repair log; fixture success/failure/retry states and log limits, documenting no silent vanilla fallback and no guarantee when public capabilities or Custom itself are absent.
- [ ] 3.6 Cover independent local and pc2 Desktop homes plus a Core-only peer using disposable deployment/machine fixtures; retain the existing full-local versus remote-shell-only policy and document that each Desktop's ordinary full Update installs its palette, with no live SSH/deployment.

## 4. Safe native palette retirement and normal update integration

- [ ] 4.1 Stage and check owned payload/binding before disabling native palette refresh in installer/startup paths; fixtures cover fresh install and upgrade from both legacy and 0.1.18 stop-gap while retaining feedback refresh and all public host gates.
- [ ] 4.2 Retire only recognized owned palette entrypoint/helpers/opt-in with current-native provenance and retained recovery records; fixture masked 0.1.17-to-0.1.18 upgrade, stock reset, future unknown stock, corrupt records and personal helper edits without downgrade or broad cleanup.
- [ ] 4.3 Integrate owned palette assets, policy/history/log exclusion and removal/rollback into normal customization update packaging; fixture checkout-independent installed execution, ordinary updater replacement and later-edit-safe rollback, and update README/architecture/commands/testing guidance with final ownership and limits.
- [ ] 4.4 Execute quick targeted palette, key persistence, packaging and retirement fixtures plus plan/spec validation; report exact results and any unavailable native interaction/pixel checks, with no installed app changes, restart or live session testing.

## Workflow follow-up

- Await maintainer plan approval before implementing either stage. The replacement stays in this task's existing PR/branch; approved stop-gap gets a distinct task/PR as described in `stopgap.md`.
- Upstream-sync activation requires separate explicit authorization for timurproko/herdr-app and the successful hosted probe/variables in `design.md`; no workflow or variable change belongs to this plan-only task.
- No agent readiness promotion or merge is authorized. Installation occurs through the person's normal update after maintainer merge, not from this worktree.
