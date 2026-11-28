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
Settings → Spaces SHALL expose **Connect fleet space to coordinator**, defaulting off and portable as a boolean. Enabled verified same-machine fleets SHALL appear as indented numbered children using the Agents child-row connector pattern and the coordinator's badge colour. Neither row SHALL show a chain; only the coordinator SHALL show Crew within an attached block. Independent native identities and ordinary selected/inactive text states SHALL remain.

#### Scenario: First use and disabled setting
- **WHEN** the preference is absent or false
- **THEN** spaces retain independent numbering, ordinary Crew tag rules, ordering and selection behavior
- **AND** no attachment-specific discovery is started

#### Scenario: Connected fleet
- **WHEN** attachment and Crew are enabled and live ownership identifies one coordinator and one fleet on the same machine
- **THEN** the fleet appears directly below the coordinator as an indented child with the same connector shape, stroke, colour and spacing as an Agents child row
- **AND** the fleet retains its own native-selection number in the ordinary 16px rounded badge, using the coordinator's resolved colour without changing the fleet's saved colour
- **AND** neither row has a chain icon, the coordinator alone has the attached block's Crew pill, and unrelated plugin tags remain
- **AND** inactive child names use ordinary muted styling and selected names retain ordinary selected foreground and weight
- **AND** worktree markers and ahead/behind counts remain available without displacing the numbered child badge or connector

#### Scenario: Compact rail attachment
- **WHEN** a verified pair is shown in the compact rail
- **THEN** both spaces retain separately selectable numbered badges in the existing size and position, using the coordinator's colour
- **AND** the rail remains badge-only without chain icons, connector lines, Crew pills or names
- **AND** expanded-mode parent folding does not hide compact badges, and ordinary hover and name/directory tooltips remain

#### Scenario: Coordinator recolouring
- **WHEN** the coordinator's colour changes while attached
- **THEN** both badges and either member's drag chip use that colour in expanded and compact views
- **AND** the fleet's saved colour and Automatic setting remain untouched

#### Scenario: Colour chosen from the attached fleet
- **WHEN** the fleet's colour menu captures a freshly verified unchanged pair and the user chooses a colour or Automatic
- **THEN** the palette reflects and changes the captured coordinator's colour and synchronizes both badges and either drag chip
- **AND** mouse and keyboard choices leave the fleet's saved colour and Automatic flag unchanged
- **AND** other menu actions target the clicked fleet without moving focus, names, tabs or terminals

#### Scenario: Pair changes while its colour menu is open
- **WHEN** the captured pair changes, a member disappears, attachment is disabled or fresh action verification becomes unavailable
- **THEN** no stale colour write occurs and the action does not silently retarget another coordinator or the fleet's independent colour
- **AND** reopening after detachment uses the fleet's independent colour controls

#### Scenario: Independent navigation
- **WHEN** the user clicks a visible child rather than dragging it
- **THEN** that native fleet is selected, not the coordinator, without moving terminals
- **AND** clicking the coordinator selects the coordinator, while its separate fold control changes only disclosure

#### Scenario: Fleet name selection and hover
- **WHEN** an attached child is selected, inactive or hovered
- **THEN** its text, selected background, hover and drag-time interaction suppression match ordinary space behavior while retaining its child indentation
- **AND** compact selection and hover remain ordinary numbered-space controls without names

#### Scenario: Unverified or broken relationship
- **WHEN** no prior verified attachment exists, or completed evidence establishes an absent, ambiguous, cross-machine or changed relationship
- **THEN** unrelated spaces are not attached by name and remain ordinary spaces in their original machine groups without changing focus or sessions
- **AND** no connector crosses machine headers and no cross-machine reorder or parent fold is introduced
- **AND** uncertain refreshes retain valid remembered presentation rather than briefly detaching it

#### Scenario: Disable or preference round trip
- **WHEN** attachment or Crew is disabled
- **THEN** nesting, attached parent disclosure and inherited child colour disappear without closing or moving either space or replaying an earlier order
- **AND** independent Crew tag rules and the fleet's saved colour and Automatic setting return, as on confirmed unlinking
- **AND** only the preference boolean is exported, not fold identities, homes, tasks, terminals or pair bindings

#### Scenario: Numbered badges identify native selection targets
- **WHEN** attachment projects a fleet ahead of an unrelated space without changing native order
- **THEN** expanded rows, compact badges and drag chips retain native selection-command and shortcut numbers
- **AND** native order coordinator, unrelated space, fleet displays as coordinator 1, child fleet 3, unrelated 2, and detachment restores native row order
- **AND** attachment never silently reorders native spaces or remaps shortcuts to make displayed digits consecutive

### Requirement: Linked spaces reorder as one block
Dragging a displayed coordinator SHALL reorder its whole same-machine block, coordinator first. Dragging a connected child SHALL reorder only that child among its siblings. Remembered last-verified identity SHALL suffice for space-only ordering. Gestures SHALL NOT cross machines, split another block, select a space or move terminals. Cancellation or changed captured identity SHALL NOT commit stale ordering. Unlinked spaces SHALL retain ordinary reordering.

#### Scenario: Drag the coordinator or the fleet
- **WHEN** the user drags a coordinator to a valid position in its own machine group
- **THEN** the final displayed and acknowledged native order puts the coordinator and all its children at that position in their existing sibling order
- **AND** every source row remains dimmed with one external block insertion marker
- **AND** the floating preview contains exactly one chip showing the grabbed coordinator's own numbered badge and name, without stacked rows or a chain
- **AND** the active space and running terminals are unchanged

#### Scenario: Coordinator-origin chip
- **WHEN** the user starts dragging the coordinator row of an attached pair
- **THEN** the single floating chip shows that coordinator's numbered badge and name with the same resolved fill as its sidebar row
- **AND** cancellation retains that chip identity through its return and fade

#### Scenario: Fleet-origin chip
- **WHEN** the user starts dragging an attached child row
- **THEN** the single floating chip shows the child's own native number and name with the coordinator's resolved badge colour, matching its sidebar badge
- **AND** only that child dims and the insertion marker stays among its siblings; the preview does not substitute the coordinator, show a chain or use the child's independent saved colour
- **AND** cancellation retains that chip identity through its return and fade

#### Scenario: Drop beside another linked pair
- **WHEN** a coordinator block or an ordinary space is dropped on a member of another linked block
- **THEN** the destination resolves to an edge of that block rather than between its members
- **AND** a child-origin gesture cannot join or move that other block

#### Scenario: Cancellation or relationship changes
- **WHEN** a gesture is cancelled, a member disappears, completed verification changes the displayed relationship, or attachment is disabled before release
- **THEN** no stale block or sibling move is committed
- **AND** cancellation never activates the grabbed row

#### Scenario: Native move acknowledgements fail
- **WHEN** the host does not acknowledge a public ordering command or captured membership changes during a multi-command move
- **THEN** the app stops the remaining sequence and reports the failure or uncertain result
- **AND** it does not restore an old whole document or persist a retry for a later session

#### Scenario: Ordinary spaces and worktrees
- **WHEN** attachment is off or a dragged space has no displayed current or remembered link
- **THEN** existing same-machine independent reorder behavior is preserved
- **AND** its single preview chip retains that space's own numbered badge, independent colour and name
- **AND** repository discovery does not regroup unrelated worktree spaces

#### Scenario: Remembered link before background verification
- **WHEN** exact remembered space identities exist and attachment is enabled while verification is pending, failed or expired
- **THEN** the coordinator can move the displayed block and a child can move only within its displayed sibling group without awaiting Crew status
- **AND** this permission covers only native space ordering, not tab or terminal movement, worker navigation, messaging or coordinator colour writes

#### Scenario: Sibling boundary and singleton
- **WHEN** a child is dragged above its first sibling, below its last sibling, toward its parent, outside its coordinator or toward another machine
- **THEN** the insertion target is clamped within its original siblings or the gesture cancels without a write
- **AND** a coordinator with only one child offers no effective child reorder, and no gesture reparents a child

#### Scenario: Persistence numbering and connectors
- **WHEN** a sibling reorder is acknowledged and the app subsequently restarts
- **THEN** native saved space order restores the chosen sibling order without a separate portable child-order preference
- **AND** native shortcut numbers, expanded and compact badge order, and last-child connector placement follow that acknowledged order
- **AND** selection remains on the same native space and coordinator dragging retains the new sibling order

### Requirement: Aligned space worktree markers
Expanded Spaces SHALL retain plugin tags at the existing trailing tag edge after ahead/behind counts and worktree markers. Untagged worktree markers SHALL retain the machine-header chevron axis. Nested child indentation and parent disclosure SHALL NOT remove metadata or add chain icons. Worktree visibility and rename behavior SHALL remain unchanged.

#### Scenario: Ordinary and attached worktree rows
- **WHEN** local or remote machine groups show ordinary worktree spaces or a connected child with a worktree marker and no plugin tags
- **THEN** worktree markers stay on the machine-chevron axis at the existing right inset
- **AND** the child badge and connector remain at their nested left position without moving trailing markers

#### Scenario: Worktree marker beside plugin tags
- **WHEN** a worktree row has Crew or unrelated plugin tags
- **THEN** metadata order remains name, ahead/behind counts, worktree marker and tags, with no chain slot
- **AND** only the connected block's coordinator shows Crew, unrelated tags keep their tooltips and relative order, and a child's unrelated tags remain
- **AND** the final tag retains the ordinary tag-only right edge, while attachment-off rows retain their independent order

#### Scenario: Hidden marker and renaming
- **WHEN** worktree icons are switched off or a row is renamed
- **THEN** its worktree marker is hidden under existing rules
- **AND** the worktree switch does not hide the child connector or numbered badge, while editing suppresses that row's ordinary tags and nonediting controls
- **AND** visible tags retain their trailing edge and rename still captures the clicked native space

### Requirement: Stable verified fleet presentation during refresh
Fleet presentation SHALL use a bounded host-local last-verified pair record independently of fresh action authority. With attachment enabled, exact remembered native space identities SHALL restore the first render before verification completes. Disablement SHALL hide but preserve memory. Failed, slow or abandoned reads SHALL retain it. Completed contradictory evidence or confirmed missing spaces SHALL clear or replace memory. Remembered presentation SHALL NOT grant fresh operational authority.

#### Scenario: Successful refresh cycle
- **WHEN** delayed status refresh from Git or Spaces verifies the same pair
- **THEN** every intermediate expanded projection retains the nested block, truthful numbered badges and coordinator colour, coordinator-only Crew pill and current parent fold state
- **AND** there is no intermediate independent-colour, detached-position, chain-icon or duplicate-Crew frame

#### Scenario: Unrelated model and focus changes
- **WHEN** unrelated spaces, tabs or panes are added, removed, renamed, reordered or selected on either machine, or focus/relay/Git refresh occurs
- **THEN** no detached projection of the verified pair appears
- **AND** binding invalidation depends on pair identities, coordinator home/owner and adoption facts, not unrelated topology
- **AND** pending or successful same-binding refreshes preserve child nesting and fold state

#### Scenario: Failed or timed-out refresh
- **WHEN** a previously verified pair's read fails, is malformed, times out or expires without completion
- **THEN** remembered presentation remains while both native spaces exist until completed contradictory evidence or feature disablement
- **AND** elapsed time alone does not detach the pair, including long outages
- **AND** memory remains bounded to exact machine/space/home identities with at most one verified pair per known machine, never action authorization

#### Scenario: Completed relationship change
- **WHEN** a completed successful read establishes missing ownership or a different valid pair
- **THEN** the prior attachment and invalid remembered identity are removed or replaced atomically without a temporary unknown publication
- **AND** late older results cannot resurrect it or apply its fold state to a different pair

#### Scenario: No verified history
- **WHEN** first verification is pending, fails or is ambiguous with no valid memory
- **THEN** no pairing is inferred from names, role hints or an unverified snapshot

#### Scenario: Restart, mod reload or layout switch
- **WHEN** both remembered native spaces still exist after restart, reload, update or layout change with attachment enabled
- **THEN** the first available space frame restores their nested block, numbered badges with coordinator colour, coordinator-only Crew pill and saved parent disclosure before verification completes
- **AND** background verification can replace or disprove the pair without an intermediate detached frame
- **AND** persisted identity contains no reports, task records, PR inventory, credentials or transcripts and is not portable

#### Scenario: Relevant identity changes during a read
- **WHEN** owner/home or adoption evidence changes while verification is pending
- **THEN** fresh actions lose eligibility immediately but remembered presentation remains until completion
- **AND** missing native space identities or explicit disablement detach immediately rather than leaving ghost children

#### Scenario: Disable and restore remembered pairing
- **WHEN** attachment or Crew is switched off and on while both remembered spaces exist
- **THEN** off hides nesting immediately without erasing pair memory, and on restores the nested picture and its local fold state before any read completes
- **AND** verification refreshes authority independently of that picture

#### Scenario: Remembered space is absent
- **WHEN** an exact remembered native space is missing from the current snapshot
- **THEN** no attached ghost row or name-based substitute appears
- **AND** authoritative ready-layout absence clears invalid memory outside render, while an unready remote snapshot alone does not erase it

### Requirement: Independent attached-space identity and tags
A coordinator and all its connected children SHALL remain independently selectable native spaces with distinct tabs and terminals. Expanded blocks SHALL show Crew only on the coordinator before its far-right chevron, retain unrelated plugin tags and show no chain icons. Child presentation/folding SHALL NOT grant native operations or replace captured targets.

#### Scenario: Attached row selection and tags
- **WHEN** a verified coordinator and fleet are attached in Spaces
- **THEN** selecting either targets its own native space without moving tabs or terminals
- **AND** child indentation and connectors coexist with ordinary selected/inactive name treatment
- **AND** the coordinator's Crew label uses Agents machine-label styling and retains its tooltip before the disclosure chevron at the far right, while the child has no Crew label or chain icon
- **AND** unrelated plugin tags remain on both rows with existing metadata order and tooltips

#### Scenario: Attachment removed
- **WHEN** attachment is disabled or a relationship is authoritatively broken
- **THEN** separate native identities and ordinary plugin tag rules remain without inherited child colour, connectors, chains or parent disclosure
- **AND** disabling Crew hides its tags without closing or moving either space

### Requirement: Live fleet attachment preference propagation
Changes to the fleet attachment switch SHALL propagate in the next render while Settings remains open. Enablement SHALL immediately show a valid remembered pair and start background verification; without memory it SHALL attach only after successful first verification. Disablement SHALL immediately hide attachment without erasing remembered identity. Local and ready remote groups SHALL obey the same rule without granting unverified operational authority.

#### Scenario: Enable while Settings remains open
- **WHEN** attachment is enabled with Settings open and both spaces of a remembered same-machine pair exist
- **THEN** the next render shows the coordinator and its indented child, subject to saved disclosure, with truthful numbers, coordinator colour and coordinator-only Crew before a read completes
- **AND** background verification starts without waiting for close or another interaction
- **AND** Settings, native order, focus, tabs and terminals remain unchanged

#### Scenario: Disable while Settings remains open
- **WHEN** attachment is disabled with Settings open and an attached pair visible
- **THEN** independent order returns immediately with native numbers, independent tag rules and the fleet's own saved badge colour
- **AND** nesting and parent disclosure disappear without another event and pair memory remains available

#### Scenario: Verification still pending or unavailable
- **WHEN** enablement has no valid previously verified identity
- **THEN** no relationship, inherited colour or child connector is fabricated before success
- **AND** failed or ambiguous verification leaves independent rows

#### Scenario: Disable before verification completes
- **WHEN** attachment is enabled and disabled while its verification is pending
- **THEN** the superseded reply cannot reattach or overwrite remembered identity after disabling
- **AND** a later enable can restore valid memory and initiate current verification with Settings still open

#### Scenario: Repeated verified off/on cycles
- **WHEN** a verified pair is repeatedly toggled with immediate, one-second or fifteen-second off intervals
- **THEN** off immediately restores independent presentation and on restores valid nesting and local disclosure in the same render while verifying
- **AND** no freshness, transport latency or abandoned-reader wait delays memory restoration
- **AND** ready remote groups restore their own same-machine pairs independently

#### Scenario: Older reply after a newer toggle
- **WHEN** a pre-toggle reply arrives before or after the current successful reply
- **THEN** it cannot replace binding, presentation, verification age, remembered identity or retry state
- **AND** discarding it cannot delay or erase the current result

#### Scenario: Large verification response and interrupted processing
- **WHEN** a valid supported response of up to one MiB arrives during enablement
- **THEN** bounded processing publishes its pair without watchdog interruption or dependence on closing Settings
- **AND** abandoned processing is replaced by the existing lifecycle within the next two-second recovery interval rather than the transport lease
- **AND** commands remain bounded, superseded replies cannot publish, and interruption never erases remembered presentation

#### Scenario: Pretty-printed large legacy status
- **WHEN** legacy status emits a supported response up to one MiB and 4096 tasks over tens of thousands of lines
- **THEN** collection and field projection complete within the normal allowance without a format-induced timeout
- **AND** cost grows with input bytes, lines and task count rather than repeatedly copying accumulated output

#### Scenario: Other Spaces switches
- **WHEN** either last-tab preference changes with Settings open
- **THEN** subsequent close actions and empty-space reconciliation see it without waiting for dialog close
- **AND** confirmation, process-exit and automatic-space exceptions remain unchanged

### Requirement: Quiet Core apply footer
Custom Settings → Core SHALL keep its pre-Apply hint unchanged while applying and restarting, without duplicating runtime progress in the footer. The Status row SHALL retain runtime progress and failures SHALL remain visible in the existing page error area. The footer SHALL retain its geometry through completion, with an empty hint and disabled Discard/Apply when no changes remain.

#### Scenario: Idle and pending edits
- **WHEN** Core Settings is idle with no pending changes
- **THEN** its reserved footer hint is empty and Discard/Apply are disabled
- **AND** a pending permission change shows “Apply restarts core with all agents.”, while a sign-in-only edit shows “Unapplied changes”

#### Scenario: Applying settings before restart
- **WHEN** the user clicks Apply and the settings save is still pending
- **THEN** controls and Discard/Apply are disabled and the pre-Apply hint stays unchanged
- **AND** the footer does not show Applying, Starting, Stopping or Restarting

#### Scenario: Core restart in progress
- **WHEN** the permission apply operation is restarting Core
- **THEN** the Status row shows Restarting and the footer keeps the pre-Apply hint
- **AND** the reserved hint area and action buttons do not change position or dimensions

#### Scenario: Successful apply
- **WHEN** fresh runtime facts confirm the operation has completed with no remaining edits
- **THEN** the footer hint becomes empty and Discard/Apply stay disabled in the same positions
- **AND** the Status row shows the actual runtime state

#### Scenario: Failed or indeterminate apply
- **WHEN** applying fails or its outcome is unknown
- **THEN** the existing page error area still reports the failure or unknown outcome
- **AND** the footer does not substitute progress or error text for the pending-change hint
- **AND** unknown outcomes remain protected against duplicate submission

### Requirement: Verified Core control recovery
After apply, Core Settings SHALL restore eligible runtime controls as soon as fresh runtime facts confirm Running and no operation or inspection remains active. Cached Running facts SHALL NOT authorize controls during reconciliation. Completion SHALL NOT leave a permanent disabled state, and offline, unsupported and unknown-permission guards SHALL remain intact.

#### Scenario: Delayed post-restart inspection
- **WHEN** a restart has completed but the required fresh runtime inspection has not finished
- **THEN** the page retains truthful transition or checking feedback and keeps unsafe controls disabled
- **AND** cached Running facts do not imply that the post-restart state is already verified

#### Scenario: Fresh Running result
- **WHEN** post-restart inspection returns supported, reachable, signed-in Running facts with known permissions and no pending operation
- **THEN** Permissions, the sign-in toggle, Stop and Reboot are enabled immediately without another timer or manual refresh
- **AND** Discard/Apply remain disabled if there are no pending edits

#### Scenario: Different machine or failed verification
- **WHEN** the user changes machines during completion or verification fails
- **THEN** completion cannot enable another machine's controls or grant permission from cached facts
- **AND** existing error and offline behavior is preserved

### Requirement: Connected space parent disclosure
Expanded connected coordinators SHALL show a far-right chevron aligned with machine headers, default expanded. Both expanded and collapsed coordinators SHALL show their connected child-space count on a fixed inner column without shifting Crew. Disclosure SHALL remain local, identity-scoped and nonportable, without changing native selection, shortcuts, paired reorder or compact membership.

#### Scenario: Parent toggle and collapsed count
- **WHEN** the user activates the coordinator's fold control
- **THEN** all that parent's child rows toggle together without starting drag, selecting a different space or making discovery reads
- **AND** the chevron glyph axis, hit target and hover bounds match the machine header in both states
- **AND** Crew precedes count then chevron in both states, with Crew and count retaining their horizontal positions
- **AND** the count excludes the coordinator and counts connected spaces, not agents, tabs or tasks

#### Scenario: Keyboard navigation to a hidden child
- **WHEN** native keyboard or external navigation selects a child hidden by a collapsed parent
- **THEN** its parent is disclosed so the selected row is visible without changing the native target or shortcut mapping
- **AND** explicit folding does not itself select the parent, and disclosure controls remain separate from row selection and reorder

#### Scenario: Reorder a collapsed connected block
- **WHEN** the user drags the collapsed parent within its machine group
- **THEN** all hidden children move with the parent through acknowledged same-machine block operations
- **AND** expanding restores every child's identity and truthful number, while cancellation or changed captured membership commits no stale move

#### Scenario: Remote pair and invalid cross-machine link
- **WHEN** ready remote groups contain valid same-machine pairs or a candidate points across machines
- **THEN** valid pairs nest and fold independently inside their own machine group
- **AND** a cross-machine candidate stays independent under its own machine header without a cross-group connector, fold or move

### Requirement: Connected space badge and connector anchors
Expanded connected Spaces SHALL use one continuous vertical stem from the coordinator badge centre, intermediate child branches and a last-child corner. Every child badge SHALL align left with the coordinator name. Connectors SHALL retain the Agents stroke, colour and rounded style. Geometry SHALL scale with zoom without changing native numbering, selection, compact membership or whole-block reorder.

#### Scenario: Expanded connected row at supported zoom
- **WHEN** a coordinator and one, two or three children are shown at 100% or 130% zoom
- **THEN** the connector runs down from the horizontal centre of the parent badge and across toward the child badge
- **AND** the left edge of the child numbered badge aligns with the left edge of the coordinator name, rather than sitting farther right
- **AND** all badges retain ordinary size and native shortcut numbers, shared parent colour, selected/inactive text, hover and row heights
- **AND** intermediate children connect to the continuing stem and only the last child has the final rounded corner; removing a sibling updates the last-child corner without breaking continuity

### Requirement: Multiple connected project spaces
One coordinator SHALL support multiple validated same-machine project children through the existing contribution boundary, including legacy single-child links. Children SHALL retain native targets and shortcut numbers. Coordinator drags SHALL move the whole block in saved sibling order; child drags SHALL affect only siblings. Captured membership and acknowledgements SHALL be revalidated. Ambiguous ownership, cross-machine links and uncertain outcomes SHALL fail closed without replay.

#### Scenario: One, two and three project children
- **WHEN** validated contributions identify one, two or three children under one coordinator
- **THEN** all appear under that coordinator with shared connector anchors, independently selectable native numbers, and one parent fold hiding all children with the child-space count visible in both expanded and collapsed states
- **AND** selecting any hidden child discloses the parent without selecting another child or remapping shortcuts
- **AND** validated project children show the supplied safe repository display name rather than a task worktree basename or placement project key, while explicit user-renamed space titles take precedence

#### Scenario: Combined and project populations
- **WHEN** legacy combined workers, placement-v1 project workers or both coexist for the same verified home
- **THEN** every exact same-machine native space is connected after validating task identity and placement labels, without changing crew.home or inferring links from names
- **AND** unsupported placement versions, mismatching authoritative projects or automatic IDs, conflicting same-child names, unsafe display names, wrong adoption IDs and cross-machine members do not establish a link

#### Scenario: Repository display name differs from project identity
- **WHEN** exact task, home, owner and native membership validate a per-project child whose safe repository display name differs from its authoritative placement project key
- **THEN** the name is accepted as display metadata without changing the project-derived automatic space ID or granting identity from the name
- **AND** legacy registered-name captions and directory-cased or dot-prefixed repository captions remain supported

#### Scenario: Internal repair named core beside an application project
- **WHEN** a verified home contains an application project child and an internal repair with task project crew:self, placement project crew:self, canonical self space ID and safe display name core
- **THEN** both children remain connected to their coordinator with count two and one parent disclosure
- **AND** the coordinator retains its verified recorded task-PR context rather than probing its non-repository working directory
- **AND** the legacy internal caption crew and a validated repair sharing placement project crew remain compatible

#### Scenario: Restored repository-named children
- **WHEN** verified repository-named child identities are restored after a mod reload or a preference off/on cycle
- **THEN** their safe display metadata survives validation and remembered nesting returns under the existing presentation rules
- **AND** remembered names do not grant fresh Git, worker navigation or colour authority before current verification

#### Scenario: Mixed generations within one combined space
- **WHEN** a valid same-home combined native space contains legacy workers and placement-v1 combined workers, including when the fleet view omits task projects
- **THEN** that single child remains connected after exact membership validation, with one connector and Crew only on its coordinator
- **AND** a change in the child's directory-derived title does not detach it or remove the coordinator's eligible task PRs

#### Scenario: Mixed combined fleet switched off and on
- **WHEN** the preference is switched off and on with Settings still open for a valid local or ready remote mixed combined fleet
- **THEN** off immediately hides nesting and revokes task inventory, while on immediately restores valid remembered presentation and starts current verification through the recurring Spaces owner
- **AND** without remembered identity, only successful current verification attaches the child and enables task PR reads; pending verification shows ordinary coordinator Loading rather than Not a git repository
- **AND** no dialog close, unrelated topology event, prior-toggle inventory or pre-toggle reply is required or accepted to complete the current binding

#### Scenario: Drag any member or change membership
- **WHEN** the parent or any child is dragged within its machine group
- **THEN** the parent moves the whole coordinator-first block in saved sibling order, while a child moves only among that parent's children without splitting another block or selecting/moving terminals
- **AND** the preview keeps the grabbed row's own number/name, and cancellation, changed captured child membership or concurrent native order stops further commands without replay

#### Scenario: Unsupported or ambiguous contribution
- **WHEN** project child identity is unverified, multiply owned, cross-machine or structurally unsupported
- **THEN** no inferred nesting or stale operational authority is granted from project names, and legacy valid single-child identities remain supported

#### Scenario: Existing Agents and compact rail
- **WHEN** the shared connector or fold primitives are used by Agents, or Spaces switches into compact rail
- **THEN** Agents retains its existing connector geometry and collapsed-count behavior
- **AND** compact Spaces retains the coordinator and every independently selectable child badge in saved sibling order without connector, Crew label, parent disclosure or new dragging

### Requirement: Shared sidebar trailing grid
Spaces and Agents SHALL share trailing label and disclosure/status rails without changing native row semantics. Spaces SHALL show lowercase `crew` in plain Agents machine-label style with its tooltip: before count/disclosure with children, at the machine-chevron column without empty rails otherwise. Counts, machine plus and rename approve SHALL share an inner axis; chevrons and rename cancel an outer axis. Terminal Crew SHALL remain unchanged.

#### Scenario: Expanded and collapsed coordinator metadata
- **WHEN** a coordinator with connected children is shown expanded or collapsed in a local or remote group
- **THEN** its role text reads `crew` on the same label rail and the child count stays visible on the same inner column before the chevron
- **AND** machine-header plus, connected child count and space-rename approve are centred on the same inner axis, while all Spaces chevrons and rename cancel share the outer axis
- **AND** labels are regular 12px dim text without fill, border or pill padding; unrelated tags retain their existing styling and metadata order
- **AND** previous Spaces references to Crew pills describe the Crew role label, whose presentation remains this plain-label contract with lowercase visible text

#### Scenario: Long names and zoom
- **WHEN** long space or machine names are shown at default or narrow expanded-sidebar widths at 100% or 130% zoom with one or several connected children
- **THEN** names truncate without moving the fixed trailing columns, overlapping labels/counts or displacing connectors and numbered badges
- **AND** row height, selection, hover, compact rail, native shortcuts and captured whole-block reorder remain unchanged

#### Scenario: Missing role or children
- **WHEN** a space has no Crew role label or no connected children
- **THEN** no role label or child count is fabricated and ordinary tag, worktree, hover, selection and truncation behavior remains unchanged
- **AND** Agents retains its existing numeric rail and collapsed-count behavior

#### Scenario: Crew label without child controls
- **WHEN** a space row has a crew label but no child spaces, or combined view is off
- **THEN** the label sits at the right with its text right edge on the machine-header chevron column at both 100% and 130% zoom
- **AND** absent count and disclosure reserve no empty rails; when real child controls exist, Crew stays immediately before them in its existing inner column

#### Scenario: Sidebar-only casing
- **WHEN** the same coordinator is represented in Spaces and a terminal-pane header
- **THEN** its Spaces role text is `crew` while the terminal-pane badge remains `Crew`
- **AND** the sidebar casing does not rename plugin identity, alter role authority, change unrelated labels or rewrite shared tag contributions

### Requirement: Space rename trailing alignment
Inline space rename SHALL retain 24px action buttons, a 2px inter-button gap and a 4px input-to-actions gap, shared with tab rename. Cancel SHALL occupy the machine-chevron axis on every space row, replacing coordinator disclosure while editing. Confirm SHALL share the machine-plus and child-count axis immediately to its left. Editing SHALL retain its captured target, full initial selection and existing Enter, Escape and blur behavior.

#### Scenario: Parent child and ordinary inline editors
- **WHEN** rename opens on a coordinator, child or ordinary space
- **THEN** the Cancel target shares the machine/coordinator chevron centre and 24px hover bounds with the sidebar's 8px outer gutter preserved
- **AND** Confirm is 2px to its left on the machine-plus and child-count axis, the input ends 4px before Confirm, and ordinary tags/count/disclosure are suppressed while editing
- **AND** Enter saves only the captured space, Escape or blur cancels unchanged, and repeated rename does not reset an existing draft or selection

### Requirement: Global project-space switch in Spaces settings
Enabled Crew SHALL contribute one standard Spaces row immediately below Connect fleet space to coordinator, titled Separate space per project. Its switch SHALL show global Herdr intent: absent/off means combined; on means per-project. Title and description SHALL have no per-machine wording. Existing row, toggle and badge presentation SHALL be reused.

#### Scenario: Standard row and wording
- **WHEN** Spaces settings renders with Crew enabled
- **THEN** the row appears directly below Connect fleet space to coordinator
- **AND** its description is Give each project its own space under the coordinator for new work; running agents stay where they are.
- **AND** the row uses neighboring settings geometry with no new visual pattern or machine selector

#### Scenario: Intent remains global
- **WHEN** homes disagree about mode or the selected machine or coordinator changes
- **THEN** the switch retains the same saved intent rather than displaying the first returned home mode
- **AND** turning fleet attachment off does not change or pause this independent Crew policy

#### Scenario: Restart and preference round trip
- **WHEN** Herdr restarts or its existing preferences are exported and restored
- **THEN** the one boolean intent survives and missing intent defaults off
- **AND** target homes, observations, pending work and errors are excluded from portable preferences
- **AND** runtime application status is rechecked rather than restored as confirmed success

#### Scenario: Crew disabled
- **WHEN** Crew is disabled and later re-enabled
- **THEN** its row hides and new policy work stops while disabled
- **AND** re-enablement restores the same intent and resumes eligible reconciliation

### Requirement: Capability-aware global switch availability
Separate space per project SHALL show saved on/off intent without routine checking, pending or success lines. It MAY be disabled during bounded background application. Only completed unsuccessful application or confirmed unreachability SHALL produce one short line per affected machine. Unsupported Crew SHALL disable the switch without guessing a version requirement. Partial success SHALL NOT imply complete application or erase another machine's failure.

#### Scenario: Installed Crew lacks the capability
- **WHEN** an inspected target machine's installed Crew cannot advertise worker-space-local-set version 1
- **THEN** the switch is disabled with one short Crew-support reason naming that machine
- **AND** existing intent remains visible and unchanged, with unsupported targets not counted as applied
- **AND** no install, update, ownership workaround or unsupported setter is attempted

#### Scenario: One refused home or offline machine
- **WHEN** one capable home matches intent but another attempt finishes refused, fails or cannot reach its machine
- **THEN** the row preserves intent and shows one concise failure line naming each affected machine, using the existing row styling without Pending or progress badges
- **AND** multiple failed homes on the same machine are summarized once, while successes produce no line
- **AND** no optimistic global success, rollback of intent or raw command dump is shown

#### Scenario: Off, on and unresolved presentation at both zooms
- **WHEN** synthetic native fixtures render off, on, applying and completed refusal states at 100% and 130%
- **THEN** the title, description, standard switch and any concise failure line remain legible without overlap or overflow
- **AND** normal application and success show no machine status lines and fixtures do not alter real Crew configuration or running coordinators

#### Scenario: Bounded application and interrupted continuation
- **WHEN** supported reachable homes are being updated, including after a slow or interrupted callback or a retired request
- **THEN** the existing lifecycle resumes eligible reconciliation after the finite command allowance without another click or closing Settings
- **AND** optional toggle disablement ends when the attempt settles rather than remaining latched forever
- **AND** an uncertain setter remains serialized through its transport bound and requires readback before another write; hidden progress never fabricates success

### Requirement: Consistent workspace inline rename presentation
Tab and space inline rename SHALL share field and action presentation: button and icon sizes, field-to-action and inter-action gaps, vertical centring, hover and focus treatment. Entering rename SHALL preserve row height and limit tab width growth to the editable field and required actions. Visual unification SHALL NOT change captured targets, native input ownership or save/cancel behavior.

#### Scenario: Default and narrow rename layouts
- **WHEN** a tab or space enters inline rename at default or narrow widths
- **THEN** both editors show the same-sized field, check and cancel controls with identical icons, gaps, vertical alignment, hover and focus styling
- **AND** fields shrink or tabs use their existing scrolling/expansion behavior without overlapping or clipping the action controls, changing row height or adding unnecessary tab-width growth

#### Scenario: Rename completion and cancellation
- **WHEN** the user submits, cancels, presses Escape or blurs a tab or space inline editor
- **THEN** the original owner-bound save, cancel and focus-restoration rules still apply without terminal input or unintended drag
- **AND** sidebar agent rows retain their existing behavior without gaining a new rename feature

### Requirement: Agents group chevrons match Spaces
Agents group-header chevrons SHALL use the same small square hover and focus treatment as Spaces disclosure controls. Existing header folding, group order, counts, status indicators and row geometry SHALL remain. Hovering a chevron SHALL NOT activate or select an agent.

#### Scenario: Chevron hover and activation
- **WHEN** an expanded or folded Agents group chevron is hovered at 100% or 130% zoom
- **THEN** the chevron has Spaces' 24px square control treatment rather than only a whole-header highlight
- **AND** activating it toggles that group exactly once without selecting an agent or changing its membership, count or ordering

#### Scenario: Existing header and compact behavior
- **WHEN** the user activates the rest of a group header or switches Agents into its compact rail
- **THEN** ordinary header folding remains available and the compact rail gains no group-header controls
- **AND** numeric/status rails, child-agent folding, sidebar gutters and row heights retain their existing geometry

### Requirement: Independently visible Spaces Crew labels
Spaces' Show icons menu SHALL include a Crew label toggle only while Crew is enabled, using the existing checked menu-row treatment and defaulting on. Its saved choice SHALL affect only Crew labels in Spaces, not terminal-pane badges, unrelated tags, fleet attachment, counts, disclosure, selection or Crew operations.

#### Scenario: Default and toggled label
- **WHEN** Crew is enabled and no visibility preference exists
- **THEN** Show icons contains a checked Crew label entry after Machine status and Worktree icon, and eligible space rows show their existing lowercase crew label
- **AND** clicking the entry hides or restores only those labels in the next render, updates its check and keeps the menu open like the existing entries

#### Scenario: Hidden labels retain workspace behavior
- **WHEN** Crew labels are hidden on attached or independent local or remote space rows
- **THEN** numbered badges, child connectors, counts, parent chevrons, selection, worktree metadata and unrelated plugin tags retain their existing behavior
- **AND** terminal-pane Crew badges and all verification, grouping and task behavior remain unchanged

#### Scenario: Disable and restore
- **WHEN** Crew is disabled and later enabled again
- **THEN** its Show icons entry is absent while disabled and returns with the prior saved visibility choice when enabled
- **AND** disabling does not erase that choice or alter Machine status and Worktree icon choices
