## MODIFIED Requirements

### Requirement: Consistent Git stage and verdict boxes
Git stage and verdict controls SHALL share a tight width equal to the longest supported caption's natural text width plus 6px side padding on each side, with equal 18px height and centred text. There SHALL be no additional common-width allowance. Interaction bounds SHALL match the visible boxes. Existing right alignment, title truncation, row height, guarded actions and tooltip suppression SHALL remain unchanged.

#### Scenario: Common geometry across captions
- **WHEN** ordinary or coordinator rows show Build, Build 2 through Build 99, Review, Approved or another fixed verdict such as Changes requested at 100% or 130% zoom
- **THEN** all stage and verdict controls use the same width, with the longest supported caption retaining exactly 6 logical pixels on either side and shorter captions centred
- **AND** the baseline accounts for supported captions even when the longest fixed caption is not currently displayed, without restoring an extra-wide arbitrary minimum
- **AND** hover, focus and click share that box without tooltip or a changed right rail, title reservation or block height

#### Scenario: Rare longer round
- **WHEN** a supported Build caption contains more than two round digits
- **THEN** the common sizing accommodates its full caption with normal side padding while keeping every stage and verdict right anchored and equally wide in that presentation
- **AND** sizing does not reserve speculative extra round digits or change the accepted round metadata or visible wording

#### Scenario: Long title and retained presentations
- **WHEN** long-title rows appear in ordinary, coordinator, pinned, scrolling, probe or ghost presentations at either zoom
- **THEN** the existing title truncation and full-title hover remain intact and the stage/verdict does not gain a title-line reservation
- **AND** visible, probe and ghost boxes use identical sizing, while probes and ghosts retain their noninteractive behavior

## ADDED Requirements

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
