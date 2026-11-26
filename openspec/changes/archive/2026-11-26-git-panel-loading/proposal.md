# Proposal

## Why

Git's cold coordinator Loading dot is static and sits above the ordinary panel's Loading position; ordinary entry can also display a zero-count repository header above Loading. The requested presentation is one pulsing cold Loading message, label-only Open/Closed tabs, and no repository headers until content is ready.

## What Changes

- Reuse the shared pulsing Loading message in both Git views, with identical vertical placement, and suppress the moving header line whenever body Loading is shown.
- Make cold Loading and repository section headers/counts mutually exclusive in ordinary and coordinator views. Preserve visible actionable failures without section headers while cold work remains unresolved.
- Remove Open/Closed count bubbles and their empty reservations in both views, retaining repository section counts and existing tab selection behavior.
- Investigate the reported native interrupted-render banner with four Open PRs, multiple repositories and frequent synthetic background updates; fix a reproduced local cause if found, otherwise report the limitation honestly.
- Preserve warm lists, pinning, pagination, failure semantics, bounded rendering and repository ordering. Update the conflicting loading/tab documentation and regression expectations.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Cold loading exclusivity, pulsing feedback/placement and label-only Git tabs; preserve existing render-failure and warm-publication contracts.

## Impact

Focused presentation changes in `src/plugins/git/mod/main.js`, existing shared `panelMessage` usage, relevant Git loading/tab/inventory/entry tests, and feature documentation. Reuse existing synthetic native fixtures for 100% and 130% screenshots and interruption investigation after approval. No new dependencies, native binary changes, installed-app edits, GitHub reads against real tasks, provider authority changes or coordinator repository-order changes.
