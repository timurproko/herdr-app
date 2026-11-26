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
- **THEN** only facts with the destination's full qualified identity can populate its section or pin
- **AND** one machine's response, cached totals or folder mapping cannot be reused as the other's

#### Scenario: Directory and routing change
- **WHEN** a selected terminal changes directory, its repository mapping changes, effective routing changes, or a read proves the destination is not a repository
- **THEN** incompatible rows, counts and pending transitions are rejected before the next destination presentation
- **AND** an unproven new directory never borrows a former folder's repository solely from a retained task label

#### Scenario: Lifetime and authority
- **WHEN** Git or the relevant source provider is disabled and re-enabled, ownership changes, or the app restarts
- **THEN** affected entry snapshots cannot restore prior-generation inventory or grant stale worker actions
- **AND** hidden snapshots do no reads and contain no native handles, callback trees, credentials or portable or restart-persisted PR inventory

### Requirement: Unified selected-agent Git pin transition
Entering a linked agent's space and clicking its stage chip SHALL use the same existing pin movement, retention and settlement behavior; robot fallback clicks SHALL remain equivalent. The matching PR SHALL pin within its repository section, with no duplicate list row. Returning to coordinator SHALL restore unpinned section order. Missing or unrelated matches SHALL NOT invent a pin or navigation.

#### Scenario: Stage chip changes selected agent
- **WHEN** one agent space is selected and a live Build or Review chip on another PR is clicked
- **THEN** existing role-aware navigation selects its agent immediately and the clicked PR moves to the pin using the existing native motion after destination confirmation
- **AND** entering that same agent directly produces the same row-to-pin transition through the same behavior, while Approved remains non-navigating

#### Scenario: Explicit link and branch selection
- **WHEN** the destination has a current explicit PR association or otherwise matches a PR head branch in its verified repository
- **THEN** the existing explicit-link precedence and branch fallback select its pin without borrowing another machine's agent
- **AND** a repeated selection of the same PR neither unpins nor restarts motion, and robot fallback navigation remains supported

#### Scenario: Coordinator order and latest facts
- **WHEN** selection returns from a worker to the coordinator while refresh has changed underlying PR facts
- **THEN** the shared motion removes the worker pin and restores the coordinator's latest eligible section order without refetch Loading
- **AND** motion settlement commits the latest accepted facts, not an older captured row payload

#### Scenario: Cancellation and unavailable geometry
- **WHEN** another selection, repository mismatch, Open/Closed change, scroll, disconnect or unavailable destination supersedes a transition
- **THEN** its retained motion is cancelled without undoing an already completed navigation
- **AND** unmeasured or cross-repository transitions use the existing safe normal reveal, never invented coordinates or a second animation treatment

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
