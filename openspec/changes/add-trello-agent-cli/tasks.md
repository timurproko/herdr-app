# Tasks

## 1. Private local setup and fail-closed authority

- [x] 1.1 Add Trello home resolution, credential/policy schemas and protected store IO under `src/plugins/trello`; verify fake-store tests for default/explicit homes, checkout refusal, links, permissions/ACLs, malformed stores and atomic guarded rotation.
- [x] 1.2 Add explicit local setup/rotation and board allowlist/write-cap management without secret argv; verify injected IO tests keep fake secrets out of output, shared state and unrelated files and reject wildcard scope.
- [x] 1.3 Add narrowly read-only persisted plugin-state/access checks intersected with local policy before every request; verify disabled, missing-state, read-only, imported-preference and mid-operation policy-change denials with zero unauthorized requests.
- [x] 1.4 Start `docs/TRELLO.md` with explicit protected-input setup, key/user-token terminology, private paths, empty default scope and separate local write opt-in; verify examples contain placeholders only and no secret-bearing arguments.

## 2. Scoped reads and bounded JSON transport

- [x] 2.1 Implement fixed-origin key/token query transport with redirect refusal, deadlines, response/input/request bounds and sanitized errors; verify fake transport for exact auth placement, malicious errors, 401/403/404/429, Retry-After, cross-invocation cooldown and blocked routing/auth overrides.
- [x] 2.2 Implement allowed-board, list/card and board/card label reads using the official route contract in design.md; verify exact method/path/field fixtures and no account-wide inventory or lookup of forged out-of-scope IDs.
- [x] 2.3 Implement verified card detail with comments/checklists/items and supported explicit pagination/incompleteness; verify bounded multi-component results, oversized/malformed replies, parent-ID mismatches and interrupted/superseded reads without claiming complete history.
- [x] 2.4 Add versioned JSON read/status command parsing, stable exit codes and input validation; verify CLI fixtures reject unknown fields/commands and treat hostile card/comment strings as inert data.
- [x] 2.5 Extend `docs/TRELLO.md` with board-ID provisioning, read commands, untrusted-data wording and pagination limits; verify documented shapes and examples match the CLI fixtures.

## 3. Narrow writes without automatic replay

- [x] 3.1 Add card create/update/move/archive with explicit board/list context and source/destination preflight; verify exact official-route fixtures, both-board allowlisting, read-only/disabled refusal, policy changes before dispatch and a single mutation per command.
- [x] 3.2 Add comment creation and existing-label assignment/removal; verify card/label board identity, required inputs, no board-label administration and redacted unknown outcomes after lost responses.
- [x] 3.3 Add checklist creation/name/position edits and check-item creation/name/position/state edits; verify card/checklist/item ownership, complete/incomplete mappings and absence of checklist/item deletion or source-copy escape hatches.
- [x] 3.4 Enforce no automatic mutation retries for timeout, disconnect, malformed success or oversized response; verify exactly one dispatched write and truthful local-refusal/HTTP-rejection/unknown-outcome errors with safe reconciliation guidance.
- [x] 3.5 Extend `docs/TRELLO.md` with JSON write examples, all excluded operations, concurrent-move limits and read-before-explicit-retry guidance; verify examples against fake operation fixtures.

## 4. Declarative plugin and owned installed shell command

- [ ] 4.1 Add off-by-default Trello plugin declaration, read-only public access default and sanitized local prerequisites/actions through the plugin API; verify packaged plugin harness tests and declaration/UI architecture checks without network or secret fields.
- [ ] 4.2 Register self-contained CLI/runtime dependencies in `customization.json` and build output; verify disposable packaging/import-closure tests and help/status execution with the source checkout unavailable.
- [ ] 4.3 Add exact-name user-bin Bash/Windows launchers to full deploy with PATH preflight, home-bound ownership/journals, conflict-before-write checks and rollback/removal safeguards; verify disposable-bin tests for spaces/Unicode, argument integrity, idempotence, other-home conflicts and later edits.
- [ ] 4.4 Preserve shell-only deployment and private stores across install/update/recovery; verify disposable full/shell-only fixtures and fake credential/policy bytes are never copied, exported, read by build/deploy or removed by launcher cleanup.
- [ ] 4.5 Extend `docs/TRELLO.md` with installed-command discovery, PATH prerequisites, explicit per-host setup and recovery; verify documented installation behavior using fixture homes/bins only, with no profile edits or live process changes.

## 5. Complete owner guidance and offline integration contracts

- [ ] 5.1 Complete `docs/TRELLO.md` with official API-key/user-token generation steps, scopes/expiry, errors/revocation/rotation and the same-OS-user credential-file limitation; link README and verify all required topics and official documentation references are present.
- [ ] 5.2 Add fake-only end-to-end CLI/module integration fixtures spanning setup, enablement, scoped reads, write opt-in, policy revocation, cooldown and unknown write outcomes; verify subprocess/module transport seams cannot escape to live network or the real home.
- [ ] 5.3 Add cross-layer regression assertions for preference/deployment secret exclusion, installed dependency closure and stable JSON error/exit contracts; verify quick targeted checks and strict OpenSpec validation and document remaining live-validation limits without real Trello calls.
