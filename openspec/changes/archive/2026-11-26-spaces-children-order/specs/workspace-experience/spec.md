## MODIFIED Requirements

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

### Requirement: Multiple connected project spaces
One coordinator SHALL support multiple validated same-machine project children through the existing contribution boundary, including legacy single-child links. Children SHALL retain native targets and shortcut numbers. Coordinator drags SHALL move the whole block in saved sibling order; child drags SHALL affect only siblings. Captured membership and acknowledgements SHALL be revalidated. Ambiguous ownership, cross-machine links and uncertain outcomes SHALL fail closed without replay.

#### Scenario: One, two and three project children
- **WHEN** validated contributions identify one, two or three children under one coordinator
- **THEN** all appear under that coordinator with shared connector anchors, independently selectable native numbers, and one parent fold hiding all children with the child-space count visible in both expanded and collapsed states
- **AND** selecting any hidden child discloses the parent without selecting another child or remapping shortcuts
- **AND** validated project children show the supplied registered project name rather than a worktree basename, while explicit user-renamed space titles take precedence

#### Scenario: Combined and project populations
- **WHEN** legacy combined workers, placement-v1 project workers or both coexist for the same verified home
- **THEN** every exact same-machine native space is connected after validating task identity and placement labels, without changing crew.home or inferring links from names
- **AND** unsupported placement versions, mismatching project/name labels, wrong adoption IDs and cross-machine members do not establish a link

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
