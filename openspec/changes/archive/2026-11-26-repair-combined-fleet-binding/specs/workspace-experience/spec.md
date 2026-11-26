# Spec Delta

## MODIFIED Requirements

### Requirement: Multiple connected project spaces
One coordinator SHALL support multiple validated same-machine project children through the existing contribution boundary, with legacy single-child compatibility. Each child SHALL retain its native target and shortcut number. Dragging any member SHALL move the entire coordinator-first block in stable child order, revalidating captured membership and acknowledgements. Ambiguous ownership, cross-machine links and uncertain outcomes SHALL fail closed without replay.

#### Scenario: One, two and three project children
- **WHEN** validated contributions identify one, two or three children under one coordinator
- **THEN** all appear under that coordinator with shared connector anchors, independently selectable native numbers, and one parent fold hiding all children with no count
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
- **THEN** the whole block moves with coordinator first and stable child order, without splitting another block or selecting/moving terminals
- **AND** the preview keeps the grabbed row's own number/name, and cancellation, changed captured child membership or concurrent native order stops further commands without replay

#### Scenario: Unsupported or ambiguous contribution
- **WHEN** project child identity is unverified, multiply owned, cross-machine or structurally unsupported
- **THEN** no inferred nesting or stale operational authority is granted from project names, and legacy valid single-child identities remain supported

#### Scenario: Existing Agents and compact rail
- **WHEN** the shared connector or fold primitives are used by Agents, or Spaces switches into compact rail
- **THEN** Agents retains its existing connector geometry and collapsed-count behavior
- **AND** compact Spaces retains the coordinator and every independently selectable child badge without connector, Crew pill or parent disclosure
