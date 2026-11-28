# Spec Delta

## MODIFIED Requirements

### Requirement: Consistent Git stage and verdict boxes
Git stage and verdict controls SHALL size to their own caption with 6px side padding, equal 18px height and centred text, without a minimum width shared across captions. Interaction bounds SHALL match each visible box. Existing right alignment, title truncation, row height, guarded actions and tooltip suppression SHALL remain unchanged.

#### Scenario: Common geometry across captions
- **WHEN** ordinary or coordinator rows show Build, Build 2 through Build 99, Review, Approved or another fixed verdict such as Changes requested at 100% or 130% zoom
- **THEN** each control fits its own natural caption width plus 6 logical pixels on either side, rather than inheriting the widest caption's width
- **AND** hover, focus and click share that box without tooltip or a changed right rail, title reservation or block height

#### Scenario: Rare longer round
- **WHEN** a supported Build caption contains more than two round digits
- **THEN** only that control grows to fit its caption and normal side padding while keeping its right anchor
- **AND** other controls retain their own caption-sized widths

#### Scenario: Long title and retained presentations
- **WHEN** long-title rows appear in ordinary, coordinator, pinned, scrolling, probe or ghost presentations at either zoom
- **THEN** the existing title truncation and full-title hover remain intact and the stage/verdict does not gain a title-line reservation

### Requirement: Non-actionable delivery kind explanation
The Projects description SHALL append Delivery kinds in inline accent styling with a dashed underline. Hover or keyboard focus SHALL show three two-column explanations: regular-weight foreground kind names on the left and muted descriptions on the right. All descriptions and their wrapped lines SHALL share one left edge, with no separating dashes or column headers. Clicking SHALL do nothing, using the existing tooltip treatment.

#### Scenario: Complete explanation
- **WHEN** the person hovers or focuses Delivery kinds after Git folders crew may work in on this machine.
- **THEN** Plain says The worker codes right away; Crew opens the pull request and reviews it.
- **AND** Delivery explains that the worker plans in a draft pull request and codes after approval; Crew reviews
- **AND** Gate explains that the gate tool reviews, tests and opens the pull request
- **AND** each entry stays one short sentence, without small-fix or gate-skip detail
- **AND** Plain, Delivery and Gate use regular-weight white foreground styling in one left column, while descriptions use the existing grey tooltip text style in a second column
- **AND** descriptions share a single left edge across entries and wrapped lines, without dashes, overlap, clipping or column headings
- **AND** clicking does not open a URL, menu or action, and no command or machine read is started
