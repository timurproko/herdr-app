# Spec Delta

## MODIFIED Requirements

### Requirement: Optional coordinator fleet attachment
Settings → Spaces SHALL expose **Connect fleet space to coordinator**, defaulting off and portable as a boolean. When enabled with Crew, a verified same-machine fleet SHALL appear below its coordinator with its own numbered badge using the coordinator's badge colour. The expanded coordinator SHALL show a muted outline chain immediately before its Crew tag. Fleet names SHALL align with ordinary names and use ordinary selected and inactive text states.

#### Scenario: First use and disabled setting
- **WHEN** the preference is absent or false
- **THEN** spaces retain their existing independent numbering, Crew tags, ordering and selection behavior
- **AND** no attachment-specific discovery is started

#### Scenario: Connected fleet
- **WHEN** the preference is true, Crew is enabled and live ownership identifies one coordinator and one fleet on the same machine
- **THEN** the fleet is displayed directly below the coordinator with its own ordinary list-number badge, using the same 16px box, rounded shape and vertical centre as other numbered badges
- **AND** the fleet badge uses the coordinator's resolved colour without changing the fleet's saved colour, and no chain appears inside either badge or as an elbow or connector line
- **AND** the fleet name begins at the same left edge as the coordinator and ordinary space names, without indentation, and uses muted text only while inactive
- **AND** the coordinator has a small muted outline chain immediately before its Crew tag, with the same size, slot, gap and vertical alignment as a worktree marker and no filled badge background
- **AND** both expanded rows display the same Crew pill styling at the trailing tag edge, after any ahead/behind counts and worktree marker, and unrelated plugin tags remain
- **AND** a worktree marker without plugin tags retains its existing right-edge alignment with the machine chevron

#### Scenario: Compact rail attachment
- **WHEN** the verified pair is shown in the compact rail
- **THEN** both rows retain their own ordinary numbered badges and use the coordinator's resolved badge colour, with the same box size and centering as other numbered badges
- **AND** no chain, elbow or connector lines are drawn
- **AND** the fleet remains separately selectable with its existing name or directory tooltip and ordinary hover/selection behaviour
- **AND** the rail remains badge-only without added Crew pills or names

#### Scenario: Coordinator recolouring
- **WHEN** the coordinator's space colour changes while an attached pair is displayed
- **THEN** both numbered badges use that same resolved colour in expanded and compact views and in either member's drag chip
- **AND** the fleet's own saved colour and Automatic setting remain unchanged and do not override the attached display colour

#### Scenario: Colour chosen from the attached fleet
- **WHEN** the user opens the attached fleet's colour menu and chooses a colour or Automatic while the captured pair remains freshly verified
- **THEN** the palette reflects and changes the captured coordinator's colour, keeping both attached badges and either drag chip synchronized
- **AND** mouse and keyboard selection have the same result without overwriting the fleet's saved colour or Automatic setting
- **AND** other menu actions remain bound to the clicked fleet space, without changing selection, names, tabs or terminals

#### Scenario: Pair changes while its colour menu is open
- **WHEN** the captured pair changes, a member disappears, attachment is disabled or fresh action verification is unavailable before a colour choice
- **THEN** no colour is written through that stale pair action and it does not silently retarget another coordinator or fall back to changing the fleet's independent colour
- **AND** reopening after confirmed detachment uses the fleet's ordinary independent colour controls

#### Scenario: Independent navigation
- **WHEN** the user clicks the attached fleet rather than dragging it
- **THEN** the fleet space itself is selected without selecting the coordinator or moving its terminals
- **AND** clicking the coordinator continues to select that space itself

#### Scenario: Fleet name selection and hover
- **WHEN** an attached fleet is displayed in active, inactive or hovered states
- **THEN** its active name has exactly the same selected text colour and normal weight as an ordinary selected space, and its inactive name retains ordinary muted styling
- **AND** ordinary selected backgrounds, hover treatment, tooltip and drag-time interaction suppression apply without an attached-only text override
- **AND** compact rail selection/hover matches ordinary numbered-space controls without adding a name label

#### Scenario: Unverified or broken relationship
- **WHEN** no prior verified attachment exists, or completed evidence establishes an absent, ambiguous, cross-machine or changed relationship
- **THEN** the app does not attach unrelated spaces or infer a relationship from their names
- **AND** affected spaces use ordinary presentation without changing focus or sessions
- **AND** transport uncertainty during refresh is handled by bounded last-verified presentation rather than an intermediate detached frame

#### Scenario: Disable or preference round trip
- **WHEN** the user disables attachment or disables Crew
- **THEN** linked presentation and the coordinator chain are removed without closing or relocating either space or replaying an earlier order
- **AND** the fleet's numbered badge shows its own saved colour and Automatic behaviour again, as it does after confirmed unlinking
- **AND** exporting and importing the preference preserves only its boolean, not homes, task records, terminal IDs or pair bindings

### Requirement: Linked spaces reorder as one block
Dragging either member of a verified coordinator/fleet pair SHALL reorder both as one same-machine block, with the coordinator before the fleet. The drag SHALL NOT split another linked block, cross machines, select a space, move tabs or restart terminals. Cancellation and stale relationships SHALL NOT commit an order change. Unlinked spaces SHALL retain ordinary reordering.

#### Scenario: Drag the coordinator or the fleet
- **WHEN** the user drags either linked row to a valid position in its own machine group
- **THEN** the final displayed and acknowledged native order puts coordinator then fleet at that position
- **AND** both source rows remain dimmed with one external block insertion marker
- **AND** the floating preview contains exactly one chip showing the grabbed row's own numbered badge and name, without stacked rows or a chain
- **AND** the active space and running terminals are unchanged

#### Scenario: Coordinator-origin chip
- **WHEN** the user starts dragging the coordinator row of an attached pair
- **THEN** the single floating chip shows that coordinator's numbered badge and name with the same resolved fill as its sidebar row
- **AND** cancellation retains that chip identity through its return and fade

#### Scenario: Fleet-origin chip
- **WHEN** the user starts dragging the attached fleet row
- **THEN** the single floating chip shows the fleet's own list number and name with the coordinator's resolved badge colour, matching the fleet sidebar badge
- **AND** the chip does not substitute the coordinator's number or name, show a chain or use the fleet's independent saved colour
- **AND** cancellation retains that chip identity through its return and fade

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
- **AND** its single preview chip retains that space's own numbered badge, independent colour and name
- **AND** repository discovery does not regroup unrelated worktree spaces

### Requirement: Aligned space worktree markers
In the expanded Spaces sidebar, plugin tags SHALL occupy the existing tag-only right edge, after any ahead/behind counts, worktree marker and attached-coordinator chain. Worktree markers on rows without tags SHALL retain their existing alignment with the machine header's fold chevron. Worktree-icon visibility and rename behavior SHALL remain unchanged.

#### Scenario: Ordinary and attached worktree rows
- **WHEN** a local or remote machine group shows ordinary worktree spaces or an attached fleet with its worktree marker enabled and no plugin tags
- **THEN** every visible worktree marker is centred on the header chevron's vertical axis with the same right inset
- **AND** the fleet's left-aligned name and ordinary numbered badge do not move the marker away from that axis

#### Scenario: Worktree marker beside plugin tags
- **WHEN** a worktree space also displays a Crew tag or another plugin tag
- **THEN** the row's order is name, any ahead/behind counts, worktree marker, attached-coordinator chain if present, then plugin tags
- **AND** the chain is immediately before the coordinator's Crew tag, with matching worktree icon size, muted outline colour, gap and vertical alignment and no filled background
- **AND** when multiple plugin tags exist, unrelated tag content, tooltips and relative order remain while the chain and Crew pill stay adjacent at the trailing edge
- **AND** the final tag shares the same right edge as a tag-only row instead of being displaced by the markers
- **AND** ordinary rows retain their existing order with attachment off

#### Scenario: Hidden marker and renaming
- **WHEN** worktree icons are switched off or a space is being renamed
- **THEN** that row shows no worktree marker, preserving the existing visibility and editing behavior
- **AND** the worktree visibility switch does not hide an attached coordinator's independent chain marker, but renaming hides both markers and tags
- **AND** visible plugin tags retain their trailing edge when the worktree marker is hidden, and renaming still hides the tags

### Requirement: Stable verified fleet presentation during refresh
Verified fleet presentation SHALL be a persisted property of exact pair identity, not a temporary refresh mode. Unrelated changes SHALL NOT emit detached frames. Persisted facts SHALL restore the first native-space frame after restart or reload while background verification runs. Failures SHALL retain the pair while both native spaces exist; only completed contradictory evidence, explicit disablement or missing native spaces SHALL detach it. Retained display SHALL NOT authorize actions.

#### Scenario: Successful refresh cycle
- **WHEN** an attached fleet undergoes a delayed Crew status refresh from Git or Spaces and the completed result verifies the same pair
- **THEN** every intermediate sidebar projection retains the same coordinator/fleet block, own numbered badges with shared coordinator colour, coordinator chain and visible Crew pills on both expanded rows
- **AND** no intermediate frame reverts the fleet to its independent colour or position, removes the coordinator chain or loses an attached-row Crew pill

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
- **THEN** the first available native-space frame restores its attached block, own numbered badges with shared coordinator colour, coordinator chain and Crew pills on both expanded rows from persisted sanitized identity facts before a status read completes
- **AND** background verification can update or disprove that pair without an intermediate detached frame
- **AND** persisted facts contain no reports, task records, PR inventory, credentials or transcripts and are not exported as portable preferences

#### Scenario: Relevant identity changes during a read
- **WHEN** the pair's owner/home or adoption evidence changes while verification is pending
- **THEN** actions lose eligibility immediately but the previous verified display remains until the new read completes
- **AND** missing native space identities or explicit disablement detach immediately rather than leaving ghost rows

### Requirement: Independent attached-space identity and tags
Attached coordinator and fleet rows SHALL remain independently selectable native spaces with distinct tabs and terminals. Both expanded rows SHALL display the existing Crew pill with matching styling and a common trailing tag edge after counts and worktree markers. Only the attached coordinator SHALL show a muted outline chain immediately before its Crew tag. Unrelated plugin tags SHALL remain.

#### Scenario: Attached row selection and tags
- **WHEN** a verified coordinator and fleet are attached in Spaces
- **THEN** clicking either row selects that native space without relocating tabs or terminals
- **AND** the active fleet name uses ordinary selected-space text colour and normal weight, while inactive fleet text remains muted and names retain their aligned left edge
- **AND** both expanded rows display their Crew pill and unrelated plugin tags remain
- **AND** when Crew is their only tag, the coordinator and fleet pills share the same right edge even if either row has a worktree marker and ahead/behind counts and only the coordinator has the chain
- **AND** the coordinator retains its coordinator tooltip and the fleet uses its worker tooltip

#### Scenario: Attachment removed
- **WHEN** the relationship is confirmed broken or attachment is disabled
- **THEN** the rows retain their separate native identities and ordinary plugin tag rules without a coordinator chain or inherited fleet colour
- **AND** disabling Crew still hides Crew tags without closing or relocating either space
