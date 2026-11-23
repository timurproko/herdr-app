# Proposal

## Why

The coordinator Git panel repeats the enrollment notice inside repository bodies, where folding and scrolling can hide it. Repository-header counts also crowd canonical names even though the panel already has Open/Closed totals.

## What Changes

- Replace coordinator-only per-repository enrollment prompts with one non-shrinking footer after the scroll area; global missing setup still takes precedence.
- Offer confirmed unenrolled canonical repository names in rendered section order, deduplicated, through the exact account-style upward dropdown even for one choice. Zero choices and unknown membership stay quiet.
- Hoist the Claude account choice-menu presentation into a shared UI helper used by both callers, preserving trigger, chevron, menu geometry, row states and selected-slot treatment; account operations remain in their controller.
- Capture choices and coordinator/home/view scope on opening and reject obsolete callbacks before opening Settings with the chosen repository filter. Opening the picker performs no additional reads or enrollment.
- Remove Open/Closed counts from expanded and collapsed repository headers; give the name the released width, retaining truncation and a tooltip only for genuine overflow. Keep top-level totals unchanged.
- Preserve scoped PR errors, repository-specific diagnostics, fold persistence, relay render guards, shared PR rows/labels/separators and ordinary Git notices.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: coordinator enrollment-footer interaction, shared account-style choice presentation, and count-free collapsible repository headers.

## Impact

- `src/plugins/git/mod/main.js` and a narrow enrollment-picker controller/helper if needed; consume existing `GitNotices` decisions rather than introducing membership IO.
- `src/features/workspace-status/claude-account.js`, shared presentation under `src/ui/`, and required sandbox packaging mappings in `customization.json` and Git's `panel.json`.
- Focused render-tree/controller regressions, including actual shared-component parity across both callers; existing fleet, notices, account, relay and PR-row regressions remain protected.
- README and architecture guidance must stop describing per-header counts and fold-hidden enrollment prompts. The delta supersedes the corresponding requirements introduced by PR #18.
- No deployment, native changes, new dependencies, Crew reader/discovery work, label-pill renderer edits or changes to enrollment/authentication/auto-fix authority. Implementation waits for plan approval.
