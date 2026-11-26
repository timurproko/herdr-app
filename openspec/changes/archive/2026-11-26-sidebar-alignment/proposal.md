# Proposal

## Why

Spaces and Agents currently disagree on trailing columns, Crew styling and rename alignment. Git also duplicates update animation, while its existing moving line does not cover all loading states.

## What Changes

- Share a right-edge grid for machine headers, coordinator/child rows and Agents metadata; use the existing plain machine-label styling for Crew.
- Put space rename Cancel on the chevron axis with the existing tab-rename button spacing.
- Show connected child-space count only on collapsed coordinators, in the Agents group count rail; deliberately replace PR 88's no-count rule.
- Extend Git's existing under-header moving line to cold, warm and background work, then remove the header activity bulb and tooltip. Make the line Git's only loading animation; preserve cold Loading text and warm mounted rows.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: shared sidebar columns, plain Crew labels, aligned inline rename and collapsed-only connected-space counts.
- `plugin-integrations`: one complete-lifecycle Git loading animation, without a header bulb or warm body Loading.

## Impact

Private renderers in `src/features/spaces/main.js`, shared `src/ui/ui.js` / `src/ui/panel-kit.js`, and `src/plugins/git/mod/main.js`; Agents supplies the existing number/label reference. Targeted geometry, rename, fleet and Git lifecycle fixtures plus disposable native screenshots and documentation will be updated. No native patches, installations, live sessions, transport-policy changes or new visual pattern. Current branch already equals main `cccc239`, including merged PR 92.
