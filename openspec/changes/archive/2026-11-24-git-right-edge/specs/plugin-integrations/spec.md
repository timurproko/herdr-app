## ADDED Requirements

### Requirement: Git trailing alignment with Spaces
Git PR rows and coordinator repository headers SHALL share the actual Spaces Crew pill trailing inset of 11 logical pixels. Robot and header chevron reservations SHALL be 24px wide with equal right edges matching actual label pills. Their glyphs SHALL share a centre line without resizing. All row variants SHALL preserve interaction targets, absent-agent title reservations, tooltips, callbacks and vertical geometry.

#### Scenario: Complete panel alignment
- **WHEN** ordinary or coordinator Git panels render at 280, 320, 360, 390 or 480 logical pixels and 75%, 100%, 125%, 130%, 150% or 200% zoom
- **THEN** robot slot, repository-header chevron slot and actual trailing label pill right edges use the same 11px logical inset as the actual Spaces Crew pills
- **AND** complete-panel border, list padding and Spaces negative trailing pill margin are included in the comparison

#### Scenario: Different glyph sizes
- **WHEN** a 16px robot glyph and a 14px repository-header chevron are shown
- **THEN** each remains centred within its 24px reservation in the same column
- **AND** their literal SVG right edges may differ by 1px without shifting reservation or pill edges

#### Scenario: Missing agent, folded header and motion preview
- **WHEN** an agent is absent, a repository header folds or a PR is pinned, scrolled or shown as a motion-preview row
- **THEN** the shared trailing edge and existing row/header heights and line positions are preserved
- **AND** the absent robot reservation remains inert, live robot hit targets remain 24px square, ghost robots remain noninteractive and existing tooltips and captured actions remain unchanged
