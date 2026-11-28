# Proposal

## Why

People can run out of a quota while holding an unused provider reset. An explicit, machine-local opt-in can spend a selected reset at 1% remaining without opening Usage, but scarce resets require stricter authority and duplicate prevention than display-only quota caches.

## What Changes

- Add **Automatic reset** to Settings → Usage, off by default, with an expandable area beneath it using the existing Resets panel treatment and simple unchecked reset-type checkboxes grouped by provider and account.
- Offer only reset types actually reported for each Claude or Codex account. Store selections by exact provider/account/organization and reset scope, not email, display position or individual credit ID; never opt a newly discovered type in.
- Evaluate automatic resets on fresh successful collection results for the captured selected machine while Herdr is open and active. Execute the existing reset action on that machine, locally or over the existing remote transport; no daemon runs while Herdr is closed.
- Require explicit type selection, known quota applicability, remaining quota at or below 1%, current account/machine evidence and available usable resets. Serialize manual and automatic claims, reserve a depletion before submission, and never retry an uncertain spend or cascade through several reset types for the same depletion.
- Reuse PR #107's captured-account refresh path for authoritative dialog/sidebar updates. Show one existing-style success toast identifying a confirmed automatic reset; keep manual success silent and add no explanatory messages, buttons or options.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Add per-machine explicit automatic reset authorization, fresh scope-bound triggers, at-most-once spending, and existing-pattern automatic-spend visibility while retaining explicit-reset behavior.

## Impact

- Usage preferences/model, Settings page declaration, collector metadata, store/reset orchestration and plugin lifecycle under `src/plugins/usage/`.
- A generic declarative expandable grouped-checkbox capability in `src/features/settings/plugins-ui.js` and the shared Settings kit only where needed; no Usage-specific renderer branch or handwritten Settings UI.
- Existing worker actions `claude-reset` and `codex-reset`, supported host notifications, current shared-cache publication and PR #107's scoped refresh continuation; no new provider consume endpoint, native patch or dependency.
- Focused Usage/Settings/plugin regression tests, synthetic worker transports and relevant user/architecture documentation. No live reset spending, credential reads, full local suite, deployment or app restart during planning.
