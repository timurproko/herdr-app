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
Fleet bindings and live worker actions SHALL require a live Crew owner and exact machine-qualified task-terminal membership, with matching home identity and worker labels. Closed-task PR reads SHALL require validated task links from the verified coordinator's same-home status, not a live former worker. Unknown or conflicting identity SHALL fail closed. Bounded last-verified presentation SHALL NOT authorize actions or alter Crew ownership, records or running agents.

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
With attachment and Git enabled, selecting a verified coordinator SHALL show deduplicated task PRs from its crew home's eligible live and closed tasks, using validated discovery when supported and recorded links otherwise. Live tasks retain existing eligibility; closed-task history SHALL obey the bounded history policy. Open/Closed counts SHALL cover eligible task PRs grouped by repository, not repository-wide inventory. Other spaces and attachment-off mode SHALL retain folder-based Git.

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
- **AND** a completed closed task can retain its validated PR under the bounded history policy without a live former worker
- **AND** stopped, failed or absent non-closed task records do not gain historical eligibility

#### Scenario: Unreported tasks
- **WHEN** an eligible task has not reported yet and supported discovery supplies a canonical known PR URL
- **THEN** that PR is eligible without waiting for a report or changing recorded Crew state
- **AND** the app does not guess links through branches, terminal footers, transcripts or repository-wide inventories
- **AND** the panel shows no generic incomplete-list notice or replacement explanation

#### Scenario: Uncluttered aggregate header
- **WHEN** the consolidated coordinator Git panel is displayed
- **THEN** its normal Git title and controls remain without the heading text `Recorded task PRs`
- **AND** the notice `Recorded PRs · possibly incomplete until tasks report` is absent entirely, with no replacement text
- **AND** repository-specific errors and setup or enrollment controls retain their existing purpose

#### Scenario: Newly recorded PR
- **WHEN** `crew status --all --json --discover-prs` supplies a newly recorded or discovered PR for an eligible task from the verified coordinator's home
- **THEN** the next local-context refresh adds that PR without a terminal restart or coordinator folder change
- **AND** the source remains isolated behind the existing bounded status-reader adapter

#### Scenario: Ordinary mode restored
- **WHEN** attachment is disabled or a non-coordinator space is selected
- **THEN** aggregate work stops and Git resumes its existing selected-folder behavior, including its ordinary pin, pagination and repository actions

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

### Requirement: Shared Git pull request metadata
Git SHALL share natural-width metadata across all row variants, without Owner badges. Both lower lines SHALL flow left with constant gaps, trailing free space and no absent-group reservations. Status order SHALL be tasks, checks, labels, review. Full wording SHALL remain while the line fits; only real overflow SHALL select whole compact task/time forms before secondary clipping. Checks SHALL never shrink, wrap or truncate. Full values SHALL remain in tooltips.

#### Scenario: Ordinary and coordinator rows
- **WHEN** an owner-authored PR with tasks, checks and labels is displayed in either view and either tab
- **THEN** its metadata flows naturally as tasks, checks and labels in that order, without an Owner badge
- **AND** pinned, scrolling and motion-preview rows use the same presentation

#### Scenario: Natural lower-line spacing
- **WHEN** full number, author, time or status content fits the available line, including around 390px panel width
- **THEN** it uses natural widths without stretched, percentage or equal-width cells and leaves free space only at the end
- **AND** constant gaps separate present groups, without leading, trailing or doubled dots
- **AND** overflow first shortens task wording or byline time before secondary author, label or review clipping

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

### Requirement: GitHub label presentation
Each assigned PR label SHALL retain its exact name, including emoji, in a fully rounded 18px pill derived from its GitHub colour. Dark palettes SHALL use GitHub's 18% tint, readable lightness-adjusted coloured text and 30% text-colour border; light palettes SHALL use GitHub's solid fill and contrasting black/white text. Names SHALL remain bounded in one line with full-name tooltips, without horizontal overflow or label-driven row-height jumps.

#### Scenario: Under review label
- **WHEN** a PR has the label named `🤖 Under review` with GitHub colour `840479`
- **THEN** the row displays that exact name in a pill derived from that colour after the checks item and a separator
- **AND** on a dark palette it uses a translucent purple tint, lightened purple text and a thin translucent purple border rather than a solid purple block

#### Scenario: Several labels in a narrow panel
- **WHEN** assigned labels do not all fit beside the preceding metadata
- **THEN** the label area stays within the row in a single-height strip rather than expanding the panel or row height
- **AND** tooltips expose the complete assigned names, including any clipped names

#### Scenario: Different hues and extreme colours on dark palettes
- **WHEN** green, amber, purple, red, blue, near-black or near-white labels appear on a dark panel palette
- **THEN** each uses GitHub's perceived-lightness and HSL adjustment formula, an 18% original-colour background and a 30% adjusted-text-colour border
- **AND** very dark labels acquire readable lighter text while already light labels are not unnecessarily lightened

#### Scenario: Light palette and palette changes
- **WHEN** the effective panel palette is light or changes between light and dark
- **THEN** labels follow that palette without a restart, using solid original colours and GitHub's contrast-selected black/white foreground on light palettes
- **AND** near-white light-mode pills receive GitHub's darkened translucent border so they remain distinguishable from their surroundings

#### Scenario: Shared rendering and invalid colour
- **WHEN** labels appear in ordinary or coordinator views, in either tab, or in pinned and motion-preview rows
- **THEN** all use the same palette-dependent pill presentation without changing metadata order, separators or row geometry
- **AND** an invalid or missing colour uses the existing neutral theme fallback rather than producing invalid colours or hiding its exact name

### Requirement: Labels share PR data refresh
PR labels SHALL be obtained with existing PR reads rather than additional per-row requests. Labels SHALL refresh with other row facts on panel opening, manual refresh, reconnect and relevant webhook invalidation, including pull_request labeled and unlabeled actions. Stale replies SHALL NOT restore labels in another repository or panel context, and unchanged PRs SHALL NOT acquire periodic label polling.

#### Scenario: Existing repository and targeted reads
- **WHEN** a PR is loaded through a paginated repository list, an older active-PR lookup or a coordinator task lookup
- **THEN** its assigned label names and colours are included in that same PR read
- **AND** no additional label request is started for the row

#### Scenario: Label added or removed
- **WHEN** a relevant authenticated pull_request labeled or unlabeled event invalidates loaded rows
- **THEN** the corresponding existing refresh path updates their labels from authoritative PR data
- **AND** removing the final label removes its visible pills and any now-redundant separator without changing the line height or leaving a visible placeholder or horizontal reservation

### Requirement: Consistent visible Git metadata separators
PR metadata separators SHALL use one visibly larger but muted dot treatment with equal spacing on both sides and vertical centring against adjacent text and icons. This treatment SHALL apply to every PR metadata separator in the Git panel, including the number/author byline and status items.

#### Scenario: Byline and status separators
- **WHEN** a PR row displays its number/author byline and multiple status metadata items
- **THEN** each dot uses the same size, muted colour, balanced spacing and vertically centred placement
- **AND** ordinary and coordinator views show the same separator treatment

### Requirement: Collapsible coordinator repository sections
Each consolidated coordinator repository section SHALL use the Spaces machine-header control and style, default expanded, with independent locally persisted fold state. Expanded and collapsed headers SHALL show only the canonical repository name and chevron, without Open/Closed counts. The name SHALL use the available width, truncating only on overflow with a full-name tooltip then. Top-level Open/Closed totals SHALL remain unchanged.

#### Scenario: First display
- **WHEN** a repository has no saved folded state and appears in the coordinator overview
- **THEN** its section is expanded with a machine-style header and expanded chevron
- **AND** its header shows the canonical repository name and chevron without repository counts, allowing the name to use the width freed by their removal

#### Scenario: Collapse and expand one repository
- **WHEN** the user clicks a repository header or its chevron
- **THEN** only that repository section toggles, using the same interaction and visual style as a Spaces machine header
- **AND** its name and chevron remain visible while its body rows and scoped errors or repository-specific diagnostics are hidden when folded
- **AND** reopening restores its current rows and scoped body notices without changing the Open/Closed tab or selecting a PR
- **AND** the single enrollment footer remains visible independently of section folding

#### Scenario: Fold state survives panel changes
- **WHEN** a repository is collapsed and the user changes Open/Closed tabs, refreshes, changes coordinator selection, or closes and reopens the panel
- **THEN** the repository retains its local folded state independently of other repositories
- **AND** panel recreation restores saved state through the same local persistence mechanism as Spaces machine folding
- **AND** that UI state is not exported as a portable preference or written to Crew records

#### Scenario: Counts update while collapsed
- **WHEN** the normal aggregate lifecycle updates PR facts or task links for a folded repository
- **THEN** global Open/Closed counts still include eligible task PRs in collapsed sections and update without expanding the section
- **AND** no per-repository counts appear in expanded or collapsed headers
- **AND** folding itself performs no extra GitHub read, stops no existing webhook update, and does not create an empty-list message solely because all sections are folded

#### Scenario: Long repository name
- **WHEN** a canonical repository name is rendered in a wide or narrow panel
- **THEN** the name uses all header width not reserved for the chevron and existing header insets
- **AND** a fitting name stays complete without a tooltip, while a genuinely overflowing name truncates with its full canonical name available on hover

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

### Requirement: Bounded finished-task pull request history
Closed tasks from the verified coordinator's crew home SHALL contribute their validated Open/Draft task PRs without live workers. Historical-only Merged/Closed PRs SHALL appear only within 24 hours of GitHub's merge/close timestamp; undated closed history SHALL be excluded. Live sources SHALL win deduplication and keep worker navigation. Historical-only rows SHALL have no robot or worker action. Status and targeted-read bounds SHALL remain enforced.

#### Scenario: Worker finishes before merge
- **WHEN** a same-home task becomes closed and loses its live worker while its validated task PR remains Open or Draft on GitHub
- **THEN** that PR remains in the coordinator's Open tab and repository/global counts
- **AND** it has no worker robot or navigation unless another eligible live task shares it
- **AND** finishing the final worker does not discard same-home PR history while its verified coordinator remains live

#### Scenario: Conservative Closed history
- **WHEN** a historical-only task PR is Merged or Closed on GitHub
- **THEN** it appears in the Closed tab and counts only within 24 hours of its authoritative merge/close timestamp
- **AND** older or undated historical closed PRs do not appear or leave empty repository headers
- **AND** PRs still linked by eligible live tasks retain normal Closed behavior regardless of age

#### Scenario: Live task shares a historical PR
- **WHEN** several closed tasks and an eligible live task link the same repository and PR number
- **THEN** the panel fetches, displays and counts one full PR identity and retains the live task's robot
- **AND** closing that live task removes its worker navigation but does not remove an otherwise eligible historical PR
- **AND** a stale captured robot callback cannot navigate to the former worker

#### Scenario: No recorded PR or wrong home
- **WHEN** a reviewer or scout has no PR, a task link is malformed, or status does not belong to the verified coordinator's crew home and owner
- **THEN** that record adds no historical row, count or worker target
- **AND** matching task names, repository names or local terminal IDs on another machine cannot bypass provenance checks

#### Scenario: Existing bounded reader and refresh
- **WHEN** historical candidates are read or updated by the shown enabled aggregate panel
- **THEN** status includes closed tasks through `--all --json`, requests discovery when supported, and retains response-size, task-count and finite transport bounds
- **AND** targeted GitHub reads retain their concurrency bound
- **AND** existing webhook/manual refresh handles merge, close and reopen transitions without repository-wide inventory or periodic polling of unchanged GitHub facts

### Requirement: Truthful repository-scoped pull request read notices
The coordinator Git overview SHALL render at most one PR-read failure notice per repository section in the selected tab. Notices SHALL describe the failed operation and distinguish GitHub responses from genuine transport unreachability. Cached PR state SHALL scope failures to the appropriate tab without erasing healthy rows or bypassing history eligibility.

#### Scenario: One live open PR and three finished merged PRs
- **WHEN** a verified coordinator records one live Open or Draft PR and three finished-task Merged PRs in the same repository, each merged within 24 hours
- **THEN** Open shows only the live PR and Closed shows the three merged PRs without historical worker robots
- **AND** successful reads produce no failure notices in either tab, with repository and global counts of Open 1 and Closed 3

#### Scenario: Failed refresh of known closed history
- **WHEN** refresh reads fail for several previously loaded historical Merged or Closed PRs in one repository
- **THEN** their failures produce no notice in Open and at most one scoped read-failure notice in Closed
- **AND** last-good eligible rows and counts remain, while expired historical rows and their row-specific failures do not reappear

#### Scenario: Historical failure before state is known
- **WHEN** an initial read fails for a recorded historical-only PR whose GitHub state has not been established
- **THEN** at most one history-load notice appears in that repository's Closed section, with no per-PR error line under Open
- **AND** no state, completion date or count is invented for the unread PR

#### Scenario: GitHub answered with a refusal
- **WHEN** GitHub answers a PR read with a resource-resolution, access, authentication or rate-limit failure
- **THEN** the notice describes the failed read or relevant refusal instead of declaring GitHub unreachable
- **AND** several failures in that repository still produce at most one notice in the applicable tab

#### Scenario: Local process failure or timeout
- **WHEN** the GitHub CLI cannot start, exits abnormally with empty stderr or exceeds its local command timeout
- **THEN** the applicable repository section shows one transient read-failure notice offering Refresh to retry rather than asserting that GitHub is unreachable
- **AND** last-good eligible PR facts survive and the existing bounded refresh path remains without a new polling or automatic retry loop

#### Scenario: Current account cannot resolve the repository
- **WHEN** GitHub answers that the repository or PR cannot be resolved or accessed with the current login
- **THEN** the notice identifies access with the current GitHub account rather than a GitHub connectivity outage
- **AND** the panel does not switch the login or discard healthy rows

#### Scenario: Genuine connectivity failure
- **WHEN** applicable PR reads fail because the GitHub connection cannot be established or times out at the transport boundary
- **THEN** the repository section shows one clear connectivity notice rather than one line per PR
- **AND** other repositories' valid rows remain visible and no account switch or automatic enrollment occurs

#### Scenario: Partial recovery and folded sections
- **WHEN** some failed reads recover or a repository section is folded
- **THEN** recovered failures are removed from the summary without hiding remaining applicable failures
- **AND** folding hides the single notice with that section's body, without new reads or changes to its counts

### Requirement: Single coordinator enrollment footer
The coordinator Git panel SHALL show at most one non-shrinking enrollment card below its scrolling repository sections, preserving the info icon, message and card surface. Choices SHALL be confirmed unenrolled canonical owner/name values, deduplicated in rendered section order, including folded sections. Unknown membership SHALL stay quiet; zero choices SHALL remove the card. Global missing setup SHALL take precedence. Ordinary Git notices SHALL remain unchanged.

#### Scenario: Zero, one or several unenrolled repositories
- **WHEN** existing membership facts confirm zero, one or several rendered repositories as unenrolled
- **THEN** zero choices produces no enrollment footer and one or several choices produces exactly one footer with a dropdown
- **AND** the dropdown always opens a repository-choice menu, even with exactly one choice
- **AND** enrolled, unknown and pending repositories never appear as choices

#### Scenario: Section order and duplicate links
- **WHEN** several PRs or tasks share repository identities and repository sections have an established render order
- **THEN** each confirmed unenrolled repository appears once by canonical owner/name in exactly that section order, regardless of folding or Open/Closed row availability

#### Scenario: Folded sections and long scroll content
- **WHEN** all repository sections are folded or a long PR list is scrolled
- **THEN** the footer remains outside the scroll area and visible at the panel bottom without shrinking away
- **AND** scoped PR errors and genuinely repository-specific stale or error notices remain within their repository bodies

#### Scenario: Enrollment completes or setup becomes missing
- **WHEN** the normal notice lifecycle confirms enrollment or changes global setup readiness
- **THEN** enrolled repositories leave future picker choices and enrollment of the final choice removes the footer
- **AND** missing global setup replaces enrollment presentation with the existing one global setup notice

### Requirement: Shared account-style choice presentation
Enrollment and status-bar accounts SHALL share the muted 12px chevron, text-relative gap, upward popup anchor, menu shift and menu surface, bounds, rows and highlights. Accounts SHALL retain their existing pill geometry. The enrollment card SHALL match ordinary Git's height, padding, icon size, gaps and single-line vertical centres, adding only a trailing chevron without extra trigger height or padding. Account operations SHALL remain independent.

#### Scenario: Actual caller presentation parity
- **WHEN** both callers render their interactive triggers and choice menus
- **THEN** their shared choice presentation uses the same chevron glyph, 12px size, inherited muted colour and 6px text-to-chevron gap
- **AND** both use an upward popup with matching 180px minimum width, 360px maximum width, 280px maximum height, row height, insets, hover/highlight and selected-slot geometry
- **AND** the enrollment trigger is on the card's text side without replacing the existing info icon or message

#### Scenario: Compact enrollment card matches ordinary Git
- **WHEN** the ordinary repository enrollment notice and coordinator enrollment footer render with the same theme, zoom and sufficient width
- **THEN** their card height, horizontal and vertical padding, icon size and icon-to-message gap match
- **AND** the coordinator icon, text, Settings link and trailing chevron have one common vertical centre without a taller wrapper
- **AND** ordinary Git's card and the status-bar account control retain their existing appearance

#### Scenario: Native opener and dismissal
- **WHEN** the user presses the enrollment trigger with the left mouse button or dismisses its open menu
- **THEN** the opener press reaches native popup handling rather than being stopped by the trigger
- **AND** Escape and a backdrop click close the menu without opening Settings or changing enrollment

### Requirement: Captured enrollment Settings navigation
Opening the coordinator enrollment picker SHALL capture its choices and coordinator/home/view scope without membership or GitHub reads or enrollment. Entries SHALL remain stable while open, with local keyboard index and focus. Choosing SHALL close the menu and open Git repository Settings only after revalidating captured presentation scope and choice eligibility. Obsolete menus SHALL close rather than retarget or shift entries under the pointer.

#### Scenario: Keyboard and pointer choices
- **WHEN** the menu is opened and the user hovers a row, presses Up/Down or presses Enter
- **THEN** hover and keyboard movement use the shared row highlights and local choice index, and Enter chooses the highlighted captured repository
- **AND** the chosen row closes the popup and opens Settings with section `plugins`, plugin `git`, pluginSection `repository`, and pluginSearch equal to that captured canonical repository
- **AND** opening and choosing add no membership or GitHub read and never enroll a repository

#### Scenario: Refresh, membership or context replacement
- **WHEN** refresh invalidates eligibility, membership/configuration changes, a tab/view changes, another coordinator/home is selected, or Git is hidden or disabled after opening
- **THEN** obsolete callbacks cannot open Settings for another repository or coordinator
- **AND** invalidated menus close and require reopening instead of changing their entries under the pointer
- **AND** a repository choice must still belong to the captured presentation and be confirmed unenrolled before navigation

### Requirement: Validated task PR discovery results
The app SHALL accept discovery only for top-level version 1 with valid per-task status, URL, source and reason combinations. Known results SHALL provide canonical HTTPS GitHub PR links. None SHALL mean no PR on that read; unavailable SHALL mean unknown. Both states SHALL survive binding into the generic pull context without inventing links or action authority. Malformed v1 fields SHALL be read uncertainty, never evidence of absent tasks, ownership or PRs.

#### Scenario: Known result before the first report
- **WHEN** a valid v1 status has a working task with no recorded PR and a known canonical discovery URL from GitHub
- **THEN** the sanitized task and generic pull links contain that URL
- **AND** worker identity, home binding, deduplication and captured navigation rules are unchanged

#### Scenario: Partial discovery budget
- **WHEN** a v1 read returns known and none results alongside unavailable results with reason budget-exhausted
- **THEN** known links remain usable and each none/unavailable distinction remains available in the generic pull context
- **AND** unavailable tasks add no invented PR and no immediate follow-up lookup or retry loop

#### Scenario: Strict discovery schema
- **WHEN** a v1 task result omits a required field, has a wrong type or contradictory field combination, or supplies a noncanonical or unsafe known URL
- **THEN** the app treats the read as uncertain instead of publishing authoritative missing ownership, tasks or PRs
- **AND** prior verified presentation and freshness obey the existing failed-read policy

### Requirement: Bounded discovery compatibility
Discovery SHALL use the existing read-only installed-tool machine transport and coalesced local refresh lifecycle. Missing or unknown versions SHALL retain recorded-only behavior without an extra status call. Only an explicit unsupported discovery-flag refusal SHALL permit one bounded recorded-only fallback. Transport, timeout and authentication failures SHALL NOT mean none or trigger that fallback. Discovery SHALL NOT add a refresh loop or change the ten-second refresh cadence.

#### Scenario: Older Crew ignores the flag or uses an unknown version
- **WHEN** status succeeds without discovery metadata or with an unsupported discovery version
- **THEN** the app uses recorded links from that payload without another read and does not assert confirmed none
- **AND** no generic incomplete-list text is restored

#### Scenario: Older Crew explicitly refuses the flag
- **WHEN** the installed Crew status command explicitly rejects the discovery flag as unsupported
- **THEN** at most one bounded plain `status --all --json` fallback supplies recorded-only data
- **AND** failure of that fallback remains unavailable without another attempt

#### Scenario: Timeout or authentication failure
- **WHEN** the machine transport times out or status fails for authentication or another non-capability reason
- **THEN** no capability fallback or immediate discovery retry is started
- **AND** the failure cannot publish none or renew successful action freshness

#### Scenario: Slow and superseded discovery
- **WHEN** discovery consumes its additional ten-second budget or completes after plugin, preference, owner or read-generation replacement
- **THEN** finite transport and in-flight lease bounds account for that extra latency while duplicate readers still coalesce
- **AND** obsolete results cannot publish links, change bindings or authorize worker actions

### Requirement: Selected-tab coordinator repository visibility
The coordinator Git panel SHALL render a repository section only when the selected tab has an eligible PR row or a genuine repository-scoped read notice. Eligibility SHALL be evaluated before folding and on each tab change, retaining existing history limits, top-level totals and saved fold state. Enrollment SHALL use the full eligible repository inventory independently of selected-tab section visibility.

#### Scenario: Open and Closed contain different repositories
- **WHEN** one repository has only Open or Draft task PRs and another has only eligible Merged or Closed task PRs
- **THEN** Open shows only the first repository section and Closed shows only the second
- **AND** omitted sections leave no header or chevron, and switching tabs preserves both totals

#### Scenario: Genuine selected-tab notice without rows
- **WHEN** a repository has no eligible rows in the selected tab but has an applicable PR-read notice
- **THEN** its section remains available with that notice under the existing folding behavior
- **AND** a failure scoped only to the other tab does not keep an otherwise empty section visible

#### Scenario: History ages out
- **WHEN** a historical-only Merged or Closed PR is outside the existing 24-hour history limit or lacks a valid completion date
- **THEN** that PR and its expired row-specific failure do not keep a repository section visible
- **AND** other eligible rows or genuine applicable notices can still keep that section visible

#### Scenario: Folded repository disappears and returns
- **WHEN** a repository is folded, becomes ineligible in the selected tab and later reappears through a tab switch or updated PR facts
- **THEN** its saved folded state is restored
- **AND** folding an eligible section alone does not produce an empty state or change counts

#### Scenario: Empty settled tab
- **WHEN** no repository has an eligible row or applicable read notice in a settled verified tab
- **THEN** the panel uses ordinary Git's same empty-state presentation and wording, namely `No open pull requests` or `No closed pull requests`
- **AND** no empty repository header remains, while pending loading and unverified waiting states retain their existing feedback

#### Scenario: Hidden section remains an enrollment choice
- **WHEN** a confirmed unenrolled repository has eligible PRs only in the other tab
- **THEN** the single pinned enrollment footer still includes that repository in canonical inventory order
- **AND** hiding its section does not enroll it, remove its fold state, or initiate or cancel GitHub reads

### Requirement: Stable pull request block geometry
Every PR block SHALL retain fixed state-icon, title and related-agent slots, three fixed line boxes and a 74px height at a given width and zoom. Optional facts SHALL NOT move title boundaries or vertical anchors. Lower-line items MAY move horizontally in fixed order as facts arrive; absent groups SHALL reserve no width. The metadata line SHALL retain its height even when empty, without placeholders.

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

### Requirement: Always-visible Git tab counts
Ordinary and coordinator Git views SHALL always display Open and Closed count badges. Unknown first-load or real-context-change totals SHALL display 0 with a loading tooltip and accessible label. Same-context refreshes SHALL retain last-known totals. Badge slots SHALL keep stable width for at least three digits, without moving neighboring tabs.

#### Scenario: Unknown and loaded totals
- **WHEN** an ordinary or coordinator Git panel first loads, then receives authoritative totals
- **THEN** both badges visibly start at 0 and change to the real counts without moving the tabs
- **AND** three-digit totals remain fully contained in the fixed badge geometry at supported zooms

#### Scenario: Refresh retains counts
- **WHEN** known same-repository or coordinator-home counts are refreshed, including delayed or failed reads
- **THEN** their last-known totals remain visible rather than returning to 0
- **AND** only a real context change clears incompatible counts back to the first-load presentation

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
