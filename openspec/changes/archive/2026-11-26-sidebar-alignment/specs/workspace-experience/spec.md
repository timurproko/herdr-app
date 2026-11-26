## MODIFIED Requirements

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

### Requirement: Connected space parent disclosure
Expanded connected coordinators SHALL show a far-right chevron aligned with machine headers, default expanded. Only collapsed coordinators SHALL show their connected child-space count in the Agents group number style and time/count rail. Disclosure SHALL remain local, identity-scoped and nonportable, without changing native selection, shortcuts, paired reorder or compact membership.

#### Scenario: Parent toggle and collapsed count
- **WHEN** the user activates the coordinator's fold control
- **THEN** all that parent's child rows toggle together without starting drag, selecting a different space or making discovery reads
- **AND** the chevron glyph axis, hit target and hover bounds match the machine header, with no count expanded and a right-aligned child-space count collapsed
- **AND** collapsed Crew precedes count then chevron, with count on the Agents time/group-count rail rather than after the chevron
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

### Requirement: Multiple connected project spaces
One coordinator SHALL support multiple validated same-machine project children through the existing contribution boundary, with legacy single-child compatibility. Each child SHALL retain its native target and shortcut number. Dragging any member SHALL move the entire coordinator-first block in stable child order, revalidating captured membership and acknowledgements. Ambiguous ownership, cross-machine links and uncertain outcomes SHALL fail closed without replay.

#### Scenario: One, two and three project children
- **WHEN** validated contributions identify one, two or three children under one coordinator
- **THEN** all appear under that coordinator with shared connector anchors, independently selectable native numbers, and one parent fold hiding all children with the child-space count visible only while collapsed
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
- **AND** compact Spaces retains the coordinator and every independently selectable child badge without connector, Crew label or parent disclosure

## ADDED Requirements

### Requirement: Shared sidebar trailing grid
Spaces and Agents SHALL share trailing label, numeric and disclosure/status rails, with existing native row semantics. Spaces Crew SHALL use plain Agents machine-label styling instead of the previous filled Crew-pill presentation, retaining its tooltip. Machine plus and expanded Crew SHALL share a right edge; collapsed Crew SHALL move to the label rail so the count retains the numeric rail.

#### Scenario: Expanded and collapsed coordinator metadata
- **WHEN** a coordinator is shown expanded or collapsed in a local or remote group
- **THEN** expanded Crew ends at the numeric rail's right edge with no count, while collapsed Crew ends at the Agents machine-label edge and the count occupies the Agents time/group-count rail
- **AND** machine-header plus right edge matches expanded Crew and all chevrons and ordinary agent status dots share the machine-chevron axis
- **AND** labels are regular 12px dim text without fill, border or pill padding; unrelated tags retain their existing styling and metadata order
- **AND** previous Spaces references to Crew pills describe the Crew role label, whose presentation is replaced by this plain-label contract

#### Scenario: Long names and zoom
- **WHEN** long space or machine names are shown at 100% or 130% zoom with one or several connected children
- **THEN** names truncate without moving the fixed trailing rails, overlapping labels/counts or displacing connectors and numbered badges
- **AND** selection, compact rail, native shortcuts and captured whole-block reorder remain unchanged

### Requirement: Space rename trailing alignment
Inline space rename SHALL retain tab rename's existing 24px action buttons, 2px inter-button gap and 4px input-to-actions gap. Cancel SHALL occupy the machine-chevron axis on every space row, replacing coordinator disclosure while editing. Confirm SHALL sit immediately to its left. Editing SHALL retain its captured target, full initial selection and existing Enter, Escape and blur behavior.

#### Scenario: Parent child and ordinary inline editors
- **WHEN** rename opens on a coordinator, child or ordinary space
- **THEN** the Cancel target shares the machine/coordinator chevron centre and 24px hover bounds with the sidebar's 8px outer gutter preserved
- **AND** Confirm is 2px to its left, the input ends 4px before Confirm, and ordinary tags/count/disclosure are suppressed while editing
- **AND** Enter saves only the captured space, Escape or blur cancels unchanged, and repeated rename does not reset an existing draft or selection
