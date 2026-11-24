# Proposal

## Why

A verified coordinator/fleet pair can remain visually detached after switching attachment off and back on with Settings open. The existing mounted regression passes on current main, so a diagnosis-backed lifecycle regression is needed before changing generation, lease or identity policy.

## What Changes

- Make repeated verified-on → off → on cycles publish attachment after the first successful current-generation verification, including immediate, one-second and fifteen-second off intervals.
- Reproduce through the packaged Settings page, Spaces lifecycle and separate Crew provider instances with retained shared facts; preserve diagnostics from the failing sequence rather than assuming a cause.
- Fix the reproduced native response-decoder watchdog interruption with bounded bulk decoding, projected status fields and a lifecycle-owned response-processing deadline independent of finally; keep obsolete replies rejected and disablement immediate.
- Prefer the separately supplied Crew `--view fleet` capability when explicitly advertised, falling back to projected legacy `--all` status without changing historical Open/Draft PR eligibility.
- Extend the existing regression to cover repeated cycles, local and ready remote machines, delayed replies, independent badge colours and both attachment chains without closing Settings.
- Collect multiline legacy output and project tasks in linear time, covering 50k-line replies and measuring the entire real Windows PowerShell/native path at 10 KiB, 400 KiB and one MiB.
- Keep enabled coordinator verification in the Git panel's standard Loading state without an extra header label, or retain the same session's exact-identity inventory as Stale across off/on; never fall back to Not a git repository merely because verification is pending.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: make repeated off/on reattachment explicit in the live fleet preference contract, including verification completion, interrupted processing, linear large-reply transport and obsolete-reply boundaries.
- `plugin-integrations`: preserve same-identity session PR inventory during re-verification and use standard empty Loading feedback with sanitized diagnostic tooltips.

## Impact

Likely targets are `src/shared/space-preferences.js`, `src/plugins/crew/fleet.js`, `src/plugins/crew/plugin.js` and `tests/fleet-toggle-live.test.mjs`; investigation may show that only one runtime file needs correction. Reuse the existing registry, status reader, diagnostics and 250 ms Spaces lifecycle. No new dependencies, host patches, scheduler, deployment, native mutation or portable state are proposed. Pull requests 45, 46, 48 and 49 remain untouched.
