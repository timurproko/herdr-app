# Spec Delta

## ADDED Requirements

### Requirement: Informative pull request item tooltips
Git lower-line PR items SHALL show a tooltip only for a hidden, abbreviated or omitted full value, or additional known facts absent from visible text. Ordinary and coordinator views SHALL share this policy. Parent hover targets SHALL NOT restore repeat-only lower-line tooltips. Existing native title/header rendering and full-title hover SHALL remain unchanged, without title-width probes, a font override or custom truncation.

#### Scenario: Complete visible text
- **WHEN** a number, author, task phrase, check count, label name or review phrase is fully visible and no extra facts are supplied
- **THEN** that item and its parent hover targets show no tooltip that only repeats those visible words
- **AND** suppression does not remove accessibility labels or alter main's row, icon or separator geometry

#### Scenario: Compact or clipped item
- **WHEN** an item is semantically compacted, clipped or omitted
- **THEN** its tooltip supplies the full original value rather than only the visible abbreviation
- **AND** a completely hidden item remains recoverable on a surviving appropriate group hover target without redundant full-line text

#### Scenario: Informative time and check detail
- **WHEN** a relative time has a known exact timestamp or a check count has known failing or pending check names
- **THEN** its tooltip exposes those additional facts even if visible text fits
- **AND** complete relative time without an exact timestamp and a complete count without extra details have no repeat-only tooltip
- **AND** check names retain newest-workflow/rerun semantics without hover-triggered reads

#### Scenario: Clipped or omitted labels
- **WHEN** label names are clipped or omitted from the bounded coordinator strip
- **THEN** an informative group or surviving metadata tooltip exposes complete exact assigned names when hovering the pills or strip, without individual pill-width probes
- **AND** complete visible names have no repeat-only pill or group tooltip

#### Scenario: State and related agent descriptions
- **WHEN** a state icon or current live robot represents a semantic state or known agent identity absent from visible text
- **THEN** its tooltip may name that state, Merge conflicts or the known related agent
- **AND** unknown identities are not invented and absent/ghost targets gain no action authority

#### Scenario: Native titles remain unchanged on edit
- **WHEN** a short title is replaced by a long title on the same ID and allocated box without another size callback
- **THEN** its native truncation, inherited interface font and complete title tooltip remain available immediately
- **AND** title/header rendering uses no new width probe, prefix fitting, custom suffix or font override

### Requirement: Bounded lower-line intrinsic measurement
A complete Git render SHALL create at most four new lower-line intrinsic-width probes, with a 512-entry font/style/zoom-keyed cache and one pending probe per key. Known visible ordinary rows and the pinned row SHALL take priority. Native callbacks SHALL advance remaining batches without a new timer or withholding rows. Existing main repository-header rendering and measurement SHALL remain unchanged.

#### Scenario: Cold mounted rows
- **WHEN** ordinary or coordinator rows cold-start after opening, zoom or interface-font changes
- **THEN** every row renders immediately and at most four lower-line intrinsic probes are created across the snapshot
- **AND** callbacks advance remaining missing keys; cached strings add no recurring probe
- **AND** known visible ordinary rows precede offscreen rows, otherwise presentation order is used

#### Scenario: Settings and obsolete callbacks
- **WHEN** many rows render or an old context/font/zoom measurement completes
- **THEN** settings are captured once per render entry rather than per string and cache/request storage stays bounded
- **AND** obsolete callbacks do not publish measurements into the new context

### Requirement: Mounted pull request render cost
Cold fully mounted 30/60/100-row native render construction SHALL cost no more than fc0dfde baseline plus 2 ms for the reference workload, and 200 rows SHALL complete without interruption. Ordinary lists SHALL use their actual loaded-row renderer. Deterministic operation/element ratios SHALL not exceed frozen baseline tree sizes; paging SHALL NOT substitute a smaller tree.

#### Scenario: Ordinary Open and Closed cold starts
- **WHEN** 30, 60, 100 or 200 loaded ordinary PRs render after zoom/interface-font invalidation
- **THEN** every loaded row is mounted and operation/element counts remain within baseline budgets with at most four lower-line probes
- **AND** ordinary 100-row and scrolled-bottom cases are not protected only by coordinator paging

#### Scenario: Native benchmark provenance
- **WHEN** cold-render costs are reported
- **THEN** the report identifies workload, actually built rows, baseline revision, samples, failures and build-only scope
- **AND** every current 200-row sample completes; interrupted samples receive no fabricated timing

### Requirement: Pull row geometry outlives text facts
Lower-line allocated physical widths SHALL remain keyed to native element IDs when strings, typography keys or immutable PR facts change. Text-metric invalidation SHALL NOT discard unchanged allocated geometry. Existing stale-context guards and fixed row/line geometry SHALL remain intact.

#### Scenario: Changed string without resize
- **WHEN** lower-line content changes on the same native ID without an allocated-size callback
- **THEN** available geometry survives while current intrinsic facts determine compact/clipped hover eligibility
- **AND** no resize is required

#### Scenario: Typography without physical resize
- **WHEN** typography changes but allocated physical width is unchanged
- **THEN** retained width is normalized with current zoom while intrinsic widths refresh in bounded batches
- **AND** obsolete measurements cannot erase or replace current geometry
