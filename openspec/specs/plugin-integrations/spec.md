# plugin-integrations Specification

## Purpose
Define how optional panels and external integrations compose with the workspace, stop work when disabled, and keep account and operational effects separate from public configuration.

## Requirements

### Requirement: Independent plugin lifecycle
The app SHALL expose independent plugin controls for Files, Git, Usage and optional external integrations. Disabling a plugin SHALL hide its entrypoints and stop new plugin work while preserving user preferences. Already-started work SHALL NOT initiate follow-up work or overwrite newer state after disablement.

#### Scenario: Both sidebar panels disabled
- **WHEN** the user disables both Files and Git
- **THEN** the sidebar and its toggle are hidden without deleting panel preferences or existing file-viewer tabs

#### Scenario: Usage disabled during collection
- **WHEN** Usage is disabled while a collector is in flight
- **THEN** its entrypoints disappear and no new collection is started
- **AND** a stale result cannot overwrite state from a later enable generation

### Requirement: Explicit file operations
Files SHALL resolve paths on the selected machine, reuse an unambiguous existing viewer in the current space, and require confirmation before recycling captured entries. Recycling SHALL use that machine's supported trash/recycle facility and SHALL have no permanent-delete fallback.

#### Scenario: Unsupported trash facility
- **WHEN** a confirmed file deletion cannot use a supported recycle facility
- **THEN** the app reports failure without retrying permanent deletion or another machine

#### Scenario: Existing file viewer
- **WHEN** the user opens a file with an unambiguous existing viewer for the same full path in the current space and machine
- **THEN** the app activates that viewer rather than creating a duplicate

### Requirement: Git and automation authority boundaries
Git SHALL present repository/PR/CI information for the captured repository, or the verified coordinator's task-linked repositories while fleet attachment is enabled. Webhook notices SHALL act as authenticated invalidation hints, not authority to execute a fix. Automatic fix behavior SHALL default to off and require explicit user configuration plus independent evidence and policy gates before messaging an agent.

#### Scenario: Unconfigured automatic fix
- **WHEN** a CI failure notice arrives with automatic fix unconfigured
- **THEN** the app does not provision automation or send an agent a fix request

#### Scenario: Webhook authentication rejected
- **WHEN** a webhook request has an invalid signature
- **THEN** it is rejected without delivering an invalidation to authenticated subscribers
- **AND** source publication does not supply a bypass token or webhook secret

#### Scenario: Aggregate presentation grants no automation permission
- **WHEN** the coordinator overview displays task PRs from several repositories
- **THEN** merely displaying those links does not enroll repositories, change auto-fix scope or send any worker a message

### Requirement: Usage and account privacy
Usage and account integrations SHALL keep credential stores, live account selection, usage caches and session data machine-local. Credential access or refresh SHALL be disclosed as operational behavior, not described as a visual-only theme. Public examples SHALL NOT contain real account-linked pins or privileged automation choices.

#### Scenario: Fixture-only usage regression
- **WHEN** usage and account behavior is tested without configured providers
- **THEN** tests use isolated made-up account stores and mocked provider transport
- **AND** do not read or refresh the user's installed provider credentials

### Requirement: Optional companion compatibility
External companion actions SHALL require explicit feature configuration and verified prerequisites. Unsupported A1 protocols or stale exact-session identity SHALL refuse control without restarting agents, injecting input or mutating unrelated sessions. External private shell wiring SHALL NOT be required for base installation or represented as installed by deployment.

#### Scenario: Incompatible running A1 session
- **WHEN** a configured color/control integration encounters an unsupported protocol or stale session identity
- **THEN** it reports unavailability without modifying another session or restarting the existing agent

#### Scenario: Standalone install without private shell profiles
- **WHEN** the app is built and installed without external dotfiles-managed shell hooks
- **THEN** base layout and plugin configuration remain available
- **AND** optional shell-reporting limitations are documented rather than silently installing private profile integration

### Requirement: Verified fleet integration identity
Fleet attachment and coordinator PR context SHALL require a live Crew owner and exact task-terminal membership on the captured machine. Crew task IDs, home identity and worker labels SHALL agree. Names or a role marker alone SHALL NOT authorize a relationship. Unknown, conflicting or stale evidence SHALL fail closed without altering Crew ownership, records or running agents.

#### Scenario: Existing Crew identity
- **WHEN** read-only Crew status identifies its home, a live owner terminal and task terminals matching live worker labels and the current space model
- **THEN** only the owner's actual coordinator space and that home's unique fleet space are related
- **AND** the same local terminal or task ID on another machine cannot join that pair

#### Scenario: Ambiguous or moved terminals
- **WHEN** a worker label disagrees with the task record, workers span several candidate fleet spaces, or the owner is missing or replaced
- **THEN** the app refuses the ambiguous attachment and aggregate context
- **AND** a later response from the previous binding cannot restore it

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

### Requirement: Bounded aggregate reads and invalidation
Aggregate reads SHALL be read-only, machine-bound and limited to a shown enabled Git panel. New local task links SHALL trigger targeted PR reads; CI changes SHALL use authenticated webhook invalidation or explicit refresh, not periodic GitHub polling. Selection, plugin or ownership changes SHALL invalidate stale responses and captured actions. One repository's failure SHALL NOT erase valid rows from another.

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
