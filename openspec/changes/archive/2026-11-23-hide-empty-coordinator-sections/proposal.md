# Proposal

## Why

The coordinator Git panel renders repository headers even when all eligible PRs belong to the other tab. Its enrollment footer also grows taller than ordinary Git's card because the account-style trigger introduces its own fixed height.

## What Changes

- Render repository sections only when the selected tab has eligible PR rows or a genuine scoped read notice; retain counts and saved folds.
- When no sections qualify, reuse ordinary Git's tab empty wording, retaining loading and unverified-state feedback where applicable.
- Keep the single enrollment footer based on the full eligible repository inventory, including repositories hidden in the selected tab.
- Match the coordinator footer's height, padding, icon and inline vertical centres to ordinary Git, with only the dropdown chevron added; leave status-bar accounts unchanged.
- Extend renderer and shared geometry regressions and update feature/testing documentation and OpenSpec.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: selected-tab section visibility and empty states; compact enrollment-card geometry with unchanged account/menu presentation.

## Impact

Targets `src/plugins/git/mod/main.js`, `enrollment-picker.js`, shared choice presentation as needed, and existing fleet/choice-menu fixtures. No new GitHub reads, history-policy changes, preference migrations, deployment or native changes. PR #34 remains unrelated; refresh from the default branch before implementation handoff.
