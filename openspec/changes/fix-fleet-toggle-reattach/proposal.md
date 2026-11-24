# Proposal

## Why

A verified coordinator/fleet pair can remain visually detached after switching attachment off and back on with Settings open. The existing mounted regression passes on current main, so a diagnosis-backed lifecycle regression is needed before changing generation, lease or identity policy.

## What Changes

- Make repeated verified-on → off → on cycles publish attachment after the first successful current-generation verification, including immediate, one-second and fifteen-second off intervals.
- Reproduce through the packaged Settings page, Spaces lifecycle and separate Crew provider instances with retained shared facts; preserve diagnostics from the failing sequence rather than assuming a cause.
- Fix only the demonstrated generation, lease, eligibility or publication defect; keep obsolete replies rejected and keep disablement immediate.
- Extend the existing regression to cover repeated cycles, local and ready remote machines, delayed replies, independent badge colours and both attachment chains without closing Settings.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: make repeated off/on reattachment explicit in the live fleet preference contract, including verification completion and obsolete-reply boundaries.

## Impact

Likely targets are `src/shared/space-preferences.js`, `src/plugins/crew/fleet.js`, `src/plugins/crew/plugin.js` and `tests/fleet-toggle-live.test.mjs`; investigation may show that only one runtime file needs correction. Reuse the existing registry, status reader, diagnostics and 250 ms Spaces lifecycle. No new dependencies, host patches, scheduler, deployment, native mutation or portable state are proposed. Pull requests 45, 46, 48 and 49 remain untouched.
