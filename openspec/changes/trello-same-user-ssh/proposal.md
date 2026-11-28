# Proposal

## Why

An elevated Windows SSH login is currently rejected before setup even when it is the same Windows user/profile as the selected normal-user Herdr Core. The person has explicitly chosen a narrow same-user exception so remote Requirements can work normally without changing SSH, Core startup or the existing secret handoff.

## What Changes

- Permit elevated Windows direct-SSH setup only after proving the SSH SID equals the owner SID of the selected session's safe `core.json`, and the actual selected Core runs normally as that same user with the same profile and resolved Herdr home.
- Keep direct SSH, pinned Core/session, READY before secret stdin, safe stores, deadlines, cancellation and unknown-outcome handling for the entire runtime/account/boards/access lifecycle.
- Ensure elevated writes produce user-owned, protected Trello files usable by the same non-elevated user, with real disposable Windows storage coverage rather than mocked ACL success.
- Reuse the existing Requirements/account/boards/settings controls unchanged; replace misleading refusals with one accurate cause and next action, without attributing Herdr's checks to Trello.
- Keep different users, Unix root, elevated/unavailable/unverifiable or changed Core, unsafe paths/ACLs and unsupported routing refused. No credential import, added confirmation/option, Core launch changes or automatic provisioning.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `trello-agent-access`: replace blanket elevated-SSH refusal with verified Windows same-user setup, protected elevated-write ownership and precise unsupported-host guidance; retain all existing lifecycle and secret-isolation guarantees.

## Impact

- `src/services/private-actions/trello-bootstrap.cjs` and `trello-transport.cjs`: public identity proof and safe result categories; no Core-based secret transport.
- `src/plugins/trello/credentials.cjs`, Trello-only installer and owned launcher integration: explicit user ownership and protected creation/updates without repairing unrelated or unsafe existing files.
- `src/plugins/trello/actions.js` and existing declarative Settings tests: refusal copy and normal prerequisite recovery, not new UI infrastructure.
- Targeted bootstrap/SSH, private-storage, remote lifecycle, global access and Settings regressions; real disposable Windows ACL/token evidence with fake credentials only.
- README, `docs/TRELLO.md`, `docs/PLUGIN-UI.md` and relevant architecture guidance where applicable; no native binary, OS account, SSH/UAC configuration or Core startup changes.
