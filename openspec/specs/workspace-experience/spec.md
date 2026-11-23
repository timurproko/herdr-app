# workspace-experience Specification

## Purpose
Describe the Custom layout's main workspace interactions and safety boundaries without turning every visual detail or feature control into an independent capability.

## Requirements

### Requirement: Composed Custom workspace
The app SHALL provide a Custom layout and theme with coordinated workspace, tab, pane, settings and status controls while preserving native terminal/session ownership. Custom interactions SHALL use supported host operations except for separately reviewed compatibility exceptions.

#### Scenario: Custom layout is selected
- **WHEN** the user explicitly enables the Custom layout on a supported host
- **THEN** its workspace controls compose the selected spaces, tabs, panes and enabled panels
- **AND** selecting the layout does not replace native binaries or automatically import personal profiles

### Requirement: Target-bound workspace operations
Rename, close, panel-pin and workspace actions SHALL preserve their captured machine-qualified target rather than silently retarget current focus. Cancellation SHALL leave that target unchanged. Ordinary native operations outside Custom entrypoints SHALL retain their native behavior.

#### Scenario: Focus changes during a confirmation
- **WHEN** a user opens a close confirmation and then focuses another space
- **THEN** confirmation remains bound to the originally captured space
- **AND** cancelling does not close either space

#### Scenario: Per-tab sidebar pin
- **WHEN** a user pins a panel choice and open state for one tab and navigates to another tab
- **THEN** the pinned choice is retained for its original tab without replacing other tabs' remembered choices

### Requirement: Literal profile and shell launch behavior
Selecting another shell SHALL open a new native tab rather than replace an existing terminal. Profile launch requests SHALL preserve literal command arguments and machine identity. A profile requiring a coordinator role SHALL refuse launch when that role's prerequisites cannot be established, without silently falling back to an ordinary launch.

#### Scenario: Shell selection with an active terminal
- **WHEN** the user selects another shell from the Custom launch controls
- **THEN** the host opens a new tab using that shell
- **AND** the existing terminal is not restarted, replaced or given injected input

#### Scenario: Required role unavailable
- **WHEN** a role-marked profile lacks its configured repository or another required role prerequisite
- **THEN** the app reports the refusal without launching an ordinary unmarked session

### Requirement: Narrow same-machine tab movement
Moving a tab SHALL retain its terminals and splits and require minimum supported versions, required capabilities, understood generation/document shape and same-machine destinations, not exact reviewed versions. Unknown identity, unsupported targets or stale state SHALL fail closed. Uncertain results SHALL NOT be treated as success or replayed. The menu SHALL use consistent outline chevrons and readable wrapping refusals.

#### Scenario: Supported move to another space
- **WHEN** a user explicitly moves a supported tab to another space on the same verified machine
- **THEN** the tab's running terminals and split structure are preserved
- **AND** their working directories are not changed by the move

#### Scenario: Unknown host or different machine
- **WHEN** a move targets a different machine, lacks a required method or command, uses an unknown generation/document shape, or is below App 0.1.15 or Core 0.1.19
- **THEN** the app refuses the document mutation with an actionable reason
- **AND** does not rebuild the host or create a replay job

#### Scenario: Unreviewed newer host with capabilities
- **WHEN** App and Core versions are newer than last reviewed but meet minimum versions, generation, required capabilities and all target/shape/safety checks
- **THEN** the submenu lists same-machine destination spaces and permits the explicit move
- **AND** absence from a reviewed-version list is not a refusal, including on local routing and remote targets

#### Scenario: Unreviewed remote routing without a capability
- **WHEN** a newer local routing Core or target Core lacks a required method or reports an unknown generation
- **THEN** remote moving refuses before a document mutation with the actual incompatibility
- **AND** a complete capability set at the other Core cannot bypass that refusal

#### Scenario: Navigation chevron consistency
- **WHEN** the parent tab menu displays Move to and the submenu displays Back
- **THEN** Move to has a leading right-pointing outline chevron matching Back's left-pointing outline chevron in size, color and icon-column alignment
- **AND** Move to has no duplicate trailing text arrow, while actual destination rows retain their numbered colored badges

#### Scenario: Readable refusal
- **WHEN** preflight rejects a missing capability, unsupported generation, below-minimum version or unsafe document shape
- **THEN** the submenu retains Back and shows the detected facts and unmet requirement in a wrapping, inert explanation without a single-line ellipsis
- **AND** its content has sufficient layout height and remains reachable within the bounded scroll area
- **AND** Left or Escape returns to the parent menu without submitting a move

### Requirement: Best-effort terminal copy-on-select feedback
On supported Windows hosts, Custom SHALL observe terminal selections once window facts become available and provide best-effort copy-on-select feedback through its custom centered terminal-font popup, not the app's standard notification. Missing startup facts SHALL NOT permanently disable observation. Feedback SHALL NOT expose copied contents or change terminal input, focus, selection, or clipboard contents.

#### Scenario: Cold startup
- **WHEN** window/platform facts are initially unavailable and Windows facts are later published
- **THEN** the observer begins tracking selections without a reload or restart

#### Scenario: Mouse selection copy
- **WHEN** copy-on-select is enabled and a settled terminal selection is followed by a readable nonempty clipboard update
- **THEN** the observer shows one custom centered terminal-font popup with the copied character count
- **AND** the native selection and clipboard remain unchanged by the observer

#### Scenario: Original custom presentation
- **WHEN** terminal copy feedback is displayed in its source tab
- **THEN** the popup retains revision 42d2325's bottom-center placement within the terminal area, terminal font, white text, theme popover background and border, rounded geometry and fade/slide animation
- **AND** its wording is “Copied N chars to clipboard” with singular “char” for one character
- **AND** the standard notification system receives no terminal-copy notification

#### Scenario: Popup lifetime and source tab
- **WHEN** the popup is shown and no newer settled copy replaces it
- **THEN** it fades/slides in over 180 ms after a 16 ms arming delay, stays for 2000 ms and fades/slides out over 180 ms
- **AND** it is not displayed in another tab

#### Scenario: Copy-on-select disabled
- **WHEN** copy-on-select is disabled while a selection is pending
- **THEN** pending feedback is canceled and no new selection feedback is scheduled
- **AND** re-enabling resumes observation with a fresh clipboard baseline

#### Scenario: Canceled or stale selection
- **WHEN** a pending selection is cleared, superseded, or no longer belongs to the focused terminal/tab
- **THEN** the observer does not show its stale custom popup

#### Scenario: Same-text selection inference
- **WHEN** a new settled selection infers a copy of the same nonempty clipboard text
- **THEN** the observer produces at most one popup for that selection
- **AND** a later clipboard update for that selection does not produce another popup

#### Scenario: Best-effort limitations
- **WHEN** no copy-success event is available from the host
- **THEN** feedback remains explicitly documented as selection-and-clipboard inference, not guaranteed copy confirmation
- **AND** explicit or repeated shortcut copies with unchanged selections are not promised reliable notifications
- **AND** a held drag or unrelated clipboard activity can still be mistaken for a completed copy
