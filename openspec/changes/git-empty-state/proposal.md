# Proposal

## Why

Git's empty and error messages use PR-row feedback geometry rather than repository-header geometry, causing visible movement when selected-tab content changes. Zero-PR headers add noise, and the Spaces coordinator label should read `crew` without changing the terminal badge.

## What Changes

- Align list-replacing empty, informational and actionable error text with the first repository header's text left edge, vertical position and row height in ordinary and coordinator Git.
- Omit repository headers, zero counts and chevrons whenever the current tab has no PRs for that repository, including notice-only sections; retain actionable notices without an empty header.
- Show a single tab-specific empty message when all repositories are authoritatively empty; omit only empty sections when other repositories have rows.
- Render the Spaces coordinator role label as lowercase `crew` locally, leaving the plugin's shared `Crew` label and terminal-pane badge unchanged.
- Preserve PR 97's cold Loading/header exclusion and PR 98's verified child-derived repository ordering. Replace only Git's moving warm-loading line with a stationary accent line breathing smoothly by opacity over 2–2.5 seconds; match the cold dot rhythm, retain existing work-only visibility and use static dim feedback for reduced motion.
- Trace first-build numbering through Crew's publisher and Git's renderer. Treat the published current round correctly: spawn, plan report, approval and first implementation show `Build`; only actual review-requested rework shows `Build 2` onward. Record exact upstream field/value evidence and do not mask incorrect upstream data.
- Make verdict labels such as Approved and Changes requested use the same guarded build-agent navigation, hover/focus/keyboard behavior and no-tooltip policy as Build, including dim inert unavailable targets.
- Resolve the target agent's pin/list association before its first content paint, reusing known links/cache and retaining calm feedback while genuinely unresolved; no list-to-pin intermediate frame.
- Quietly discard changed-during-detail and equivalent obsolete/raced reads, retaining last-good rows without transient notices and retrying through bounded existing scheduling.
- Make absent numbered keyboard navigation targets silent no-ops, explicitly Ctrl+number missing tabs and Alt+number missing spaces, without suppressing real command failures. This requires confirming a supported native-dispatch interception boundary; no new native patch or global keymap rewrite is implicitly authorized.
- After approval, capture before/after synthetic-native pictures and pixel measurements at 100% and 130%, outside the checkout, without accessing the person's running app or real Crew homes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Header-position Git body feedback and header suppression for zero-row sections, reconciling existing notice-only header exceptions while preserving loading and ordering; correct current-round stage captions.
- `workspace-experience`: Lowercase Spaces-only coordinator role text, with existing sidebar rails and terminal-pane badge unchanged.

## Impact

Target `src/plugins/git/mod/main.js`, the coordinator selected-tab/reveal projection as needed, and `src/features/spaces/main.js`. Reuse repository-header geometry without globally changing Files or other `panelMessage` consumers. Extend targeted Git loading, section/reveal, error and Spaces/terminal-role regressions plus the isolated native fixture. No new dependency, GitHub read, persistent setting, deployment, host patch or real-session operation is needed. Implementation and proof capture await plan approval.
