# Spec Delta

## MODIFIED Requirements

### Requirement: Shared Git pull request metadata
Git SHALL use identical metadata in ordinary and coordinator Open/Closed rows, without author-association badges. Stable width-dependent cells SHALL retain tasks, checks, assigned-labels and review-decision order. Allocation priority SHALL be full checks icon/count, assigned review-label pills, then task progress. Missing groups SHALL preserve blank reservations; separators SHALL NOT lead, double or trail visible groups. Tooltips SHALL retain full values.

#### Scenario: Ordinary and coordinator rows
- **WHEN** an owner-authored PR with tasks, checks and labels is displayed in either view and either tab
- **THEN** its metadata uses the reserved tasks, checks and labels cells in that order, without an Owner badge
- **AND** pinned, scrolling and motion-preview rows use the same presentation

#### Scenario: Missing metadata items
- **WHEN** a PR lacks tasks, checks or labels
- **THEN** only present items are visible in their reserved cells, without shifting the other groups toward the left edge
- **AND** no visible empty label placeholder or redundant separator is shown

#### Scenario: Task counts and review decision change
- **WHEN** a checklist changes between untouched, partial and complete, check counts change, or a review decision appears or disappears
- **THEN** icons and text update within their existing cells without moving the labels, other metadata anchors or row lines
- **AND** compact or truncated content remains available through full-value hover text

#### Scenario: Checks take priority at supported widths
- **WHEN** metadata renders at any supported panel width and zoom, including 280/320/360/480px at 75–200% zoom
- **THEN** the checks icon and full count remain contained, without clipping, ellipsis or wrapping, including one- and two-digit totals such as 1/1, 3/10, 11/11 and 99/99
- **AND** its reservation accommodates the widest realistic count rather than just the currently displayed digits
- **AND** the label allocation takes priority over verbose task wording without changing cell anchors when optional facts appear

#### Scenario: Compact whole task progress
- **WHEN** full task wording does not fit its reserved cell
- **THEN** the row uses a complete compact form such as 2/2 tasks or an icon with 2/2, without cutting a word
- **AND** no metadata value renders as a lone ellipsis; full task progress, labels and review values remain available in tooltips

### Requirement: Stable pull request block geometry
At a given panel width and zoom, every PR block SHALL reserve the same state-icon, title, related-agent, byline and metadata slots from first paint. Optional facts SHALL NOT change title truncation width, line positions, block height or other cells' anchors. Metadata SHALL occupy one fixed-height line even when empty, and absent content SHALL remain visually blank rather than showing skeletons or fabricated values.

#### Scenario: Agent appears or finishes
- **WHEN** otherwise identical rows have or lack a related live agent, including a coordinator task whose worker finishes
- **THEN** their title truncation boundaries, line positions and block heights match
- **AND** the absent robot leaves an inert blank slot rather than a hidden clickable control

#### Scenario: Late optional data
- **WHEN** checks, tasks, assigned labels, author details, review decisions or merge-conflict facts arrive or are removed after first paint
- **THEN** their reserved cells and the state-icon slot retain their geometry without adding or removing lines
- **AND** lower-priority content shortens within its cell instead of displacing neighboring cells or overflowing the block, while checks remain complete

#### Scenario: Row variants and zoom
- **WHEN** ordinary, pinned, scrolling, coordinator and motion-preview rows render in Open or Closed at 75%, 100%, 125%, 150% or 200% zoom
- **THEN** each uses the same logical line and slot geometry for its available width
- **AND** optional content changes preserve the list's vertical rhythm at every zoom

#### Scenario: Whole relative time in the byline
- **WHEN** verbose relative time cannot fit its stable byline slot
- **THEN** a complete compact relative time such as 27m ago is shown instead of a mid-word truncation
- **AND** full author, action and relative-time values remain in the byline tooltip without moving neighboring cells

## ADDED Requirements

### Requirement: Completion-driven Git checks freshness
A shown, enabled Git panel with an enrolled repository and healthy relay SHALL refresh loaded checks from authoritative GitHub reads after relevant completion events, including events during an in-flight refresh. Reconnect and reopening SHALL catch up. The app SHALL retain latest-workflow/rerun semantics without periodic CI polling and document latency dependencies and conditions that retain stale counts.

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
- **AND** it states that absent enrollment, missing/offline relay, hidden or disabled panels, unverified coordinator context, missed events and failed reads can retain old counts until the applicable catch-up or manual refresh
- **AND** it does not promise a bounded live-update delay when those prerequisites or successful authoritative reads are absent
