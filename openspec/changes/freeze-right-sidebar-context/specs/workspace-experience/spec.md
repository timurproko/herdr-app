# Spec Delta

## MODIFIED Requirements

### Requirement: Target-bound workspace operations
Rename, close, panel-pin and workspace actions SHALL preserve their captured machine-qualified target rather than silently retarget current focus. Cancellation SHALL leave that target unchanged. Ordinary native operations outside Custom entrypoints SHALL retain their native behavior.

#### Scenario: Focus changes during a confirmation
- **WHEN** a user opens a close confirmation and then focuses another space
- **THEN** confirmation remains bound to the originally captured space
- **AND** cancelling does not close either space

#### Scenario: Per-tab sidebar pin
- **WHEN** a user pins the displayed right sidebar and navigates to another agent, tab, pane or space
- **THEN** the sidebar retains its captured machine, folder and agent/space source, view and open state rather than restoring a per-tab choice
- **AND** native selection changes normally without changing the held sidebar source

## ADDED Requirements

### Requirement: One held right-sidebar context
The header pin SHALL hold one sidebar source and view across agents and spaces until unpinned. Changing Files or Git while pinned SHALL change only the held view. Unpinning SHALL resume following the current native selection with the ordinary shared panel choice. Pinning SHALL NOT focus or mutate any agent, terminal, tab or space.

#### Scenario: Switch views after navigating away
- **WHEN** Files is pinned for agent A, agent B in another space is selected and Git is chosen from the sidebar title
- **THEN** Git uses A's captured source and remains pinned rather than adopting B
- **AND** choosing Files again retains A's captured folder

#### Scenario: Unpin from another agent
- **WHEN** the sidebar is held for A and the user unpins while B is selected
- **THEN** the sidebar releases A and follows B using the ordinary shared view and visibility
- **AND** it does not select A, restore an old per-tab pin or alter either agent

#### Scenario: Close and reopen while pinned
- **WHEN** the person closes a pinned sidebar, navigates elsewhere and reopens it with the existing sidebar toggle
- **THEN** the pin and held source remain, while visibility changes explicitly
- **AND** no new control, information message or option is added

#### Scenario: Source directory changes after capture
- **WHEN** the original terminal changes directory while the sidebar is pinned
- **THEN** the held directory does not follow that change or the newly selected agent
- **AND** existing Refresh and live data updates remain scoped to the held source rather than producing a static screenshot

### Requirement: Session-only sidebar pin and compatibility
The held sidebar context SHALL exist only in the running app session, excluded from durable and portable preferences. Restart SHALL begin unpinned and follow the current agent. Legacy per-tab choices SHALL migrate without inventing a held source. Unknown future formats SHALL remain untouched and SHALL NOT enable pin changes.

#### Scenario: Restart with a valid source
- **WHEN** the app restarts after a sidebar was pinned, even if its source identities still exist
- **THEN** the pin starts unpressed and the sidebar follows the current agent
- **AND** no held context, rendered inventory or read/action authority is restored

#### Scenario: Old per-tab state
- **WHEN** the app encounters the previous per-tab view and visibility records that contain no captured content source
- **THEN** it preserves their shared default and initializes the new single pin as unpressed
- **AND** it does not pick an arbitrary old pin or infer an agent from current selection

#### Scenario: Missing or disconnected source
- **WHEN** the held source disappears or its machine becomes unavailable
- **THEN** the sidebar never substitutes the currently selected agent or another machine with a matching local identifier
- **AND** existing unavailable, last-good or empty behavior applies without new pin-specific messages, and Unpin remains available
