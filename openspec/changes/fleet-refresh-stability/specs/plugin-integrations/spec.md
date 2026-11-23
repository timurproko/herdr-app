# Spec Delta

## MODIFIED Requirements

### Requirement: Verified fleet integration identity
Fleet bindings and live worker actions SHALL require a live Crew owner and exact machine-qualified task-terminal membership, with matching home identity and worker labels. Closed-task PR reads SHALL require recorded links from the verified coordinator's same-home status, not a live former worker. Unknown or conflicting identity SHALL fail closed. Bounded last-verified presentation SHALL NOT authorize actions or alter Crew ownership, records or running agents.

#### Scenario: Existing Crew identity
- **WHEN** read-only Crew status identifies its home, a live owner terminal and task terminals matching live worker labels and the current space model
- **THEN** only the owner's actual coordinator space and that home's unique fleet space are related
- **AND** the same local terminal or task ID on another machine cannot join that pair

#### Scenario: Ambiguous or moved terminals
- **WHEN** a worker label disagrees with the task record, workers span several candidate fleet spaces, or the owner is missing or replaced
- **THEN** the app refuses new ambiguous attachment and aggregate actions
- **AND** completed authoritative evidence removes an invalid prior attachment, while an incomplete refresh alone does not erase bounded last-verified presentation
- **AND** a later response from the previous binding cannot restore it

#### Scenario: Presentation is not authorization
- **WHEN** a previous attachment remains visible during refresh uncertainty but its current live action identity cannot be verified
- **THEN** pair reordering, new aggregate reads and worker focus actions do not use the retained display as permission; same-home closed-task reads still require independently verified owner/status provenance
- **AND** existing stale-binding and generation checks continue to refuse obsolete requests

### Requirement: Coordinator task pull request overview
With attachment and Git enabled, selecting a verified coordinator SHALL show deduplicated recorded PRs from its crew home's eligible live and closed tasks, independent of its directory or selected tab. Live tasks retain existing eligibility; closed-task history SHALL obey the bounded history policy. Open/Closed counts SHALL cover eligible task PRs grouped by repository, not repository-wide inventory. Other spaces and attachment-off mode SHALL retain folder-based Git.

#### Scenario: Coordinator outside a repository
- **WHEN** the coordinator is selected in its non-repository home and eligible live or closed tasks have PRs in different repositories
- **THEN** the panel shows those task PRs grouped by repository instead of reporting that the coordinator home is not a repository
- **AND** unrelated PRs in those repositories are absent and no single PR is pinned as the coordinator's active PR

#### Scenario: Duplicate PR numbers and shared tasks
- **WHEN** different repositories both have PR number 12 or several eligible live or closed tasks share one PR
- **THEN** PRs in different repositories remain distinct and tasks sharing the same full PR identity produce one row and one count
- **AND** a live task takes precedence for the robot and worker navigation, while historical-only rows have neither
- **AND** row menus and CI facts retain the correct repository and URL

#### Scenario: Task eligibility and removal
- **WHEN** a task remains working or reported with its exact live worker terminal, including an idle, done or blocked agent
- **THEN** its known PR remains eligible, including a plan awaiting approval
- **AND** a completed closed task can retain its recorded PR under the bounded history policy without a live former worker
- **AND** stopped, failed or absent non-closed task records do not gain historical eligibility

#### Scenario: Unreported tasks
- **WHEN** an eligible task has not reported yet
- **THEN** only recorded task PR links are used, without branch guesses, transcript searches or a new Crew capability
- **AND** the panel shows no generic incomplete-list notice or replacement explanation

#### Scenario: Uncluttered aggregate header
- **WHEN** the consolidated coordinator Git panel is displayed
- **THEN** its normal Git title and controls remain without the heading text `Recorded task PRs`
- **AND** the notice `Recorded PRs · possibly incomplete until tasks report` is absent entirely, with no replacement text
- **AND** repository-specific errors and setup or enrollment controls retain their existing purpose

#### Scenario: Newly recorded PR
- **WHEN** `crew status --all --json` supplies a newly recorded PR for an eligible task from the verified coordinator's home
- **THEN** the next local-context refresh adds that PR without a terminal restart or coordinator folder change
- **AND** the source remains isolated behind the existing bounded status-reader adapter

#### Scenario: Ordinary mode restored
- **WHEN** attachment is disabled or a non-coordinator space is selected
- **THEN** aggregate work stops and Git resumes its existing selected-folder behavior, including its ordinary pin, pagination and repository actions

### Requirement: Collapsible coordinator repository sections
Each repository section in the consolidated coordinator Git panel SHALL have a collapsible header using the Spaces machine-header control and style. Sections SHALL default expanded and retain independent per-repository fold state locally, using the same persistence mechanism as Spaces machine sections. Headers SHALL retain the repository name, task-scoped Open/Closed counts and chevron while collapsed.

#### Scenario: First display
- **WHEN** a repository has no saved folded state and appears in the coordinator overview
- **THEN** its section is expanded with a machine-style header and expanded chevron
- **AND** its header shows that repository's distinct Open and Closed task-PR counts, not repository-wide totals

#### Scenario: Collapse and expand one repository
- **WHEN** the user clicks a repository header or its chevron
- **THEN** only that repository section toggles, using the same interaction and visual style as a Spaces machine header
- **AND** its name, counts and chevron remain visible while its PR body and genuine repository-specific errors or stale notices are hidden when folded
- **AND** reopening restores its current rows and scoped body notices without changing the Open/Closed tab or selecting a PR
- **AND** the single bottom repository-enrollment picker remains visible independently of section folding

#### Scenario: Fold state survives panel changes
- **WHEN** a repository is collapsed and the user changes Open/Closed tabs, refreshes, changes coordinator selection, or closes and reopens the panel
- **THEN** the repository retains its local folded state independently of other repositories
- **AND** panel recreation restores saved state through the same local persistence mechanism as Spaces machine folding
- **AND** that UI state is not exported as a portable preference or written to Crew records

#### Scenario: Counts update while collapsed
- **WHEN** the normal aggregate lifecycle updates PR facts or task links for a folded repository
- **THEN** its visible header counts update without expanding the section
- **AND** global Open/Closed counts still include eligible task PRs in collapsed sections
- **AND** folding itself performs no extra GitHub read, stops no existing webhook update, and does not create an empty-list message solely because all sections are folded

## ADDED Requirements

### Requirement: Non-destructive fleet status refresh
Refreshing fleet status SHALL distinguish pending or failed transport from a completed relationship result. Starting a read or receiving a read error SHALL NOT overwrite a previously verified binding with an authoritative absence. Successful status/binding replacement SHALL publish atomically, and obsolete read completions SHALL NOT replace newer facts. Retained display SHALL be bounded to persisted exact pair identities, not renewed action freshness.

#### Scenario: Error after a verified result
- **WHEN** a refresh fails after the same machine published a verified pair
- **THEN** the persisted verified pair remains available for identity-scoped presentation without being replaced by a fresh empty binding or expiring merely due to elapsed time
- **AND** the failure does not reset verification age or bypass live identity checks

#### Scenario: Fresh negative result
- **WHEN** a current successful read and coherent live model establish that no eligible pair exists
- **THEN** consumers observe the completed negative result, not the older cached pair
- **AND** a retry or result from a superseded generation cannot restore old ownership

#### Scenario: Shared refresh entrypoints
- **WHEN** Git manual refresh, existing relay invalidation, Spaces lifecycle or periodic Crew refresh runs
- **THEN** all consumers observe the same non-destructive refresh policy
- **AND** no extra polling loop, companion or cross-machine inference is introduced

### Requirement: Stale coordinator presentation without action authority
When strict fleet action context is unavailable, the selected persisted coordinator SHALL retain its already-loaded same-home Git rows with an explicit stale or waiting state. Retained context SHALL NOT start new GitHub reads or authorize worker navigation. Fresh verified status SHALL restore normal operation or replace invalid context. No PR/task inventory SHALL be persisted for restart merely to retain presentation.

#### Scenario: Status unavailable beyond action freshness
- **WHEN** a status read fails or times out after strict action freshness expires while the verified pair's native spaces still exist
- **THEN** the sidebar stays attached and the selected coordinator's previously loaded Git rows, counts and fold state remain presented as stale
- **AND** no new aggregate read or robot navigation uses the retained context as authorization
- **AND** the removed task heading and generic incomplete-list notice do not reappear

#### Scenario: Cold restart before verification
- **WHEN** the selected coordinator is restored from durable pair identity but no task/PR facts have been verified in this runtime
- **THEN** Git shows its coordinator waiting/unverified state rather than switching to folder-based non-repository mode
- **AND** only a fresh verified same-home status result can start task-linked GitHub reads

#### Scenario: Different selected space or confirmed home change
- **WHEN** the user selects another space or a completed read disproves or changes coordinator/home ownership
- **THEN** stale rows are not displayed or reused as facts for the unrelated destination
- **AND** ordinary folder Git and existing stale-generation guards remain intact

### Requirement: Consolidated repository enrollment picker
The coordinator Git panel SHALL use one pinned bottom enrollment banner instead of repeated per-repository banners. Its upward picker SHALL reuse the status-bar account control's chevron, trigger, popup and row styling. Confirmed unenrolled repositories SHALL appear in section order. Choosing one SHALL open captured pre-populated Settings without enrolling it. Ordinary Git SHALL remain unchanged.

#### Scenario: Several repositories require enrollment
- **WHEN** at least one displayed coordinator repository is confirmed unenrolled and global Git setup is ready
- **THEN** exactly one bottom banner shows `Add this repo in Settings` with a chevron, not one banner per section
- **AND** its info icon, message and card surface retain the ordinary single-repository banner's appearance
- **AND** it remains visible when sections are folded or the PR list scrolls
- **AND** its dropdown lists distinct owner/name choices in the same order as the rendered repository sections

#### Scenario: Exactly one or no unenrolled repositories
- **WHEN** exactly one displayed repository is confirmed unenrolled
- **THEN** the banner still opens the same dropdown containing one choice rather than changing to a direct action
- **AND** once all displayed repositories are enrolled the banner and its obsolete popup disappear

#### Scenario: Account-style control and keyboard behavior
- **WHEN** the user opens the bottom banner's repository picker
- **THEN** the same shared presentation as the status-bar account control supplies the chevron glyph, 12px size, muted colour, placement, upward popup, row height/padding and hover/highlight treatment
- **AND** Up/Down selects a highlighted row, Enter chooses it, and Escape or outside dismissal closes the popup

#### Scenario: Captured repository Settings action
- **WHEN** the user chooses an eligible repository from the opened picker
- **THEN** the popup closes and the existing Git Settings Repositories dialog opens with that captured owner/name pre-populated
- **AND** the picker performs no enrollment writes or discovery reads beyond the unchanged existing Settings-opening action
- **AND** a changed coordinator/view or obsolete membership cannot retarget a stale choice to another repository

#### Scenario: Other notices and ordinary Git
- **WHEN** a repository has a genuine scoped error or stale-data notice, global Git setup is missing, or ordinary single-repository Git is selected
- **THEN** scoped notices and the existing global setup behavior retain their purpose and placement
- **AND** the ordinary single-repository banner and its direct Settings action are unchanged

### Requirement: Bounded finished-task pull request history
Closed tasks from the verified coordinator's crew home SHALL contribute their recorded Open/Draft PRs without live workers. Historical-only Merged/Closed PRs SHALL appear only within 24 hours of GitHub's merge/close timestamp; undated closed history SHALL be excluded. Live sources SHALL win deduplication and keep worker navigation. Historical-only rows SHALL have no robot or worker action. Status and targeted-read bounds SHALL remain enforced.

#### Scenario: Worker finishes before merge
- **WHEN** a same-home task becomes closed and loses its live worker while its recorded PR remains Open or Draft on GitHub
- **THEN** that PR remains in the coordinator's Open tab and repository/global counts
- **AND** it has no worker robot or navigation unless another eligible live task shares it
- **AND** finishing the final worker does not discard same-home PR history while its verified coordinator remains live

#### Scenario: Conservative Closed history
- **WHEN** a historical-only recorded PR is Merged or Closed on GitHub
- **THEN** it appears in the Closed tab and counts only within 24 hours of its authoritative merge/close timestamp
- **AND** older or undated historical closed PRs do not appear or leave empty repository headers
- **AND** PRs still linked by eligible live tasks retain normal Closed behavior regardless of age

#### Scenario: Live task shares a historical PR
- **WHEN** several closed tasks and an eligible live task record the same repository and PR number
- **THEN** the panel fetches, displays and counts one full PR identity and retains the live task's robot
- **AND** closing that live task removes its worker navigation but does not remove an otherwise eligible historical PR
- **AND** a stale captured robot callback cannot navigate to the former worker

#### Scenario: No recorded PR or wrong home
- **WHEN** a reviewer or scout has no PR, a task link is malformed, or status does not belong to the verified coordinator's crew home and owner
- **THEN** that record adds no historical row, count or worker target
- **AND** matching task names, repository names or local terminal IDs on another machine cannot bypass provenance checks

#### Scenario: Existing bounded reader and refresh
- **WHEN** historical candidates are read or updated by the shown enabled aggregate panel
- **THEN** the existing status reader uses `--all --json` with its response size, task count and timeout bounds, and targeted GitHub reads retain their concurrency bound
- **AND** existing webhook/manual refresh handles merge, close and reopen transitions without repository-wide inventory or periodic polling of unchanged GitHub facts
