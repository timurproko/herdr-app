# Proposal

## Why

Git's empty and error messages use PR-row feedback geometry rather than repository-header geometry, causing visible movement when selected-tab content changes. Zero-PR headers add noise, and the Spaces coordinator label should read `crew` without changing the terminal badge.

## What Changes

- Align list-replacing empty, informational and actionable error text with the first repository header's text left edge, vertical position and row height in ordinary and coordinator Git.
- Omit repository headers, zero counts and chevrons whenever the current tab has no PRs for that repository, including notice-only sections; retain actionable notices without an empty header.
- Show a single tab-specific empty message when all repositories are authoritatively empty; omit only empty sections when other repositories have rows.
- Render the Spaces coordinator role label as lowercase `crew` locally, leaving the plugin's shared `Crew` label and terminal-pane badge unchanged.
- Preserve PR 97's pulsing cold Loading with no repository headers and PR 98's verified child-derived repository ordering.
- After approval, capture before/after synthetic-native pictures and pixel measurements at 100% and 130%, outside the checkout, without accessing the person's running app or real Crew homes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Header-position Git body feedback and header suppression for zero-row sections, reconciling existing notice-only header exceptions while preserving loading and ordering.
- `workspace-experience`: Lowercase Spaces-only coordinator role text, with existing sidebar rails and terminal-pane badge unchanged.

## Impact

Target `src/plugins/git/mod/main.js`, the coordinator selected-tab/reveal projection as needed, and `src/features/spaces/main.js`. Reuse repository-header geometry without globally changing Files or other `panelMessage` consumers. Extend targeted Git loading, section/reveal, error and Spaces/terminal-role regressions plus the isolated native fixture. No new dependency, GitHub read, persistent setting, deployment, host patch or real-session operation is needed. Implementation and proof capture await plan approval.
