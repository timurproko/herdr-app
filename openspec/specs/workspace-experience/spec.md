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

### Requirement: Optional coordinator fleet attachment
Settings → Spaces SHALL expose **Connect fleet space to coordinator**, defaulting off and portable as a boolean. When enabled with Crew, a verified same-machine fleet SHALL appear below its coordinator with a muted vector elbow replacing its numbered badge. Only the attached fleet SHALL omit its Crew tag; the coordinator SHALL retain its Crew tag. Both rows SHALL remain independently selectable. Native spaces, tabs and terminals SHALL remain distinct.

#### Scenario: First use and disabled setting
- **WHEN** the preference is absent or false
- **THEN** spaces retain their existing independent numbering, Crew tags, ordering and selection behavior
- **AND** no attachment-specific discovery is started

#### Scenario: Connected fleet
- **WHEN** the preference is true, Crew is enabled and live ownership identifies one coordinator and one fleet on the same machine
- **THEN** the fleet is displayed directly below the coordinator with a thin muted elbow line descending from beneath the coordinator's numbered badge and turning right toward the inset muted fleet name
- **AND** the elbow is a vector line in the badge position, not a chain/link glyph or text character
- **AND** the coordinator retains its Crew tag, only the attached fleet omits its Crew tag, and unrelated plugin tags remain
- **AND** the existing fleet worktree icon remains at the row's right edge when enabled

#### Scenario: Compact rail attachment
- **WHEN** the verified pair is shown in the compact rail
- **THEN** the coordinator retains its numbered badge and the fleet shows the same thin muted vector elbow motif in its badge slot
- **AND** the fleet remains separately selectable with its existing name or directory tooltip and no chain/link glyph

#### Scenario: Independent navigation
- **WHEN** the user clicks the attached fleet rather than dragging it
- **THEN** the fleet space itself is selected without selecting the coordinator or moving its terminals
- **AND** clicking the coordinator continues to select that space itself

#### Scenario: Unverified or broken relationship
- **WHEN** no prior verified attachment exists, or completed evidence establishes an absent, ambiguous, cross-machine or changed relationship
- **THEN** the app does not attach unrelated spaces or infer a relationship from their names
- **AND** affected spaces use ordinary presentation without changing focus or sessions
- **AND** transport uncertainty during refresh is handled by bounded last-verified presentation rather than an intermediate detached frame

#### Scenario: Disable or preference round trip
- **WHEN** the user disables attachment or disables Crew
- **THEN** linked presentation is removed without closing or relocating either space or replaying an earlier order
- **AND** exporting and importing the preference preserves only its boolean, not homes, task records, terminal IDs or pair bindings

### Requirement: Linked spaces reorder as one block
Dragging either member of a verified coordinator/fleet pair SHALL reorder both as one same-machine block, with the coordinator before the fleet. The drag SHALL NOT split another linked block, cross machines, select a space, move tabs or restart terminals. Cancellation and stale relationships SHALL NOT commit an order change. Unlinked spaces SHALL retain ordinary reordering.

#### Scenario: Drag the coordinator or the fleet
- **WHEN** the user drags either linked row to a valid position in its own machine group
- **THEN** the final displayed and acknowledged native order puts coordinator then fleet at that position
- **AND** both source rows share drag feedback, with one block preview and one external insertion marker
- **AND** the active space and running terminals are unchanged

#### Scenario: Drop beside another linked pair
- **WHEN** a linked block or an ordinary space is dropped on a member of another linked block
- **THEN** the destination resolves to an edge of that block rather than between its members

#### Scenario: Cancellation or relationship changes
- **WHEN** a gesture is cancelled, a member disappears, ownership changes, or the switch is disabled before release
- **THEN** no stale block move is committed
- **AND** cancellation never activates the grabbed row

#### Scenario: Native move acknowledgements fail
- **WHEN** the host does not acknowledge a public ordering command or the captured membership changes during a multi-command block move
- **THEN** the app stops the remaining sequence and reports the failure or uncertain result
- **AND** it does not restore an old whole document or persist a retry for a later session

#### Scenario: Ordinary spaces and worktrees
- **WHEN** attachment is off or a dragged space has no verified link
- **THEN** the existing same-machine independent reorder behavior is preserved
- **AND** repository discovery does not regroup unrelated worktree spaces

### Requirement: Aligned space worktree markers
In the expanded Spaces sidebar, visible Git worktree markers SHALL occupy the same right-edge vertical axis as the machine header's fold chevron, for ordinary spaces and attached fleet rows. Any adjacent Crew or other plugin tag SHALL appear to the marker's left without shifting that axis. Worktree-icon visibility and rename behavior SHALL remain unchanged.

#### Scenario: Ordinary and attached worktree rows
- **WHEN** a local or remote machine group shows ordinary worktree spaces or an attached fleet with its worktree marker enabled
- **THEN** every visible worktree marker is centred on the header chevron's vertical axis with the same right inset
- **AND** the fleet's child inset does not move the marker away from that axis

#### Scenario: Worktree marker beside plugin tags
- **WHEN** a worktree space also displays a Crew tag or another plugin tag
- **THEN** the tag appears to the left of the trailing worktree marker
- **AND** the marker retains the same centre line as rows without tags and the machine header chevron

#### Scenario: Hidden marker and renaming
- **WHEN** worktree icons are switched off or a space is being renamed
- **THEN** that row shows no worktree marker, preserving the existing visibility and editing behavior

### Requirement: Stable verified fleet presentation during refresh
Verified fleet presentation SHALL be a persisted property of exact pair identity, not a temporary refresh mode. Unrelated changes SHALL NOT emit detached frames. Persisted facts SHALL restore the first native-space frame after restart or reload while background verification runs. Failures SHALL retain the pair while both native spaces exist; only completed contradictory evidence, explicit disablement or missing native spaces SHALL detach it. Retained display SHALL NOT authorize actions.

#### Scenario: Successful refresh cycle
- **WHEN** an attached fleet undergoes a delayed Crew status refresh from Git or Spaces and the completed result verifies the same pair
- **THEN** every intermediate sidebar projection retains the same coordinator/fleet block, fleet elbow and Crew-tag visibility
- **AND** no intermediate frame shows the fleet's ordinary numbered badge, independent position or Crew tag

#### Scenario: Unrelated model and focus changes
- **WHEN** spaces, tabs or panes unrelated to the pair are added, removed, renamed, reordered or selected on this or another machine, or focus/relay/Git refresh events occur
- **THEN** none of those changes emits even one detached projection of the verified pair
- **AND** only the two spaces' identities, coordinator home/owner and fleet adoption facts participate in binding-dependent invalidation
- **AND** a pending or subsequent successful same-binding refresh emits no detached sidebar projection

#### Scenario: Failed or timed-out refresh
- **WHEN** a previously verified pair's next status read fails, is malformed or times out
- **THEN** its prior verified presentation remains while its two native spaces exist, until a completed read disproves it or the setting/plugin is turned off
- **AND** elapsed time alone does not detach an unchanged pair, including long outages beyond the former 60-second window
- **AND** retention is bounded to the exact machine/space/home identities with at most one verified pair per known machine, never fresh action authorization

#### Scenario: Completed relationship change
- **WHEN** a successful completed read establishes that the fleet or coordinator is gone or ownership identifies a different valid pair
- **THEN** the prior attachment is removed or replaced atomically without a temporary unknown publication
- **AND** a late result from an older read cannot resurrect it

#### Scenario: No verified history
- **WHEN** the first read is pending, fails or produces ambiguous evidence and no previously verified pair exists in memory or durable local identity facts
- **THEN** the sidebar remains unattached rather than creating a relationship from names, role hints or an unverified snapshot

#### Scenario: Restart, mod reload or layout switch
- **WHEN** a previously verified pair's two native spaces still exist after app restart, mod hot reload or a layout switch
- **THEN** the first available native-space frame restores its attached block, elbow and Crew-tag treatment from persisted sanitized identity facts before a status read completes
- **AND** background verification can update or disprove that pair without an intermediate ordinary-space frame
- **AND** persisted facts contain no reports, task records, PR inventory, credentials or transcripts and are not exported as portable preferences

#### Scenario: Relevant identity changes during a read
- **WHEN** the pair's owner/home or adoption evidence changes while verification is pending
- **THEN** actions lose eligibility immediately but the previous verified display remains until the new read completes
- **AND** missing native space identities or explicit disablement detach immediately rather than leaving ghost rows
