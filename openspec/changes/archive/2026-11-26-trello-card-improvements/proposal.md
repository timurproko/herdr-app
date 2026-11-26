# Proposal

## Why

Trello's Windows permission subprocess can mistake valid setup for unsafe storage, while the Settings card loses account/board names and cannot configure SSH execution hosts. Bring the card into the existing Crew Requirements/Projects patterns and make installed CLI guidance and machine authorization trustworthy.

## What Changes

- Fix the Windows PowerShell ACL child's inherited module path without weakening ACL checks; expose distinct secret-free storage, tooling, public-state and transport failures.
- Persist bounded non-secret account and added-board names beside each private setup so reopening needs no Trello request.
- Make installed help sufficient without a source checkout, including a packaged offline reference.
- Support per-machine account/board setup through the existing private bridge and identity-bound direct SSH/stdin; offer explicit runtime Install/Update in Requirements when needed.
- Keep one global Read-only/Read-write control in Settings and apply explicit owner authorization to each configured execution host, independently of portable preferences.
- Show one saved account name with hover Remove, or the masked inputs and Save & verify; remove Verify saved, Replace and the help button. Explicit Requirements Check verifies the account; ordinary opening reads cached status only.
- Use Boards, an `N added` badge, selected-machine scope, named hover-removable rows, and the existing picker with Active/Inactive tabs and tab-local search. Keep descriptions short and put the Power-Up administration link in the description.
- Cover all fourteen coordinator requirements with fake-only regression/integration tests, disposable running-app screenshots and Windows/Ubuntu hosted checks before implementation handoff.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `trello-agent-access`: protected storage diagnostics, durable names, installed help, Crew-style owner card, direct-SSH machine isolation/runtime setup, and global authorization applied to execution hosts.

## Impact

Changes touch `src/plugins/trello`, the private-action bridge/plugin API, generic Settings declaration support, runtime packaging/launcher installation, tests and Trello/plugin UI guidance. No native patch, real credential/remote-machine test, production deployment, new UI idiom or automatic credential provisioning is proposed. Agent hooks, setup copying, MCP and OAuth are excluded.

### Explicit limits requiring plan approval

- Safe remote support requires a configured persistent direct-SSH target, trusted existing host key, noninteractive authentication, Node 20+, and provable Core identity/session plus execution user/home. Temporary/custom-via targets, ambiguous/elevated identity arrangements and unsupported shell quoting are refused by named Requirements errors, never local fallback. Missing Node is a prerequisite, not an automatic OS install.
- An offline host cannot immediately acknowledge a global access change. Applied and pending hosts are distinguished; no all-host success is claimed and no read-write grant is automatically replayed. A previously granted offline host retains its last acknowledged authority until contacted; immediate disconnected-host revocation is not promised. This limit must be accepted before implementation.
- Legacy files contain IDs/secrets but no names. Names cannot be reconstructed without a provider request: one explicit Requirements Check hydrates missing account/allowed-board names; subsequent openings use saved hints. The initial legacy state asks for Check instead of inventing names or silently contacting Trello.
