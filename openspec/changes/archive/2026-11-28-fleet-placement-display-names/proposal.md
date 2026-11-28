# Proposal

## Why

A valid Crew self-repair worker now requests the repository display name `core`, but Herdr requires the literal `crew` and rejects the entire home, disconnecting sibling project spaces and routing coordinator Git into its non-repository folder. The adapter must distinguish display metadata from the unchanged placement identity rather than undo Crew's documented naming behavior.

## What Changes

- Accept bounded, safe repository display names independently of authoritative placement project and automatic space ID, for registered projects and internal repairs; retain legacy names.
- Preserve exact home/task/project/owner/native membership guards, coherent same-child metadata, durable presentation validation and explicit user renames.
- Add focused local and remote mixed-fleet regressions covering Spaces contributions, coordinator task-PR routing, reload and negative identity cases.
- Recheck the separately reported worker root-read failure using the existing bounded request path; do not assume binding causes it or suppress truthful errors. An independent defect requires its own evidence and scope decision.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: Clarify that validated repository display names, including internal repair names, are independent of placement identity in multiple connected project spaces.

## Impact

Targets `src/plugins/crew/fleet.js`, its existing project-space/provider/Git fixtures, and the placement contract in `docs/FLEET-STATUS.md` and `docs/ARCHITECTURE.md`. No Crew edits, native/Core changes, live label rewrites, preference resets, new timers, new status retries or deployment are proposed. The whole-home rejection reproduces at both app revisions; the listed app update is not its introduction point.
