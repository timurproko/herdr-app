# Spec Delta

## MODIFIED Requirements

### Requirement: Coordinator task pull request overview
With attachment and Git enabled, selecting a verified coordinator space SHALL show distinct PRs of its live `working` and `reported` tasks across repositories, regardless of coordinator directory or selected tab. Open/Closed counts SHALL describe those task PRs, grouped by repository, not repository-wide inventory. Other selected spaces and attachment-off mode SHALL retain folder-based Git.

#### Scenario: Coordinator outside a repository
- **WHEN** the coordinator is selected in its non-repository home and eligible workers have PRs in different repositories
- **THEN** the panel shows those task PRs grouped by repository instead of reporting that the coordinator home is not a repository
- **AND** unrelated PRs in those repositories are absent and no single PR is pinned as the coordinator's active PR

#### Scenario: Duplicate PR numbers and shared tasks
- **WHEN** different repositories both have PR number 12 or several eligible tasks share one PR
- **THEN** PRs in different repositories remain distinct and tasks sharing the same full PR identity produce one row
- **AND** row menus, CI facts and related-agent navigation retain the correct repository and captured worker identity

#### Scenario: Task eligibility and removal
- **WHEN** a task remains working or reported with its exact live worker terminal, including an idle, done or blocked agent
- **THEN** its known PR remains eligible, including a plan awaiting approval
- **AND** stopped, failed, closed or absent workers do not contribute rows

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
- **WHEN** plain Crew status supplies a newly recorded PR for an eligible task
- **THEN** the next local-context refresh adds that PR without a terminal restart or coordinator folder change
- **AND** the source remains isolated behind an adapter for future discovery without depending on it

#### Scenario: Ordinary mode restored
- **WHEN** attachment is disabled or a non-coordinator space is selected
- **THEN** aggregate work stops and Git resumes its existing selected-folder behavior, including its ordinary pin, pagination and repository actions

## ADDED Requirements

### Requirement: Collapsible coordinator repository sections
Each repository section in the consolidated coordinator Git panel SHALL have a collapsible header using the Spaces machine-header control and style. Sections SHALL default expanded and retain independent per-repository fold state locally, using the same persistence mechanism as Spaces machine sections. Headers SHALL retain the repository name, task-scoped Open/Closed counts and chevron while collapsed.

#### Scenario: First display
- **WHEN** a repository has no saved folded state and appears in the coordinator overview
- **THEN** its section is expanded with a machine-style header and expanded chevron
- **AND** its header shows that repository's distinct Open and Closed task-PR counts, not repository-wide totals

#### Scenario: Collapse and expand one repository
- **WHEN** the user clicks a repository header or its chevron
- **THEN** only that repository section toggles, using the same interaction and visual style as a Spaces machine header
- **AND** its name, counts and chevron remain visible while its body rows, scoped errors and enrollment prompt are hidden when folded
- **AND** reopening restores its current rows and scoped body notices without changing the Open/Closed tab or selecting a PR

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
