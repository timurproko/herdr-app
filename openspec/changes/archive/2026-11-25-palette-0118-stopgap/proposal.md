# Proposal

## Why

Herdr 0.1.18 changed the stock command palette, so the exact-original gate correctly skips our existing Custom replacement. Restore that customization through a narrow release-specific rebase without losing 0.1.18's new native manifest commands or weakening safety.

## What Changes

- Add pinned LF and independently verified Windows CRLF 0.1.18 originals and provenance beside the retained 0.1.17 entries; select a dedicated replacement through the existing registry.
- Rebase Custom presentation and activation routing onto the real 0.1.18 catalog, preserving native manifest validation, deduplication, hotkey matching and explicit clone arguments.
- Gate the new replacement's Usage entry by the existing Usage plugin preference; preserve every other existing Custom palette interaction and non-Custom native behavior.
- Extend real-stock, VM and isolated upgrade/restore tests for both releases; document read-only installed-byte evidence separately from unperformed live UI validation.
- Keep this temporary native exception isolated for later retirement by the owned-palette work in PR 64. No deployment, restart, new opt-in or changes to other tasks.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: Extend reviewed per-original palette behavior to exact 0.1.18 stock while retaining its native catalog additions and the existing fail-closed recovery contract.

## Impact

`src/integration/native-patches/palette/`, its registry and `customization.json` mappings; focused palette/frame tests and a 0.1.18 review note. No installer redesign, new dependencies, host-version allowlist, structural matching, binary modification or owned-palette implementation. Existing 0.1.17 replacement bytes and feedback remain unchanged. Scope follows the read-only `fix/palette-0118` stop-gap/design documents; that branch and PRs 56, 59, 61, 62, 63 and 64 remain untouched.
