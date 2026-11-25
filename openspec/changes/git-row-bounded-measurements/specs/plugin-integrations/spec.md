# Spec Delta

## MODIFIED Requirements

### Requirement: Informative pull request item tooltips
PR titles SHALL retain full-title tooltips without measuring their widths. Other Git PR items SHALL show a tooltip only for a hidden or abbreviated full value, or additional known facts absent from the item. Ordinary and coordinator views SHALL share this policy. Parent hover targets SHALL NOT restore repeat-only lower-line tooltips. Lower-line fit decisions SHALL reuse the bounded shared measured-layout cache without per-row title or pill probes.

#### Scenario: Complete visible text
- **WHEN** a number, author, task phrase, check count, label name or review phrase is fully visible and no extra facts are supplied
- **THEN** that item and its parent hover targets show no tooltip that only repeats those visible words
- **AND** titles retain the explicitly approved full-title hover fallback even when they fit, without delaying any row
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
- **THEN** informative group or surviving metadata tooltips expose complete exact assigned names when hovering those pills or the strip, without individual pill width probes
- **AND** a fully visible set of complete names has no repeat-only pill or group tooltip

#### Scenario: State and related agent information
- **WHEN** a state icon or current live robot represents a semantic state or agent identity absent from visible row text
- **THEN** the tooltip may name that state, Merge conflicts, or the known related agent
- **AND** unknown identities are not invented, absent/ghost targets gain no action authority, and stale click guards remain unchanged

#### Scenario: Shared paths and invalidation
- **WHEN** ordinary, pinned, scrolling, coordinator or ghost rows render after a size, zoom, context or fact change
- **THEN** current lower-line fit facts determine tooltip eligibility consistently in both tabs, while title hover does not depend on measurements
- **AND** obsolete measurements cannot restore a tooltip or hidden value from another row or context

### Requirement: Readable Git title and header ellipses
Overflowing PR titles, repository section names and other truncating Git header text SHALL end with a single U+2026 ellipsis whose three dots are visibly distinct at 100% and 130% zoom. Its glyph bounds SHALL stay inside the existing line box. Fitting text content SHALL remain unchanged. This SHALL preserve the 20px title line, 74px PR block, horizontal anchors and interaction targets without title/prefix width probes or a native host patch.

#### Scenario: Long title or header
- **WHEN** a PR title or Git header exceeds its available width in either view
- **THEN** native truncation renders U+2026 rather than an underscore or three ASCII periods, using a fallback face that paints distinct dots
- **AND** the ellipsis glyph is fully contained vertically and horizontally inside its line box at 100% and 130%
- **AND** its tooltip exposes the full original text without a title-measurement gate

#### Scenario: Fitting title or header
- **WHEN** the complete title or header fits
- **THEN** its text content is unchanged with no added suffix; PR titles retain the approved full-title tooltip, while repository section headers stay informative-only
- **AND** unrelated descriptive header information remains available when it adds facts

#### Scenario: Row and header variants
- **WHEN** titles appear in ordinary, pinned, scrolling, coordinator or ghost rows, or repository sections are folded
- **THEN** truncating title/header presentation uses the same readable native suffix and original size/weight without changing line heights, row heights, reservations or saved fold state

## ADDED Requirements

### Requirement: Bounded pull request intrinsic measurement
A complete Git render SHALL create at most four shared intrinsic-width probes, with a 512-entry style/font/zoom-keyed cache and one pending probe per key. Known visible ordinary rows and the pinned row SHALL take priority. Native callbacks SHALL advance remaining batches without a new timer or withholding rows. Titles, pills and prefix candidates SHALL add no individual intrinsic probes.

#### Scenario: Cold mounted rows and continued background measurement
- **WHEN** ordinary or coordinator rows cold-start after opening, zoom or interface-font changes
- **THEN** every row renders immediately and no more than four intrinsic probes are created across the snapshot
- **AND** following native callbacks advance the remaining missing keys, with no recurring intrinsic probes for cached strings
- **AND** known visible ordinary rows precede offscreen rows; without viewport facts, current presentation order is used

#### Scenario: Settings bridge and obsolete callbacks
- **WHEN** a snapshot renders many rows or an old context/font/zoom measurement completes
- **THEN** settings are read once per render entry rather than per row/string/prefix, and cache/request storage remains bounded
- **AND** obsolete callbacks do not publish measurements into the new context

### Requirement: Mounted pull request render cost
Cold fully mounted 30/60/100-row native render construction SHALL cost no more than the fc0dfde baseline plus 2 ms for the reference workload, and 200 rows SHALL complete without interruption. Ordinary lists SHALL be tested through their actual loaded-row renderer. Deterministic operation/element ratios SHALL not exceed the frozen baseline tree sizes; paging SHALL NOT substitute a smaller tree for these measurements.

#### Scenario: Ordinary Open and Closed cold starts
- **WHEN** 30, 60, 100 or 200 loaded ordinary PRs render after zoom/interface-font invalidation
- **THEN** every loaded row is mounted and operation/element ratios remain within their baseline budgets, with at most four intrinsic probes
- **AND** 100-row and scrolled-bottom cases are not protected only by a coordinator page bound

#### Scenario: Native benchmark provenance
- **WHEN** native cold-render costs are reported
- **THEN** the report identifies the workload, actually built rows, baseline revision, samples, failures and build-only scope
- **AND** all current 200-row samples complete; no interrupted sample is assigned a fabricated successful timing

### Requirement: Pull row geometry outlives text facts
Allocated physical widths SHALL remain keyed to native element IDs when strings, font/zoom keys or immutable PR facts change. Text-metric invalidation SHALL NOT discard unchanged allocated geometry. Native title truncation and full-title hover SHALL update on a title edit even when no size callback is emitted. Existing stale-context guards and fixed row/line geometry SHALL remain intact.

#### Scenario: Same title element changes from short to long
- **WHEN** a short title is replaced by a long title on the same native ID and 200px allocated box, without a size callback
- **THEN** the new text retains native truncation and its complete title tooltip immediately
- **AND** lower-line available geometry survives and no resize is required

#### Scenario: Style invalidation without a physical resize
- **WHEN** typography changes but the allocated physical width remains unchanged
- **THEN** the existing width is retained and normalized with current zoom while intrinsic text widths are refreshed in bounded batches
- **AND** an obsolete measurement cannot erase or replace current geometry
