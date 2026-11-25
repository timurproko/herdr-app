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

### Requirement: Existing lower-line fit facts determine tooltips
Informative lower-line tooltips SHALL reuse the renderer's existing full/compact/clipped choices. Tooltip policy SHALL NOT add intrinsic probes, width caches, measurement scheduling, geometry changes or a separate layout calculation. Main's native title/header rendering, icon/dot offsets, mounted-row reveal/caps and stale-measurement guards SHALL remain intact.

#### Scenario: Snapshot construction
- **WHEN** a cold or warm ordinary/coordinator tree renders
- **THEN** tooltip decoration adds no native elements or intrinsic probes relative to the reference main renderer
- **AND** existing layout decisions determine hidden-value hover without withholding rows or starting reads

#### Scenario: Changed title without resize
- **WHEN** a title changes on the same element ID with no size callback
- **THEN** native truncation and complete-title hover update immediately without a measurement gate
- **AND** lower-line allocated geometry is not discarded by tooltip policy

### Requirement: Mounted pull request render cost
Cold fully mounted 30/60-row native render construction with informative tooltips SHALL cost no more than the reference current main plus 2 ms for the same workload. Benchmarks SHALL use real ordinary rendering and coordinator rendering with the existing mounted reveal model. Coordinator caps SHALL NOT be disabled or replaced by viewport virtualization in production.

#### Scenario: Actual mounted rows
- **WHEN** 30 or 60 ordinary/coordinator rows are benchmarked cold
- **THEN** every requested row is actually mounted, not only an initial ten-item reveal
- **AND** samples identify the main revision, failures and build-only scope; median cost remains within main plus 2 ms

#### Scenario: Main-relative regression
- **WHEN** the deterministic render-budget regression runs in both tabs
- **THEN** returned native elements and intrinsic probes equal the reference main counts
- **AND** larger coordinator inventories respect main's 60-row and 100-presentation-item safety caps
