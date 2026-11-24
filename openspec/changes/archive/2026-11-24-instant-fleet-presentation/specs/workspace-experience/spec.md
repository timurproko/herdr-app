# Spec Delta

## MODIFIED Requirements

### Requirement: Linked spaces reorder as one block
Dragging either member of a displayed coordinator/fleet pair SHALL reorder both as one same-machine block, with the coordinator before the fleet. A remembered last-verified pair SHALL suffice for space-only ordering without fresh Crew status. The drag SHALL NOT split another linked block, cross machines, select a space, move tabs or restart terminals. Cancellation or changed captured pair identities SHALL NOT commit an order change. Unlinked spaces SHALL retain ordinary reordering.

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
- **WHEN** a gesture is cancelled, a member disappears, completed verification changes the displayed pair, or the switch is disabled before release
- **THEN** no stale block move is committed
- **AND** cancellation never activates the grabbed row

#### Scenario: Native move acknowledgements fail
- **WHEN** the host does not acknowledge a public ordering command or the captured membership changes during a multi-command block move
- **THEN** the app stops the remaining sequence and reports the failure or uncertain result
- **AND** it does not restore an old whole document or persist a retry for a later session

#### Scenario: Ordinary spaces and worktrees
- **WHEN** attachment is off or a dragged space has no displayed current or remembered link
- **THEN** the existing same-machine independent reorder behavior is preserved
- **AND** its single preview chip retains that space's own numbered badge, independent colour and name
- **AND** repository discovery does not regroup unrelated worktree spaces

#### Scenario: Remembered link before background verification
- **WHEN** both exact remembered space identities exist and attachment is enabled while verification is pending, failed or expired
- **THEN** either row can be dragged as the same displayed block without awaiting Crew status
- **AND** this permission covers only native space ordering, not tab or terminal movement, worker navigation, messaging or coordinator colour writes

### Requirement: Stable verified fleet presentation during refresh
Fleet presentation SHALL use a bounded host-local last-verified pair record independently of fresh action authority. With attachment enabled, exact remembered native space identities SHALL restore the first render before verification completes. Disablement SHALL hide but preserve memory. Failed, slow or abandoned reads SHALL retain it. Completed contradictory evidence or confirmed missing spaces SHALL clear or replace memory. Remembered presentation SHALL NOT grant fresh operational authority.

#### Scenario: Successful refresh cycle
- **WHEN** an attached fleet undergoes a delayed Crew status refresh from Git or Spaces and the completed result verifies the same pair
- **THEN** every intermediate sidebar projection retains the same coordinator/fleet block, own numbered badges with shared coordinator colour, matching chains and visible Crew pills on both expanded rows
- **AND** no intermediate frame reverts the fleet to its independent colour or position, removes either chain or loses an attached-row Crew pill

#### Scenario: Unrelated model and focus changes
- **WHEN** spaces, tabs or panes unrelated to the pair are added, removed, renamed, reordered or selected on this or another machine, or focus/relay/Git refresh events occur
- **THEN** none of those changes emits even one detached projection of the verified pair
- **AND** only the two spaces' identities, coordinator home/owner and fleet adoption facts participate in binding-dependent invalidation
- **AND** a pending or subsequent successful same-binding refresh emits no detached sidebar projection

#### Scenario: Failed or timed-out refresh
- **WHEN** a previously verified pair's next status read fails, is malformed, times out or expires without completing
- **THEN** its remembered presentation remains while its two native spaces exist, until a completed read disproves it or the setting/plugin is turned off
- **AND** elapsed time alone does not detach an unchanged pair, including long outages beyond the former 60-second window
- **AND** retention is bounded to the exact machine/space/home identities with at most one verified pair per known machine, never fresh action authorization

#### Scenario: Completed relationship change
- **WHEN** a successful completed read establishes that the fleet or coordinator is gone or ownership identifies a different valid pair
- **THEN** the prior attachment and remembered identity are removed or replaced atomically without a temporary unknown publication
- **AND** a late result from an older read cannot resurrect it

#### Scenario: No verified history
- **WHEN** the first read is pending, fails or produces ambiguous evidence and no previously verified pair exists in memory or durable local identity facts
- **THEN** the sidebar remains unattached rather than creating a relationship from names, role hints or an unverified snapshot

#### Scenario: Restart, mod reload or layout switch
- **WHEN** a previously verified pair's two native spaces still exist after app restart, mod hot reload, update or a layout switch with attachment enabled
- **THEN** the first available native-space frame restores its attached block, own numbered badges with shared coordinator colour, chains and Crew pills on both expanded rows from persisted sanitized identity facts before a status read completes
- **AND** background verification can update or disprove that pair without an intermediate detached frame
- **AND** persisted facts contain no reports, task records, PR inventory, credentials or transcripts and are not exported as portable preferences

#### Scenario: Relevant identity changes during a read
- **WHEN** the pair's owner/home or adoption evidence changes while verification is pending
- **THEN** fresh operational actions lose eligibility immediately but the remembered display remains until the new read completes
- **AND** missing native space identities or explicit disablement detach immediately rather than leaving ghost rows

#### Scenario: Disable and restore remembered pairing
- **WHEN** attachment or Crew is switched off and later enabled with both remembered native space identities still present
- **THEN** off hides the link immediately without erasing its last verified pair record and on restores the picture in the same render with zero reads completed
- **AND** background verification refreshes authority independently of the restored picture

#### Scenario: Remembered space is absent
- **WHEN** either exact remembered space identity is missing from the current native space snapshot
- **THEN** that record contributes no attached rows and cannot be matched by another space's name
- **AND** authoritative ready-layout absence clears the stale record outside render; an unready remote snapshot alone does not erase memory

### Requirement: Live fleet attachment preference propagation
Changes to the fleet attachment switch SHALL propagate in the next render while Settings remains open. Enablement SHALL immediately show a valid remembered pair and start background verification; without memory it SHALL attach only after successful first verification. Disablement SHALL immediately hide attachment without erasing remembered identity. Local and ready remote groups SHALL obey the same rule without granting unverified operational authority.

#### Scenario: Enable while Settings remains open
- **WHEN** the user enables attachment with Settings open and both spaces of a remembered same-machine pair still exist
- **THEN** the next render shows the fleet below the coordinator, truthful native shortcut numbers, matching chains before both Crew pills and the coordinator's colour on both badges before any read completes
- **AND** background verification starts without waiting for dialog close or another lifecycle interaction
- **AND** Settings remains open and native space order, focus, tabs and terminals are unchanged

#### Scenario: Disable while Settings remains open
- **WHEN** the user disables attachment while Settings is open and an attached pair is visible
- **THEN** the sidebar immediately returns to independent row order, retains each row's native shortcut number, removes both chains and restores the fleet's saved badge colour
- **AND** no close event or further interaction is needed and remembered pair identity remains available for later enablement

#### Scenario: Verification still pending or unavailable
- **WHEN** enabling requires verification and no valid previously verified display identity is available
- **THEN** no relationship, inherited badge colour or attachment chain is fabricated before the read succeeds
- **AND** a failed or ambiguous read leaves the spaces independent rather than attaching an unverified pair

#### Scenario: Disable before verification completes
- **WHEN** the user enables and then disables attachment while Settings stays open and the enable-time read is pending
- **THEN** the sidebar remains independent after disabling and the superseded reply cannot restore attachment or overwrite remembered identity
- **AND** a later explicit enable can restore valid memory and start current verification without closing Settings

#### Scenario: Repeated verified off/on cycles
- **WHEN** a verified attached pair is switched off and on repeatedly with Settings open, with immediate, one-second or fifteen-second off intervals
- **THEN** each off transition immediately restores independent presentation and each on transition restores the still-valid remembered pair in the same render and initiates background verification
- **AND** no freshness, attempt, command latency or abandoned-reader wait delays that remembered picture
- **AND** ready remote machines restore their own remembered pairs independently rather than waiting for another machine

#### Scenario: Older reply after a newer toggle
- **WHEN** a reply initiated before the last off/on sequence arrives before or after the current sequence's successful reply
- **THEN** the older reply cannot replace current binding, presentation, verification age, remembered identity or retry state
- **AND** rejecting it cannot discard or delay the current sequence's valid reply

#### Scenario: Large verification response and interrupted processing
- **WHEN** a valid supported status response of up to one MiB arrives during enablement
- **THEN** bounded response processing publishes its verified pair without a watchdog interruption or dependence on closing Settings
- **AND** if response processing is nevertheless abandoned, the existing lifecycle replaces its read within the next two-second recovery interval rather than waiting for the transport lease
- **AND** transport commands retain their bounded execution allowance and superseded replies remain unable to publish
- **AND** interruption never removes an already remembered presentation

#### Scenario: Pretty-printed large legacy status
- **WHEN** legacy status emits a supported reply up to one MiB and 4096 tasks over tens of thousands of JSON lines
- **THEN** transport collection and field projection complete within the ordinary command allowance without a format-induced timeout
- **AND** their cost grows with input bytes, lines and task count rather than repeatedly recopying accumulated output

#### Scenario: Other Spaces switches
- **WHEN** the user changes either last-tab switch with Settings still open
- **THEN** the new preference is available to subsequent close actions and normal empty-space reconciliation without requiring Settings to close
- **AND** their existing confirmation, process-exit and automatic-space exceptions remain unchanged
