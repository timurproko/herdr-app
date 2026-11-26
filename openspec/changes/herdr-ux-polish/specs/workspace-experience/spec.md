# Spec Delta

## MODIFIED Requirements

### Requirement: Independent attached-space identity and tags
Attached coordinator and fleet SHALL remain independently selectable native spaces with distinct tabs and terminals. Expanded connected blocks SHALL show Crew only on the coordinator before its far-right disclosure chevron, retain unrelated plugin tags, and show no chain icons. Child presentation and folding SHALL NOT grant native operations or replace captured space targets.

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
- **THEN** only that parent's child rows toggle without starting drag, selecting a different space or making discovery reads
- **AND** the chevron glyph, hit target and hover match the Agents parent fold control, with no child count when expanded or collapsed
- **AND** Crew precedes the far-right chevron in both states and only the chevron direction indicates collapse

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

## ADDED Requirements

### Requirement: Connected space badge and connector anchors
Expanded connected Spaces SHALL anchor the child connector's vertical stem at the horizontal centre of the coordinator's numbered badge and align the child badge's left edge with the coordinator name's left edge. The connector SHALL retain the Agents rounded branch style, stroke and colour. Geometry SHALL scale with interface zoom without changing native numbering, selection, compact rail or paired reorder.

#### Scenario: Expanded connected row at supported zoom
- **WHEN** a coordinator and child are shown at 100% or 130% zoom
- **THEN** the connector runs down from the horizontal centre of the parent badge and across toward the child badge
- **AND** the left edge of the child numbered badge aligns with the left edge of the coordinator name, rather than sitting farther right
- **AND** both badges retain their ordinary size and native shortcut numbers, and shared parent colour, selected/inactive text, hover and row heights remain unchanged

#### Scenario: Existing Agents and compact rail
- **WHEN** the shared connector or fold primitives are used by Agents, or Spaces switches into compact rail
- **THEN** Agents retains its existing connector geometry and collapsed-count behavior
- **AND** compact Spaces retains both independently selectable badges without connector, Crew pill or parent disclosure
