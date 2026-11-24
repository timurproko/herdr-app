# Spec Delta

## MODIFIED Requirements

### Requirement: Shared Git pull request metadata
Git SHALL use identical metadata in ordinary and coordinator Open/Closed rows, without author-association badges. The two lower lines SHALL flow left at natural content widths with constant gaps and trailing free space, without stretched, percentage or equal-width cells. Metadata SHALL retain tasks, checks, assigned-labels and review-decision order. Missing groups SHALL occupy no horizontal space; separators SHALL NOT lead, double or trail visible groups. Full wording SHALL remain when the whole line fits. On actual overflow, tasks SHALL shorten to whole fractions and byline time to a compact form before clipping secondary author, label or review text. Checks SHALL never shrink, wrap or truncate. Tooltips SHALL retain full values.

#### Scenario: Ordinary and coordinator rows
- **WHEN** an owner-authored PR with tasks, checks and labels is displayed in either view and either tab
- **THEN** its metadata flows naturally as tasks, checks and labels in that order, without an Owner badge
- **AND** pinned, scrolling and motion-preview rows use the same presentation

#### Scenario: Missing metadata items
- **WHEN** a PR lacks tasks, checks or labels
- **THEN** only present items and separators between them occupy the left-aligned run, leaving unused space at the end
- **AND** no visible empty label placeholder or redundant separator is shown

#### Scenario: Task counts and review decision change
- **WHEN** a checklist changes between untouched, partial and complete, check counts change, or a review decision appears or disappears
- **THEN** present items take their natural places in fixed order without changing title geometry, line positions or block height
- **AND** compact or truncated content remains available through full-value hover text

#### Scenario: Checks take priority at supported widths
- **WHEN** metadata renders at any supported panel width and zoom, including 280/320/360/390/480px at 75–200% zoom
- **THEN** the checks icon and full count remain contained, without clipping, ellipsis or wrapping, including one- and two-digit totals such as 1/1, 3/10, 11/11 and 99/99
- **AND** checks use their complete natural width before lower-priority content is clipped
- **AND** the matrix includes the screenshot's approximately 390px panel, with no shortening while the complete line fits

#### Scenario: Compact whole task progress
- **WHEN** the whole metadata line cannot fit with full task wording
- **THEN** the row uses a complete compact form such as 2/2 tasks or an icon with 2/2, without cutting a word and before clipping label text
- **AND** no metadata value renders as a lone ellipsis; full task progress, labels and review values remain available in tooltips

### Requirement: Stable pull request block geometry
At a given panel width and zoom, every PR block SHALL reserve the same state-icon, title, related-agent, byline and metadata slots from first paint. Optional facts SHALL NOT change title truncation width, line positions or block height. Within a lower line, present elements MAY take their natural places as facts change; horizontal anchors are not reserved for absent metadata. Metadata SHALL occupy one fixed-height line even when empty, and absent content SHALL remain visually blank rather than showing skeletons or fabricated values.

#### Scenario: Agent appears or finishes
- **WHEN** otherwise identical rows have or lack a related live agent, including a coordinator task whose worker finishes
- **THEN** their title truncation boundaries, line positions and block heights match
- **AND** the absent robot leaves an inert blank slot rather than a hidden clickable control

#### Scenario: Late optional data
- **WHEN** checks, tasks, assigned labels, author details, review decisions or merge-conflict facts arrive or are removed after first paint
- **THEN** the state-icon and title/agent reservations and all three line boxes retain their geometry without adding or removing lines
- **AND** present lower-line elements flow in fixed order at natural widths, shortening only on whole-line overflow while checks remain complete

#### Scenario: Row variants and zoom
- **WHEN** ordinary, pinned, scrolling, coordinator and motion-preview rows render in Open or Closed at 75%, 100%, 125%, 150% or 200% zoom
- **THEN** each uses the same logical line and slot geometry for its available width
- **AND** optional content changes preserve the list's vertical rhythm at every zoom

#### Scenario: Whole relative time in the byline
- **WHEN** the full number, author and verbose relative time run cannot fit the available byline width
- **THEN** a complete compact relative time such as 27m ago is shown instead of a mid-word truncation
- **AND** full author, action and relative-time values remain in the byline tooltip while the number, author and time remain left-aligned with constant separator gaps

### Requirement: Bounded aggregate reads and invalidation
Aggregate reads SHALL be read-only, machine-bound and limited to a shown enabled Git panel. New local task links SHALL trigger targeted PR reads. CI SHALL use authenticated events or explicit refresh, with a bounded pending/unknown-only fallback for repositories lacking live coverage. Selection, plugin or ownership changes SHALL invalidate stale responses and captured actions. One repository's failure SHALL NOT erase valid rows from another.

#### Scenario: Refresh and repository events
- **WHEN** the panel opens, the user refreshes, or a relevant authenticated repository event arrives
- **THEN** it refreshes the appropriate linked PR facts and retains unaffected repository rows
- **AND** timer-based local Crew membership checks do not periodically re-fetch unchanged GitHub PR or CI facts

#### Scenario: Hide, disable or switch during a request
- **WHEN** Git is hidden or disabled, Crew or attachment is disabled, or the selected coordinator binding changes during a read
- **THEN** no new aggregate follow-up read starts from that obsolete request
- **AND** its late result cannot populate the next context or authorize a stale agent-focus action

#### Scenario: Repository unavailable
- **WHEN** one linked repository is inaccessible to that machine's GitHub login
- **THEN** the panel preserves other repositories' valid rows and reports a scoped incomplete result
- **AND** it does not switch accounts, install companions or enroll webhook repositories automatically

## ADDED Requirements

### Requirement: Pending checks fallback without live coverage
Shown pending or unknown checks without repository live coverage SHALL refresh at 45-second intervals through one coalesced repository job using the existing request queue. Failed reads SHALL retain prior values and back off exponentially; rate limits SHALL delay retries at least 15 minutes. Settled or enrolled rows SHALL NOT be polled. Hidden, disabled, offline or superseded contexts SHALL stop fallback reads.

#### Scenario: Pending checks settle
- **WHEN** an unenrolled shown PR has pending checks and its fallback read returns settled checks
- **THEN** the count updates in place and subsequent fallback timers start no reads for that settled row
- **AND** a confirmed empty rollup is settled rather than unknown

#### Scenario: Failure and visibility
- **WHEN** a fallback read fails or the panel is hidden, disabled or its machine goes offline
- **THEN** its last displayed value remains and failures back off before another eligible read
- **AND** hidden, disabled or offline contexts start no fallback reads and late replies cannot overwrite a new context

### Requirement: Completion-driven Git checks freshness
A shown, enabled Git panel with an enrolled repository and healthy relay SHALL refresh loaded checks from authoritative GitHub reads after relevant completion events, including events during an in-flight refresh. Reconnect and reopening SHALL catch up. The app SHALL retain latest-workflow/rerun semantics without polling settled or enrolled rows and document latency dependencies and conditions that retain stale counts.

#### Scenario: Completion and rerun update loaded rows
- **WHEN** authenticated check, status or workflow invalidation arrives for a loaded ordinary or coordinator repository after checks change
- **THEN** refreshed icon/count values match the latest authoritative checks, including partial completion and reruns
- **AND** pinned, unpinned and explicitly linked older rows receive the refresh without requiring agent selection changes

#### Scenario: Completion during an in-flight read
- **WHEN** a relevant completion event arrives while the previous refresh is reading GitHub facts
- **THEN** a coalesced follow-up refresh consumes that invalidation rather than leaving the previous count indefinitely
- **AND** obsolete replies cannot overwrite facts in a different repository, machine or coordinator context

#### Scenario: Refresh timing and unavailable live updates
- **WHEN** refresh behavior is documented or reported
- **THEN** it distinguishes event receipt, request queue/read latency and GitHub data propagation from measured end-to-end latency
- **AND** it states how absent enrollment uses pending-only fallback, while relay outages, hidden or disabled panels, unverified coordinator context, missed events and failed reads can retain old counts until the applicable fallback, catch-up or manual refresh
- **AND** it does not promise a bounded live-update delay when those prerequisites or successful authoritative reads are absent
