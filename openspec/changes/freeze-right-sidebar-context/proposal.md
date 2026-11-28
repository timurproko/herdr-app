# Proposal

## Why

The right-sidebar pin currently remembers a tab's panel choice and visibility, but does not keep the displayed agent context when the person navigates away. The pin should instead hold the current sidebar source across agents and spaces until explicitly released.

## What Changes

- **BREAKING**: Replace multiple per-tab Files/Git visibility pins with one client-local sidebar pin capturing the currently displayed machine, folder and agent/space context plus view and visibility.
- Agent, tab, pane and space navigation will not retarget a pinned sidebar. Manually choosing Files or Git updates the pinned view without recapturing its source; unpin resumes following the current selection.
- Keep the existing pin icon, pressed styling, title dropdown, Refresh and Close controls. Add no messages, buttons, settings or native changes.
- Keep the held context in app-session memory only. Restart begins unpinned and follows the current agent; legacy per-tab pins migrate to unpinned without inventing a source.
- Replace the workspace spec's explicit per-tab pin scenario and qualify existing selected-agent Git/File rules with the sidebar's effective source while pinned.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: One captured right-sidebar context across native selection changes, manual view changes, unpin, state migration and restart.
- `plugin-integrations`: Files and ordinary/coordinator Git use the held sidebar context while pinned; selected-agent and navigation-following rules continue unchanged when unpinned.

## Impact

- Primary implementation: `src/shared/panel-state.js`, a small shared context helper, `src/ui/panel-pin.js`, Files/Git's `mod/location.js` adapters and their packaging mappings. Existing tab and panel-switch entrypoints retain captured-action safety.
- Focused fixtures: panel state/pin UI, Files/Git location and sidebar plugin availability. README and architecture descriptions will be corrected during implementation.
- Storage today: `custom.panel.tabs` version 1 contains `{default:{open,view},pins:{[qualifiedTabId]:{space,open,view}}}` via `shared`/`setShared`; `custom.panel.view` is the separate default reopen hint. Herdr persists public shared values locally, so valid tab pins can survive restart; they are not portable preferences. No source directory, terminal context or rendered content is stored by today's pin.
- Concurrent PR #104 (`fix/git-panel-render`) owns Git re-render/agent-link refresh and loading animation work. This change will not edit Git `mod/main.js`, `mod/agent-links.js`, render/animation helpers or that PR's tests; integration happens at context resolution, not rendering.
- No build/deploy or live app mutation during planning. Implementation requires plan approval and targeted tests only.
