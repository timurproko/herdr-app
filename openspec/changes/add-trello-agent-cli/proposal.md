# Proposal

## Why

Herdr's optional plugins do not currently give shell-capable agents a Trello tool. A constrained JSON CLI will let agents work with the owner's explicitly permitted boards without putting credentials or write authority in portable plugin preferences.

## What Changes

- Add an off-by-default headless Trello integration under `src/plugins/trello`, with declarative Settings status and a standalone `herdr-trello` JSON CLI; no MCP adapter or board panel.
- Provide explicit local credential setup using an API key and user token, stored privately under the resolved Herdr home. Authenticate REST calls with `key` and `token` query parameters; do not use OAuth 2.0 or an application secret.
- Require an explicit host-local board-ID allowlist for reads and writes. Default to read-only; mutations additionally require a separate local write opt-in and enabled plugin state.
- Support allowed-board/list/card discovery, card details with comments and checklists, card create/update/move/archive, comment addition, existing-label assignment/removal, and checklist/check-item creation and editing/completion.
- Exclude permanent deletion, including checklist/check-item deletion, board administration and board-label creation/editing, attachments, bulk operations, webhooks, arbitrary HTTP requests and automatic replay of uncertain writes.
- Package the dependency-complete CLI and shell launchers through ordinary build/deploy, without a source-checkout dependency, credential provisioning or remote credential copying.
- Add fake-only injected-transport regressions and `docs/TRELLO.md`, linked from README, covering setup, user-token generation, scope, examples, failures, revocation and same-OS-user limitations.

## Capabilities

### New Capabilities

- `trello-agent-access`: Machine-local authorization, scoped read/write operations, safe JSON command behavior and installed shell access to Trello.

### Modified Capabilities

None. Existing plugin lifecycle and conflict-safe installation requirements remain applicable unchanged; the new capability adds Trello-specific behavior rather than altering other plugins or shell-only deployment.

## Impact

- Canonical plugin files and plugin-local tests in `src/plugins/trello/`, automatically discovered by `tools/plugins.mjs`.
- Explicit runtime mappings in `customization.json`, plus narrowly scoped launcher build/install/ownership handling in `tools/` and disposable deployment fixtures in `tests/`.
- Existing declarative Settings renderer, registry enablement and read-only durable plugin-state access; no native host changes, terminal input, new service, polling or desktop restart.
- Official Trello authorization and REST references are the endpoint contract, not the scout's unverified table. No real Trello calls or real credential inspection during development or tests.
- One account and credential pair per explicitly provisioned execution host initially. Same-user shell agents can read private files and bypass client policy; this is not a security sandbox.
