# Proposal

## Why

Trello currently requires protected headless setup and manually copied board IDs, so its Settings card cannot complete onboarding. Owners need credential verification, board selection and local write authorization in that card without making private authority portable.

## What Changes

- Add a small, reusable declarative action form with transient text/secret inputs; nothing typed into it becomes a plugin preference, and saved secrets are never read back into controls.
- Hand credentials to a Node setup worker over stdin through a bounded local-only in-memory transport, retaining the existing protected credential store and sanitized errors.
- Add Save and verify, Verify saved, Replace and Remove actions, account identity feedback and official token-generation help to the Trello card.
- Offer owner-only visible-board discovery and explicit checkbox selection of allowed boards; keep agent CLI discovery strictly allowlisted.
- Make the card's Read-only / Read-write choice update private local write authorization as well as the existing public Access gate. Imported preferences still cannot authorize writes or boards.
- Explicitly refuse Trello setup on SSH-selected machines in this change, rather than applying it to this computer accidentally. Keep headless setup for each execution host.
- Cover offline privacy/transport/policy and installed-export regressions, document the card and capture fake-data proof in a disposable running app after approval.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Declarative transient action inputs that never persist or survive their captured Settings context.
- `trello-agent-access`: Owner Settings setup, verified credential lifecycle, private board/write policy selection and explicit remote-machine refusal while preserving the headless CLI boundary.

## Impact

- Shared Settings renderer and kit: `src/features/settings/plugins-ui.js`, `src/ui/settings-kit.js`, plugin action context and `docs/PLUGIN-UI.md`.
- Plugin-owned Trello declaration, actions, Node setup/credential/transport helpers and tests under `src/plugins/trello/`.
- A bounded loopback-to-stdin handoff using the existing native WebSocket API, with its server dependency packaged self-contained rather than relying on the checkout. No native host patch or permanent server.
- Build/runtime mapping and deployment fixture copy lists if their dependency closure changes; specifically protect `tests/installed-export.test.mjs` and `tests/preferences-home.test.mjs`.
- `README.md`, `docs/TRELLO.md`, testing guidance and disposable-native proof coverage. Windows/Ubuntu hosted CI is the implementation gate, not a claim made for this planning-only PR.

No real Trello access, production deployment, credential copying, MCP, board-content panel, agent input, automatic write replay or native rebuild is included.
