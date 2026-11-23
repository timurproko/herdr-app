# Spec Delta

## MODIFIED Requirements

### Requirement: Linked spaces reorder as one block
Dragging either member of a verified coordinator/fleet pair SHALL reorder both as one same-machine block, with the coordinator before the fleet. The drag SHALL NOT split another linked block, cross machines, select a space, move tabs or restart terminals. Cancellation and stale relationships SHALL NOT commit an order change. Unlinked spaces SHALL retain ordinary reordering.

#### Scenario: Drag the coordinator or the fleet
- **WHEN** the user drags either linked row to a valid position in its own machine group
- **THEN** the final displayed and acknowledged native order puts coordinator then fleet at that position
- **AND** both source rows remain dimmed with one external block insertion marker
- **AND** the floating preview contains exactly one chip showing the grabbed row's badge and name rather than stacked rows
- **AND** the active space and running terminals are unchanged

#### Scenario: Coordinator-origin chip
- **WHEN** the user starts dragging the coordinator row of an attached pair
- **THEN** the single floating chip shows that coordinator's numbered badge and name, with the same badge fill as its sidebar row
- **AND** cancellation retains that chip identity through its return and fade

#### Scenario: Fleet-origin chip
- **WHEN** the user starts dragging the attached fleet row
- **THEN** the single floating chip shows the fleet's own name and the same filled white-outline chain badge as its sidebar row, using the coordinator's resolved badge colour
- **AND** the chip does not substitute the coordinator's number or name or use the fleet's independent saved colour
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
- **AND** its single preview chip retains that space's own numbered badge, colour and name
- **AND** repository discovery does not regroup unrelated worktree spaces
