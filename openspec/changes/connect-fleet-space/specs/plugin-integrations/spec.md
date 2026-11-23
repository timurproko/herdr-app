# Plugin integrations delta

## MODIFIED Requirements

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

## ADDED Requirements

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

#### Scenario: Unknown PR discovery
- **WHEN** a worker has no recorded PR and the companion cannot establish whether a pre-report PR exists
- **THEN** the overview identifies discovery as incomplete rather than claiming there are no PRs
- **AND** it does not guess links from transcript mentions, unrelated branches or another worker

#### Scenario: Newly opened pre-report PR
- **WHEN** the companion's read-only discovery provides a PR for an eligible task before its next report
- **THEN** the next local-context refresh adds that PR without requiring land, done, a terminal restart or a coordinator folder change

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
