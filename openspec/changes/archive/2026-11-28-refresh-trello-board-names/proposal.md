# Proposal

## Why

Settings keeps added boards' old names after a Trello rename: verification only hydrates missing hints, and opening Boards reads saved status. Owners should see current names without removing and re-adding their board grants.

## What Changes

- Refresh added-board display names from Trello when Boards opens and when its existing Check or Requirements Check runs, even when every saved name exists.
- Match refreshed names to canonical board IDs; preserve grants, order, write policy and last-known names on unavailable or incomplete reads.
- Keep saved account status local on ordinary card opening and reuse the current minimal Herdr list/disclosure/Check presentation, with no new messages, buttons or options.
- Replace the current spec's unconditional no-network-on-opening board-name contract with event-driven board-name refresh and offline fallback.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `trello-agent-access`: Refresh allowed-board display hints on Boards opening and Check while retaining ID-based authority and offline names.

## Impact

- Trello owner worker and Settings actions, plus the shared section-opening hook only if needed to express the existing disclosure event generically.
- Focused owner/name and packaged Settings regression fixtures; existing machine/enable-generation and private-store concurrency guards remain authoritative.
- README and `docs/TRELLO.md` cached-name guidance. No new dependencies, agent commands, background polling, deployment, real credentials or Trello writes.
