# Design

## Context

See proposal.md for motivation. `AggregatePulls.repositories()` includes repositories eligible in either tab, while `rows(view)` and `readNotice(repo, view)` already enforce state/history and notice scope. `renderAggregate` currently renders the entire repository inventory and bases emptiness on row count alone. Ordinary settled empty text is `No open pull requests` / `No closed pull requests`.

The ordinary notice uses a 20px icon wrapper beside inline text within px(8)/py(6) card padding. The coordinator nests `choiceDropdown` inside that card: its `pillTrigger` imposes `h(U.control)` (28px), while the icon remains in a 20px wrapper and the outer row uses `items_start`. This explains the extra card height and mismatched centres. `tests/choice-menu.test.mjs` currently requires identical account/enrollment trigger heights, so that contract needs a narrow exception rather than changing account defaults.

## Goals / Non-Goals

**Goals:** separate render visibility from repository membership; keep render free of focus allocation, notifications and IO; provide a compact enrollment trigger without account visual drift.

**Non-Goals:** changing history eligibility, counts, fold storage, webhook membership, popup interaction, account switching, native code, PR #34's update behavior or deployment.

## Decisions

1. Derive visible repositories from the existing selected-tab eligible rows plus `readNotice` results, before folding. Keep the full repository inventory for notice synchronization, enrollment choices, geometry identity and webhook scope. Do not filter `repositories()` globally: that would incorrectly drop hidden-tab enrollment choices and updates. Preserve saved fold keys when a section disappears.
2. Show the ordinary settled empty text only when no sections qualify, not merely when there are no rows. Notice-only sections and folded nonempty sections are not empty. Preserve existing Loading and Waiting for fleet verification feedback during pending/unverified contexts.
3. Provide an explicit compact/inline trigger presentation for enrollment, using ordinary notice geometry and retaining the shared 12px chevron, gap, native popup anchoring and menu rows. Account remains on the existing default pill presentation. Prefer reusing ordinary notice card/content geometry over maintaining subtly different wrappers; avoid global changes to `pillTrigger` dimensions. Ensure all icon/text/Settings/chevron centres share one line without extra trigger vertical padding.
4. Extend actual renderer fixtures for mixed states, notice-only sections, expired history, tab transitions, folded reappearance and hidden-section enrollment. Extend shared-component geometry coverage to compare the actual ordinary and coordinator cards, including effective height, padding, icon size and vertical centres, while pinning unchanged account geometry. Keep render-phase assertions active.
5. Update README, docs/ARCHITECTURE.md and docs/TESTING.md with the behavior and coverage. Use targeted checks before pushes; after implementation run the requested `CI=true npm run test:ci` once, refresh the default branch and report final-head required-check status without deployment or manual readiness/merge actions.

## Risks / Trade-offs

- Filtering the membership source could silently remove enrollment choices → retain an independent full inventory and assert hidden-tab choices.
- Row-count emptiness would hide useful notices or mislabel folded content → base emptiness on section eligibility before folding.
- Reusing a pill's fixed height would preserve the screenshot defect → compare complete actual card geometry, not popup/trigger parity alone.
- Fixture geometry is not native pixel evidence → document that limit; no installed app deployment is authorized.

## Migration Plan

No data migration. Existing local fold keys remain valid. Reverting the source change restores prior presentation without touching Crew records, enrollment or account state. No deployment is part of this task.
