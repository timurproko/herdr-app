# Tasks

## 1. Consistent sentence punctuation across Settings update descriptions

- [ ] 1.1 Terminate all four Custom running descriptions with a full stop and update exact expectations in update-row, update-check and update-runner tests; verify targeted updater tests pass with unchanged Updating… button labels and target/scope guards.
- [ ] 1.2 Correct missing or duplicated sentence-boundary stops in Custom dynamic errors, failed/partial/unknown diagnostics and the sibling Core failure; extend the model matrix and Settings controller harness to assert terminated descriptions, preserved diagnostic paths, already-terminated causes and unchanged checking/restart controls.
- [ ] 1.3 Update README.md, docs/TESTING.md and any other current documentation quoting changed descriptions, and reconcile applicable current spec examples through this delta; verify quoted running strings include their full stops while button ellipses and historical archives remain unchanged.

## Workflow follow-up

- After implementation approval, run quick focused checks before pushing the delivered outcome, then run CI=true npm run test:ci once when no other suite is active and record the result.
- Inspect required checks on the final head; report unavailable draft-only checks honestly. Never mark the PR ready or merge it.
