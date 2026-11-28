## MODIFIED Requirements

### Requirement: Consistent Git stage and verdict boxes
Git stage and verdict controls SHALL share a tight width equal to the longest supported caption's natural text width plus 6px side padding on each side, with equal 18px height and centred text. There SHALL be no additional common-width allowance. Interaction bounds SHALL match the visible boxes. Existing right alignment, title truncation, row height, guarded actions and tooltip suppression SHALL remain unchanged.

#### Scenario: Common geometry across captions
- **WHEN** ordinary or coordinator rows show Build, Build 2 through Build 99, Review, Approved or another fixed verdict such as Changes requested at 100% or 130% zoom
- **THEN** all stage and verdict controls use the same width, with the longest supported caption retaining exactly 6 logical pixels on either side and shorter captions centred
- **AND** the baseline accounts for every supported fixed caption and every accepted Build round length even when absent, without extra width beyond the longest natural caption and its padding
- **AND** hover, focus and click share that box without tooltip or a changed right rail, title reservation or block height

#### Scenario: Rare longer round
- **WHEN** a supported Build caption contains more than two round digits
- **THEN** the common width already accommodates the longest accepted safe-integer round caption with normal side padding, and every stage and verdict stays equally wide and right anchored
- **AND** switching between statuses, missing round data and any accepted round never changes that width or the accepted round metadata and wording

#### Scenario: Long title and retained presentations
- **WHEN** long-title rows appear in ordinary, coordinator, pinned, scrolling, probe or ghost presentations at either zoom
- **THEN** the existing title truncation and full-title hover remain intact and the stage/verdict does not gain a title-line reservation
- **AND** visible, probe and ghost boxes use identical sizing, while probes and ghosts retain their noninteractive behavior

## REMOVED Requirements

### Requirement: Coordinator-first Agents groups
**Reason**: The approved Space-mode correction follows Spaces order machine by machine without role-based promotion.
**Migration**: No preference migration; Space mode uses current displayed Spaces order and Priority remains unchanged.

## ADDED Requirements

### Requirement: Space-mode Agents groups follow Spaces order
The Agents menu's Space mode SHALL follow displayed Spaces order, local machine first then remote machines in Spaces order, including connected children. No role SHALL promote a group. Equal names on different machines SHALL remain separate; same-machine groups spanning spaces SHALL use the earliest represented row. Pinned agents SHALL retain their leading section. Priority mode SHALL remain unchanged.

#### Scenario: Interleaved agent groups and machines
- **WHEN** agents arrive in a different order from Spaces, with coordinators on multiple machines
- **THEN** their Space-mode groups follow the Spaces machine blocks and row order, not agent arrival or coordinator-first promotion
- **AND** equal names across machines remain independent groups with their own counts and folds

#### Scenario: Native reorder and attached children
- **WHEN** a native space or connected sibling changes position
- **THEN** Space-mode groups follow the updated full Spaces projection, with attached children under their coordinator even if folded in Spaces
- **AND** group order changes no space, terminal, tab or fleet identity and starts no discovery work

#### Scenario: Shared group or unavailable space
- **WHEN** one same-machine group represents several spaces or its native space is temporarily unavailable
- **THEN** a shared group uses its earliest represented Spaces position, while unavailable groups remain in stable order at their machine's tail
- **AND** existing same-machine grouping, fold identities, counts and full navigation membership remain intact

#### Scenario: Pinned rows and Priority mode
- **WHEN** agents are pinned or the person selects Group agents by: Priority
- **THEN** pinned agents retain their separate leading section and Priority retains its existing urgency, time and sequence ordering
- **AND** native space reorder and coordinator metadata changes do not alter Priority or start attachment presentation queries there


### Requirement: Crew owns its Spaces label visibility contribution
The enabled Crew plugin SHALL contribute its own Crew label toggle to Spaces through the generic plugin boundary. The choice SHALL default true, survive plugin disablement and affect only its Spaces tag presentation. Disabled-plugin or obsolete popup callbacks SHALL NOT change it. Opening or toggling the entry SHALL start no plugin work or external operation.

#### Scenario: Enabled-only checked menu contribution
- **WHEN** Spaces opens Show icons with Crew enabled
- **THEN** Crew contributes its existing-style toggle using its saved value or the true default, without a Crew-specific feature import
- **AND** popup sizing includes the contributed row and existing built-in entries retain their styling, order and values

#### Scenario: Disable while the menu is open
- **WHEN** Crew becomes disabled after its menu entry was built
- **THEN** a retained callback cannot change the hidden plugin's setting
- **AND** the current menu projection omits its entry and re-enabling restores the last saved choice without replaying an action
