# Design

## Context

See proposal.md for motivation. `src/plugins/crew/plugin.js` declares a four-column `descriptionHint`; `src/ui/settings-kit.js` renders it through `hintTable`, HoverCard and a focus-only Popup. The current spec explicitly mandates that table, so this change replaces that contract rather than treating it as a purely internal restyle.

`PROJECTS.check` passes `CHECK_TIMEOUT` (15 seconds) to every `readProjectKinds` command, including `project list --json` and the legacy list. `on()` passes that deadline to `hc exec` and gives Settings admission a two-second larger ownership allowance. The Settings queue has no independent shorter group deadline. `reloadPlugins` already keeps prior items while a check group is loading and rejects obsolete machine/session/group results.

Crew's `docs/project-kinds.md` and README delivery section distinguish plain worker commits followed by Crew review/land, worker-owned workflow draft PRs with approval for changes needing plans, and gate-owned delivery. Gate steps can be skipped, and the shared workflow allows small fixes without a separate plan.

## Goals / Non-Goals

**Goals:** readable explanatory copy, sufficient bounded time for the observed twenty-second list, and unchanged contextual/pending behavior.

**Non-Goals:** faster Crew internals, new polling/retry loops, new controls, changed kind editing, global timeout increases, live app installation, or altered write safety.

## Decisions

1. Extend the existing declarative hint to accept three named text entries, preserving table support for other callers. Render each entry as a bold kind name followed by regular sentence text in a wrapping body using existing menu surface, text and spacing styles. Start with a roughly 440 logical-pixel maximum width and 8-pixel entry gaps; confirm at 100% and 130% in disposable native proof. Do not change Usage's hintTable, the dashed trigger, hover delay or keyboard-focus behavior. A new tooltip widget or browser imitation would introduce unnecessary divergence.
2. Approved short copy: Plain — The worker codes right away; Crew reviews, then opens the pull request. Delivery — The worker plans in a draft pull request and codes after approval; Crew reviews. Gate — The gate tool reviews, tests and opens the pull request. On approval the coordinator explicitly requested omitting small-fix and gate-skip detail from this concise summary; those exceptions remain in the underlying Crew/workflow documentation, not in the tooltip.
3. Introduce a project-list-specific 60-second allowance for both supported JSON and legacy listing only; keep capability and ordinary requirement probes at 15 seconds and writes at their existing bounds. Retain `on()`'s execution-plus-two-second queue allowance. Do not raise all checks or remove deadlines.
4. Preserve the existing retained-item and loading-group implementation unless a focused delayed fixture exposes a concrete gap. Add fake-clock/held-response tests that cross the old 15-second threshold, complete at twenty seconds, and inspect cold and warm states, real timeout failure and context retirement. No real twenty-second sleep or actual Crew home is required for unit regressions.

## Risks / Trade-offs

- Longer waits for genuinely hung list commands → keep a finite 60-second execution deadline and the current failure/retry message afterward.
- Wrapped text may grow in height at zoom → use the existing native tooltip surface and wrapping, inspect before/after images at both zoom levels, and avoid fixed row heights.
- Retained rows could be mistaken for newly acknowledged writes → preserve existing pending-control, identity and kind-set guards; retained display is not a successful read.
- A browser reconstruction would not prove GPUI layout → use a disposable native fixture with synthetic project data and no real Crew/SSH actions; retain screenshots and shutdown evidence in the task folder.

## Migration Plan

No storage or API migration. After approval, publish the two outcomes in this PR with focused tests and docs. Capture source-baseline and changed tooltip screenshots in isolated disposable app instances; stop every instance before reporting. Rollback is reverting the source change through normal publication. No live installation is part of this task.
