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
- **THEN** the overview labels its recorded-link list as possibly incomplete until tasks report
- **AND** only recorded task PR links are used, without branch guesses, transcript searches or a new Crew capability

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

### Requirement: Crew project names preserve safe dots
Crew Projects settings SHALL derive registration names from folder basenames while preserving safe dots. Accepted names SHALL contain 1–40 lowercase ASCII letters, digits, dashes or dots, start with a letter or digit, contain no consecutive dots and end with no dot. Naming guidance SHALL describe these constraints. Existing valid dotted registrations SHALL remain visible and removable by their exact registered names.

#### Scenario: Dotted project folder
- **WHEN** the user adds `D:/Git/agentnumberone.dev` to Crew Projects
- **THEN** the app requests registration as `agentnumberone.dev` rather than `agentnumberone-dev`

#### Scenario: Dotted registration returned by Crew
- **WHEN** Crew lists a registration named `agentnumberone.dev` with its folder
- **THEN** Settings shows that folder as a project row
- **AND** removing or unticking it requests removal of the exact name `agentnumberone.dev`

#### Scenario: Invalid derived name
- **WHEN** a folder basename cannot produce a name under the naming policy
- **THEN** Settings reports the naming constraints without sending a registration request

#### Scenario: Name boundaries
- **WHEN** Settings derives a project name or interprets a listed registration
- **THEN** its accepted name satisfies the length, starting-character and dot restrictions
- **AND** safe dots within the 40-character result are not replaced with dashes

### Requirement: Crew project refusals retain authority and origin
Settings SHALL present Crew's project-change refusals as messages from Crew, separately from the selected folder's operation context. Home-ownership refusals SHALL remain about Crew's home. An older Crew refusing a dotted name SHALL expose its refusal without a silent alternative-name retry or false success. Batch changes SHALL retain successful operations and identify failed operations.

#### Scenario: Older Crew rejects dotted registration
- **WHEN** Crew refuses a requested dotted project name
- **THEN** Settings shows Crew's refusal as a message from Crew
- **AND** the app does not retry with a dash-only name or show the project as registered

#### Scenario: Crew home owned by another terminal
- **WHEN** an add fails because Crew reports that its home is read-only and owned by another terminal
- **THEN** Settings identifies Crew as the source and preserves the home-ownership explanation
- **AND** the selected folder is shown only as the attempted operation's target, not as the owner-locked resource

#### Scenario: Partial batch failure
- **WHEN** one folder change fails while other selected changes succeed
- **THEN** Settings retains the successes, identifies the failed operation and shows its attributed refusal
- **AND** the project list is refreshed using Crew's authoritative result

### Requirement: Shared Git pull request metadata
Git SHALL use identical PR metadata presentation in ordinary repository and coordinator views, in both Open and Closed tabs. Rows SHALL omit author-association badges, including Owner. Below the number/author byline, metadata SHALL start at the existing left edge and order present items as tasks, checks, then assigned GitHub labels. Missing items SHALL NOT leave placeholders or leading, doubled or trailing separators.

#### Scenario: Ordinary and coordinator rows
- **WHEN** an owner-authored PR with tasks, checks and labels is displayed in either view and either tab
- **THEN** its metadata starts with tasks, followed by checks and labels, without an Owner badge
- **AND** pinned, scrolling and motion-preview rows use the same presentation

#### Scenario: Missing metadata items
- **WHEN** a PR lacks tasks, checks or labels
- **THEN** only present items appear in the specified order, starting at the metadata line's left edge
- **AND** no empty label placeholder or redundant separator is shown

### Requirement: GitHub label presentation
Each assigned PR label SHALL display its exact GitHub name, including emoji, in a small pill using its GitHub colour and readable foreground. Several labels and long names SHALL remain bounded by the panel width, with truncated or clipped names available in tooltips. Label changes SHALL NOT cause horizontal overflow or label-driven row-height jumps.

#### Scenario: Under review label
- **WHEN** a PR has the label named `🤖 Under review` with GitHub colour `840479`
- **THEN** the row displays that exact name in a pill using that colour after the checks item and a separator

#### Scenario: Several labels in a narrow panel
- **WHEN** assigned labels do not all fit beside the preceding metadata
- **THEN** the label area stays within the row in a single-height strip rather than expanding the panel or row height
- **AND** tooltips expose the complete assigned names, including any clipped names

### Requirement: Labels share PR data refresh
PR labels SHALL be obtained with existing PR reads rather than additional per-row requests. Labels SHALL refresh with other row facts on panel opening, manual refresh, reconnect and relevant webhook invalidation, including pull_request labeled and unlabeled actions. Stale replies SHALL NOT restore labels in another repository or panel context, and unchanged PRs SHALL NOT acquire periodic label polling.

#### Scenario: Existing repository and targeted reads
- **WHEN** a PR is loaded through a paginated repository list, an older active-PR lookup or a coordinator task lookup
- **THEN** its assigned label names and colours are included in that same PR read
- **AND** no additional label request is started for the row

#### Scenario: Label added or removed
- **WHEN** a relevant authenticated pull_request labeled or unlabeled event invalidates loaded rows
- **THEN** the corresponding existing refresh path updates their labels from authoritative PR data
- **AND** removing the final label removes its pills and separator without an empty placeholder

### Requirement: Consistent visible Git metadata separators
PR metadata separators SHALL use one visibly larger but muted dot treatment with equal spacing on both sides and vertical centring against adjacent text and icons. This treatment SHALL apply to every PR metadata separator in the Git panel, including the number/author byline and status items.

#### Scenario: Byline and status separators
- **WHEN** a PR row displays its number/author byline and multiple status metadata items
- **THEN** each dot uses the same size, muted colour, balanced spacing and vertically centred placement
- **AND** ordinary and coordinator views show the same separator treatment

### Requirement: Shared authenticated relay lifecycle
The enabled Git integration SHALL own one authenticated relay connection per desktop relay scope, mounted with non-footer workspace chrome. Git's shown panel and Custom availability SHALL consume independent subscriptions without duplicate socket owners. Hiding Git SHALL stop its PR reads but SHALL NOT stop update hints. Disabling Git SHALL stop all relay subscriptions while independent Custom polling remains available.

#### Scenario: Hidden Git and unrelated selected repository
- **WHEN** Git is enabled with valid local relay setup and the Git panel is hidden or switches repositories
- **THEN** Custom's update subscription stays active for its fixed repository
- **AND** the panel performs no new hidden PR reads and does not reconnect or retarget the update transport

#### Scenario: Panel and update subscriptions overlap
- **WHEN** Git's panel and updates both need the same configured relay
- **THEN** they share one authenticated socket and receive independently filtered invalidations
- **AND** duplicate mounts, replacement and reconnect cannot leave parallel owners or stale publishers

#### Scenario: Git disabled or setup absent
- **WHEN** Git is disabled, local credentials are missing or invalid, the relay is absent, or the customization repository is not enrolled
- **THEN** Custom continues independent periodic and startup/idle catch-up without provisioning accounts, keys or webhooks
- **AND** disabled Git closes transport and rejects stale callbacks; absent or invalid setup does not retry on every render
- **AND** an otherwise valid relay with no matching repository enrollment produces no matching update hints and leaves polling as the fallback

### Requirement: Minimal validated merge notice metadata
The relay SHALL retain raw-body HMAC verification, authenticated subscriptions and bounded input, client and deduplication limits. Notices SHALL add only validated push ref or PR action, merged boolean and base branch needed for main filtering; credentials and full GitHub payloads SHALL NOT be forwarded. Old consumers SHALL remain compatible and notices without new fields SHALL NOT imply a merge.

#### Scenario: Matching main metadata
- **WHEN** an authenticated GitHub push or pull-request body contains valid branch and merge fields
- **THEN** subscribers receive only the existing repository, event and delivery metadata plus the minimal applicable fields
- **AND** no body text, account details, webhook secret or client token is published into shared state, preferences or logs

#### Scenario: Forged or malformed notice
- **WHEN** signature verification fails or optional merge fields have invalid types, lengths or shapes
- **THEN** invalid signatures deliver no notice and malformed fields never satisfy the update filter
- **AND** unrelated valid Git CI invalidation behavior is preserved

#### Scenario: Explicit relay rollout
- **WHEN** the application is installed without the person redeploying the old relay or enrolling this repository
- **THEN** periodic authoritative availability checks still operate
- **AND** no cloud deployment, enrollment, private-key sync or automatic credential repair occurs
