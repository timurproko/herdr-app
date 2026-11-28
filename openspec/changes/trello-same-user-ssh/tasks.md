# Tasks

The three groups below map one-to-one, in order, to the draft PR's Implementation outcomes. All remain pending until the plan is approved. Run targeted tests only, with fake credentials/provider/SSH and disposable output in the crew task folder.

## 1. Same-user SSH proof preserves the private boundary

- [x] 1.1 Replace blanket Windows SSH-elevation refusal with verified SSH SID/session-metadata ownership plus same normal-Core SID/profile/resolved-home proof; add bootstrap cases for elevated same-user success, ordinary-user compatibility, different SID, elevated Core, unavailable/unverifiable Core, mismatched home and Unix root.
- [x] 1.2 Bind public proof to the configured Core ID and named session, refuse metadata reparse/unsafe paths and avoid implicit Core startup; cover changed Core/session/user/home before READY, before action handling and at commit guards in targeted bootstrap/remote tests.
- [x] 1.3 Preserve strict direct-SSH routing, deterministic command-size limits, READY-before-secret stdin, secret-free arguments/environment/output and stale/cancel/unknown-result behavior; exercise `tests/trello-remote.test.mjs` and `tests/trello-ssh-shell.test.mjs` with injected identity/SSH only.
- [x] 1.4 Update the transport/security guidance in `docs/PLUGIN-UI.md` and applicable architecture text to describe same-user direct SSH, public-only Core inspection and no Core startup/permission changes; check it against the new proof tests and spec delta.

## 2. Elevated output remains private and usable by the normal user

- [ ] 2.1 Reuse canonical Windows ACL creation/verification for verified user-SID ownership, protected inheritance and restricted grants before content writes and after atomic publication; cover private directories, credentials/policy/display/control/cooldown, locks and replacement files with real disposable ACL checks and existing credentials regressions.
- [ ] 2.2 Apply the same user ownership/protected access to newly created or replaced Trello runtime/help/launchers, owned metadata/journals/locks and created directories without changing unrelated shared ancestors; extend targeted installer/launcher regressions for install/update/conflict/rollback and verify private state remains unchanged by installation.
- [ ] 2.3 Add a focused real-Windows-storage fixture using actual elevated and non-elevated same-SID contexts, no security stubs, fake credentials and injected provider data; assert writer/reader token facts, owner SID not Administrators, inheritance disabled and allowed ACEs, then exercise installed normal-user CLI/owner status, boards/access and account removal after elevated install/update/save.
- [ ] 2.4 Cover wrong-owner, overbroad ACL, unsafe/reparse/hard-linked private paths and failed permission tooling without automatic repair; run relevant credentials and installed-setup tests, preserving PS7 environment isolation and no secret output.
- [ ] 2.5 Document ownership guarantees and administrator/same-user limits in `docs/TRELLO.md`; retain real-storage/token receipts outside the checkout and report unavailable elevated/filtered test contexts as a proof blocker, never as a passing skipped test or an excuse to auto-elevate/reconfigure Core.

## 3. Existing Requirements supports the complete lifecycle with accurate refusals

- [ ] 3.1 Replace misleading administrator-login/Trello-refusal copy with one actual cause and matching next action for unsafe user/Core/session/path/ACL states; extend `tests/trello-unavailable.test.mjs` for hidden dependent controls, no false readiness/fix count and stale/disabled guards without new buttons, options, messages or elevation confirmation.
- [ ] 3.2 Extend `tests/trello-remote-settings.test.mjs` and focused remote lifecycle tests for same-user elevated runtime Install/Update, save/status/explicit verify/remove, named board discovery/add/remove and account reset; assert selected-machine-only storage, masked transient inputs and secret-free shared state/output.
- [ ] 3.3 Extend `tests/trello-global-access.test.mjs` for same-user elevated host activation/access application, normal-user enforcement and offline/changed-host Pending/Retry with explicit acknowledgement and no write-grant replay; retain empty-board/read-only defaults and no authority from import/install/check.
- [ ] 3.4 Update README, `docs/TRELLO.md` setup/troubleshooting and applicable contract assertions to match the same-user exception and unchanged minimal UI; run only these focused Settings/access/contract tests and strict OpenSpec validation, recording remaining gaps without waiting for hosted CI.
