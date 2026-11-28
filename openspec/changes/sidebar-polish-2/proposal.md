# Proposal

## Why

Agents group headers lack the small chevron hover used by Spaces, Git stage/verdict boxes have inconsistent widths after PR 103, and Spaces cannot hide its Crew role label independently. These three focused presentation changes should reuse the existing Herdr controls without adding unrelated UI or operational behavior.

## What Changes

- Give Agents group chevrons Spaces' small square hover/focus treatment while preserving header folding, counts, status and group order.
- Give Git stage/verdict controls one tight common width derived from the longest supported caption plus the existing 6px side padding, with shorter captions centred; change sizing only.
- Let the enabled Crew plugin contribute a checked-by-default Crew label entry to Spaces' existing Show icons menu, hiding only its space-row label when unchecked.
- Place a childless space's Crew label at the machine-chevron column without empty count/disclosure reservations; retain the inner grid when children exist, as additionally approved during implementation.
- Replace PR 103's caption-sized Git boxes and fixed childless Crew-label column; preserve the separate ongoing Git work in PRs 104 and 110. Common Git width covers every supported caption and accepted round length, not current statuses.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: Agents group chevron treatment and independently switchable Spaces Crew labels.
- `plugin-integrations`: Tight equal-width Git stage/verdict boxes and enabled-only Crew-owned menu contributions.

## Impact

Implementation will touch Agents and Spaces presentation, the existing plugin registry/menu boundary, Crew's declaration/settings and Git's stage/verdict sizing only, plus directly relevant fixtures and descriptive documentation. No native patches, external dependencies, network requests, Crew task/configuration operations, terminal changes or deployment are proposed. Implementation and targeted tests begin only after plan approval.
