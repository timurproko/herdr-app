# Spec Delta

## MODIFIED Requirements

### Requirement: Independent attached-space identity and tags
A coordinator and all its connected children SHALL remain independently selectable native spaces with distinct tabs and terminals. Expanded blocks SHALL show Crew only on the coordinator before its far-right chevron, retain unrelated plugin tags and show no chain icons. Child presentation/folding SHALL NOT grant native operations or replace captured targets.

#### Scenario: Attached row selection and tags
- **WHEN** a verified coordinator and fleet are attached in Spaces
- **THEN** selecting either targets its own native space without moving tabs or terminals
- **AND** child indentation and connectors coexist with ordinary selected/inactive name treatment
- **AND** the coordinator's Crew pill retains existing styling and tooltip before the disclosure chevron at the far right, while the child has no Crew pill or chain icon
- **AND** unrelated plugin tags remain on both rows with existing metadata order and tooltips

#### Scenario: Attachment removed
- **WHEN** attachment is disabled or a relationship is authoritatively broken
- **THEN** separate native identities and ordinary plugin tag rules remain without inherited child colour, connectors, chains or parent disclosure
- **AND** disabling Crew hides its tags without closing or moving either space

### Requirement: Connected space parent disclosure
Expanded connected coordinators SHALL use the Agents parent-row chevron to show or hide their children, default expanded, after Crew at the far right. No child count SHALL appear in either state. Disclosure SHALL be local, identity-scoped and nonportable. It SHALL NOT change native space selection, shortcut numbering, paired reorder semantics or compact-rail membership.

#### Scenario: Parent toggle and collapsed count
- **WHEN** the user activates the coordinator's fold control
- **THEN** all that parent's child rows toggle together without starting drag, selecting a different space or making discovery reads
- **AND** the chevron glyph, hit target and hover match the Agents parent fold control, with no child count when expanded or collapsed
- **AND** Crew precedes the far-right chevron in both states and only the chevron direction indicates collapse

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

## ADDED Requirements

### Requirement: Connected space badge and connector anchors
Expanded connected Spaces SHALL use one continuous vertical stem from the coordinator badge centre, intermediate child branches and a last-child corner. Every child badge SHALL align left with the coordinator name. Connectors SHALL retain the Agents stroke, colour and rounded style. Geometry SHALL scale with zoom without changing native numbering, selection, compact membership or whole-block reorder.

#### Scenario: Expanded connected row at supported zoom
- **WHEN** a coordinator and one, two or three children are shown at 100% or 130% zoom
- **THEN** the connector runs down from the horizontal centre of the parent badge and across toward the child badge
- **AND** the left edge of the child numbered badge aligns with the left edge of the coordinator name, rather than sitting farther right
- **AND** all badges retain ordinary size and native shortcut numbers, shared parent colour, selected/inactive text, hover and row heights
- **AND** intermediate children connect to the continuing stem and only the last child has the final rounded corner; removing a sibling updates the last-child corner without breaking continuity

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
