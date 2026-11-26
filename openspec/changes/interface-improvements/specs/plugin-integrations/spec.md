# Spec Delta

## MODIFIED Requirements

### Requirement: Verified fleet integration identity
Fresh fleet action bindings SHALL require a live Crew owner and exact machine-qualified task-terminal membership with matching home identity and labels. Closed-task PR reads SHALL require validated same-home verified status, not a former worker. Remembered last-verified identity SHALL permit presentation and space-only block ordering, not new Git inventory reads, coordinator colour writes, messaging, worker navigation or terminal movement. Unknown action identity SHALL fail closed.

#### Scenario: Existing Crew identity
- **WHEN** read-only Crew status identifies its home, a live owner terminal and task terminals matching live worker labels and the current space model
- **THEN** only the owner's actual coordinator space and that home's unique fleet space are related
- **AND** the same local terminal or task ID on another machine cannot join that pair

#### Scenario: Ambiguous or moved terminals
- **WHEN** a worker label disagrees with the task record, workers span several candidate fleet spaces, or the owner is missing or replaced
- **THEN** the app refuses new ambiguous attachment and aggregate actions
- **AND** completed authoritative evidence removes an invalid prior attachment, while an incomplete refresh alone does not erase remembered last-verified presentation
- **AND** a later response from the previous binding cannot restore it

#### Scenario: Presentation is not authorization
- **WHEN** a remembered attachment is visible before fresh live action identity is verified
- **THEN** the display permits nested child rows, matching badge colour, local folding and same-machine space-only block ordering, but not new aggregate reads, coordinator colour writes, worker focus, messaging or tab/terminal movement
- **AND** same-home closed-task reads still require independently verified owner/status provenance
- **AND** existing stale-binding and generation checks continue to refuse obsolete requests

#### Scenario: Remembered coordinator without current inventory
- **WHEN** attachment is enabled or restored from host-local memory before current status and inventory are verified
- **THEN** the selected remembered coordinator shows the standard Loading working bulb rather than ordinary folder Git or a restored prior-toggle PR inventory
- **AND** presentation memory contains no PR/task inventory, grants no action freshness and does not alter Crew ownership, task records or running agents

### Requirement: Collapsible coordinator repository sections
Each coordinator repository section SHALL default expanded with independent locally persisted folding. Headers SHALL show canonical repository name, selected-tab eligible task PR count and chevron, using existing section styling and Agents group number styling and number-to-chevron spacing. Names SHALL truncate only on overflow with a full-name tooltip then. Folding SHALL remain responsive without changing top-level totals or starting reads.

#### Scenario: First display
- **WHEN** a repository has no saved folded state and appears in the coordinator overview
- **THEN** its section is expanded with the existing section header and expanded chevron
- **AND** its header shows canonical repository name and selected-tab count immediately before the chevron, with the same number style and number-to-chevron gap as an Agents group header

#### Scenario: Collapse and expand one repository
- **WHEN** the user clicks a repository header or its chevron
- **THEN** only that repository section toggles, using the existing section interaction and visual style
- **AND** its name, count and chevron remain visible while body rows and scoped errors or repository-specific diagnostics are hidden when folded
- **AND** reopening restores current rows and scoped body notices without changing the Open/Closed tab or selecting a PR
- **AND** the single enrollment footer remains visible independently of section folding

#### Scenario: Fold state survives panel changes
- **WHEN** a repository is collapsed and the user changes Open/Closed tabs, refreshes, changes coordinator selection, or closes and reopens the panel
- **THEN** it retains its local folded state independently of other repositories
- **AND** panel recreation restores saved state through the same local persistence mechanism as Spaces machine folding
- **AND** this UI state is not exported as a portable preference or written to Crew records

#### Scenario: Counts update while collapsed
- **WHEN** the normal aggregate lifecycle updates PR facts or task links for a folded repository
- **THEN** its header count includes every deduplicated eligible task PR for the selected tab, including unrevealed rows, and the global totals still include folded repositories
- **AND** switching Open/Closed updates the repository count without using repository-wide inventory
- **AND** folding performs no extra GitHub read, stops no existing webhook update, and does not create an empty-list message solely because all sections are folded

#### Scenario: Long repository name
- **WHEN** a canonical repository name is rendered in a wide or narrow panel
- **THEN** it uses all width not reserved for the count, chevron and existing header insets
- **AND** fitting names have no repeat-only tooltip, while overflowing names truncate with the full canonical name on hover
- **AND** count and chevron geometry remains stable for one-, two- and three-digit values

#### Scenario: Closed collapse with 41 items
- **WHEN** Closed contains 41 eligible PRs across repository sections and the user repeatedly collapses and reopens sections at different reveal depths and scroll positions
- **THEN** every action completes with the current fold state rather than an interrupted-render banner or frozen previous version
- **AND** rows remain reachable with the existing mounted reveal and batch limits, totals remain unchanged, and native error handling and deadlines are not weakened

#### Scenario: Incomplete repository count
- **WHEN** a visible repository has authoritative selected-tab rows plus unresolved admitted identities, or only an applicable initial failure notice
- **THEN** its number is the known eligible selected-tab row count, with existing loading hover and accessibility feedback identifying incomplete knowledge rather than an asserted complete total
- **AND** unread identities invent no PR state or count, while complete visible counts have no repeat-only count tooltip

### Requirement: Selected-tab coordinator repository visibility
Coordinator Git SHALL admit new repository sections only for known eligible selected-tab PRs or genuine applicable read notices, not unread links alone. Pending first reads SHALL share one standard panel Loading indication while compatible same-home runtime sections remain visible. Eligibility SHALL precede folding and preserve history bounds, truthful totals and saved folds. Enrollment SHALL use full eligible inventory independently of section visibility.

#### Scenario: Open and Closed contain different repositories
- **WHEN** one repository has only Open or Draft task PRs and another has only eligible Merged or Closed task PRs, with no unresolved task PRs
- **THEN** Open shows only the first repository section and Closed shows only the second
- **AND** omitted sections leave no header or chevron, and switching tabs preserves both totals

#### Scenario: Genuine selected-tab notice without rows
- **WHEN** a repository has no eligible selected-tab rows but has an applicable actionable PR-read notice
- **THEN** its section appears with that notice under existing folding behavior, even without a known PR state
- **AND** a failure scoped only to the other tab does not keep an otherwise empty section visible
- **AND** this explicit failure exception never becomes an empty Loading-only section

#### Scenario: History ages out
- **WHEN** a historical-only Merged or Closed PR is outside the existing 24-hour history limit or lacks a valid completion date
- **THEN** that PR and its expired row-specific failure do not keep a section visible
- **AND** other eligible rows or genuine applicable notices can still keep the section visible, while unresolved work remains represented by panel Loading

#### Scenario: Folded repository disappears and returns
- **WHEN** a repository is folded, becomes ineligible in the selected tab and later reappears through a tab switch or updated PR facts
- **THEN** its saved folded state is restored
- **AND** folding an eligible section alone does not produce an empty state or change counts

#### Scenario: Empty settled tab
- **WHEN** no repository has an eligible row or applicable read notice and no unresolved work remains in a settled verified tab
- **THEN** ordinary Git's `No open pull requests` or `No closed pull requests` appears without empty repository headers
- **AND** pending or unverified work uses one standard panel Loading indication instead of a false empty state

#### Scenario: Hidden section remains an enrollment choice
- **WHEN** a confirmed unenrolled repository has eligible PRs only in the other tab
- **THEN** the single pinned enrollment footer still includes it in canonical inventory order
- **AND** hiding its section does not enroll it, remove its fold state, or initiate or cancel reads

#### Scenario: Mixed successful repositories and a quietly deferred cold repository
- **WHEN** verified admitted links include unread PRs in one repository while healthy siblings have supplied rows
- **THEN** healthy rows remain visible and exactly one standard panel Loading bulb represents all unresolved first reads, including queued, in-flight and quietly deferred work
- **AND** the unread repository does not gain a new header in either tab until an eligible selected-tab row or genuine applicable failure notice is known
- **AND** no error or rate-limit wording, placeholder PR, per-repository Loading flash or falsely complete global total is introduced

#### Scenario: Retry fills the existing section
- **WHEN** the existing cooldown expires while the panel remains shown, enabled and freshly verified, and its automatic retry succeeds
- **THEN** the appropriate selected-tab section appears with its authoritative PR rows without requiring a new event or manual refresh
- **AND** surviving section identities, folds, reveal depth and scroll anchors remain stable without clearing healthy siblings
- **AND** confirmed missing PRs, other-tab-only rows and expired history leave no empty section, while panel Loading remains until unresolved work finishes

#### Scenario: Return to a previously visited coordinator
- **WHEN** the user returns to the same coordinator machine, owner, home and enable generation during the same runtime
- **THEN** the last compatible selected-tab sections, rows, counts and folds are shown immediately while current verification or membership reconciliation runs
- **AND** unresolved work shares one panel Loading indication rather than a list of unknown-only repository sections
- **AND** authoritative removals, state transitions and expiry reconcile without restoring incompatible facts or granting stale worker actions

### Requirement: Non-destructive same-context PR refresh presentation
A same-context PR refresh SHALL retain displayed rows, pin geometry and pagination until replacement data is ready. Pending reads, verification and transient failures SHALL NOT replace known rows with empty states. Coordinator returns SHALL reuse only bounded compatible runtime presentation. Different identities SHALL invalidate incompatible facts, and retained stale coordinator presentation SHALL NOT authorize reads or worker actions.

#### Scenario: Delayed manual or webhook refresh
- **WHEN** a manual, webhook, reconnect or show-time refresh is pending for the displayed repository or coordinator home
- **THEN** known rows stay mounted without a temporary empty list or loading reflow
- **AND** replacement facts apply directly, preserving expanded webhook depth and resetting manual pagination only when the replacement page is ready

#### Scenario: Transient root or PR read failure
- **WHEN** a same-context Git-root probe or PR refresh fails without authoritative evidence of a changed or absent repository
- **THEN** last-good rows remain visible with the appropriate failure notice rather than being cleared
- **AND** later success replaces facts without a blank intermediate frame

#### Scenario: Loading and fleet verification
- **WHEN** the panel is loading or the same coordinator home temporarily loses fresh verification
- **THEN** retained rows keep their Stale treatment without per-repository loading lines or displacement
- **AND** cold verification uses one ordinary panel working bulb and Loading wording, with no extra Verifying header, invented PRs, counts or skeleton values

#### Scenario: Off and on with slow or failed first verification
- **WHEN** a verified coordinator list is switched off and back on and the first current read is slow, interrupted or fails
- **THEN** off uses ordinary Git and clears inventory; on shows standard Loading for the current candidate, never Not a git repository while verification is pending or awaiting retry
- **AND** no previous inventory returns across off/on; Stale retains only its same-context meaning and grants no reads or worker navigation

#### Scenario: Negative completes before toggle without a panel render
- **WHEN** authoritative absence completes without a Git render, then attachment is switched off/on and new verification is pending or fails
- **THEN** Loading appears without old inventory or Stale resurrection
- **AND** only current fresh verification can populate the list

#### Scenario: Changed coordinator owner with verification pending
- **WHEN** a previous owner has a positive or negative result and a different labelled owner begins verification
- **THEN** the current candidate shows Loading rather than ordinary folder Git or the previous inventory
- **AND** only a witnessed authoritative negative matching current dependency identity can suppress Loading

#### Scenario: Authoritative context or membership change
- **WHEN** a different machine, folder or coordinator home is selected, a repository is definitively absent, or authoritative PR/task membership changes
- **THEN** incompatible rows are removed or replaced rather than retained as facts for the destination
- **AND** legitimate pin navigation, task-history expiry and requested folds or tab changes remain allowed layout changes

#### Scenario: Bounded runtime return memory
- **WHEN** a previously visited coordinator is selected again within the same runtime and enable generation
- **THEN** only that exact machine, owner, home and selected-tab presentation can be restored, subject to current eligibility and fresh action verification
- **AND** the cache is bounded, starts no hidden reads, and persists no PR/task inventory to disk, portable preferences or restart state
- **AND** Git, Crew or attachment disablement and authoritative ownership loss invalidate affected cached presentations
