# Spec Delta

## MODIFIED Requirements

### Requirement: Shared Git pull request metadata
Git SHALL use identical PR metadata presentation in ordinary repository and coordinator views, in both Open and Closed tabs. Rows SHALL omit author-association badges, including Owner. Below the number/author byline, metadata SHALL reserve independent cells in tasks, checks, assigned GitHub labels and review-decision order. Missing items SHALL leave blank geometry, not visible placeholders; visible separators SHALL NOT lead, double or trail the present groups.

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
- **AND** truncated content remains available through full-value hover text

### Requirement: Labels share PR data refresh
PR labels SHALL be obtained with existing PR reads rather than additional per-row requests. Labels SHALL refresh with other row facts on panel opening, manual refresh, reconnect and relevant webhook invalidation, including pull_request labeled and unlabeled actions. Stale replies SHALL NOT restore labels in another repository or panel context, and unchanged PRs SHALL NOT acquire periodic label polling.

#### Scenario: Existing repository and targeted reads
- **WHEN** a PR is loaded through a paginated repository list, an older active-PR lookup or a coordinator task lookup
- **THEN** its assigned label names and colours are included in that same PR read
- **AND** no additional label request is started for the row

#### Scenario: Label added or removed
- **WHEN** a relevant authenticated pull_request labeled or unlabeled event invalidates loaded rows
- **THEN** the corresponding existing refresh path updates their labels from authoritative PR data
- **AND** removing the final label removes its visible pills and any now-redundant separator while retaining blank cell geometry, without a visible placeholder

## ADDED Requirements

### Requirement: Stable pull request block geometry
At a given panel width and zoom, every PR block SHALL reserve the same state-icon, title, related-agent, byline and metadata slots from first paint. Optional facts SHALL NOT change title truncation width, line positions, block height or other cells' anchors. Metadata SHALL occupy one fixed-height line even when empty, and absent content SHALL remain visually blank rather than showing skeletons or fabricated values.

#### Scenario: Agent appears or finishes
- **WHEN** otherwise identical rows have or lack a related live agent, including a coordinator task whose worker finishes
- **THEN** their title truncation boundaries, line positions and block heights match
- **AND** the absent robot leaves an inert blank slot rather than a hidden clickable control

#### Scenario: Late optional data
- **WHEN** checks, tasks, assigned labels, author details, review decisions or merge-conflict facts arrive or are removed after first paint
- **THEN** their reserved cells and the state-icon slot retain their geometry without adding or removing lines
- **AND** long content truncates within its cell instead of displacing neighboring cells or overflowing the block

#### Scenario: Row variants and zoom
- **WHEN** ordinary, pinned, scrolling, coordinator and motion-preview rows render in Open or Closed at 75%, 100%, 125%, 150% or 200% zoom
- **THEN** each uses the same logical line and slot geometry for its available width
- **AND** optional content changes preserve the list's vertical rhythm at every zoom

### Requirement: Non-destructive same-context PR refresh presentation
A same-context PR refresh SHALL retain previously displayed rows, pin geometry and pagination until replacement data is ready. Pending reads, verification and transient failures SHALL NOT replace known rows with loading or empty states. Changed repository, machine or coordinator-home identities SHALL still invalidate old facts immediately, and retained stale coordinator presentation SHALL NOT authorize reads or worker actions.

#### Scenario: Delayed manual or webhook refresh
- **WHEN** a manual, webhook, reconnect or show-time refresh is pending for the displayed repository or coordinator home
- **THEN** known rows stay mounted in their existing positions without a temporary empty list or loading reflow
- **AND** successful replacement facts are applied directly, preserving expanded depth for webhook refresh and resetting manual pagination only when its replacement page is ready

#### Scenario: Transient root or PR read failure
- **WHEN** a same-context Git-root probe or PR refresh fails without authoritative evidence of a changed or absent repository
- **THEN** last-good rows remain visible with the appropriate failure notice rather than being cleared
- **AND** a later successful refresh replaces facts without a blank intermediate frame

#### Scenario: Loading and fleet verification
- **WHEN** the panel is loading or the same coordinator home temporarily loses fresh verification
- **THEN** loading or verifying feedback does not add row lines or displace retained rows
- **AND** cold start without prior rows retains truthful waiting feedback without inventing PRs, counts or visible skeleton values

#### Scenario: Authoritative context or membership change
- **WHEN** a different machine, folder or coordinator home is selected, a repository is definitively absent, or authoritative PR/task membership changes
- **THEN** incompatible rows are removed or replaced under existing eligibility rules rather than retained as facts for the new context
- **AND** legitimate pin navigation, task-history expiry and requested folds or tab changes remain allowed layout changes
