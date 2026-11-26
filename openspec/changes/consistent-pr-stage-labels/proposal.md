# Proposal

## Why

Initial build tasks currently fall through to a title-line robot because stage projection requires an assigned managed GitHub label, whereas later build rounds already have one. Stage chips also have unwanted hover popups and cramped horizontal padding.

## What Changes

- Remove stage-control tooltips, including stage-only aliases, agent names and findings leaking through parent label/metadata hover; retain accessible actions and unrelated metadata tooltips.
- Increase stage-chip side padding from 2px to 6px using the existing plain-chip styling, height, colours and bottom-right anchor.
- Project an unlabelled Open/Draft PR with a verified live ship/fix target as Build in the same bottom-right slot, with Build 2, Build 3 and later captions only when valid completed-review round metadata exists.
- Treat a planning-only ship/fix task with a linked PR as Build too: this identifies the build-owner action, not proof implementation has started. No PR means no row or stage.
- Preserve assigned managed-stage precedence, Review/Approved semantics, inert unavailable controls and existing guarded focus/pin motion. Non-build fallback agent navigation is not reclassified as a build status.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Consistent initial-build stage projection and tooltip-free, comfortably padded stage controls.

## Impact

Limit runtime edits to Git PR row stage/label presentation and its existing target resolution boundary, plus focused tests and documentation. Likely files are `src/plugins/git/mod/main.js`, row-label helpers if needed, and existing stage/agent-link tests. No Git panel loading, tab-counter, repository-section ordering, Crew protocol, GitHub label writes, polling or deployment changes.
