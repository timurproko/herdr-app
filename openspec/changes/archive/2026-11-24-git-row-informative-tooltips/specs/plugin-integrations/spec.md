# Spec Delta

## MODIFIED Requirements

### Requirement: Shared Git pull request metadata
Git SHALL share natural-width metadata across rows without Owner badges. The byline SHALL flow left with constant gaps and trailing space. Tasks, checks and review text SHALL flow left; labels SHALL group right with intervening space and no preceding dot. Full wording SHALL remain while the line fits; actual overflow SHALL compact tasks/time before secondary clipping. Checks SHALL never shrink, wrap or truncate. Only hidden values SHALL have full-value tooltips.

#### Scenario: Ordinary and coordinator rows
- **WHEN** an owner-authored PR with tasks, checks and labels is displayed in either view and either tab
- **THEN** tasks and checks flow naturally from the left without an Owner badge, while assigned labels form an ordered group at the right content edge
- **AND** pinned, scrolling and motion-preview rows use the same presentation

#### Scenario: Natural lower-line spacing
- **WHEN** full number, author, time or status content fits the available line, including around 390px panel width
- **THEN** the byline and left status run use natural widths without stretched, percentage or equal-width cells
- **AND** constant gaps and dots separate present left-run groups, without leading, trailing or doubled dots; no dot separates that run from labels
- **AND** free status space lies between the left run and the label group, or at the end when no label exists
- **AND** overflow first shortens task wording or byline time before secondary clipping

#### Scenario: Missing metadata items
- **WHEN** a PR lacks tasks, checks or labels
- **THEN** only present left-run items and their separators occupy the left run, while any labels remain anchored to the right edge even when checks or tasks are absent
- **AND** no visible empty label placeholder, reserved right-hand label width or redundant separator is shown when there are no labels

#### Scenario: Task counts and review decision change
- **WHEN** a checklist changes between untouched, partial and complete, check counts change, or a separate review decision appears or disappears
- **THEN** present left-run items take their natural places as tasks, checks and separate review-decision text without changing title geometry, line positions or block height
- **AND** the label group's right edge does not move with those changes
- **AND** compact or clipped content remains available through full-value hover text, while complete visible wording has no repeat-only hover text

#### Scenario: Checks take priority at supported widths
- **WHEN** metadata renders at any supported panel width and zoom, including 280/320/360/390/480px at 75–200% zoom and explicitly 130%
- **THEN** the checks icon and full count remain contained, without clipping, ellipsis or wrapping, including one-, two- and three-digit totals such as 1/1, 3/10, 11/11, 99/99 and 101/101
- **AND** checks use their complete natural width before lower-priority content is clipped
- **AND** the matrix includes the screenshot's approximately 390px panel, with no shortening while the complete line fits

#### Scenario: Compact whole task progress
- **WHEN** the whole metadata line cannot fit with full task wording
- **THEN** the row uses a complete compact task fraction such as an icon with 2/2 before reducing secondary text
- **AND** remaining overflow reduces separate review-decision text first and label text next, while checks remain complete and the compact task fraction stays whole
- **AND** clipping stays within the fixed-height line with no overlap or lone ellipsis; hidden full task progress, labels and review values remain available in informative tooltips

### Requirement: GitHub label presentation
Each assigned PR label SHALL retain its exact name, including emoji, in a fully rounded 18px pill derived from its GitHub colour. Dark palettes SHALL use GitHub's 18% tint, readable lightness-adjusted coloured text and 30% text-colour border; light palettes SHALL use GitHub's solid fill and contrasting black/white text. Names SHALL stay single-line without horizontal overflow or row-height jumps; full-name tooltips SHALL require hidden names. Pills SHALL form one ordered right-aligned group.

#### Scenario: Under review label
- **WHEN** a PR has the label named `🤖 Under review` with GitHub colour `840479`
- **THEN** the row displays that exact name in a pill derived from that colour at the row's right content edge, with no separator dot before the label group
- **AND** on a dark palette it uses a translucent purple tint, lightened purple text and a thin translucent purple border rather than a solid purple block

#### Scenario: Several labels in a narrow panel
- **WHEN** assigned labels do not all fit beside the preceding metadata
- **THEN** they remain one right-aligned group in their existing order, within a bounded single-height strip rather than expanding the panel or row height
- **AND** pill words remain whole while task compaction and secondary review-text reduction can make room; only remaining overflow clips the label group without overlap or a lone ellipsis
- **AND** informative tooltips expose the complete assigned names, including any clipped or omitted names

#### Scenario: Different hues and extreme colours on dark palettes
- **WHEN** green, amber, purple, red, blue, near-black or near-white labels appear on a dark panel palette
- **THEN** each uses GitHub's perceived-lightness and HSL adjustment formula, an 18% original-colour background and a 30% adjusted-text-colour border
- **AND** very dark labels acquire readable lighter text while already light labels are not unnecessarily lightened

#### Scenario: Light palette and palette changes
- **WHEN** the effective panel palette is light or changes between light and dark
- **THEN** labels follow that palette without a restart, using solid original colours and GitHub's contrast-selected black/white foreground on light palettes
- **AND** near-white light-mode pills receive GitHub's darkened translucent border so they remain distinguishable from their surroundings

#### Scenario: Shared rendering and invalid colour
- **WHEN** labels appear in ordinary or coordinator views, in either tab, or in pinned and motion-preview rows
- **THEN** all use the same palette-dependent right-aligned pill presentation without changing left-run spacing or row geometry
- **AND** an invalid or missing colour uses the existing neutral theme fallback rather than producing invalid colours or hiding its exact name

#### Scenario: Stable right content anchor
- **WHEN** rows with different task progress, check widths, absent checks or absent tasks display assigned labels at the same panel width and zoom
- **THEN** each label group's rightmost visible pill ends at the same right content edge as the title line's reserved robot control, whether or not a robot is present
- **AND** the anchor uses the control's outer edge, not its inset SVG glyph or the panel border
- **AND** adding or removing the final label adds no separator and does not alter title or line geometry

### Requirement: Stable pull request block geometry
Every PR block SHALL retain fixed state-icon, title and related-agent slots, three fixed line boxes and a 74px height at a given width and zoom. Optional facts SHALL NOT move title boundaries or vertical anchors. Left-run lower-line items MAY move horizontally in fixed order as facts arrive; assigned labels SHALL retain their right content anchor. Absent groups SHALL reserve no width. The metadata line SHALL retain its height even when empty, without placeholders.

#### Scenario: Agent appears or finishes
- **WHEN** otherwise identical rows have or lack a related live agent, including a coordinator task whose worker finishes
- **THEN** their title truncation boundaries, line positions and block heights match
- **AND** the absent robot leaves an inert blank slot rather than a hidden clickable control

#### Scenario: Late optional data
- **WHEN** checks, tasks, assigned labels, author details, review decisions or merge-conflict facts arrive or are removed after first paint
- **THEN** the state-icon and title/agent reservations and all three line boxes retain their geometry without adding or removing lines
- **AND** present left-run elements flow in fixed order at natural widths, shortening only on whole-line overflow while checks remain complete and assigned labels remain right-anchored

#### Scenario: Row variants and zoom
- **WHEN** ordinary, pinned, scrolling, coordinator and motion-preview rows render in Open or Closed at 75%, 100%, 125%, 130%, 150% or 200% zoom
- **THEN** each uses the same logical line and slot geometry for its available width
- **AND** optional content changes preserve the list's vertical rhythm and label right anchor at every zoom

#### Scenario: Whole relative time in the byline
- **WHEN** the full number, author and verbose relative time run cannot fit the available byline width
- **THEN** a complete compact relative time such as 27m ago is shown instead of a mid-word truncation
- **AND** hidden author, action and relative-time values remain available through informative tooltips while the number, author and time remain left-aligned with constant separator gaps

### Requirement: Git trailing alignment with Spaces
Git PR rows and coordinator repository headers SHALL match the actual Spaces Crew pill inset inside its own row highlight: 3 logical pixels. Robot and header chevron reservations SHALL be 24px wide with equal right edges matching actual label pills. Their glyphs SHALL share a centre line without resizing. All row variants SHALL preserve interaction targets, absent-agent title reservations, informative tooltips, callbacks and vertical geometry.

#### Scenario: Complete panel alignment
- **WHEN** ordinary or coordinator Git panels render at 280, 320, 360, 390 or 480 logical pixels and 75%, 100%, 125%, 130%, 150% or 200% zoom
- **THEN** robot slot, repository-header chevron slot and actual trailing label pill right edges are inset from their own row highlight edge by the same amount as the actual Spaces Crew pill from its own row highlight edge
- **AND** complete-panel border, list padding and Spaces negative trailing pill margin are included in the comparison, yielding a 3px logical row-relative inset rather than requiring equal panel-relative trailing edges
- **AND** Git retains its 5px panel-to-highlight inset and Spaces retains its 8px sidebar-to-highlight inset; their resulting control-to-panel insets are 8px and 11px respectively

#### Scenario: Different glyph sizes
- **WHEN** a 16px robot glyph and a 14px repository-header chevron are shown
- **THEN** each remains centred within its 24px reservation in the same column
- **AND** their literal SVG right edges may differ by 1px without shifting reservation or pill edges

#### Scenario: Missing agent, folded header and motion preview
- **WHEN** an agent is absent, a repository header folds or a PR is pinned, scrolled or shown as a motion-preview row
- **THEN** the shared trailing edge and existing row/header heights and line positions are preserved
- **AND** the absent robot reservation remains inert, live robot hit targets remain 24px square, ghost robots remain noninteractive and captured actions remain unchanged; tooltips follow the informative-item policy

## ADDED Requirements

### Requirement: Informative pull request item tooltips
Every Git PR item SHALL show a tooltip only when it exposes a clipped, truncated or abbreviated full value, or additional known facts absent from the visible item. This SHALL cover title, number, author, time, tasks, checks, label pills, review, state and robot in ordinary and coordinator views. Parent hover targets SHALL NOT restore repeat-only child tooltips. Fit decisions SHALL reuse existing measured layout facts without extra hidden per-row probes.

#### Scenario: Complete visible text
- **WHEN** a title, number, author, task phrase, check count, label name or review phrase is fully visible and no extra facts are supplied
- **THEN** that item and its parent hover targets show no tooltip that only repeats those visible words
- **AND** suppression does not remove accessibility labels or alter row geometry

#### Scenario: Compact or clipped item
- **WHEN** an item is semantically compacted, clipped or truncated
- **THEN** its tooltip supplies the full original value rather than only the visible abbreviation
- **AND** a fully clipped item remains recoverable on a surviving appropriate group hover target without redundant full-line text

#### Scenario: Informative time and check detail
- **WHEN** a relative time has a known exact timestamp or a check count has known failing or pending check names
- **THEN** the tooltip exposes that additional timestamp or check detail even if the visible text fits
- **AND** a fully visible relative time without an exact timestamp and a complete count without extra details have no repeat-only tooltip
- **AND** names retain newest-workflow/rerun semantics without hover-triggered reads

#### Scenario: Label visibility and omitted labels
- **WHEN** a label name is clipped or assigned labels are omitted from the bounded coordinator strip
- **THEN** informative pill/group or surviving metadata tooltips expose complete exact assigned names
- **AND** a fully visible set of complete names has no repeat-only pill or group tooltip

#### Scenario: State and related agent information
- **WHEN** a state icon or current live robot represents a semantic state or agent identity absent from visible row text
- **THEN** the tooltip may name that state, Merge conflicts, or the known related agent
- **AND** unknown identities are not invented, absent/ghost targets gain no action authority, and stale click guards remain unchanged

#### Scenario: Shared paths and invalidation
- **WHEN** ordinary, pinned, scrolling, coordinator or ghost rows render after a size, zoom, context or fact change
- **THEN** current fit facts determine tooltip eligibility consistently in both tabs
- **AND** obsolete measurements cannot restore a tooltip or hidden value from another row or context

### Requirement: Readable Git title and header ellipses
Overflowing PR titles, repository section names and other truncating Git header text SHALL end with a single U+2026 ellipsis whose three dots are visibly distinct at 100% and 130% zoom. Its glyph bounds SHALL stay inside the existing line box. Full fitting text SHALL remain unchanged. This SHALL preserve the 20px title line, 74px PR block, horizontal anchors and interaction targets without a native host patch.

#### Scenario: Long title or header
- **WHEN** a PR title or Git header exceeds its available measured width in either view
- **THEN** the rendered visible text ends in U+2026 rather than an underscore or three ASCII periods
- **AND** the ellipsis glyph is fully contained vertically and horizontally inside its line box at 100% and 130%
- **AND** its informative tooltip exposes the full original text

#### Scenario: Fitting title or header
- **WHEN** the complete title or header fits
- **THEN** its text is unchanged with no added suffix or repeat-only full-value tooltip
- **AND** unrelated descriptive header information remains available when it adds facts

#### Scenario: Row and header variants
- **WHEN** titles appear in ordinary, pinned, scrolling, coordinator or ghost rows, or repository sections are folded
- **THEN** truncating title/header presentation uses the same readable suffix without changing line heights, row heights, reservations or saved fold state
