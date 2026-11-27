# Spec Delta

## ADDED Requirements

### Requirement: Coherent agent entry layout
Git SHALL resolve known PR association before the first target-content paint on an agent or space switch, directly rendering the final pinned or ordinary layout. Genuinely unresolved associations SHALL retain compatible stable content or calm Loading, never an intermediate unpinned target list. Different-pin and reverse switches SHALL obey the same rule. Stale association replies SHALL NOT affect a later selection.

#### Scenario: Agent switches
- **WHEN** entry changes from a no-PR agent to a known PR agent, to another PR agent or back to a no-PR agent
- **THEN** the target content uses exactly one layout and its PR row vertical positions do not change after its first content paint
- **AND** pending association resolution does not briefly expose a different pin/list layout

#### Scenario: Association read cannot resolve successfully
- **WHEN** the linked PR is authoritatively absent or a root, footer or targeted read fails, times out or is abandoned
- **THEN** absence releases admission to the final list; other failures expose actionable retry feedback and last-good content rather than perpetual Loading or a blank body
- **AND** raw alias errors are classified before absence decisions, pending footer reads have a finite deadline and obsolete replies cannot overwrite recovery

#### Scenario: Same-terminal footer changes
- **WHEN** periodic or manual root verification succeeds while the selected terminal stays the same and its footer PR changes or disappears
- **THEN** forced association demand runs after root loading clears, retaining the prior pin until the replacement resolves
- **AND** forced demand received during loading is not discarded

### Requirement: Quiet discarded read snapshots
A PR changing during a detail read or an obsolete/superseded refresh SHALL be discarded quietly, retaining last-good row content without a notice, error flash or layout shift. Retry SHALL be bounded through existing refresh scheduling. Actual actionable read failures SHALL retain their notices; stale snapshots SHALL NOT count as successful fresh reads.

#### Scenario: Head or state changes during detail read
- **WHEN** a detail response no longer matches the initial page's PR head, state or draft status
- **THEN** no partial result or changed-during-read notice is published and the existing row stays in the same position
- **AND** an eligible bounded later retry can publish a coherent replacement without a new immediate retry loop

### Requirement: Verdict labels navigate to the build owner
Git verdict labels, including Approved and Changes requested, SHALL use Build's guarded build-owner navigation with identical pointer, cursor, hover, focus and keyboard behavior and no tooltip. Missing, ended or disconnected targets SHALL be dim and inert like Build, without opening the PR. Review stage SHALL retain reviewer navigation. Verdict captions and colors SHALL remain independent of target availability.

#### Scenario: Verdict activation
- **WHEN** a verdict label is clicked or activated with Enter or Space in ordinary or coordinator Git
- **THEN** the exact currently eligible PR build owner is focused using the same navigation and pin-motion controller as Build, without opening GitHub
- **AND** captured stale targets, preview/probe labels and unavailable terminals cannot navigate or fall through to the row link

#### Scenario: Verdict appearance
- **WHEN** a verdict is live, unavailable, focused or hovered
- **THEN** its native caption and color remain, interaction styling matches Build and no tooltip appears, including from parent groups

### Requirement: Header-position Git body feedback
Ordinary and coordinator Git SHALL place list-replacing empty, informational and error text at the first repository header text's left edge and vertical position, with the same single-line row height at the current zoom. Multiline errors SHALL retain that first-line anchor and remain readable. Shared feedback in other panels SHALL remain unchanged.

#### Scenario: Empty tab replaces a repository list
- **WHEN** Open or Closed has no qualifying PRs and its empty text replaces the first repository header
- **THEN** the message text has the same x and y position and single-line row height as the header text at 100% and 130% zoom
- **AND** switching tabs or receiving content does not add a feedback-specific offset

#### Scenario: Error or information replaces the list
- **WHEN** a Git panel has a list-replacing actionable loading failure, non-repository explanation or other informational message
- **THEN** its first text line uses the same header-position anchor and single-line row height
- **AND** long errors remain readable without overlapping subsequent content or hiding actions

#### Scenario: Existing loading presentation
- **WHEN** unresolved cold data shows pulsing Loading or a warm list refreshes
- **THEN** the existing cold dot/text placement and lack of repository headers remain unchanged, and warm work retains its list with only the stationary under-header breathing line
- **AND** no global change moves Files or another panel's messages

### Requirement: Zero-row repository header suppression
Ordinary and coordinator Git SHALL omit a repository's header, count and chevron when the selected tab contains no qualifying PRs for it. Applicable actionable notices SHALL remain visible without a zero-row header. An authoritatively empty tab without notices SHALL show exactly one tab-specific empty text. Header visibility SHALL NOT change inventory, saved folds or repository ordering.

#### Scenario: Some repositories are empty
- **WHEN** one repository has selected-tab PRs and another has none
- **THEN** only the nonempty repository has a header and PR rows, with no name, zero count or chevron for the empty repository
- **AND** changing Open/Closed recomputes eligibility without disturbing the connected-child order of remaining sections

#### Scenario: All repositories are empty
- **WHEN** all selected-tab repository reads settle authoritatively without qualifying PRs or actionable notices
- **THEN** the body shows only one No open pull requests or No closed pull requests message at the first header position
- **AND** no repository header, zero count or chevron remains, even if its fold was saved or its final PR just left the selected tab

#### Scenario: Failure without rows
- **WHEN** a repository has an applicable actionable read failure but no qualifying selected-tab PRs
- **THEN** its notice remains visible and scoped to that repository without a header, count or chevron, including after cold Loading ends
- **AND** a saved fold cannot hide that headerless notice, while quiet rate refusals retain their existing Loading or last-good presentation

#### Scenario: Folded and pinned nonempty sections
- **WHEN** qualifying rows exist but a section is intentionally folded, or an ordinary selected PR is pinned
- **THEN** folding alone does not make the section empty and existing remaining-row counts and lone-pin header suppression remain intact
- **AND** omitted empty sections retain their saved fold keys for later reappearance

## MODIFIED Requirements

### Requirement: Three managed pull request stages
Git SHALL derive Build, Review or Approved from assigned managed labels and aliases using existing reads. Without a managed label, an Open/Draft PR with a verified live ship/fix target SHALL show Build instead of a robot. Each stage SHALL appear once on the bottom-right checks line with existing stage colours and raised fill, no emoji, outline, title reservation or tooltip. Assigned labels SHALL win; CI and GitHub review decisions SHALL NOT determine stage.

#### Scenario: Current and historical label names
- **WHEN** an ordinary or coordinator PR has a managed Build, Review or Approved label, with or without the managed robot prefix
- **THEN** its single bottom-right plain chip shows Build, Review or Approved, using the published current round for Build
- **AND** Rework and Changes needed map to Build, and Under review maps to Review, including previous robot-prefixed names
- **AND** unrelated labels remain unchanged and managed aliases collapse without duplicate stage pills or tooltips

#### Scenario: Existing label reads and refresh
- **WHEN** a list, targeted older-active or coordinator PR read returns label arrays or a connection, including null or empty labels
- **THEN** stage uses the same normalized labels plus existing verified live build-target evidence without another request
- **AND** existing refresh and stale-reply guards apply to stage updates and removal

#### Scenario: Approved while checks are pending or failed
- **WHEN** the assigned managed label is Approved and checks are pending, failed or successful
- **THEN** Approved retains its green caption and uses the same guarded build-owner navigation as Build, dim and inert if unavailable
- **AND** CI remains exclusively in the checks item, with no approved-CI-running or Review check CI chip
- **AND** required GitHub checks remain the merge gate; the app does not promote or merge the PR

#### Scenario: No managed label
- **WHEN** an Open/Draft PR has no managed stage label and a verified live ship/fix target exists
- **THEN** one bottom-right Build chip replaces its title-line robot and retains guarded build-agent focus
- **AND** missing, invalid or first-round metadata produces Build, not Build 1 or Build 2
- **AND** a row without a managed stage or verified live build target invents no stage; other fallback navigation remains unchanged

#### Scenario: Planning-only build owner
- **WHEN** a live ship/fix task has only planned its linked PR, including an unapproved draft plan
- **THEN** it uses the same first-round Build caption and build-owner action as initial implementation
- **AND** Build asserts neither implementation approval nor completion, and a task without a PR contributes no row or chip

#### Scenario: Multiple labels and unavailable agents
- **WHEN** several managed aliases coexist or the selected stage has no live connected role target
- **THEN** existing deterministic precedence produces one bottom-right plain chip with no separate robot or top chip
- **AND** stage remains in the bounded coordinator group even when unrelated labels precede it
- **AND** unavailable Build, Review and Approved remain dim and inert without a tooltip or fallback PR action

### Requirement: Role-aware stage navigation
Build and Approved SHALL target ship or fix terminals by validated full crew.pr identity or matching repository/head branch. Review SHALL target only crew.kind=review terminals whose crew.pr matches the PR, never by branch. Live connected targets SHALL focus their existing machine-qualified terminal without opening GitHub. Separate review-verdict text SHALL use the same guarded build-owner action.

#### Scenario: Worker and reviewer share a PR
- **WHEN** ship and review terminals share the same full crew.pr URL while the reviewer sits on the base branch
- **THEN** Build, Approved and review-verdict text focus the ship terminal and Review focuses the reviewer
- **AND** an identically numbered PR in another repository never matches

#### Scenario: Branch fallback is build-only
- **WHEN** a ship or fix terminal lacks crew.pr but has the verified repository and PR head branch
- **THEN** it can be the build-owner target for Build or a verdict
- **AND** a review terminal without matching crew.pr cannot become a target through branch, footer or tab-name inference

#### Scenario: Exact identity outranks branch
- **WHEN** a ship terminal explicitly links another PR but its branch matches this PR, or a review terminal links another repository's same PR number
- **THEN** that terminal is not a stage target for this PR
- **AND** multiple eligible matches prefer exact PR identity, then the selected terminal, then stable model order

#### Scenario: Captured action becomes stale
- **WHEN** a target ends, moves, changes role or PR, disconnects, or the panel's captured context or verdict becomes invalid before a click
- **THEN** the click does not focus a replacement terminal or open GitHub accidentally
- **AND** coordinator navigation still requires fresh verified same-home membership and exact captured task identity

#### Scenario: Preview and row actions
- **WHEN** a stage or verdict is rendered in a motion preview or activated in an ordinary row
- **THEN** previews remain noninteractive and live labels use their guarded agent action without also activating the row
- **AND** unavailable stage and verdict targets remain dim and inert without tooltips

### Requirement: Tight bottom-right plain stage projection
The one stage control SHALL use plain Build, Review or Approved text on the bottom-right checks line, stage-palette colour, subtle raised fill and 6px side padding, without robot emoji, outline or tooltip. Published current round 1 SHALL show Build; current n >= 2 SHALL show Build n. Titles SHALL occupy the entire row content width except an unrelated live fallback robot. Probes SHALL measure the same caption/style without navigation handlers.

#### Scenario: Full-width title and supplied round
- **WHEN** normal or narrow rows show any managed or initial-build stage, including supplied current Build rounds
- **THEN** the title truncates only at the right content edge with no stage reservation
- **AND** exactly one bottom-right chip is visible, and changing the round invalidates its measured caption
- **AND** side padding is 6px, row height remains 74px and the metadata-line height and trailing anchor are unchanged

#### Scenario: Preserved role actions
- **WHEN** the visible stage is activated
- **THEN** fresh guarded Build/Approved targets focus their build owner and Review focuses its reviewer
- **AND** unavailable targets remain dimmed/inert with accessible semantics, while probes and ghosts cannot navigate

### Requirement: One complete-lifecycle Git loading animation
Ordinary and coordinator Git SHALL show one loading animation at a time: a cold Loading dot or a stationary full-width 1px accent line immediately below the header for warm pending work. Both SHALL breathe by opacity only with a 2400ms ease-in-out cycle and a nonzero minimum opacity. Reduced motion SHALL use static dim feedback. Existing work-only visibility and retirement conditions SHALL remain; other panels SHALL remain unchanged.

#### Scenario: Cold ordinary and coordinator work
- **WHEN** enabled shown Git begins work without compatible previously shown content
- **THEN** cold Loading retains its 7px dot, 6px gap, blue 12px text and placement, with the shared Git breathing rhythm and no moving line or repository headers
- **AND** actionable failures, coherent inventory publication and count uncertainty remain unchanged

#### Scenario: Warm background and manual work
- **WHEN** shown Git performs warm return, verification, manual, webhook or safety work
- **THEN** one full-width thin accent line breathes without positional motion, stepping or vanishing, while the existing list remains mounted without body Loading or Stale text
- **AND** overlapping work retains the line until the last pending operation finishes and Refresh stays static with its existing disabled feedback

#### Scenario: Idle failure cooldown and retired callbacks
- **WHEN** work completes, fails, awaits a dormant retry, or the panel hides, disables or changes context
- **THEN** obsolete work cannot retain or clear a newer context's loading feedback
- **AND** dormant cooldowns and uncertain totals do not assert active warm work; unresolved cold inventory may retain Loading

#### Scenario: Reduced motion
- **WHEN** reduced motion is requested
- **THEN** Git uses a static dim line or dot with the same geometry and admission conditions, without an animation loop
- **AND** other panels' loading feedback is unchanged

### Requirement: Optional build review history
Git SHALL interpret published crew.round as the current build/review round, not a completed-review count. Missing, invalid or first-round metadata SHALL show Build; current round 2 and later SHALL show Build n. Plan reporting and approval SHALL NOT advance the caption. crew.finding and crew.approved SHALL NOT determine stage, invent history or create tooltips.

#### Scenario: First return from review
- **WHEN** the Build terminal reports current round 2 after its first actual requested-changes review
- **THEN** its plain chip reads Build 2 without a finding tooltip
- **AND** later current rounds advance the same chip's build number without adding another visible stage

#### Scenario: Older Crew has no review metadata
- **WHEN** terminal labels omit round, finding and approval metadata
- **THEN** the stage remains usable with canonical Build and no round or finding tooltip text
- **AND** absent findings are not replaced with invented text

#### Scenario: Approval metadata is not a fourth stage
- **WHEN** a terminal publishes crew.approved while GitHub labels still show Review or Build
- **THEN** the assigned managed label continues to determine the chip
- **AND** no CI-dependent chip or extra agent action is inferred from that SHA

#### Scenario: Spawn plan approval and implementation
- **WHEN** a ship task is spawned with current round 1, reports its plan, receives approval and begins implementation without any requested-changes review
- **THEN** each lifecycle step shows Build with no number, whether or not a managed Build label is already assigned
- **AND** only a real requested-changes review advancing the published current round to 2 produces Build 2

### Requirement: Collapsible coordinator repository sections
Each nonempty coordinator repository section SHALL default expanded with independent locally persisted folding. Headers SHALL show canonical repository name, selected-tab eligible task PR count and chevron, using existing section styling and Agents group number styling and number-to-chevron spacing. Names SHALL truncate only on overflow with a full-name tooltip then. Folding SHALL preserve top-level totals without starting reads. Notice-only sections SHALL have no header.

#### Scenario: First display
- **WHEN** a repository has selected-tab PRs, no saved folded state and appears in the coordinator overview
- **THEN** its section is expanded with the existing section header and expanded chevron
- **AND** its header shows canonical repository name and selected-tab count immediately before the chevron, with the same number style and number-to-chevron gap as an Agents group header

#### Scenario: Collapse and expand one repository
- **WHEN** the user clicks a nonempty repository header or its chevron
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
- **AND** switching Open/Closed updates the repository count without using repository-wide inventory, removing the header if no selected-tab PRs remain
- **AND** folding performs no extra GitHub read, stops no existing webhook update, and does not create an empty-list message solely because all sections are folded

#### Scenario: Long repository name
- **WHEN** a canonical repository name is rendered in a wide or narrow panel
- **THEN** it uses all width not reserved for the count, chevron and existing header insets
- **AND** fitting names have no repeat-only tooltip, while overflowing names truncate with the full canonical name on hover
- **AND** count and chevron geometry remains stable for one-, two- and three-digit values

#### Scenario: Incomplete repository count
- **WHEN** a visible repository has authoritative selected-tab rows plus unresolved admitted identities
- **THEN** its number is the known eligible selected-tab row count, with existing loading hover and accessibility feedback identifying incomplete knowledge rather than an asserted complete total
- **AND** unread identities invent no PR state or count, while complete visible counts have no repeat-only count tooltip
- **AND** a repository with only an applicable initial failure notice has no header or count

### Requirement: Selected-tab coordinator repository visibility
Coordinator Git SHALL withhold cold partial successes until first reads settle, with top-left pulsing Loading below Open/Closed and no headers, counts or warm line. Warm return/refresh SHALL retain the list with the under-header line, no body Loading and in-place completion. Actionable notices SHALL appear immediately, without headers for zero-PR selected-tab sections. Eligibility SHALL precede folding; enrollment SHALL use full eligible inventory independently of section visibility.

#### Scenario: Open and Closed contain different repositories
- **WHEN** one repository has only Open or Draft task PRs and another has only eligible Merged or Closed task PRs, with no unresolved task PRs
- **THEN** Open shows only the first repository section and Closed shows only the second
- **AND** omitted sections leave no header or chevron, and switching tabs preserves internal scoped totals without tab badges

#### Scenario: Genuine selected-tab notice without rows
- **WHEN** a repository has no eligible selected-tab rows but has an applicable actionable PR-read notice
- **THEN** its notice appears immediately without a repository header, count or chevron, both during and after cold Loading, regardless of saved folding
- **AND** a failure scoped only to the other tab does not keep an otherwise empty section visible
- **AND** this explicit failure exception never becomes an empty Loading-only section

#### Scenario: History ages out
- **WHEN** a historical-only Merged or Closed PR is outside the existing 24-hour history limit or lacks a valid completion date
- **THEN** that PR and its expired row-specific failure do not keep a section visible
- **AND** other eligible rows or genuine applicable notices can still keep a section visible once admitted, while unresolved work remains represented by panel Loading

#### Scenario: Folded repository disappears and returns
- **WHEN** a repository is folded, becomes ineligible in the selected tab and later reappears through a tab switch or updated PR facts
- **THEN** its saved folded state is restored
- **AND** folding an eligible section alone does not produce an empty state or change counts

#### Scenario: Empty settled tab
- **WHEN** no repository has an eligible row or applicable read notice and no unresolved work remains in a settled verified tab
- **THEN** ordinary Git's No open pull requests or No closed pull requests appears once at the first repository header text position without empty repository headers
- **AND** pending or unverified work uses one standard panel Loading text indication instead of a false empty state

#### Scenario: Hidden section remains an enrollment choice
- **WHEN** a confirmed unenrolled repository has eligible PRs only in the other tab
- **THEN** the single pinned enrollment footer still includes it in canonical inventory order
- **AND** hiding its section does not enroll it, remove its fold state, or initiate or cancel reads

#### Scenario: Mixed successful repositories and a quietly deferred cold repository
- **WHEN** no compatible sections have previously been shown and admitted links include unread PRs in one repository while healthy siblings have supplied rows
- **THEN** only one standard top-left pulsing dot and Loading text appear as body inventory feedback, with successful sibling headers and rows withheld until all admitted first reads settle
- **AND** queued, in-flight and quietly deferred work remain unresolved; genuine applicable failures may show their scoped notice immediately below Loading without repository headers or counts
- **AND** no error or rate-limit wording, placeholder PR, per-repository Loading flash or falsely complete global total is introduced
- **AND** no under-header line appears while body Loading is shown

#### Scenario: Retry fills the existing section
- **WHEN** the existing cooldown expires while the panel remains shown, enabled and freshly verified, and its automatic retry succeeds
- **THEN** the complete eligible selected-tab success sections appear together when no unresolved first reads remain, without requiring a new event or manual refresh
- **AND** previously shown compatible section identities, folds, reveal depth and scroll anchors remain stable without clearing healthy last-good rows
- **AND** confirmed missing PRs, other-tab-only rows and expired history leave no empty section, while top-left Loading remains until unresolved work finishes

#### Scenario: Return to a previously visited coordinator
- **WHEN** the user returns to the same coordinator machine, owner, home and enable generation during the same runtime
- **THEN** the last compatible previously shown selected-tab sections, rows, counts and folds are shown immediately while current verification or membership reconciliation runs
- **AND** pending reconciliation uses only the stationary under-header breathing line, with no header bulb, body Loading or Stale label, and completion stops the line and updates the list in place
- **AND** newly loading partial success sections are withheld until first reads settle, while actionable notices appear immediately
- **AND** authoritative removals, state transitions and expiry reconcile without restoring incompatible facts or granting stale worker actions

#### Scenario: One cold repository fails while others load
- **WHEN** one admitted repository has an actionable first-read failure and other repositories have pending or deferred first reads
- **THEN** one top-left pulsing Loading indication remains and the failed repository's applicable scoped notice appears beneath it without any repository header or count
- **AND** successful partial sections remain withheld; when all remaining reads succeed, confirm absence or fail actionably, eligible successes and headerless failure-only notices appear and Loading disappears
- **AND** actionable failures without authoritative PR state keep internal totals uncertain rather than inventing exact totals, even after the body Loading disappears

#### Scenario: Background refresh of an already shown list
- **WHEN** the coordinator list is on screen and known PR facts refresh without new unread membership or lost verification
- **THEN** existing sections and rows remain mounted without body Loading or Stale text, and only the under-header line animates throughout pending work
- **AND** new unread membership or pending verification also uses the line only; it stops and the list updates in place when the update finishes
- **AND** new partial success sections are withheld until first reads settle, while current authoritative removals, history expiry and state transitions remain effective

### Requirement: Exclusive cold Git loading presentation
Ordinary and coordinator Git panels SHALL never show repository section headers or their counts together with body Loading. Unresolved cold reads SHALL show one pulsing Loading message at the same position below Open/Closed in both views. Successful partial sections SHALL wait for coherent publication. Actionable failures SHALL remain visible without a section header while Loading remains; failure-only sections SHALL remain headerless after Loading ends.

#### Scenario: Ordinary identity arrives before its first page
- **WHEN** the repository identity is known but no compatible selected-tab page or published section is ready
- **THEN** only the standard pulsing Loading message represents the pending list, without a repository header or zero section count
- **AND** the header and eligible rows appear together when ready, replacing Loading; an empty result instead shows its single header-position empty text without a header

#### Scenario: Coordinator mixed pending success and failure
- **WHEN** a cold coordinator has successful sibling reads and unresolved first reads, with or without actionable repository failures
- **THEN** one pulsing Loading message remains, all repository headers/counts and successful partial rows are withheld, and applicable failures remain visible as scoped notices
- **AND** failures are not hidden by saved folds while their headers are withheld
- **AND** after first reads settle, eligible nonempty sections use their ordinary headers, failure-only sections remain headerless and Loading disappears

#### Scenario: Warm empty and nonempty results
- **WHEN** a compatible previously published list or authoritative empty result refreshes
- **THEN** that presentation remains without body Loading, and only the under-header line animates while work is active
- **AND** visible failures, pins, folds, paging and scroll behavior retain their existing policy except that zero-row headers remain absent
