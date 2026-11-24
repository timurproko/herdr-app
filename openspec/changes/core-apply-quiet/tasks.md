# Tasks

## 1. Core apply keeps a quiet, stable footer through every lifecycle state

- [x] 1.1 Preserve the pre-Apply hint for the captured machine/request through saving, restarting and reconciliation; assertions cover idle, pending, applying, restarting, done, rejected and unknown outcomes without duplicate footer progress.
- [x] 1.2 Reserve the existing Core footer and fixed-size Discard/Apply buttons when clean, disabled unless actionable; Settings composition and renderer regressions confirm unchanged geometry through completion without changing other editors.
- [x] 1.3 Preserve failures in the existing page error area and document the quiet hint and clean footer in README's Core section; targeted permissions tests cover failure visibility and draft retention.

## 2. Core controls recover with verified Running facts after restart

- [ ] 2.1 Reconcile operation completion with fresh inspection before displaying ready Running; a deferred-inspection regression reproduces the fourth screenshot's cached Running/disabled transition and confirms truthful feedback during verification.
- [ ] 2.2 Release eligible Permissions, sign-in, Stop and Reboot controls immediately when fresh Running facts settle, with clean Discard/Apply still disabled; regressions cover delayed replies, failed inspection, request replacement, machine switches and existing offline/unknown-permission safety guards.
- [ ] 2.3 Document the verified completion behavior and run focused packaged Settings regressions, then run CI=true npm run test:ci once for integration evidence and report current final-head required-check status, including draft-skipped checks.
