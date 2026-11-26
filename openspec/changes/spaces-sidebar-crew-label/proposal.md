# Proposal

## Why

Coordinator Git currently stays on Loading with zero totals despite healthy Crew output, and earlier showed an interrupted-render banner; its stage is also duplicated as a title chip and bottom label. Spaces metadata columns and separately composed tab/sidebar rename controls need consistent alignment without changing their ownership or behavior.

## What Changes

- First reproduce and fix coordinator Git's stuck Loading using sanitized fixtures matching both real Crew status payload shapes; investigate whether the earlier render interruption has the same cause, add a failing regression and push that fix independently before visual work.
- Replace duplicate managed-stage indicators with one clickable bottom-right emoji label pill reading Build, Review or Approved; preserve the existing label colour/shape, role-aware navigation, pin motion and unavailable-target explanation. Remove the title-stage reservation; keep a robot only for a live agent without a managed label.
- Keep Crew in the same horizontal position and show connected child counts in both expanded and collapsed coordinator rows.
- Centre child counts, machine plus and space-rename approve on one inner column; centre disclosure chevrons and rename cancel on one outer column.
- Share inline rename presentation between Tabs and Spaces, matching the sidebar's button/icon sizes, field/action gaps, vertical alignment, hover and focus treatment.
- Preserve row heights, selected/hover states, truncation, compact rail, unrelated tags, ordinary nonparent rows and rename target/keyboard behavior; check default and narrow widths.
- Capture before/after native pixels in disposable instances after implementation approval, including both rename locations and both local/pc2 groups.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: one canonical managed-stage label control in the existing lower-right label style without a title-stage reservation, retaining role/navigation authority and review history in hover rather than adding stage names.
- `workspace-experience`: replace collapsed-only coordinator counts and moving Crew placement with stable metadata columns, align rename approval with machine add/count, and share tab/sidebar rename presentation.

## Impact

- Expected code: narrowly scoped Git stage/label row presentation and the proven aggregate-loading fault path; `src/features/spaces/main.js`, `src/features/tabs/main.js`, shared presentation in `src/ui/ui.js`, and packaging only if a separate shared helper is necessary.
- Focused coverage: `tests/spaces-worktree-layout.test.mjs`, `tests/rename-selection.test.mjs`, a shared rename presentation regression, and disposable native sidebar/tab proof. Update applicable README/testing guidance with each outcome.
- Build on merged sidebar PR #93, already in base `19ebb1f`; do not duplicate its work. Open PR #91 is a worker-space settings plan with no renderer edits; #89 is Trello. PR #90 heavily changes Git `main.js`, agent links and aggregate state: keep edits local to the proved failure and row trailing/label area and report exact overlap. No Crew settings, Core, live deployment or native binary changes.
- This deliberately changes the current workspace spec's explicit collapsed-only counts and moving Crew contract, so delivery requires a draft plan and approval before implementation.
