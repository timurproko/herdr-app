# Spec Delta

## ADDED Requirements

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
- **THEN** the existing cold pulsing dot, text placement and lack of repository headers remain unchanged, and warm work retains its list with only the under-header moving line
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
- **AND** no repository header, zero count or chevron remains

#### Scenario: Failure without rows
- **WHEN** a repository has an applicable actionable read failure but no qualifying selected-tab PRs
- **THEN** its notice remains visible and scoped to that repository without a header, count or chevron, including after cold Loading ends
- **AND** a saved fold cannot hide that headerless notice, while quiet rate refusals retain their existing Loading or last-good presentation

#### Scenario: Folded and pinned nonempty sections
- **WHEN** qualifying rows exist but a section is intentionally folded, or an ordinary selected PR is pinned
- **THEN** folding alone does not make the section empty and existing remaining-row counts and lone-pin header suppression remain intact
- **AND** omitted empty sections retain their saved fold keys for later reappearance

## MODIFIED Requirements

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
Coordinator Git SHALL withhold cold partial successes until first reads settle, using pulsing top-left Loading below Open/Closed without repository headers/counts or the moving line. Warm return/refresh SHALL retain the list with the under-header line, no body Loading and in-place completion. Actionable notices SHALL appear immediately, without headers when no selected-tab PRs exist. Eligibility SHALL precede folding; enrollment SHALL use full eligible inventory independently of section visibility.

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
- **AND** pending reconciliation uses only the under-header moving line, with no header bulb, body Loading or Stale label, and completion stops the line and updates the list in place
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
