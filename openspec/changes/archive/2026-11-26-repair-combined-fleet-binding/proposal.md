# Proposal

## Why

After PR 88, valid combined Crew fleets can lose both sidebar nesting and coordinator Git inventory when old and placement-v1 workers coexist. Crew's advertised fleet view omits task project identity, while the new app validator requires it even for a combined child whose identity is project-independent.

## What Changes

- Accept a valid same-home combined child containing legacy workers, placement-v1 workers or both when the minimal fleet reply omits task projects; compare projects whenever status supplies them.
- Keep exact task, home, native membership, machine and supported-version refusals, and keep per-project placement dependent on authoritative task project identity.
- Exercise real preference off/on propagation through Settings, recurring Spaces verification and coordinator Git context without relying on dialog close or an unrelated model event.
- Document the Crew fleet-view omission, combined automatic title behavior and safe compatibility boundary; do not modify Crew or any live state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Specify how combined placement treats omitted versus contradictory project evidence without weakening task/home or per-project identity checks.
- `workspace-experience`: Explicitly cover legacy and placement-v1 workers sharing one combined native space through runtime preference transitions.

## Impact

Primary implementation area: `src/plugins/crew/fleet.js`, with provider/registry, transport, Settings and Spaces lifecycle regression coverage. Existing generic workspace projection and Git task context remain the integration boundaries. Native synthetic proof will use the checksum-verified release 0.1.18 copy at the supplied task location at 100% and 130%; no installation, live relabeling or app restart is authorized. Final implementation validation includes an explicitly dispatched Windows/Ubuntu test workflow on the exact final head, after plan approval.
