# Spec Delta

## MODIFIED Requirements

### Requirement: Git trailing alignment with Spaces
Git PR rows and coordinator repository headers SHALL match the actual Spaces Crew pill inset inside its own row highlight: 3 logical pixels. Robot and header chevron reservations SHALL be 24px wide with equal right edges matching actual label pills. Their glyphs SHALL share a centre line without resizing. All row variants SHALL preserve interaction targets, absent-agent title reservations, tooltips, callbacks and vertical geometry.

#### Scenario: Complete panel alignment
- **WHEN** ordinary or coordinator Git panels render at 280, 320, 360, 390 or 480 logical pixels and 75%, 100%, 125%, 130%, 150% or 200% zoom
- **THEN** robot slot, repository-header chevron slot and actual trailing label pill right edges are inset from their own row highlight edge by the same amount as the actual Spaces Crew pill from its own row highlight edge
- **AND** complete-panel border, list padding and Spaces negative trailing pill margin are included in the comparison, yielding a 3px logical row-relative inset
- **AND** Git and Spaces highlights have equal 8px left and right panel/sidebar gutters, yielding equal 11px control-to-panel/sidebar insets
- **AND** Git row highlights match Spaces' 6px corner radius and their leading content starts 8px inside the highlight, matching Spaces' highlight-to-badge inset

#### Scenario: Different glyph sizes
- **WHEN** a 16px robot glyph and a 14px repository-header chevron are shown
- **THEN** each remains centred within its 24px reservation in the same column
- **AND** their literal SVG right edges may differ by 1px without shifting reservation or pill edges

#### Scenario: Missing agent, folded header and motion preview
- **WHEN** an agent is absent, a repository header folds or a PR is pinned, scrolled or shown as a motion-preview row
- **THEN** the shared trailing edge and existing row/header heights and line positions are preserved
- **AND** the absent robot reservation remains inert, live robot hit targets remain 24px square, ghost robots remain noninteractive and existing tooltips and captured actions remain unchanged
- **AND** hover, selected/pinned and ghost highlights retain equal Spaces-derived left and right gutters and corner radius

## ADDED Requirements

### Requirement: Consistent Git list content gutters
Ordinary and coordinator Git panels SHALL align repository section headers, notices, Loading/empty states, scroll fades and the bottom enrollment banner to the same 8px left and right outer gutters as PR row highlights. Inner content padding SHALL remain separate from these outer gutters. Header chrome and the Open/Closed tab strip SHALL remain unchanged unless they share the list gutter.

#### Scenario: Panel feedback and footer
- **WHEN** either Git view shows repository sections, read notices, Loading or empty feedback, scroll fades or an enrollment banner
- **THEN** each uses the same left and right outer content-column edges as the row highlights, including both ordinary and coordinator enrollment banners
- **AND** existing feedback semantics, enrollment actions, pagination, scrolling and vertical geometry remain unchanged
