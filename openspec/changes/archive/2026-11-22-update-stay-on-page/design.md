# Design

## Context

See proposal.md for motivation. Read-only inspection of published Herdr **v0.1.16** establishes the normal reload path:

- [`src/window.rs:4067–4140`](https://github.com/herdrdev/herdr-app/blob/v0.1.16/src/window.rs#L4067-L4140): `files_changed` calls `runtime.reload_now` for edited loaded copies; it does not remove/reopen their overlays.
- [`vendor/gpui-kit/crates/shell/src/watch.rs:521–587`](https://github.com/herdrdev/herdr-app/blob/v0.1.16/vendor/gpui-kit/crates/shell/src/watch.rs#L521-L587): reload constructs/initializes a replacement object, releases the previous generation and replaces the object in the existing view.
- `engine/quickjs/mod.rs:3007–3041` constructs and initializes that fresh object. Here `src/features/settings/main.js:66–68` takes only original overlay props or Look; navigation changes only `this.section`. The new object therefore loses the clicked Updates section.
- `src/mods.rs:447–459` owns supported shared state outside the script generation, so it survives replacement. It is persisted host runtime state, **not** a portable preference.

The memory-pressure path (`window.rs:4156–4210`) rebuilds VMs and reloads open dialogs in their existing frames. It invokes optional `View.close` through `remove_copy`; Settings currently also uses that name for user dismissal. Preserve restoration through this path by separating user-dismiss actions from lifecycle teardown, without opening a second overlay or patching native code. These are source findings, not a live-app reproduction; no live home was read or modified.

## Goals / Non-Goals

**Goal:** keep the same dialog's selected section and a truthful update row through replacement.

**Non-goals:** reopen deliberately dismissed dialogs, restore editor drafts/subpages, change native updates, workers, launch policy or preference schemas, deploy, or touch the live home.

## Decisions

1. **Dialog-scoped section only.** Store a bounded, validated overlay-qualified section record in a new `custom.*` shared key, using the same supported mechanism as the row. Restore the same dialog's record before original section props; a new dialog still uses its explicit destination or Look. Save navigation changes and clear on explicit dismissal, not replacement teardown. Do not remember plugin editors, machine context or drafts. This avoids update-job timing/expiry heuristics and leaves intentional navigation intact. Never export this key.
2. **Publish launch feedback before awaiting transport.** The controller currently holds `customUpdatePending='launch'` only on the old object; replacement can expose a cached actionable row before the launch receipt arrives. Keep a bounded shared pending indication until authoritative status resolves it, preserving unknown-outcome safety. Reattach on mount and use the existing one-second visible-page status timer and post-success main check. Do not infer success from a new title, drop running feedback just because Settings was replaced, accept obsolete replies over newer state, or launch again.
3. **Fresh-generation fixtures.** Extend `tests/update-row.test.mjs` and the Settings/controller VM harness in `tests/update-markers.test.mjs`. Recreate the mod/owner with original props and retained shared state, discard old callbacks/timers, and exercise actual section initialization/navigation rather than assigning Updates in the fixture. Cover replacement before launch acknowledgement, while running, and just after completion, plus failed/partial/unknown results, dismissal, explicit destinations and preference exclusion.

## Risks / Trade-offs

- Shared state outlives a view → qualify and validate it, clear explicit dismissals, bound records and avoid preference exports.
- Reload can occur before the runner receipt or after completion → preserve provisional busy feedback, reconcile durable status, and reject superseded replies; failure/unknown must never appear current.
- VM tests do not establish GPUI pixels or process survival → report fixture-only evidence. Real-app validation remains a separately authorized maintainer step; this task never deploys.

## Migration Plan

No migration or native change. After approval, implement in source and run focused fixture checks only; normal future deployment supplies the fix. Existing guarded rollback remains unchanged.

## Approved review correction: update-only, per-opening restoration

This supersedes Decision 1's general overlay-qualified section memory. Herdr v0.1.16 `src/mods.rs:781–785` generates `o1`, `o2`, etc. from a process-local counter; persistent shared records therefore cannot establish an opening's identity. Native/backdrop dismissal and shutdown also do not run the explicit dismissal handler.

`src/ui/settings-dialog.js` now owns Custom's Settings opening path. Each invocation adds a fresh timestamp/random nonce in supported overlay props; replacement preserves those original props, whereas a new opening receives a different nonce, including after Desktop restarts. Existing footer/menu, profiles/terminals and Git setup entrypoints call this helper, preserving their dimensions, destination and machine/plugin props. No facade or native frame is patched.

There is no general navigation store. Only pressing Update records `{opening, started}` alongside the existing runtime update projection. Settings restores Updates only if the opening nonce matches and that launch is pending/running, or the result finished within two minutes. Navigation away and explicit dismissal disarm this hint. Native dismissal/shutdown need no cleanup for correctness because new openings cannot reuse its identity. Old `custom.settings.navigation` records are ignored, not migrated or exported. Direct mod opens without an opening nonce fail closed to their requested section or Look.

Fixtures retain the shared store, retire the old `o1` without calling dismiss, recreate the opener in a fresh VM and mount a new `o1` with default and explicit Privacy destinations. They cover the same collision with an active/recent job, missing/invalid identities, matching-opening replacement, two-minute expiry, explicit navigation/dismissal, helper packaging and unchanged entrypoint props.
