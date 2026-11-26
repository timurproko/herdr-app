# Spec Delta

## MODIFIED Requirements

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
Attached coordinator and fleet SHALL remain independently selectable native spaces with distinct tabs and terminals. Expanded connected blocks SHALL show Crew only on the coordinator, retain unrelated plugin tags, and show no chain icons. Child presentation and folding SHALL NOT grant native operations or replace captured space targets.

#### Scenario: Attached row selection and tags
- **WHEN** a verified coordinator and fleet are attached in Spaces
- **THEN** selecting either targets its own native space without moving tabs or terminals
- **AND** child indentation and connectors coexist with ordinary selected/inactive name treatment
- **AND** the coordinator's Crew pill retains existing styling, tooltip and trailing tag edge, while the child has no Crew pill or chain icon
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

## ADDED Requirements

### Requirement: Connected space parent disclosure
Expanded connected coordinators SHALL use the Agents parent-row chevron to show or hide their children, default expanded, with a child count beside the chevron only while collapsed. Disclosure SHALL be local, identity-scoped and nonportable. It SHALL NOT change native space selection, shortcut numbering, paired reorder semantics or compact-rail membership.

#### Scenario: Parent toggle and collapsed count
- **WHEN** the user activates the coordinator's fold control
- **THEN** only that parent's child rows toggle without starting drag, selecting a different space or making discovery reads
- **AND** chevron, count placement, type, hit target and hover match the Agents parent fold control, with no child count when expanded

#### Scenario: Keyboard navigation to a hidden child
- **WHEN** native keyboard or external navigation selects a child hidden by a collapsed parent
- **THEN** its parent is disclosed so the selected row is visible without changing the native target or shortcut mapping
- **AND** explicit folding does not itself select the parent, and disclosure controls remain separate from row selection and reorder

#### Scenario: Reorder a collapsed connected block
- **WHEN** the user drags the collapsed parent within its machine group
- **THEN** the hidden child moves with the parent through the existing acknowledged same-machine block operation
- **AND** expanding restores the same child identity and truthful number, while cancellation or changed pair identity commits no stale move

#### Scenario: Remote pair and invalid cross-machine link
- **WHEN** ready remote groups contain valid same-machine pairs or a candidate points across machines
- **THEN** valid pairs nest and fold independently inside their own machine group
- **AND** a cross-machine candidate stays independent under its own machine header without a cross-group connector, fold or move
