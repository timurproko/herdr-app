# Proposal

## Why

Custom Settings → Core duplicates apply/restart progress in its footer even though the Status row already reports runtime state. The final screenshot also exposes an ambiguous completion frame: cached Running status is shown while a post-operation inspection still disables the controls.

## What Changes

- Keep the pre-Apply footer hint unchanged throughout saving and restarting; never replace it with Applying or Restarting. Reserve the existing footer geometry through completion, clearing the hint and disabling Discard/Apply when nothing remains pending.
- Reconcile operation completion and fresh runtime facts together so verified Running restores eligible controls immediately, without enabling actions from cached facts. Preserve existing Status wording and the existing page error location.
- Add mocked lifecycle regressions for idle, pending, applying, restarting, done and failed states, including delayed completion inspection and machine isolation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: Specify quiet, stable Core apply feedback and verified post-restart control recovery within the existing Custom settings surface.

## Impact

- This page is owned here: `src/features/settings/permissions.js` renders the exact screenshot rows and footer text, `main.js` composes it, and `customization.json` packages it as `custom-settings`. No native page, binaries or new native patch is involved.
- Expected edits: those Settings sources, `tests/regression/permissions.test.mjs`, a focused Settings-layout regression if needed, and the Core documentation in `README.md`.
- Existing core-management workers, restart semantics, privilege checks, offline guards and failure reporting remain intact. No live restart, deployment, service changes or work on PR #40.
- Implementation requires approval of this draft plan. After implementation, run `CI=true npm run test:ci` once and report final-head check results; draft-only CI intentionally skips the hosted test matrix and required aggregate.
