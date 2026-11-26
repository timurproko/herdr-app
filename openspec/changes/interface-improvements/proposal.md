# Proposal

## Why

Coordinator Git should remain responsive and show meaningful repository groups without flashing sections that turn out empty. Connected spaces should communicate their parent/child relationship using the existing Agents hierarchy rather than duplicate chain icons and Crew labels.

## What Changes

- Show each repository's selected-tab eligible task PR count immediately before its chevron, matching Agents group number styling and number-to-chevron spacing, including folded sections and unrevealed rows.
- Reproduce the reported Closed-tab collapse interruption with 41 items before fixing its demonstrated cause; add a failing-before/passing-after regression and disposable-native interaction proof without weakening native safeguards.
- Replace first-read-only repository Loading sections with one existing-style panel Loading indication. Restore the same coordinator's last runtime presentation on return, admit new sections only for known selected-tab PRs or genuine applicable failure notices, and preserve #79's quiet deferred recovery, truthful counts and visible failures.
- Display verified connected spaces as indented numbered children using Agents connectors and parent folding; remove both chains and show Crew only on the connected block's coordinator. Preserve native selection/shortcuts, per-machine grouping, paired dragging and independent space identities.
- Add deterministic coverage for all four outcomes and disposable-running-app proof; update the affected documentation/specs without touching Trello or shared Settings plugin UI.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: counted, collapse-safe coordinator sections; non-flashing selected-tab visibility and bounded same-home runtime presentation retention without stale action authority.
- `workspace-experience`: Agents-style connected child spaces, coordinator-only Crew tag, fold behavior, unchanged numbering and guarded same-machine ordering.

## Impact

Expected implementation areas are `src/plugins/git/mod/{main,aggregate,task-reveal}.js`, `src/features/spaces/main.js`, `src/shared/workspace-links.js`, shared UI primitives and their packaging, and focused Git/Spaces/Agents regressions. Adjust Crew's tag contribution only if necessary to express coordinator-only tagging; coordinate with the separate Crew project-name change rather than overwriting it. No Trello plugin or Settings plugin renderer changes are expected.

Planning starts from fetched main `d6ec6d4e03b44479da1145d2ccd8722e9efa66ed`. Reviewed merged PRs #79, #56, #45, #36, #69 and #18 and open PRs #82/#83; no open Git-panel change was present. The plan intentionally supersedes count-free headers and chain-based attached-row presentation, not their ownership, refresh or safety boundaries.

## Safety limits and delivery constraints

All four requested outcomes are planned, but the exact original native `interrupted` cause is unproven; the prior #45 work explicitly did not reproduce it. Do not claim that bug fixed without reproducing the collapse failure and establishing its cause. If it requires native changes or cannot be reproduced safely in disposable fixtures, report the blocker rather than patching Herdr, raising deadlines or concealing errors.

Cross-machine attachment cannot safely be introduced here: the provider and ordering adapter only admit same-machine pairs. Remote machines can each have their own nested pair; a cross-machine candidate remains independent in its original machine group, with no cross-group connector or move.

No task/PR snapshot is persisted for app restart or restored across Git/Crew/attachment off-on. No production install, real agent interaction, authentication change, new polling scheduler or native patch is authorized. The runtime cache is bounded and presentation-only.

Hosted Windows/Ubuntu tests normally skip draft PRs. After implementation, use the existing manual test workflow on the exact branch head while leaving this PR draft; record both OS results before any Implementation report. This plan-only handoff claims no implementation, reproduction, native proof or hosted matrix success.
