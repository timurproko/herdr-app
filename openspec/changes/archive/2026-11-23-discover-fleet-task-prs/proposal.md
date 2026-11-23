# Proposal

## Why

A working ship can open a draft PR before its first report, but the coordinator overview currently reads only Crew's recorded `tasks[].pr`. Crew now supplies bounded read-only discovery, allowing the app to show that PR without weakening task ownership or live-worker identity.

## What Changes

- Request `crew status --all --json --discover-prs` through the installed-tool machine transport, with one recorded-only fallback for an explicit unsupported-flag refusal.
- Validate discovery version 1 and all per-task result fields; map canonical known URLs into sanitized task links and retain distinct none/unavailable facts through binding and generic pull context.
- Keep missing/unknown discovery versions recorded-only and malformed v1 evidence uncertain, never authoritative absence.
- Account for Crew's added ten-second discovery budget in the transport timeout and coalescing lease, without changing the ten-second refresh cadence or adding retry loops.
- Preserve the uncluttered Git panel: no generic incomplete-list text, no enrollment or label-renderer changes, and no broader automation authority.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Allow validated discovered task PRs before reports, retain discovery uncertainty and bounded recorded-only compatibility, and preserve existing fleet identity, history and invalidation guarantees.

## Impact

- Crew-owned `src/plugins/crew/plugin.js` and `fleet.js`, their fixtures, and coordinator integration fixtures as needed.
- README and architecture source/timing guidance; the archived connect-fleet-space decision 6 is the discovery seam, not an artifact to rewrite.
- Requires discovery-capable Crew for early links, but older installed Crew retains recorded-only behavior. No Crew repository edits, deployment, enrollment banner work, label pill rendering, native changes, or new companion.
