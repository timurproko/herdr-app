## ADDED Requirements

### Requirement: Shared warm Git repository entry
Coordinator and worker entry SHALL share immediate compatible cached presentation, existing header activity and coherent in-place refresh. Worker entry SHALL show only its resolved repository section with the coordinator's header, count and chevron. Warm refresh SHALL NOT show body Loading or a blank frame. An unresolved destination without compatible cached presentation SHALL use existing cold Loading, never another destination's rows.

#### Scenario: Coordinator to worker with cached section
- **WHEN** a selected worker's exact machine and current location identify a repository whose compatible section has already loaded in the coordinator
- **THEN** the first destination frame contains that repository's cached section header, count, chevron and selected-tab rows without waiting for GitHub
- **AND** other repositories are absent and the existing header updating animation runs while eligible background refresh replaces facts in place

#### Scenario: Return to coordinator
- **WHEN** the same machine, owner, home and enable generation are selected again after a worker visit
- **THEN** its compatible sections, ordering, counts, folds and reveal/anchor presentation return immediately without a blank or body Loading frame
- **AND** current verification and admitted refresh use the same warm header activity and publication behavior as worker entry

#### Scenario: Cold destination and cached empty result
- **WHEN** a destination has no compatible presentation or its repository identity cannot be safely resolved
- **THEN** existing cold Loading remains while identity and data resolve, without guessing from a space name, branch or repository basename
- **AND** a cached authoritative empty result instead shows its known empty state with header activity while refreshing, not a cold Loading state

#### Scenario: Failure or rate refusal during warm entry
- **WHEN** a background refresh fails, is deferred by cooldown or loses fresh verification
- **THEN** compatible last-good presentation remains without a Loading replacement or false completed refresh
- **AND** existing scoped failures, quiet rate refusal, verification diagnostics and guarded recovery remain authoritative

### Requirement: Qualified bounded Git entry memory
Reusable Git presentation SHALL be bounded runtime-only data qualified by machine, canonical repository, credential routing, source inventory scope and enable generations. Cached task facts SHALL NOT authorize repository-wide totals, GitHub reads or agent focus. Authoritative identity changes and absence SHALL invalidate affected presentation, while obsolete replies SHALL NOT repopulate a new selection.

#### Scenario: Same number or repository on another machine
- **WHEN** two repositories share a PR number or two machines have the same repository name
- **THEN** only facts with the destination's full qualified identity can populate its section
- **AND** one machine's response, cached totals or folder mapping cannot be reused as the other's

#### Scenario: Directory and routing change
- **WHEN** a selected terminal changes directory, its repository mapping changes, effective routing changes, or a read proves the destination is not a repository
- **THEN** incompatible rows, counts and stale request publications are rejected before the next destination presentation
- **AND** an unproven new directory never borrows a former folder's repository solely from a retained task label

#### Scenario: Lifetime and authority
- **WHEN** Git or the relevant source provider is disabled and re-enabled, ownership changes, or the app restarts
- **THEN** affected entry snapshots cannot restore prior-generation inventory or grant stale worker actions
- **AND** hidden snapshots do no reads and contain no native handles, callback trees, credentials or portable or restart-persisted PR inventory

### Requirement: Space entry preserves order without pin motion
Entering an agent space SHALL restore its cached repository section without creating a pin, reordering rows or starting move-to-top animation. Coordinator return SHALL restore its cached order directly. Existing panel-origin stage-chip and fallback robot-click pin behavior SHALL remain unchanged and separate from entry; an already-started click transition SHALL retain its existing selection acknowledgement behavior.

#### Scenario: Direct agent-space entry
- **WHEN** the user enters an agent space directly and its PR or branch matches a row in the cached section
- **THEN** the cached section is shown immediately in its existing order with header refresh activity
- **AND** entry creates no pin, moves no row to the top and starts no pin animation

#### Scenario: Return to coordinator
- **WHEN** the user returns from a worker space to the coordinator
- **THEN** the coordinator's cached sections and ordering are restored directly with existing header refresh activity
- **AND** no entry-driven pin, unpin animation or row reorder occurs

#### Scenario: Existing chip and robot navigation
- **WHEN** the user clicks another agent PR's live stage chip or fallback robot inside the panel
- **THEN** the existing click-origin navigation and move-to-top pin animation remain unchanged, including their existing confirmation and cancellation rules
- **AND** the resulting native space acknowledgement neither starts a second animation nor cancels the original merely because cached entry ran
- **AND** Approved remains non-navigating and unavailable targets retain existing refusals

## MODIFIED Requirements

### Requirement: Always-visible Git tab counts
Ordinary and coordinator Git views SHALL always display Open and Closed count badges. Unknown or incomplete totals SHALL retain loading feedback, using 0 without compatible cached values and otherwise retaining scoped known values. Cached task subsets SHALL NOT appear as exact repository-wide totals. Badge geometry SHALL remain stable; only loading or abbreviated counts SHALL have count tooltips and accessible labels SHALL retain exact known totals and scope.

#### Scenario: Unknown and loaded totals
- **WHEN** an ordinary or coordinator Git panel first loads, then receives authoritative totals
- **THEN** both badges visibly start at 0 unless compatible scoped cached values exist and change to authoritative counts without moving the tabs
- **AND** three-digit totals remain fully contained in the fixed badge geometry at supported zooms
- **AND** unknown counts have a loading tooltip and accessible label, while fully visible exact totals have no count-only tooltip on the tab or badge

#### Scenario: Refresh retains counts
- **WHEN** known same-repository or coordinator-home counts are refreshed, including delayed and failed same-context reads
- **THEN** their last-known totals remain visible rather than returning to 0
- **AND** only an incompatible identity change clears counts back to the first-load presentation

#### Scenario: Symmetric tab padding across digit changes
- **WHEN** either selected or unselected Open or Closed tabs display one-, two- or three-digit counts in ordinary or coordinator views at 75–200% zoom including 130%
- **THEN** the gap from the tab's left edge to its label equals the gap from its painted count badge's right edge to the tab's right edge
- **AND** digits remain centred within the badge without moving tab or badge bounds as digit counts change

#### Scenario: Abbreviated large counts
- **WHEN** a count exceeds 999
- **THEN** its bounded badge displays 999+ and exposes the full exact total through its tooltip and accessible label
- **AND** its tab geometry remains unchanged

#### Scenario: One admitted repository remains unresolved
- **WHEN** some admitted coordinator PR identities have no authoritative state while other repositories have supplied rows
- **THEN** both totals remain marked loading rather than presenting the successfully loaded subset as complete
- **AND** before any complete total exists both badges show 0 using the existing count-loading tooltip and accessible state
- **AND** if new unread membership arrives after a complete same-scope snapshot, compatible last-good totals remain visibly marked loading until resolution
- **AND** completion counts only deduplicated eligible coordinator task PRs, never guessed states or whole-repository totals

#### Scenario: Worker seeded from coordinator section
- **WHEN** worker entry reuses that repository's known coordinator task section before repository-wide totals have loaded
- **THEN** both badges immediately show that section's known Open and Closed values with existing count-loading feedback identifying the cached task scope and incomplete repository totals
- **AND** no global multi-repository coordinator total is copied to the worker and no task subset is asserted to be the whole repository
- **AND** authoritative repository-wide rows and both totals replace the seed coherently when the ordinary read succeeds, while return to coordinator retains task-scoped counts
