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
Fresh fleet action bindings SHALL require a live Crew owner and exact machine-qualified task-terminal membership with matching home identity and labels. Closed-task PR reads SHALL require validated same-home verified status, not a former worker. Remembered last-verified identity SHALL permit presentation and space-only block ordering, not new Git inventory reads, coordinator colour writes, messaging, worker navigation or terminal movement. Unknown action identity SHALL fail closed.

#### Scenario: Existing Crew identity
- **WHEN** read-only Crew status identifies its home, a live owner terminal and task terminals matching live worker labels and the current space model
- **THEN** only the owner's actual coordinator space and that home's unique fleet space are related
- **AND** the same local terminal or task ID on another machine cannot join that pair

#### Scenario: Ambiguous or moved terminals
- **WHEN** a worker label disagrees with the task record, workers span several candidate fleet spaces, or the owner is missing or replaced
- **THEN** the app refuses new ambiguous attachment and aggregate actions
- **AND** completed authoritative evidence removes an invalid prior attachment, while an incomplete refresh alone does not erase remembered last-verified presentation
- **AND** a later response from the previous binding cannot restore it

#### Scenario: Presentation is not authorization
- **WHEN** a remembered attachment is visible before fresh live action identity is verified
- **THEN** the display permits nested child rows, matching badge colour, local folding and same-machine space-only block ordering, but not new aggregate reads, coordinator colour writes, worker focus, messaging or tab/terminal movement
- **AND** same-home closed-task reads still require independently verified owner/status provenance
- **AND** existing stale-binding and generation checks continue to refuse obsolete requests

#### Scenario: Remembered coordinator without current inventory
- **WHEN** attachment is enabled or restored from host-local memory before current status and inventory are verified
- **THEN** the selected remembered coordinator shows the standard Loading working bulb rather than ordinary folder Git or a restored prior-toggle PR inventory
- **AND** presentation memory contains no PR/task inventory, grants no action freshness and does not alter Crew ownership, task records or running agents

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
Aggregate reads SHALL be read-only, machine-bound and limited to a shown enabled Git panel. New local task links SHALL trigger bounded repository-batched targeted reads. Events, explicit refresh and the shown-open safety fallback SHALL refresh mutable facts, reusing session-final facts. Selection, plugin or ownership changes SHALL invalidate stale subscribers and actions without duplicating a shared read. One repository's failure SHALL NOT erase valid rows from another.

#### Scenario: Refresh and repository events
- **WHEN** the panel opens, the user refreshes, or a relevant authenticated repository event arrives
- **THEN** it refreshes appropriate mutable linked PR state and checks and retains unaffected repository rows and cached final facts
- **AND** timer-based local Crew membership checks do not themselves periodically re-fetch unchanged GitHub PR or CI facts

#### Scenario: Hide, disable or switch during a request
- **WHEN** Git is hidden or disabled, Crew or attachment is disabled, or the selected coordinator binding changes during a read
- **THEN** no new aggregate follow-up read starts from that obsolete request
- **AND** its late result cannot populate the next context or authorize a stale agent-focus action
- **AND** another independently current subscriber can reuse the same correctly routed in-flight read without inheriting coordinator authority

#### Scenario: Repository unavailable
- **WHEN** one linked repository is inaccessible to that machine's GitHub login
- **THEN** the panel preserves other repositories' valid rows and reports a scoped incomplete result for actionable failures, while rate refusals remain quiet
- **AND** it does not switch accounts, install companions or enroll webhook repositories automatically

### Requirement: Crew project names preserve safe dots
Crew Projects settings SHALL derive registration names from folder basenames while preserving safe dots. Accepted names SHALL contain 1–40 lowercase ASCII letters, digits, dashes or dots, start with a letter or digit or with one dot followed by a letter or digit, contain no consecutive dots and end with no dot. Naming guidance SHALL describe these constraints. Existing valid dotted registrations SHALL remain visible and removable by their exact registered names.

#### Scenario: Dotted project folder
- **WHEN** the user adds `D:/Git/agentnumberone.dev` to Crew Projects
- **THEN** the app requests registration as `agentnumberone.dev` rather than `agentnumberone-dev`

#### Scenario: Dot folder keeps its dot
- **WHEN** Crew lists `xrbuild` for `D:/Git/xrbuild` and the user adds `D:/Git/xrbuild/.xrbuild`
- **THEN** the app requests registration as `.xrbuild`, distinct from `xrbuild`
- **AND** Settings shows the `.xrbuild` row and removing it requests removal of the exact name `.xrbuild`

#### Scenario: Dotted registration returned by Crew
- **WHEN** Crew lists a registration named `agentnumberone.dev` with its folder
- **THEN** Settings shows that folder as a project row
- **AND** removing or unticking it requests removal of the exact name `agentnumberone.dev`

#### Scenario: Invalid derived name
- **WHEN** a folder basename cannot produce a name under the naming policy
- **THEN** Settings reports the naming constraints without sending a registration request

#### Scenario: Name boundaries
- **WHEN** Settings derives a project name or interprets a listed registration
- **THEN** its accepted name satisfies the length, starting-character and dot restrictions, counting a leading dot within the 40 characters
- **AND** safe dots within the 40-character result are not replaced with dashes

### Requirement: Crew project refusals retain authority and origin
Settings SHALL summarize failed Crew project changes with concise, actionable, sentence-case text and full stops, never usage dumps or multiline raw output. Home-ownership refusals SHALL remain about Crew's home. Rejected names SHALL NOT trigger alternative-name retries or false success. Batch changes SHALL retain successes and identify failures. Full raw output SHALL appear only in existing diagnostics or logs, if available.

#### Scenario: Older Crew rejects dotted registration
- **WHEN** Crew refuses a requested dotted project name, including a response starting with `Usage:` after an optional `crew:` prefix
- **THEN** Settings shows `Could not add {folder}. Crew did not accept the project name {name}; update the Crew tool and try again.` when the installed tool is not known to be outdated
- **AND** when that machine's Crew tool is known to be outdated, it shows `Could not add {folder}. Update the Crew tool on {machine} and try again.` instead
- **AND** the app does not retry with a dash-only name or show the project as registered

#### Scenario: Crew home owned by another terminal
- **WHEN** an add or remove fails because Crew reports that its home is read-only and owned by another terminal
- **THEN** Settings summarizes the home-ownership refusal in one sentence and directs the user to the owning session
- **AND** the selected folder is shown only as the attempted operation's target, not as the owner-locked resource

#### Scenario: Partial batch failure
- **WHEN** one folder change fails while other selected changes succeed
- **THEN** Settings retains the successes, identifies each failed operation with concise guidance and refreshes Crew's authoritative list
- **AND** no failure includes a usage block or multiline command output

#### Scenario: Missing or non-repository folder
- **WHEN** Crew reports that the attempted folder is not a git repository or is missing
- **THEN** Settings names that cause in one sentence with guidance to choose an existing git repository

#### Scenario: Registration conflict
- **WHEN** Crew reports that the name already points at another folder, is taken, or the project is already registered
- **THEN** Settings summarizes the registration conflict in one sentence with guidance to use another name or the existing registration as appropriate

#### Scenario: Failed removal
- **WHEN** Crew refuses a Remove action from a row or an unticked folder
- **THEN** Settings applies the same concise presentation rules using the removal target, without an additional raw-output wrapper
- **AND** unfinished-task and pending-working-copy refusals retain their relevant recovery guidance

#### Scenario: Unrecognized command failure
- **WHEN** a project change fails with another command or transport error
- **THEN** Settings shows `Could not add {folder}.` or the corresponding removal text, followed only by the first output line trimmed to one sentence when present
- **AND** blank output keeps only the operation failure, and usage text is never included even when it appears later in the output

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
Git SHALL share natural-width metadata across all row variants, without Owner badges. The byline SHALL flow left with constant gaps and trailing space. Status tasks, checks and review-decision text SHALL flow left; labels SHALL form a right-aligned group with intervening space and no preceding dot. Full wording SHALL remain while the line fits; actual overflow SHALL compact tasks/time before secondary clipping. Checks SHALL never shrink, wrap or truncate. Full values SHALL remain in tooltips.

#### Scenario: Ordinary and coordinator rows
- **WHEN** an owner-authored PR with tasks, checks and labels is displayed in either view and either tab
- **THEN** tasks and checks flow naturally from the left without an Owner badge, while assigned labels form an ordered group at the right content edge
- **AND** pinned, scrolling and motion-preview rows use the same presentation

#### Scenario: Natural lower-line spacing
- **WHEN** full number, author, time or status content fits the available line, including around 390px panel width
- **THEN** the byline and left status run use natural widths without stretched, percentage or equal-width cells
- **AND** constant gaps and dots separate present left-run groups, without leading, trailing or doubled dots; no dot separates that run from labels
- **AND** free status space lies between the left run and the label group, or at the end when no label exists
- **AND** overflow first shortens task wording or byline time before secondary clipping

#### Scenario: Missing metadata items
- **WHEN** a PR lacks tasks, checks or labels
- **THEN** only present left-run items and their separators occupy the left run, while any labels remain anchored to the right edge even when checks or tasks are absent
- **AND** no visible empty label placeholder, reserved right-hand label width or redundant separator is shown when there are no labels

#### Scenario: Task counts and review decision change
- **WHEN** a checklist changes between untouched, partial and complete, check counts change, or a separate review decision appears or disappears
- **THEN** present left-run items take their natural places as tasks, checks and separate review-decision text without changing title geometry, line positions or block height
- **AND** the label group's right edge does not move with those changes
- **AND** compact or clipped content remains available through full-value hover text

#### Scenario: Checks take priority at supported widths
- **WHEN** metadata renders at any supported panel width and zoom, including 280/320/360/390/480px at 75–200% zoom and explicitly 130%
- **THEN** the checks icon and full count remain contained, without clipping, ellipsis or wrapping, including one-, two- and three-digit totals such as 1/1, 3/10, 11/11, 99/99 and 101/101
- **AND** checks use their complete natural width before lower-priority content is clipped
- **AND** the matrix includes the screenshot's approximately 390px panel, with no shortening while the complete line fits

#### Scenario: Compact whole task progress
- **WHEN** the whole metadata line cannot fit with full task wording
- **THEN** the row uses a complete compact task fraction such as an icon with 2/2 before reducing secondary text
- **AND** remaining overflow reduces separate review-decision text first and label text next, while checks remain complete and the compact task fraction stays whole
- **AND** clipping stays within the fixed-height line with no overlap or lone ellipsis; full task progress, labels and review values remain available in tooltips

### Requirement: GitHub label presentation
Each assigned PR label SHALL retain its exact name, including emoji, in a fully rounded 18px pill derived from its GitHub colour. Dark palettes SHALL use GitHub's 18% tint, readable lightness-adjusted coloured text and 30% text-colour border; light palettes SHALL use GitHub's solid fill and contrasting black/white text. Names SHALL remain bounded in one line with full-name tooltips, without horizontal overflow or label-driven row-height jumps. Pills SHALL form one ordered right-aligned group.

#### Scenario: Under review label
- **WHEN** a PR has the label named `🤖 Under review` with GitHub colour `840479`
- **THEN** the row displays that exact name in a pill derived from that colour at the row's right content edge, with no separator dot before the label group
- **AND** on a dark palette it uses a translucent purple tint, lightened purple text and a thin translucent purple border rather than a solid purple block

#### Scenario: Several labels in a narrow panel
- **WHEN** assigned labels do not all fit beside the preceding metadata
- **THEN** they remain one right-aligned group in their existing order, within a bounded single-height strip rather than expanding the panel or row height
- **AND** pill words remain whole while task compaction and secondary review-text reduction can make room; only remaining overflow clips the label group without overlap or a lone ellipsis
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
- **THEN** all use the same palette-dependent right-aligned pill presentation without changing left-run spacing or row geometry
- **AND** an invalid or missing colour uses the existing neutral theme fallback rather than producing invalid colours or hiding its exact name

#### Scenario: Stable right content anchor
- **WHEN** rows with different task progress, check widths, absent checks or absent tasks display assigned labels at the same panel width and zoom
- **THEN** each label group's rightmost visible pill ends at the same right content edge as the title line's reserved robot control, whether or not a robot is present
- **AND** the anchor uses the control's outer edge, not its inset SVG glyph or the panel border
- **AND** adding or removing the final label adds no separator and does not alter title or line geometry

### Requirement: Labels share PR data refresh
PR labels SHALL be obtained with existing PR reads rather than additional per-row requests. Mutable PR labels SHALL refresh with other row facts on panel opening, manual refresh, reconnect and relevant webhook invalidation, including pull_request labeled and unlabeled actions. Session-final rows SHALL reuse cached labels unless precise change evidence invalidates them. Stale replies SHALL NOT restore labels in another context, and unchanged PRs SHALL NOT acquire periodic label polling.

#### Scenario: Existing repository and targeted reads
- **WHEN** a PR is loaded through a paginated repository list, an older active-PR lookup or a coordinator task lookup
- **THEN** its assigned label names and colours are included in that same PR read
- **AND** no additional label request is started for the row

#### Scenario: Label added or removed
- **WHEN** a relevant authenticated pull_request labeled or unlabeled event identifies a loaded PR as changed
- **THEN** the corresponding existing refresh path updates its labels from authoritative PR data
- **AND** removing the final label removes its visible pills and any now-redundant separator without changing the line height or leaving a visible placeholder or horizontal reservation

### Requirement: Consistent visible Git metadata separators
PR metadata separators SHALL use one visibly larger but muted dot treatment with equal spacing on both sides and vertical centring against adjacent text and icons. This treatment SHALL apply to every PR metadata separator in the Git panel, including the number/author byline and status items.

#### Scenario: Byline and status separators
- **WHEN** a PR row displays its number/author byline and multiple status metadata items
- **THEN** each dot uses the same size, muted colour, balanced spacing and vertically centred placement
- **AND** ordinary and coordinator views show the same separator treatment

### Requirement: Collapsible coordinator repository sections
Each coordinator repository section SHALL default expanded with independent locally persisted folding. Headers SHALL show canonical repository name, selected-tab eligible task PR count and chevron, using existing section styling and Agents group number styling and number-to-chevron spacing. Names SHALL truncate only on overflow with a full-name tooltip then. Folding SHALL preserve top-level totals without starting reads.

#### Scenario: First display
- **WHEN** a repository has no saved folded state and appears in the coordinator overview
- **THEN** its section is expanded with the existing section header and expanded chevron
- **AND** its header shows canonical repository name and selected-tab count immediately before the chevron, with the same number style and number-to-chevron gap as an Agents group header

#### Scenario: Collapse and expand one repository
- **WHEN** the user clicks a repository header or its chevron
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
- **AND** switching Open/Closed updates the repository count without using repository-wide inventory
- **AND** folding performs no extra GitHub read, stops no existing webhook update, and does not create an empty-list message solely because all sections are folded

#### Scenario: Long repository name
- **WHEN** a canonical repository name is rendered in a wide or narrow panel
- **THEN** it uses all width not reserved for the count, chevron and existing header insets
- **AND** fitting names have no repeat-only tooltip, while overflowing names truncate with the full canonical name on hover
- **AND** count and chevron geometry remains stable for one-, two- and three-digit values

#### Scenario: Incomplete repository count
- **WHEN** a visible repository has authoritative selected-tab rows plus unresolved admitted identities, or only an applicable initial failure notice
- **THEN** its number is the known eligible selected-tab row count, with existing loading hover and accessibility feedback identifying incomplete knowledge rather than an asserted complete total
- **AND** unread identities invent no PR state or count, while complete visible counts have no repeat-only count tooltip

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
- **AND** no extra healthy polling loop, companion or cross-machine inference is introduced; bounded unverified-fleet recovery uses the existing periodic lifecycle without a second scheduler

### Requirement: Stale coordinator presentation without action authority
When strict fleet action context is unavailable, the coordinator SHALL retain its shown same-home list with only the under-header moving line for pending reconciliation, no body Loading and no Stale label. Cold context SHALL show top-left Loading below Open/Closed. Retained context SHALL NOT authorize GitHub reads or worker navigation. Fresh verification SHALL restore operation or replace invalid context. PR/task inventory SHALL NOT persist for restart.

#### Scenario: Status unavailable beyond action freshness
- **WHEN** a status read fails or times out after strict action freshness expires while the verified pair's native spaces still exist
- **THEN** the sidebar stays attached and previously shown Git rows, counts and folds remain with the moving line while reconciliation is pending, no body Loading and no Stale label
- **AND** no new aggregate read or robot navigation uses the retained context as authorization
- **AND** Stale, the removed task heading and the generic incomplete-list notice do not appear in the header
- **AND** the line stops when work finishes or fails rather than animating solely because a retry deadline or unresolved total remains

#### Scenario: Cold restart before verification
- **WHEN** the selected coordinator is restored from durable pair identity but no task/PR facts have been verified in this runtime
- **THEN** Git shows its standard top-left Loading text and static dot with the moving line while work is pending, rather than switching to folder-based non-repository mode or showing partial sections
- **AND** only a fresh verified same-home status result can start task-linked GitHub reads

#### Scenario: Different selected space or confirmed home change
- **WHEN** the user selects another space or a completed read disproves or changes coordinator/home ownership
- **THEN** stale rows are not displayed or reused as facts for the unrelated destination
- **AND** ordinary folder Git and existing stale-generation guards remain intact

### Requirement: Bounded finished-task pull request history
Completed tasks from the verified coordinator's Crew home SHALL contribute validated Open/Draft PRs without live workers, including closed tasks and reported tasks whose terminals ended or disappeared. Historical-only Merged/Closed PRs SHALL appear only within 24 hours of GitHub completion. Live sources SHALL win deduplication and retain worker navigation. Completed nonlive records SHALL grant no worker action; fresh owner/status and bounded reads remain required.

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
- **WHEN** several completed tasks and an eligible live task link the same repository and PR number
- **THEN** the panel fetches, displays and counts one full PR identity and retains the live task's navigation control
- **AND** closing that live task removes its worker navigation but does not remove an otherwise eligible historical PR
- **AND** a stale captured callback cannot navigate to the former worker

#### Scenario: No recorded PR or wrong home
- **WHEN** a reviewer or scout has no PR, a task link is malformed, or status does not belong to the verified coordinator's crew home and owner
- **THEN** that record adds no historical row, count or worker target
- **AND** matching task names, repository names or local terminal IDs on another machine cannot bypass provenance checks

#### Scenario: Existing bounded reader and refresh
- **WHEN** historical candidates are read or updated by the shown enabled aggregate panel
- **THEN** recorded-only status includes completed tasks through the advertised fleet view when available or legacy --all JSON, with separate lower-priority discovery when supported, retaining response-size, task-count and finite transport bounds
- **AND** targeted GitHub reads retain their concurrency and batch bounds
- **AND** webhook/manual refresh and the eligible state-and-check fallback handle mutable PR transitions without repository-wide inventory, while unchanged final facts are reused and historical expiry needs no GitHub request

#### Scenario: Reported task outlives its terminal
- **WHEN** fresh same-home status reports a completed task as reported but its terminal has ended or been removed
- **THEN** that task's PR is admitted as read-only history rather than blocking the entire coordinator on Loading
- **AND** no terminal, adoption, colour or navigation authority comes from that completed record
- **AND** a still-working task with incomplete native membership remains unverified, and a still-live reported terminal must retain exact native membership

### Requirement: Truthful repository-scoped pull request read notices
The coordinator Git overview SHALL render at most one actionable PR-read failure notice per repository section in the selected tab. Notices SHALL distinguish GitHub responses from transport unreachability. Rate-limit refusals and confirmed missing recorded task PRs SHALL produce no error UI. Missing task PRs SHALL have no row, hint or tooltip. Failures SHALL preserve healthy last-good rows and existing history eligibility.

#### Scenario: One live open PR and three finished merged PRs
- **WHEN** a verified coordinator records one live Open or Draft PR and three finished-task Merged PRs in the same repository, each merged within 24 hours
- **THEN** Open shows only the live PR and Closed shows the three merged PRs without historical worker robots
- **AND** successful reads produce no failure notices in either tab, with repository and global counts of Open 1 and Closed 3

#### Scenario: Failed refresh of known closed history
- **WHEN** precise change evidence invalidates previously loaded historical Merged or Closed facts and replacement reads fail without confirming absence
- **THEN** actionable failures produce no notice in Open and at most one scoped read-failure notice in Closed, while rate refusals remain quiet
- **AND** last-good eligible rows and counts remain, while expired historical rows and their row-specific failures do not reappear

#### Scenario: Historical failure before state is known
- **WHEN** an initial read fails actionably for a recorded historical-only PR whose GitHub state has not been established, without confirming its absence
- **THEN** at most one history-load notice appears in that repository's Closed section, with no per-PR error line under Open
- **AND** no state, completion date or count is invented for the unread PR

#### Scenario: GitHub answered with a refusal
- **WHEN** GitHub answers a PR read with a genuine access, authentication or other actionable non-absence response failure rather than a rate-limit refusal
- **THEN** the notice describes the failed read or relevant refusal instead of declaring GitHub unreachable
- **AND** several failures in that repository still produce at most one notice in the applicable tab

#### Scenario: Local process failure or timeout
- **WHEN** the GitHub CLI cannot start, exits abnormally with empty stderr or exceeds its local command timeout
- **THEN** the applicable repository section shows one transient read-failure notice offering Refresh to retry rather than asserting that GitHub is unreachable
- **AND** last-good eligible PR facts survive and the existing bounded refresh path remains without a new polling or automatic retry loop

#### Scenario: Current account cannot resolve the repository
- **WHEN** GitHub explicitly refuses access to the repository or PR with the current login rather than establishing that the recorded PR is missing
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

#### Scenario: Confirmed missing finished-task PR
- **WHEN** GitHub authoritatively reports that an exact recorded historical-only task PR does not exist
- **THEN** the PR contributes no row, count, notice, neutral hint, tooltip or empty repository header in either tab, even if it previously had cached facts
- **AND** its canonical repository and number are remembered for the app session so manual refresh, webhook invalidation, hide/show and coordinator or panel recreation do not repeatedly request it
- **AND** first confirmation emits one sanitized customization-log line identifying that repository and number, with no raw command output, credentials or task inventory

#### Scenario: Mixed historical results
- **WHEN** a repository's recorded historical links contain both found PRs and confirmed missing PRs
- **THEN** only the found eligible rows contribute to presentation and counts, with no missing-history notice
- **AND** a different repository with the same PR number is independent of the remembered absence

#### Scenario: Missing live-task PR
- **WHEN** an unfinished task records a PR that GitHub confirms missing, including a PR also linked by finished tasks
- **THEN** the PR contributes no row, count, notice, neutral hint, tooltip, worker control or empty repository header in either tab
- **AND** repeated refreshes within five minutes do not re-request it; the next eligible existing shown-panel refresh after five minutes may recheck it once, without a new timer or concurrent duplicate read
- **AND** a corrected recorded URL can be read immediately without clearing unrelated remembered absences, and a successful later read can display the now-existing PR normally
- **AND** repeated missing confirmations still emit only the first sanitized customization-log line for that exact repository and number in the session; finishing the task restores session-long historical suppression

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
Verification SHALL use recorded-only status, preferring an explicitly advertised fleet view. PR discovery SHALL be separate lower-priority work after verified recorded inventory is available, never blocking attachment or first inventory. Capability probes SHALL be cached by CLI path and modification time across repeated reads and mod copies. Unknown discovery versions SHALL remain recorded-only; only exact unsupported-flag refusals SHALL permit bounded capability fallback.

#### Scenario: Older Crew ignores the flag or uses an unknown version
- **WHEN** discovery succeeds without metadata or with an unsupported version
- **THEN** the app uses recorded links from that payload without another read and does not assert confirmed none
- **AND** no generic incomplete-list text is restored

#### Scenario: Older Crew explicitly refuses the flag
- **WHEN** the installed Crew status command explicitly rejects the discovery flag as unsupported
- **THEN** at most one bounded plain recorded-only fallback supplies data
- **AND** failure of that fallback remains unavailable without another immediate attempt

#### Scenario: Timeout or authentication failure
- **WHEN** machine transport times out or status fails for authentication or another non-capability reason
- **THEN** no capability fallback or immediate discovery retry is started
- **AND** failure cannot publish none or renew verification freshness; eligible verification recovery retains its bounded delay

#### Scenario: Slow and superseded discovery
- **WHEN** separate PR discovery consumes its extra budget or completes after plugin, preference, owner or read-generation replacement
- **THEN** already-verified attachment and recorded inventory remain available independently of discovery
- **AND** finite command bounds and shared liveness still coalesce healthy reads, while obsolete results cannot publish links, change bindings or authorize workers

#### Scenario: Repeated reads of the same installation
- **WHEN** verification, discovery, toggles or module copies read the same CLI path with unchanged modification time
- **THEN** they reuse previously observed capability evidence instead of running help per read
- **AND** a changed CLI path or modification time causes a fresh bounded probe before selecting the advertised view

#### Scenario: Recorded verification precedes discovery
- **WHEN** recorded-only status succeeds while Git inventory is needed and separate discovery remains pending or fails
- **THEN** the pair is verified and recorded task links can populate first inventory without waiting for GitHub discovery
- **AND** later enrichment cannot renew verification age, change pair identity or discard unchanged discovered links during the next recorded refresh

### Requirement: Selected-tab coordinator repository visibility
Coordinator Git SHALL withhold cold partial successes until first reads settle, using top-left Loading below Open/Closed. Warm return/refresh SHALL retain the list with the under-header line, no body Loading and in-place completion. Actionable notices SHALL appear immediately. Eligibility SHALL precede folding, preserving history, truthful totals and saved folds. Enrollment SHALL use full eligible inventory independently of section visibility.

#### Scenario: Open and Closed contain different repositories
- **WHEN** one repository has only Open or Draft task PRs and another has only eligible Merged or Closed task PRs, with no unresolved task PRs
- **THEN** Open shows only the first repository section and Closed shows only the second
- **AND** omitted sections leave no header or chevron, and switching tabs preserves both totals

#### Scenario: Genuine selected-tab notice without rows
- **WHEN** a repository has no eligible selected-tab rows but has an applicable actionable PR-read notice
- **THEN** its section appears immediately with that notice under existing folding behavior, even without a known PR state or while other repositories are still loading
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
- **THEN** ordinary Git's `No open pull requests` or `No closed pull requests` appears without empty repository headers
- **AND** pending or unverified work uses one standard panel Loading text indication instead of a false empty state

#### Scenario: Hidden section remains an enrollment choice
- **WHEN** a confirmed unenrolled repository has eligible PRs only in the other tab
- **THEN** the single pinned enrollment footer still includes it in canonical inventory order
- **AND** hiding its section does not enroll it, remove its fold state, or initiate or cancel reads

#### Scenario: Mixed successful repositories and a quietly deferred cold repository
- **WHEN** no compatible sections have previously been shown and admitted links include unread PRs in one repository while healthy siblings have supplied rows
- **THEN** only one standard top-left static dot and Loading text appear as body inventory feedback, with successful sibling headers and rows withheld until all admitted first reads settle
- **AND** queued, in-flight and quietly deferred work remain unresolved; genuine applicable failures may show their repository notice immediately below Loading
- **AND** no error or rate-limit wording, placeholder PR, per-repository Loading flash or falsely complete global total is introduced
- **AND** only pending work animates the under-header line; a dormant cooldown alone does not animate

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
- **THEN** one top-left Loading indication remains and the failed repository's applicable header and notice appear beneath it under existing folding rules
- **AND** successful partial sections remain withheld; when all remaining reads succeed, confirm absence or fail actionably, eligible successes appear and Loading disappears
- **AND** actionable failures without authoritative PR state keep totals loading rather than inventing exact totals, even after the body Loading disappears

#### Scenario: Background refresh of an already shown list
- **WHEN** the coordinator list is on screen and known PR facts refresh without new unread membership or lost verification
- **THEN** existing sections and rows remain mounted without body Loading or Stale text, and only the under-header line animates throughout pending work
- **AND** new unread membership or pending verification also uses the line only; it stops and the list updates in place when the update finishes
- **AND** new partial success sections are withheld until first reads settle, while current authoritative removals, history expiry and state transitions remain effective

### Requirement: Stable pull request block geometry
Every PR block SHALL retain fixed state-icon, title and related-agent slots, three fixed line boxes and a 74px height at a given width and zoom. Optional facts SHALL NOT move title boundaries or vertical anchors. Left-run lower-line items MAY move horizontally in fixed order as facts arrive; assigned labels SHALL retain their right content anchor. Absent groups SHALL reserve no width. The metadata line SHALL retain its height even when empty, without placeholders.

#### Scenario: Agent appears or finishes
- **WHEN** otherwise identical rows have or lack a related live agent, including a coordinator task whose worker finishes
- **THEN** their title truncation boundaries, line positions and block heights match
- **AND** the absent robot leaves an inert blank slot rather than a hidden clickable control

#### Scenario: Late optional data
- **WHEN** checks, tasks, assigned labels, author details, review decisions or merge-conflict facts arrive or are removed after first paint
- **THEN** the state-icon and title/agent reservations and all three line boxes retain their geometry without adding or removing lines
- **AND** present left-run elements flow in fixed order at natural widths, shortening only on whole-line overflow while checks remain complete and assigned labels remain right-anchored

#### Scenario: Row variants and zoom
- **WHEN** ordinary, pinned, scrolling, coordinator and motion-preview rows render in Open or Closed at 75%, 100%, 125%, 130%, 150% or 200% zoom
- **THEN** each uses the same logical line and slot geometry for its available width
- **AND** optional content changes preserve the list's vertical rhythm and label right anchor at every zoom

#### Scenario: Whole relative time in the byline
- **WHEN** the full number, author and verbose relative time run cannot fit the available byline width
- **THEN** a complete compact relative time such as 27m ago is shown instead of a mid-word truncation
- **AND** full author, action and relative-time values remain in the byline tooltip while the number, author and time remain left-aligned with constant separator gaps

### Requirement: Non-destructive same-context PR refresh presentation
Same-context refresh SHALL retain rows, pins and pagination until replacement is ready. Pending reads, verification and transient failures SHALL NOT replace known rows with empty states. Coordinator return/background updates SHALL use the under-header line, no body Loading or Stale label. Returns SHALL reuse bounded compatible runtime presentation. Different identities SHALL invalidate incompatible facts; retained context SHALL NOT authorize reads or worker actions.

#### Scenario: Delayed manual or webhook refresh
- **WHEN** a manual, webhook, reconnect or show-time refresh is pending for the displayed repository or coordinator home
- **THEN** known rows stay mounted without a temporary empty list or replacement Loading content
- **AND** replacement facts apply directly, preserving expanded webhook depth and resetting manual pagination only when the replacement page is ready

#### Scenario: Transient root or PR read failure
- **WHEN** a same-context Git-root probe or PR refresh fails without authoritative evidence of a changed or absent repository
- **THEN** last-good rows remain visible with the appropriate failure notice rather than being cleared
- **AND** later success replaces facts without a blank intermediate frame

#### Scenario: Loading and fleet verification
- **WHEN** the panel has unresolved first reads or the same coordinator home temporarily loses fresh verification
- **THEN** previously shown compatible rows remain with only the under-header moving line for pending work, no body Loading and no Stale text anywhere
- **AND** cold verification uses the ordinary top-left static dot and Loading wording plus the same single line while work is pending, with no extra Verifying header, invented PRs, counts, skeleton values or partial success sections

#### Scenario: Off and on with slow or failed first verification
- **WHEN** a verified coordinator list is switched off and back on and the first current read is slow, interrupted or fails
- **THEN** off uses ordinary Git and clears inventory; on shows standard top-left Loading for the current candidate, never Not a git repository while verification is pending or awaiting retry
- **AND** no previous inventory returns across off/on and retained presentation grants no reads or worker navigation

#### Scenario: Negative completes before toggle without a panel render
- **WHEN** authoritative absence completes without a Git render, then attachment is switched off/on and new verification is pending or fails
- **THEN** top-left Loading appears without old inventory or Stale resurrection
- **AND** only current fresh verification can populate the list

#### Scenario: Changed coordinator owner with verification pending
- **WHEN** a previous owner has a positive or negative result and a different labelled owner begins verification
- **THEN** the current candidate shows top-left Loading rather than ordinary folder Git or the previous inventory
- **AND** only a witnessed authoritative negative matching current dependency identity can suppress Loading

#### Scenario: Authoritative context or membership change
- **WHEN** a different machine, folder or coordinator home is selected, a repository is definitively absent, or authoritative PR/task membership changes
- **THEN** incompatible rows are removed or replaced rather than retained as facts for the destination
- **AND** legitimate pin navigation, task-history expiry and requested folds or tab changes remain allowed layout changes

#### Scenario: Bounded runtime return memory
- **WHEN** a previously visited coordinator is selected again within the same runtime and enable generation
- **THEN** only that exact machine, owner, home and selected-tab previously shown presentation can be restored, subject to current eligibility and fresh action verification
- **AND** the cache is bounded, starts no hidden reads, and persists no PR/task inventory to disk, portable preferences or restart state
- **AND** Git, Crew or attachment disablement and authoritative ownership loss invalidate affected cached presentations

### Requirement: Always-visible Git tab counts
Ordinary and coordinator Git views SHALL always display Open and Closed count badges. Unknown or incomplete totals SHALL retain loading feedback, using 0 without compatible cached values and otherwise retaining scoped known values. Cached task subsets SHALL NOT appear as exact repository-wide totals. Badge geometry SHALL remain stable; only loading or abbreviated counts SHALL have count tooltips and accessible labels SHALL retain exact known totals and scope.

#### Scenario: Unknown and loaded totals
- **WHEN** an ordinary or coordinator Git panel first loads, then receives authoritative totals
- **THEN** both badges visibly start at 0 unless compatible scoped cached values exist and change to authoritative counts without moving the tabs
- **AND** three-digit totals remain fully contained in the fixed badge geometry at supported zooms
- **AND** unknown counts have a loading tooltip and accessible label, while fully visible exact totals have no count-only tooltip on the tab or badge

#### Scenario: Refresh retains counts
- **WHEN** known same-repository or coordinator-home counts are refreshed, including delayed and failed same-context reads
- **THEN** their last-known totals remain visible rather than returning to 0
- **AND** only an incompatible identity change clears counts back to the first-load presentation

#### Scenario: Symmetric tab padding across digit changes
- **WHEN** either selected or unselected Open or Closed tabs display one-, two- or three-digit counts in ordinary or coordinator views at 75–200% zoom including 130%
- **THEN** the gap from the tab's left edge to its label equals the gap from its painted count badge's right edge to the tab's right edge
- **AND** digits remain centred within the badge without moving tab or badge bounds as digit counts change

#### Scenario: Abbreviated large counts
- **WHEN** a count exceeds 999
- **THEN** its bounded badge displays 999+ and exposes the full exact total through its tooltip and accessible label
- **AND** its tab geometry remains unchanged

#### Scenario: One admitted repository remains unresolved
- **WHEN** some admitted coordinator PR identities have no authoritative state while other repositories have supplied rows
- **THEN** both totals remain marked loading rather than presenting the successfully loaded subset as complete
- **AND** before any complete total exists both badges show 0 using the existing count-loading tooltip and accessible state
- **AND** if new unread membership arrives after a complete same-scope snapshot, compatible last-good totals remain visibly marked loading until resolution
- **AND** completion counts only deduplicated eligible coordinator task PRs, never guessed states or whole-repository totals

#### Scenario: Worker seeded from coordinator section
- **WHEN** worker entry reuses that repository's known coordinator task section before repository-wide totals have loaded
- **THEN** both badges immediately show that section's known Open and Closed values with existing count-loading feedback identifying the cached task scope and incomplete repository totals
- **AND** no global multi-repository coordinator total is copied to the worker and no task subset is asserted to be the whole repository
- **AND** authoritative repository-wide rows and both totals replace the seed coherently when the ordinary read succeeds, while return to coordinator retains task-scoped counts

### Requirement: Pending checks fallback without live coverage
Shown Open/Draft PRs SHALL use 45-second safety reads while checks are pending or unknown, even when enrolled; settled rows SHALL retain 45-second unenrolled and 120-second enrolled state/check reads. Known Closed/Merged rows SHALL stay session-cached. Failures SHALL retain values with bounded backoff and at least 15 minutes for rate refusals. Hidden, disabled, offline and superseded contexts SHALL stop safety reads; window activity alone SHALL NOT gate reads.

#### Scenario: Pending checks settle
- **WHEN** a shown Open/Draft PR has pending checks and its fallback read returns settled checks
- **THEN** the count updates in place and the fallback continues reading that shown open PR's state and checks at its settled cadence
- **AND** a confirmed empty rollup is settled rather than unknown but does not stop an open row's state refresh

#### Scenario: Failure and visibility
- **WHEN** a fallback read fails or the panel is hidden, disabled or its machine goes offline
- **THEN** its last displayed value remains and failures back off before another eligible read
- **AND** hidden, disabled or offline contexts start no fallback reads and late replies cannot overwrite a new context

#### Scenario: Thin unchanged-row cycle
- **WHEN** shown PR heads and overall check summaries remain unchanged during a safety cycle
- **THEN** one bounded repository probe reads state, draft/completion/head facts and rollup summary, including up to 100 contexts for each pending or unknown row in that same request
- **AND** settled rows remain thin; changed heads or summaries can use the existing bounded detail follow-up under the same single-flight lease
- **AND** detailed pending counts use the full-detail newest-workflow and newest-attempt derivation, combining check runs and status contexts with SUCCESS, SKIPPED and NEUTRAL passed

#### Scenario: No events while pending counts advance
- **WHEN** GitHub advances a shown row from 2/10 to 5/10 to 10/10 without changing its head and with overall PENDING retained during the numeric progression, and no event arrives
- **THEN** successive successful 45-second probes publish the new numbers using one repository request per bounded chunk per cycle
- **AND** no raw aggregate replaces the newest-workflow derivation and no extra detail request is added for that already-pending row

#### Scenario: Secondary rate limit
- **WHEN** GitHub refuses a safety read with a secondary limit despite positive hourly quota
- **THEN** last-good facts remain and no immediate automatic retry occurs
- **AND** the next automatic attempt waits at least 15 minutes or a longer Retry-After value

#### Scenario: Settled open PR changes state
- **WHEN** a shown unenrolled PR with settled checks is merged, closed or converted to draft after its last successful refresh
- **THEN** the next successful fallback cycle reads its current state alongside checks and reconciles its row and totals
- **AND** settlement alone cannot leave it indefinitely in Open after closure

#### Scenario: Coordinator viewport selection
- **WHEN** a coordinator safety cycle selects eligible PRs
- **THEN** every revealed PR in an unfolded section of the selected tab is eligible, including rows below or above the visible viewport
- **AND** unrevealed rows, folded sections and the other tab remain excluded
- **AND** scroll input itself starts no inventory read or immediate extra probe, while ordinary safety selection stays unchanged

#### Scenario: Window changes during a safety request
- **WHEN** reveal, fold, tab, context or relevant inventory changes supersede a held safety selection, including changing away and back
- **THEN** its reply is rejected by the captured selection generation
- **AND** moving only the native viewport within an unchanged revealed selection does not invalidate that selection or change its normal cadence

#### Scenario: Final history retains pending checks without rereads
- **WHEN** a shown known Closed or Merged PR has pending or unknown checks
- **THEN** its last-known checks remain session-cached without a safety probe or detail reread
- **AND** Open/Draft rows still retain their normal state-and-check safety cadence

### Requirement: Completion-driven Git checks freshness
A shown, enabled Git panel with an enrolled repository and healthy relay SHALL refresh loaded PR state and numeric checks after relevant events, including during an in-flight refresh and without head/summary changes. Reconnect and reopening SHALL catch up. The app SHALL retain latest-workflow/rerun semantics, 45-second pending safety and 120-second enrolled settled safety, documenting latency and stale-data conditions.

#### Scenario: Completion and rerun update loaded rows
- **WHEN** authenticated check, status or workflow invalidation arrives for a loaded ordinary or coordinator repository after checks change
- **THEN** refreshed icon/count values match the latest authoritative checks, including partial completion and reruns, and include current PR state
- **AND** pinned, unpinned and explicitly linked older rows receive the refresh without requiring agent selection changes

#### Scenario: Completion during an in-flight read
- **WHEN** a relevant completion event arrives while the previous refresh is reading GitHub facts
- **THEN** a coalesced follow-up refresh consumes that invalidation rather than leaving the previous count indefinitely
- **AND** obsolete replies cannot overwrite facts in a different repository, machine or coordinator context

#### Scenario: Refresh timing and unavailable live updates
- **WHEN** refresh behavior is documented or reported
- **THEN** it distinguishes event receipt, request queue/read latency and GitHub data propagation from measured end-to-end latency
- **AND** it states that shown pending/unknown rows use 45-second safety regardless of enrollment, while settled enrolled rows use 120 seconds; hidden or disabled panels, unverified coordinator context and failed reads can retain stale facts until eligible fallback, catch-up or manual refresh
- **AND** it does not promise a bounded live-update delay when those prerequisites or successful reads are absent

### Requirement: Sanitized fleet verification diagnostics
Failed, unmatched and discarded fleet verification attempts SHALL retain a bounded machine-scoped reason, timestamp and attempted generation in runtime-only diagnostics. The customization log SHALL receive a bounded deduplicated line without raw command output, credentials, reports or task inventory. Late diagnostics SHALL NOT replace newer verification facts or grant action authority. Diagnostic persistence failure SHALL NOT prevent verification or recovery.

#### Scenario: Transport and status failures
- **WHEN** verification encounters a transport rejection, command timeout, nonzero Crew status exit, malformed response or unready native membership
- **THEN** its runtime diagnostic identifies the sanitized failure category, time and attempted generation
- **AND** timeout remains distinguishable from generic status failure without logging raw stderr or stdout

#### Scenario: No matching identity and obsolete reply
- **WHEN** a completed read has no owner, mismatching membership or no eligible fleet, or a reply is rejected as obsolete
- **THEN** diagnostics distinguish authoritative absence from uncertain membership and generation, lease or identity supersession
- **AND** an older reply cannot overwrite a newer success, current failure or retry deadline

#### Scenario: Repeated failures and recovery
- **WHEN** several mod copies or repeated retries encounter the same reason for the same machine and generation
- **THEN** runtime facts retain the latest occurrence but the log emits only the first line of that unchanged reason episode
- **AND** changed reasons or a new failure episode after recovery can produce a new line within the log's fixed size bound

#### Scenario: Existing verification feedback
- **WHEN** the selected coordinator has a relevant last verification failure
- **THEN** cold top-left Loading retains sanitized reason/time in its tooltip without an animated dot, Stale text or notifications
- **AND** warm header activity and its tooltip are absent; bounded runtime diagnostics and the local log remain available without a replacement header tooltip
- **AND** a cold unverified coordinator candidate gains no attachment, PR inventory, GitHub-read permission or worker-navigation authority from that feedback

#### Scenario: Runtime privacy and retention
- **WHEN** diagnostics are retained across mod replacement or inspected by an agent
- **THEN** their bounded runtime facts and customization log remain readable locally and excluded from portable preferences
- **AND** recovery history does not become a durable authorization record or contain raw task, transcript or authentication data

### Requirement: Bounded unverified fleet recovery
An enabled fleet SHALL recover on its existing lifecycle without user action or another scheduler. Failures SHALL back off for 2 seconds, 5 seconds, then repeated 10 seconds from completion. Abandoned work SHALL become retryable within the current recovery interval regardless of initiating mod, never wait for a 45-second crash lease. Healthy bounded reads SHALL coalesce. Recovery SHALL stop on success, disablement or authoritative absence and SHALL NOT grant unverified operational authority.

#### Scenario: Failed or timed-out first read
- **WHEN** first verification fails or times out while attachment and Crew remain enabled and candidates remain applicable
- **THEN** a recovery attempt runs on the existing periodic lifecycle after the delay without a click, dialog close, topology change or unrelated lifecycle interaction
- **AND** a later successful read establishes first pairing and eligible coordinator Git context; a valid remembered presentation remains independent of read completion

#### Scenario: Repeated failures under load
- **WHEN** successive eligible attempts fail and native lifecycle events continue firing
- **THEN** delays progress through 2 seconds, 5 seconds and then repeated 10-second intervals without parallel healthy readers or lifecycle-driven early retries
- **AND** shared liveness and completion facts coalesce mounted mod copies, with the next delay beginning only after the current bounded attempt ends or is detected abandoned

#### Scenario: No slower recovery for retryable failures
- **WHEN** a local or ready remote machine has retryable verification failures, including transport errors or timeouts
- **THEN** no recovery delay exceeds the previous ten-second attempt cadence and no reason-specific slower interval is used
- **AND** an unready remote layout is gated until ready rather than assigned a longer retry interval
- **AND** a replacement module rejects persisted deadlines from the older slower policy

#### Scenario: Disable, success and no fleet
- **WHEN** verification succeeds, attachment or Crew is disabled, candidates disappear or a completed coherent result establishes no applicable fleet
- **THEN** the recovery chain stops and later lifecycle callbacks cannot start recovery for that obsolete scope
- **AND** later ordinary native membership changes or explicit enablement can initiate a new eligible verification
- **AND** disablement hides but preserves remembered pair identity, while authoritative absence clears invalid memory

#### Scenario: Startup and update replacement
- **WHEN** the app starts or replaces its mod graph after an update with attachment already enabled
- **THEN** mounted lifecycle startup starts or joins verification and resumes any eligible backoff independently of retired view callbacks
- **AND** a persisted abandoned read cannot suppress new verification for a full transport lease or count as witnessed success
- **AND** remembered pair presentation restores before the background read completes

#### Scenario: Changed generation while reading
- **WHEN** disable-enable, identity replacement or a newer generation supersedes a pending attempt
- **THEN** its completion records only a bounded discard diagnostic and cannot resurrect the old pair or retry chain
- **AND** the new eligible generation can run its own coalesced verification and recovery

#### Scenario: Initiating mod does not service recovery
- **WHEN** Settings or Git starts a read and its continuation or view disappears while another mounted Spaces copy continues lifecycle ticks
- **THEN** that lifecycle detects abandoned ownership or expired processing and makes a new attempt eligible within the current recovery interval plus one normal lifecycle tick
- **AND** recovery does not depend on the initiating copy's finally block, private maps or timers and does not overlap a healthy command still within its allowance
- **AND** a late reply cannot retire its successor, publish inventory or alter remembered presentation

#### Scenario: Real command takes several seconds
- **WHEN** the actual read-only Crew command takes four to five seconds and returns a supported real-home payload on App 0.1.18 and Core 0.1.22
- **THEN** a remembered pair stays visible immediately while first pairing and Git use Loading until verification completes
- **AND** a successful response publishes first pairing and verified inventory eligibility promptly after receipt without a 45-second lease wait
- **AND** a slow but live command is not mistaken for an abandoned reader merely because it exceeds the retry interval

### Requirement: Unambiguous repository account routing
Per-repository GitHub reads SHALL explicitly identify the canonical repository in a form understood by repository-aware CLI wrappers, independently of the working directory. App-supplied GH_REPO SHALL NOT be empty. Reads SHALL NOT switch global GitHub accounts, override explicit user credentials, or infer routing from repository names embedded only in API paths or request bodies.

#### Scenario: Coordinator home with multiple repositories
- **WHEN** a coordinator outside a Git repository reads task PRs for two repositories
- **THEN** each read explicitly identifies its own canonical repository to the CLI wrapper
- **AND** neither read depends on the coordinator folder, an unrelated worktree origin, or empty GH_REPO

#### Scenario: Repository GraphQL and API reads
- **WHEN** a per-repository read uses GraphQL or an API path rather than a PR command
- **THEN** the invocation also supplies repository context recognized by the wrapper and supported by that command
- **AND** a repository named only inside the query or API path does not count as explicit routing

#### Scenario: Complete page includes both totals
- **WHEN** a repository list read supplies rows and both Open/Closed totals
- **THEN** the panel applies that snapshot without an additional count-only CLI call
- **AND** expanded pages, stale responses and repository routing retain their existing bounds

#### Scenario: Explicit user credential
- **WHEN** the execution environment supplies an explicit GitHub token
- **THEN** the app does not replace it or change the active CLI account to make a read succeed
- **AND** any resulting access refusal remains an honest scoped failure

### Requirement: Identifiable GitHub access refusal
A GitHub access refusal SHALL identify the refused canonical repository and the known account or credential context. Unknown effective identity SHALL remain explicit. Credentials SHALL NOT appear in notices, logs or shared state. Authoritative missing task PRs SHALL produce no interface output, whether live or historical, and SHALL NOT imply a login problem; other missing resources SHALL retain truthful not-found diagnostics.

#### Scenario: Missing recorded pull requests
- **WHEN** GitHub reports an exact recorded task PR missing through PR resource resolution or a definitive missing-resource response to its targeted read
- **THEN** both finished-task-only and unfinished-task links produce no row, notice, hint or tooltip
- **AND** the absence starts no account diagnosis and does not describe an authentication or permission problem

#### Scenario: Obsolete refusal arrives
- **WHEN** a failed read completes after Git is disabled, the panel is hidden, or the captured repository, machine or request context changes
- **THEN** it starts no account-diagnosis follow-up for the obsolete request
- **AND** it cannot publish an error or remembered absence into the new context

#### Scenario: Several permission refusals in one refresh
- **WHEN** several PR reads in the same repository refresh receive real permission refusals
- **THEN** they reuse at most one effective-account diagnosis for that repository in that refresh
- **AND** a later refresh re-verifies the account rather than retaining an old login identity

#### Scenario: Inaccessible historical item
- **WHEN** a recorded historical task PR is genuinely inaccessible under the execution credential
- **THEN** its repository retains one applicable scoped notice with repository and account or credential context
- **AND** healthy rows and repositories remain displayed without automatic account switching or suppression of the refusal
- **AND** explicit permission or authentication failures, network errors, rate limits and timeouts are never remembered as missing PRs

#### Scenario: Account identity unknown
- **WHEN** the failed read does not establish the effective GitHub login
- **THEN** the notice names the repository and identifies the account as unknown or the credential context as unverified
- **AND** it does not assume a wrapper's owner mapping proves the server-authenticated login

### Requirement: Diagnosable coordinator render failures
Caught Git render failures SHALL log the actual error text and innermost failing row, section or notice component before preserving native last-frame fallback. A surviving component marker after an uncatchable native abort SHALL be reported on the next render attempt, explicitly distinguishing incomplete-render evidence from a known exception or timeout cause.

#### Scenario: Caught failure while rendering mixed history
- **WHEN** Closed contains two repositories with merged and closed-unmerged rows, historical and live-agent targets, and a section read notice, and a row or notice renderer throws
- **THEN** the log identifies its actual error and innermost component without replacing them with a generic outer-panel error
- **AND** the error still reaches the host's last-good-frame fallback

#### Scenario: Native interruption leaves a surviving marker
- **WHEN** a native abort bypasses JavaScript catch/finally and a later render observes the prior component marker
- **THEN** it logs the last entered component and an explicitly incomplete-render diagnostic
- **AND** it refers to the native banner or host log for the exact unavailable native error rather than inventing a cause

#### Scenario: Synchronous notice transport refusal
- **WHEN** the host begins a notice request inline during render and its transport fails synchronously
- **THEN** request fallback and notification happen only after yielding out of render
- **AND** healthy repository rows and section notices retain their ordinary presentation

### Requirement: Bounded coordinator render work
Coordinator Open and Closed SHALL reveal ten presentation items initially and append ten near the bottom while keeping every revealed unfolded row of the selected mounted batch present. There SHALL be no viewport spacers or replacement-page footer. Pure row/measurement caches SHALL keep native render work within measured budgets; if 200 mounted rows exceed about 35ms, a measured safe cap SHALL use only one quiet end Show more row. Revealing SHALL start no GitHub inventory read.

#### Scenario: Native scrolling without a JavaScript event
- **WHEN** a native scrollbar drag, track click or keyboard action moves through the revealed content without a JavaScript callback
- **THEN** the viewport shows real mounted rows, never an empty virtual spacer
- **AND** totals still cover the complete inventory and enrollment stays outside the scroller

#### Scenario: Incremental reveal and fitting content
- **WHEN** the list nears its bottom on a received wheel, pointer-over-list or size event, or a post-batch layout check finds that it does not yet overflow
- **THEN** another ten known presentation items are revealed until content overflows, the inventory ends or the measured safe cap is reached
- **AND** dragging to the bottom without an observable event reveals the next batch on the next received event, not through a claimed scrollbar observer

#### Scenario: Atomic section reveal
- **WHEN** a reveal or safe-cap boundary would end with an unfolded repository header
- **THEN** the header is held for the next batch with at least its first row, visible notice or standard Loading body, never rendered alone
- **AND** after every reveal and state transition each rendered unfolded header has a row, visible notice or standard Loading beneath it
- **AND** settled sections with no eligible row or notice disappear after rows move tabs, expire or are authoritatively absent, while intentionally folded eligible sections keep their headers

#### Scenario: Long Closed inventory
- **WHEN** complete coordinator render builds are measured for 30, 60, 100 and 200 mounted PRs
- **THEN** measurements report actual built counts, cold/warm scope and any chosen cap, targeting below 20ms at 100 rows
- **AND** deterministic regressions bound per-row and mounted-tree operations/elements instead of asserting the obsolete viewport-window ceiling

#### Scenario: Measured safe mounted batch
- **WHEN** 200 mounted PR rows exceed the measured safe native build budget
- **THEN** each mounted batch is capped at 60 PRs and 100 presentation items, with one quiet end Show more control and no page counter or Previous control
- **AND** the control advances the batch, cycling the final batch back to the first so earlier rows remain reachable
- **AND** excess arrivals at a full row cap wait for a free slot or explicit batch cycle instead of evicting already revealed PRs

#### Scenario: Repeated row text and labels
- **WHEN** coordinator rows share natural-width metadata strings
- **THEN** native intrinsic widths are measured once per distinct zoom, style and string in a bounded cache, with at most one pending probe per snapshot
- **AND** current available line width still selects semantic shortening without guessed character budgets
- **AND** stale-context or prior-zoom callbacks cannot poison current measurements
- **AND** each row builds at most three label pills while full assigned label names remain available in tooltips

#### Scenario: Snapshot-safe row caching
- **WHEN** unchanged PR facts are rendered again
- **THEN** pure facts, strings, styles and text measurements may be reused while native elements and callbacks register in the current snapshot
- **AND** native build timings are not claimed as live desktop paint or input latency

#### Scenario: Refresh or appended facts while scrolled
- **WHEN** known rows arrive or same-context facts refresh
- **THEN** the surviving row anchor, folded sections, full counts and fixed row geometry are retained
- **AND** accepted native anchor requests unconditionally request a subsequent layout, even when both fade flags are unchanged
- **AND** a genuine context change cannot inherit incompatible facts or scroll requests

#### Scenario: Ordinary pins and older rows
- **WHEN** ordinary Git loads another cursor page, refreshes an expanded list or resolves an older active PR
- **THEN** its existing pagination, pinned row, no-jump row geometry and pin-motion behavior remain intact
- **AND** the shared scroll hints do not replace its existing explicit load or retry control

#### Scenario: Unresolved section within the existing watchdog budget
- **WHEN** unresolved repositories render or recover alongside loaded rows
- **THEN** Loading is bounded by the existing presentation-item cap, preserves atomic header/body reveal and introduces no render-time measurement, notification or diagnostic IO
- **AND** the 50 ms render watchdog and existing PR-row cap remain unchanged

### Requirement: Coherent pull request state transitions
Every successful row refresh SHALL read authoritative Open/Draft/Merged/Closed state with checks. Ordinary and coordinator views SHALL reconcile tab membership, state presentation and totals without duplicate identities or a clear-to-empty intermediate frame. Failed reads SHALL preserve last-good facts. Coordinator counts SHALL remain task-scoped; ordinary counts SHALL remain repository-wide.

#### Scenario: Settled open row merges or closes
- **WHEN** a loaded PR with settled checks merges or closes and the next event, fallback or manual refresh succeeds
- **THEN** it leaves Open and appears in Closed with its authoritative merged/closed presentation, subject to coordinator history eligibility
- **AND** both totals change in the same committed presentation while unaffected rows retain relative order and loaded content does not flicker to empty

#### Scenario: Reopened or draft row
- **WHEN** a refresh observes a Closed PR reopened or an Open PR converted to Draft
- **THEN** reopening moves the row to Open and updates both totals, while draft conversion updates its icon without changing Open membership or counts
- **AND** stale responses cannot restore its former state, duplicate a pin or overwrite another repository's facts

#### Scenario: History does not pin a merged row in Open
- **WHEN** a finished task's previously open PR is now merged or closed
- **THEN** retention uses its new GitHub completion timestamp and Closed eligibility rather than retaining its former Open membership
- **AND** unrelated row order, saved folds and ordinary pagination and pin geometry remain intact

### Requirement: Git trailing alignment with Spaces
Git PR rows and coordinator repository headers SHALL retain their 3px logical trailing inset inside each highlight, independent of Spaces Crew's plain label. Title-line stage or robot reservations SHALL share a stable trailing edge with label pills and the 24px header chevron reservation. Robot glyphs and hit targets SHALL retain their sizes. All row variants SHALL preserve absent-control title reservations, captured actions and vertical geometry.

#### Scenario: Complete panel alignment
- **WHEN** ordinary or coordinator Git panels render at 280, 320, 360, 390 or 480 logical pixels and 75%, 100%, 125%, 130%, 150% or 200% zoom
- **THEN** stage/robot reservation, repository-header chevron slot and actual trailing Git label pill right edges retain a 3px inset from their own row highlight edge
- **AND** complete-panel border and list padding are included without using the restyled Spaces Crew label as a pill-edge oracle
- **AND** Git and Spaces highlights retain equal 8px left and right panel/sidebar gutters, with Git's control-to-panel inset remaining 11px
- **AND** Git row highlights match Spaces' 6px corner radius and their leading content starts 8px inside the highlight, matching Spaces' highlight-to-badge inset

#### Scenario: Different glyph sizes
- **WHEN** a 16px robot glyph and a 14px repository-header chevron are shown
- **THEN** each remains centred within its 24px control at the shared trailing edge
- **AND** their literal SVG right edges may differ by 1px without shifting control or pill edges

#### Scenario: Missing agent, folded header and motion preview
- **WHEN** an agent is absent, a repository header folds or a PR is pinned, scrolled or shown as a motion-preview row
- **THEN** the existing trailing edge and row/header heights and line positions are preserved
- **AND** the absent control reservation remains inert, live robot hit targets remain 24px square, ghost controls remain noninteractive and existing captured actions remain guarded
- **AND** hover, selected/pinned and ghost highlights retain equal Spaces-derived left and right gutters and corner radius

#### Scenario: Text chips replace the robot
- **WHEN** otherwise identical rows show Build, Review, Approved, a robot or no control
- **THEN** they reserve the same bounded title-line space sufficient for the stage words, with no overlapping title or additional line
- **AND** all retain the existing 74px height, three fixed line boxes and label right anchor

### Requirement: Consistent Git list content gutters
Ordinary and coordinator Git panels SHALL align repository section headers, notices, Loading/empty states, scroll fades and the bottom enrollment banner to the same 8px left and right outer gutters as PR row highlights. Inner content padding SHALL remain separate from these outer gutters. Header chrome and the Open/Closed tab strip SHALL remain unchanged unless they share the list gutter.

#### Scenario: Panel feedback and footer
- **WHEN** either Git view shows repository sections, read notices, Loading or empty feedback, scroll fades or an enrollment banner
- **THEN** each uses the same left and right outer content-column edges as the row highlights, including both ordinary and coordinator enrollment banners
- **AND** existing feedback semantics, enrollment actions, pagination, scrolling and vertical geometry remain unchanged

### Requirement: Shared Git scroll edge hints
Ordinary and coordinator Git lists SHALL reuse Spaces/Agents passive fade rendering and a pure scroll-metrics projection. At render, fades SHALL use the native scroll handle's actual offset, viewport and content. Fades SHALL disappear at their respective ends and never intercept input. Host-consumed scrollbar movement MAY delay their repaint until another event/render; this limitation SHALL be stated, not hidden by a guessed scroll observer.

#### Scenario: Start, middle and end
- **WHEN** a render samples either native list at its start, middle or final end
- **THEN** only the bottom fade appears at an overflowing start, both appear in the middle and only the top fade appears at the end
- **AND** fitting content shows neither fade and gradients retain the shared 40px height, scrollbar clearance and list background

#### Scenario: Layout and input changes
- **WHEN** scrollbar dragging or a track click changes the retained handle without invalidating JavaScript
- **THEN** mounted content stays visible and the next render/event samples its real position
- **AND** documented fade/reveal latency explicitly acknowledges the missing notification path without introducing polling

#### Scenario: Accepted anchor correction
- **WHEN** a same-height refresh queues a native anchor correction while the viewport remains in the middle or reaches an end
- **THEN** it requests a repaint unconditionally after queuing the correction and rejects obsolete requests
- **AND** geometry and fade flags remain coherent through the shared atomic projection without render-time notifications or focus allocation

### Requirement: Quiet GitHub rate refusal episodes
Any Git panel GitHub read refused for primary or secondary rate limits SHALL retain last-good rows, totals, pins and paging without an error notice, banner, replacement empty state or new Stale alarm. With no prior shown inventory it SHALL retain standard top-left Loading feedback without exposing cold partial success sections. Each refusal episode SHALL emit one sanitized customization-log line, never one per attempt. Actionable non-rate failures SHALL retain their existing notices.

#### Scenario: Every read path is quiet
- **WHEN** list, count, targeted, older/pinned, history, safety, check-detail, repository-resolution, account-diagnosis or panel auxiliary reads encounter a genuine rate refusal
- **THEN** refusal alone introduces no error UI or new stale alarm, and already shown rows and totals remain
- **AND** first-load unknown data stays top-left Loading with unknown-count semantics rather than settling as an empty list or exposing partial successful repositories
- **AND** unrelated existing actionable errors or fleet-verification waiting feedback are not falsely cleared or reclassified

#### Scenario: Bounded retry and manual bypass
- **WHEN** a refusal starts or extends a cooldown
- **THEN** automatic reads wait at least fifteen minutes or the longer Retry-After duration, even with positive hourly quota
- **AND** one explicit user Refresh can attempt one read during cooldown without starting a retry loop or fan-out after another refusal
- **AND** a refused manual read remains quiet and does not emit another line in the same episode

#### Scenario: Episode recovery and strict classification
- **WHEN** retries keep failing with rate refusal, then an admitted read succeeds, and a later read is rate-refused
- **THEN** the first episode logs only once and the later episode can log once after successful recovery
- **AND** authentication, permission, network, local process, timeout and malformed-response failures are not silenced merely because they mention rate-related text or return HTTP 403 without rate-limit evidence
- **AND** logs contain no tokens, raw replies or task inventories and logging failure never blocks retry or presentation

#### Scenario: Warm refusal in either panel mode
- **WHEN** a same-context coordinator or ordinary repository with loaded facts is refused during refresh
- **THEN** its last-good rows and counts remain without replacement Loading content, paging reset or new error UI
- **AND** existing cooldown recovery remains subject to current visibility, enablement, machine and context guards

### Requirement: Session-final Git facts and shared reads
Ordinary and coordinator views SHALL reuse session-cached Closed/Merged PR facts across refreshes and context recreation instead of rereading unchanged final rows. Compatible in-flight reads of the same routed repository SHALL be shared across both views. Cache keys SHALL isolate machine, repository and credential-routing scope; caches SHALL grant no coordinator or worker authority and SHALL NOT persist PR inventory as portable or restart state.

#### Scenario: Warm final history
- **WHEN** known final PRs are revisited by tab switch, manual refresh, reconnect, generic webhook, local membership refresh or hide/show
- **THEN** unchanged final rows and their labels/checks are reused without targeted history or detail reads
- **AND** coordinator task totals and twenty-four-hour eligibility are still computed from the current verified task membership and current time

#### Scenario: Changed final fact or reopen hint
- **WHEN** precise validated change evidence identifies a cached PR, such as a successful Open inventory that contradicts its Closed state
- **THEN** only affected cached facts are invalidated and reread authoritatively
- **AND** the hint itself cannot move a row, invent totals or grant worker authority
- **AND** generic check/push events do not invalidate every cached Closed row

#### Scenario: Shared compatible read and stale subscriber
- **WHEN** ordinary and coordinator views need overlapping compatible repository facts while a read is pending
- **THEN** they reuse the pending facts rather than issuing duplicate reads for the same PRs and shape
- **AND** each subscriber independently validates its scope before publication or follow-up, so a retired subscriber cannot cancel another current subscriber's authority or receive its results in a new context

#### Scenario: No relay redeployment dependency
- **WHEN** the panel uses the currently deployed relay with repository-only invalidations
- **THEN** batching, caching and quiet-refusal benefits remain available without a relay change
- **AND** cached final coordinator history is session-bound rather than polled for external reopen or metadata changes; precise hints remain a separately scoped optional follow-up

### Requirement: Selected-tab batched Git refresh
Ordinary Git refresh SHALL read only the selected tab's pages, refreshing pending numeric checks even with unchanged head/summary and reusing unchanged settled details. Cooldown retries SHALL re-evaluate current demand. Events and enrollment SHALL retain main's immediate lifecycle without debounce, inactive-window pause or deferred enrollment retries. Shown-open safety SHALL use 45 seconds while pending, otherwise existing 45/120-second cadences.

#### Scenario: Open shown after Closed was visited
- **WHEN** Open is shown and refresh, webhook or reconnect occurs after Closed rows have loaded
- **THEN** Closed row pages are not reread and last-good Closed totals remain until an authoritative totals/state update arrives
- **AND** a later Closed selection can lazily reconcile its demanded membership without clearing cached final facts first

#### Scenario: Current demand after cooldown
- **WHEN** a Closed page or append is rate-refused and Open is selected before the retry fires
- **THEN** recovery reads Open rather than the hidden Closed tab
- **AND** an already-loaded selected destination retains its expanded depth

#### Scenario: Unchanged checks on any refresh trigger
- **WHEN** an existing row is refreshed and its head and rollup summary are unchanged
- **THEN** known settled check contexts are reused, but pending numeric checks are reread on event, manual, list, targeted and safety paths
- **AND** new rows or changed heads/summaries fetch bounded details under the same read lease without overwriting unrelated row fields

#### Scenario: Main event and window lifecycle
- **WHEN** three repository events are separately dispatched inside two seconds to a shown panel, including an inactive window
- **THEN** main's immediate event path invokes three repository-batched refreshes rather than one debounced refresh
- **AND** enrollment remains main's per-repository configuration or explicit Refresh check, without a deferred retry timer

#### Scenario: Effective repository default changes
- **WHEN** remote gh-resolved routing changes while remote URLs remain unchanged
- **THEN** the canonical agent repository cache is invalidated and rechecked
- **AND** unchanged effective routing still reuses verified identity without a GitHub lookup each footer tick

### Requirement: Informative pull request item tooltips
Git lower-line PR items SHALL show a tooltip only for a hidden, abbreviated or omitted full value, or additional known facts absent from visible text. Ordinary and coordinator views SHALL share this policy. Parent hover targets SHALL NOT restore repeat-only lower-line tooltips. Existing native title/header rendering and full-title hover SHALL remain unchanged, without title-width probes, a font override or custom truncation.

#### Scenario: Complete visible text
- **WHEN** a number, author, task phrase, check count, label name or review phrase is fully visible and no extra facts are supplied
- **THEN** that item and its parent hover targets show no tooltip that only repeats those visible words
- **AND** suppression does not remove accessibility labels or alter main's row, icon or separator geometry

#### Scenario: Compact or clipped item
- **WHEN** an item is semantically compacted, clipped or omitted
- **THEN** its tooltip supplies the full original value rather than only the visible abbreviation
- **AND** a completely hidden item remains recoverable on a surviving appropriate group hover target without redundant full-line text

#### Scenario: Informative time and check detail
- **WHEN** a relative time has a known exact timestamp or a check count has known failing or pending check names
- **THEN** its tooltip exposes those additional facts even if visible text fits
- **AND** complete relative time without an exact timestamp and a complete count without extra details have no repeat-only tooltip
- **AND** check names retain newest-workflow/rerun semantics without hover-triggered reads

#### Scenario: Clipped or omitted labels
- **WHEN** label names are clipped or omitted from the bounded coordinator strip
- **THEN** an informative group or surviving metadata tooltip exposes complete exact assigned names when hovering the pills or strip, without individual pill-width probes
- **AND** complete visible names have no repeat-only pill or group tooltip

#### Scenario: State and related agent descriptions
- **WHEN** a state icon or current live robot represents a semantic state or known agent identity absent from visible text
- **THEN** its tooltip may name that state, Merge conflicts or the known related agent
- **AND** unknown identities are not invented and absent/ghost targets gain no action authority

#### Scenario: Native titles remain unchanged on edit
- **WHEN** a short title is replaced by a long title on the same ID and allocated box without another size callback
- **THEN** its native truncation, inherited interface font and complete title tooltip remain available immediately
- **AND** title/header rendering uses no new width probe, prefix fitting, custom suffix or font override

### Requirement: Existing lower-line fit facts determine tooltips
Informative lower-line tooltips SHALL reuse the renderer's existing full/compact/clipped choices. Tooltip policy SHALL NOT add intrinsic probes, width caches, measurement scheduling, geometry changes or a separate layout calculation. Main's native title/header rendering, icon/dot offsets, mounted-row reveal/caps and stale-measurement guards SHALL remain intact.

#### Scenario: Snapshot construction
- **WHEN** a cold or warm ordinary/coordinator tree renders
- **THEN** tooltip decoration adds no native elements or intrinsic probes relative to the reference main renderer
- **AND** existing layout decisions determine hidden-value hover without withholding rows or starting reads

#### Scenario: Changed title without resize
- **WHEN** a title changes on the same element ID with no size callback
- **THEN** native truncation and complete-title hover update immediately without a measurement gate
- **AND** lower-line allocated geometry is not discarded by tooltip policy

### Requirement: Mounted pull request render cost
Cold fully mounted 30/60-row native render construction with informative tooltips SHALL cost no more than the reference current main plus 2 ms for the same workload. Benchmarks SHALL use real ordinary rendering and coordinator rendering with the existing mounted reveal model. Coordinator caps SHALL NOT be disabled or replaced by viewport virtualization in production.

#### Scenario: Actual mounted rows
- **WHEN** 30 or 60 ordinary/coordinator rows are benchmarked cold
- **THEN** every requested row is actually mounted, not only an initial ten-item reveal
- **AND** samples identify the main revision, failures and build-only scope; median cost remains within main plus 2 ms

#### Scenario: Main-relative regression
- **WHEN** the deterministic render-budget regression runs in both tabs
- **THEN** returned native elements and intrinsic probes equal the reference main counts
- **AND** larger coordinator inventories respect main's 60-row and 100-presentation-item safety caps

### Requirement: Bounded pending numeric confirmation recovery
Pending-row numeric freshness SHALL reflect successful numeric reads, not state-only or cached reads. After more than 90 seconds without numeric confirmation, the next eligible cycle SHALL demand fresh numbers past unchanged/coalescing shortcuts. Active reads SHALL retain single-flight guards. Cooldown-skipped reads SHALL retry at cooldown expiry without another event, retaining loaded data and quiet refusal handling.

#### Scenario: Overdue numbers behind an existing read
- **WHEN** a shown pending row's last successful numeric confirmation is older than 90 seconds or unknown
- **THEN** its next eligible probe requests fresh numeric facts rather than satisfying demand from an already-started read
- **AND** busy queues retry without overlapping active panel reads; state-only or cached success does not reset numeric age

#### Scenario: Cooldown expires without a new event
- **WHEN** a pending probe is skipped because a shared rate cooldown is nearly expired
- **THEN** it retries on the existing scheduler at that cooldown's expiry rather than extending the cooldown or waiting for another event
- **AND** rate refusal alone produces no error UI and preserves loaded rows

#### Scenario: Incomplete contexts remain uncertain
- **WHEN** a pending PR has more than 100 contexts and the bounded response reports another page
- **THEN** the read retains today's incomplete-context refusal and last-good facts instead of publishing a partial total

### Requirement: Durable scoped agent monitor repositories
The agent monitor SHALL derive its repository allowlist from the durable confirmed added repositories for the current relay and GitHub account, independently of disposable webhook-notice membership. Empty, missing or mismatched selections SHALL remain empty without legacy fallback. Existing configuration lifecycle paths SHALL propagate the current selection to reachable managed companions without requiring a preference re-save.

#### Scenario: Add or remove invalidates notice membership
- **WHEN** an approved Add or Remove updates confirmed added repositories and clears the webhook-notice cache
- **THEN** the monitor configuration contains the remaining confirmed repositories for the current relay and account
- **AND** the existing lifecycle synchronizes that selection into each reachable managed worker's configuration

#### Scenario: Final repository removed
- **WHEN** the last confirmed repository is removed from the current scope
- **THEN** reachable managed workers receive an empty allowlist and authorize no further messages for the removed repository
- **AND** legacy repository preferences or old notice membership cannot repopulate that allowlist

#### Scenario: Configure or credential refresh invalidates notices
- **WHEN** Configure or credential refresh clears notice membership without changing the relay and GitHub account selection
- **THEN** the monitor retains the durable confirmed selection rather than emptying its allowlist
- **AND** a changed relay or GitHub account admits only a durable selection matching the new scope

#### Scenario: Startup and restart
- **WHEN** the desktop starts or its customization code reloads with auto-fix already enabled and durable confirmed repositories present
- **THEN** the existing lifecycle synchronizes the matching selection without a preference re-save
- **AND** a restarted companion retains its written allowlist and existing duplicate receipts

#### Scenario: Explicit management configuration
- **WHEN** an explicit management operation builds a worker configuration from public desktop settings
- **THEN** it uses the same current relay and GitHub account selection as the desktop lifecycle
- **AND** missing or mismatched durable selection never falls back to notice membership or legacy repository preferences

#### Scenario: Idle agent after scope repair
- **WHEN** a verified idle agent in a confirmed repository has a completed failed latest workflow and idle is selected for delivery
- **THEN** the existing non-forced delivery policy sends exactly one CI message for unchanged failure evidence across cycles and companion restart
- **AND** an enabled persistent conflict independently produces exactly one conflict message for unchanged conflict evidence
- **AND** templates, receipts, ownership and routing to the verified PR agent remain unchanged without coordinator notification

### Requirement: Truthful bounded agent monitor diagnostics
Enabled monitoring SHALL NOT report healthy-ready when its scope is empty or every candidate is skipped. Local diagnostics SHALL retain at most 128 sanitized sent/suppressed entries identifying reason, time, repository, PR and target terminal where known. Diagnostics SHALL distinguish delivery acknowledgement from unknown submission, grant no message authority and add no toast or panel UI.

#### Scenario: No monitored repositories
- **WHEN** auto-fix is enabled with an empty allowlist
- **THEN** status identifies no monitored repositories instead of healthy-ready
- **AND** a bounded suppression entry records that reason with unknown repository, PR and terminal left explicitly empty rather than invented

#### Scenario: Agent state not selected
- **WHEN** every verified candidate agent is in a state excluded by the saved selection
- **THEN** status identifies suppressed monitoring and diagnostics record agent state not selected with each known repository, PR and terminal
- **AND** no message is sent, Working remains opt-in and Blocked remains excluded

#### Scenario: Workflow still running
- **WHEN** a candidate's latest workflow is still running, even with an individual failed job
- **THEN** diagnostics identify workflow still running and no early job alert is sent
- **AND** a cycle in which every candidate is skipped does not report healthy-ready

#### Scenario: Already sent evidence
- **WHEN** an existing receipt suppresses unchanged CI or conflict evidence
- **THEN** diagnostics identify already sent for that repository, PR and terminal without another message
- **AND** attempted or unknown receipts are not falsely described as confirmed successful delivery

#### Scenario: Sent and uncertain outcomes
- **WHEN** the existing transport acknowledges delivery or returns an uncertain submission outcome
- **THEN** diagnostics retain that outcome with its repository, PR and target terminal without changing receipt claims or retry rules
- **AND** a send acknowledgement does not assert that the agent started or completed a fix

#### Scenario: Bounded non-authoritative history
- **WHEN** suppression repeats, the worker restarts, or diagnostic persistence fails
- **THEN** journal retention stays bounded and repeated unchanged episodes are coalesced
- **AND** diagnostics remain separate from delivery receipts, contain no raw output, message text, transcript or credentials, and never relax a delivery gate
- **AND** diagnostic-write failure does not prevent ordinary verification or delivery, and read-only probes do not persist diagnostic history

### Requirement: Machine-scoped Crew update attention
A confirmed available Crew tool update SHALL be a non-optional unmet requirement for the selected machine. The row SHALL show `Outdated` using existing unmet-requirement styling, retain Update and the installed revision, and contribute to `N to fix` and any existing unmet-requirement indicators. Revision age alone SHALL NOT block coordinator launch or project actions.

#### Scenario: Outdated local or remote Crew
- **WHEN** the selected local or remote machine has an installed Crew revision confirmed behind the available revision
- **THEN** its Crew tool row shows Outdated and Update, with the existing non-optional unmet colour
- **AND** Requirements counts it as one to fix rather than one optional, independently of other machines
- **AND** existing plugin-card or navigation unmet-requirement indicators, if present, include it like other unmet requirements

#### Scenario: Current or unverified revision
- **WHEN** Crew is current or its update check fails or has unknown revision evidence
- **THEN** a current installation remains Ready and unknown or failed update evidence does not claim Outdated
- **AND** existing inspection errors and missing-installation states retain their existing meaning

#### Scenario: Optional tools remain optional
- **WHEN** another Crew prerequisite is genuinely optional
- **THEN** its Optional label, neutral styling and optional-only summary behaviour remain unchanged
- **AND** an outdated Crew tool still contributes to the non-optional count when both are present

#### Scenario: Actions with an old installed tool
- **WHEN** a coordinator launch or project action otherwise satisfies its existing guards but Crew is outdated
- **THEN** revision age alone does not refuse or disable that action
- **AND** existing installation, connection, ownership and capability refusals remain authoritative without a new update gate

### Requirement: Bounded repository read diagnostics
Git SHALL retain a bounded local runtime diagnostic per routed repository with read phase, occurrence time, quiet-refusal category and retry deadline. Evidence SHALL distinguish a fresh refusal from a cooldown-skipped read and remain inspectable without UI. It SHALL contain no raw replies, credentials, task inventory or paths, grant no authority and never block reads or rendering.

#### Scenario: Refusal followed by cooldown and success
- **WHEN** a repository's first targeted or ordinary read is rate-refused, skipped during cooldown, and later succeeds
- **THEN** diagnostic facts distinguish those phases and retain the sanitized last refusal time and absolute retry deadline after recovery
- **AND** bounded eviction limits repository retention and repeated skips do not create unbounded history or repeated episode logs

#### Scenario: Isolation, privacy and rendering
- **WHEN** local and remote repositories share names or a stale read finishes after a newer attempt
- **THEN** diagnostics remain machine/repository scoped and cannot overwrite newer phase facts or change read admission, counts or UI
- **AND** no diagnostic UI, portable export, render-time persistence or render-time notification is added

### Requirement: Declarative transient action inputs
Plugin cards SHALL support declared action forms with transient text and masked secret inputs through the common Settings renderer. Input values SHALL reach only the explicitly submitted action, never plugin settings, shared state, portable preferences, logs, deployment payloads or command arguments. Stored secrets SHALL NOT be returned to the form.

#### Scenario: Explicit submission only
- **WHEN** the owner types, blurs a field or presses Enter without invoking its declared submission action
- **THEN** no preference or private store is changed and no secret-bearing operation is started
- **AND** Install all and automatic checks cannot submit the form

#### Scenario: Masked input and action completion
- **WHEN** a secret field is rendered and its form is submitted
- **THEN** the value is masked, sent only to the captured action and cleared from editable form state on completion or failure
- **AND** only sanitized status or a non-secret hint can populate the resulting presentation

#### Scenario: Context retirement
- **WHEN** the card closes, its plugin is disabled, its machine changes or its form is cancelled
- **THEN** transient inputs are cleared and stale callbacks cannot submit, retarget or publish results into a later context
- **AND** an already-dispatched operation is not falsely reported as cancelled

#### Scenario: Generic declaration contract
- **WHEN** a plugin declares a transient action form
- **THEN** it uses shared kit controls without plugin-specific renderer branches
- **AND** persistence and preference import never invoke the action or restore its input values

### Requirement: Private action transport
A secret-bearing Settings action SHALL transfer its payload in memory to its worker over stdin, with bounded input and lifetime. Credentials SHALL NOT appear in transport URLs, process arguments, temporary files, shared state or diagnostic output. Any local handoff listener SHALL accept only its captured single-use session and terminate after completion, cancellation or expiry.

#### Scenario: Successful handoff
- **WHEN** a current explicit action supplies fake credential input to its worker
- **THEN** the worker receives the input on stdin and neither process inspection arguments nor rendezvous metadata contain that credential
- **AND** the result returns only declared non-secret facts

#### Scenario: Invalid or abandoned handoff
- **WHEN** a client presents the wrong session, replays a consumed session, sends an oversized payload or abandons the form
- **THEN** no private setup operation is authorized by that request
- **AND** the listener closes within its finite lifetime without retaining a credential-bearing file or replay job

### Requirement: Crew project folders register once
Settings SHALL NOT request registration of a folder that Crew already lists under another project name, and SHALL show that the folder is already added.

#### Scenario: Folder already registered under another name
- **WHEN** the user adds a folder that Crew already lists under a different name
- **THEN** Settings sends no registration request and shows that the folder is already added

### Requirement: Combined fleet placement evidence
A combined fleet SHALL accept legacy and supported placement-v1 workers in the same verified home and native space when minimal status omits task projects. Explicit project contradictions, unsupported versions and task/home or machine mismatches SHALL still refuse binding. Per-project placement SHALL still require matching authoritative project identity. Space titles SHALL NOT establish or invalidate identity.

#### Scenario: Minimal status and mixed combined workers
- **WHEN** read-only status identifies a live owner, exact same-home worker task identities and eligible finished-task PRs, but omits task projects, and one native combined child holds both legacy and valid placement-v1 workers
- **THEN** the coordinator and child are bound after exact live native membership verification on their own machine
- **AND** the coordinator task context includes eligible live and finished-task links without requiring relabeling, restarting or moving existing workers

#### Scenario: Explicit contradiction remains a refusal
- **WHEN** supported placement labels disagree with a supplied task project, task ID, adoption home or exact native space, or use an unsupported version
- **THEN** no fresh fleet binding or task-PR action authority is granted
- **AND** omitting project evidence in another task cannot excuse that explicit contradiction

#### Scenario: Per-project evidence is missing
- **WHEN** a worker claims per-project placement without authoritative matching task project evidence
- **THEN** the app does not infer the project from its labels, its title or another worker
- **AND** combined-mode compatibility cannot authorize that per-project child

#### Scenario: Combined title changes
- **WHEN** an unnamed combined child displays a different current worker directory name while its exact home, task and native membership evidence remains valid
- **THEN** the fleet relationship and coordinator task-PR scope remain unchanged
- **AND** renaming does not substitute for any missing identity proof

### Requirement: Three managed pull request stages
Git SHALL derive Build, Review or Approved from assigned managed label names, including their previous names, using existing PR reads. The stage SHALL replace the title-line robot and use amber, purple or green theme tokens respectively. Stage SHALL remain independent of CI and GitHub's separate review decision. Rows without managed labels SHALL retain the live linked robot fallback.

#### Scenario: Current and historical label names
- **WHEN** an ordinary or coordinator PR has a managed Build, Review or Approved label, with or without the managed robot prefix
- **THEN** its title-line control shows the corresponding plain stage name
- **AND** Rework and Changes needed map to Build, and Under review maps to Review, including their robot-prefixed previous names
- **AND** unrelated label names and assigned label pill wording are unchanged

#### Scenario: Existing label reads and refresh
- **WHEN** a list, targeted older-active or coordinator PR read returns label arrays or a label connection, including null or empty labels
- **THEN** stage uses the same normalized assigned labels without another per-row request
- **AND** existing webhook/manual refresh and stale-reply guards apply to stage updates and removal

#### Scenario: Approved while checks are pending or failed
- **WHEN** the assigned managed label is Approved and the PR's checks are pending, failed or successful
- **THEN** the chip remains Approved without a reviewer target
- **AND** CI remains exclusively in the existing checks item, with no approved-CI-running state or Review check CI chip
- **AND** GitHub's required checks remain the merge gate; the app does not promote or merge the PR

#### Scenario: No managed label
- **WHEN** a PR has no managed stage label and a live linked agent exists
- **THEN** its existing robot action, known-agent tooltip and focus behavior remain available
- **AND** a row with neither managed stage nor live related agent has an inert blank reservation

### Requirement: Role-aware stage navigation
Build SHALL target ship or fix terminals by a validated full crew.pr identity or matching repository/head branch. Review SHALL target only crew.kind=review terminals whose crew.pr matches the PR, never by branch. Live connected targets SHALL focus their existing machine-qualified terminal without opening GitHub. Approved SHALL have no agent action and SHALL allow the row's PR action.

#### Scenario: Worker and reviewer share a PR
- **WHEN** ship and review terminals share the same full crew.pr URL while the reviewer sits on the base branch
- **THEN** Build focuses the ship terminal and Review focuses the reviewer
- **AND** an identically numbered PR in another repository never matches

#### Scenario: Branch fallback is build-only
- **WHEN** a ship or fix terminal lacks crew.pr but has the verified repository and PR head branch
- **THEN** it can be the Build target
- **AND** a review terminal without matching crew.pr cannot become the Review or Build target through branch, footer or tab-name inference

#### Scenario: Exact identity outranks branch
- **WHEN** a ship terminal explicitly links another PR but its branch matches this PR, or a review terminal links another repository's same PR number
- **THEN** that terminal is not a stage target for this PR
- **AND** multiple eligible matches prefer exact PR identity, then the selected terminal, then stable model order

#### Scenario: Captured action becomes stale
- **WHEN** a target ends, moves, changes role or PR, disconnects, or the panel's captured context becomes invalid before a click
- **THEN** the click does not focus a replacement terminal or open GitHub accidentally
- **AND** coordinator navigation still requires fresh verified same-home membership and exact captured task identity

#### Scenario: Preview and row actions
- **WHEN** a chip is rendered in a motion preview or Approved is clicked in an ordinary row
- **THEN** the preview remains noninteractive and the ordinary Approved region uses the existing PR row action
- **AND** Build and Review focus actions do not also activate that row action

### Requirement: Optional build review history
Git SHALL read optional crew.round, crew.finding and crew.approved from matched terminal labels without inventing missing history or deriving stage from approval metadata. After completed review round n, Build SHALL display Build n+1 and expose a supplied finding as back from review n: finding. Missing or invalid round metadata SHALL retain plain Build without an invented round or finding tooltip.

#### Scenario: First return from review
- **WHEN** the Build terminal reports completed review round 1 and a finding
- **THEN** its chip reads Build 2 and its tooltip includes back from review 1: followed by that finding
- **AND** later completed rounds advance the displayed build number by one

#### Scenario: Older Crew has no review metadata
- **WHEN** terminal labels omit round, finding and approval metadata
- **THEN** the stage remains usable with plain Build and no round or finding tooltip text
- **AND** absent findings are not replaced with invented text

#### Scenario: Approval metadata is not a fourth stage
- **WHEN** a terminal publishes crew.approved while GitHub labels still show Review or Build
- **THEN** the assigned managed label continues to determine the chip
- **AND** no CI-dependent chip or extra agent action is inferred from that SHA

### Requirement: Unavailable stage targets are inert
Build and Review chips SHALL be dimmed and non-clickable when their target has ended, is absent or is on a disconnected machine. Their tooltip SHALL explain the known reason without inventing a live target or verdict. Availability SHALL be rechecked before focus. Ended-target metadata SHALL grant no navigation authority and SHALL NOT be persisted as portable preferences.

#### Scenario: Ended build target
- **WHEN** the PR remains Build after its build terminal ends
- **THEN** its dimmed chip explains that the build agent ended, with the existing known CI state if available
- **AND** the chip does not focus an agent or activate the row

#### Scenario: Ended reviewer
- **WHEN** the PR remains Review after its reviewer ends without a new verdict label
- **THEN** its dimmed chip explains reviewer ended without a verdict
- **AND** no branch-matched worker is substituted as the reviewer

#### Scenario: Disconnected remote machine
- **WHEN** a known target belongs to a machine that is not connected
- **THEN** its chip is dimmed with on machine, not connected using that machine's name
- **AND** reconnecting with a valid live identity restores focus using its machine-qualified address

#### Scenario: No target observed
- **WHEN** no role-matched terminal is available and no prior terminal identity is known
- **THEN** the managed stage is still shown dimmed with an unavailable-target explanation
- **AND** the app does not claim to know that an unobserved terminal ended

#### Scenario: Retained coordinator target loses live membership
- **WHEN** a previously verified coordinator target ends or its machine disconnects while its PR remains displayed, including historical-only rows
- **THEN** the same-home remembered identity supplies the known ended or disconnected explanation without requiring current live task membership for presentation
- **AND** stale membership and remembered identity authorize no focus or reads, and another home cannot borrow that identity

#### Scenario: Coordinator target reconnects before verification
- **WHEN** the target becomes live again but its coordinator membership is still unverified
- **THEN** the chip stays dimmed and explains that the role target is unavailable
- **AND** only a fresh verified exact live task binding restores its focus action

### Requirement: Agent navigation shares pin motion
Build and Review chips and fallback robots SHALL share one navigation-first pin-motion controller in ordinary and coordinator views, with or without an existing pin. The clicked row SHALL rise to the ordinary pinned position after destination selection resolves, using native 320ms motion and guarded settlement. Coordinator handoff SHALL retain only bounded inert presentation, not add a permanent coordinator pin or infer read authority.

#### Scenario: Ordinary click with an existing pin
- **WHEN** a live Build or Review chip or fallback robot links another agent PR and the user clicks it from a pinned list
- **THEN** focus changes immediately and the existing row slots are retained while the destination resolves
- **AND** the clicked row moves to the pinned position, the former pin returns to the list and affected rows move without a final jump

#### Scenario: Ordinary click before any pin exists
- **WHEN** the user clicks a live Build or Review chip or fallback robot from an initially unpinned ordinary list
- **THEN** the same controller moves that row to the pinned position with no former-pin return
- **AND** timing, overlay, affected-row motion, cancellation and settlement remain the same as for a pinned list

#### Scenario: Coordinator click into another agent space
- **WHEN** the user clicks a live Build or Review chip or fallback robot in a verified coordinator list
- **THEN** focus changes immediately to that exact agent and a bounded inert source presentation retains the clicked row's measured origin
- **AND** the same controller moves that row to the destination's ordinary pinned position after selection resolves, without a permanent active pin in the coordinator list
- **AND** the destination independently reads its repository inventory and totals rather than treating the coordinator subset as complete

#### Scenario: Reviewer on its base branch
- **WHEN** a clicked reviewer has a matching full crew.pr but remains on the base branch without a PR footer
- **THEN** that current label resolves the destination pin for the animation without a fabricated head-branch match or transcript read

#### Scenario: Cancelled or ghost navigation
- **WHEN** a destination cannot resolve within three seconds, context or Open/Closed changes, scrolling cancels the motion, or a different target is selected
- **THEN** the existing controller cancels retention without replaying focus or committing a false settled pin
- **AND** moving ghost rows and retained coordinator presentation never become navigation or worker authority

### Requirement: One complete-lifecycle Git loading animation
Ordinary and coordinator Git panels SHALL use the existing moving line immediately below the header as their only panel-loading animation throughout pending cold, warm and background work, regardless of pending CI. The line SHALL stop on completion, failure, hide, disable or scope replacement. The header activity bulb and its tooltip SHALL be absent; shared activity components and other panels SHALL remain unchanged.

#### Scenario: Cold ordinary and coordinator work
- **WHEN** an enabled shown Git panel begins folder, repository, list, targeted, pagination, verification or inventory work without previously shown compatible content
- **THEN** one moving line runs until the pending work completes or fails, including work exceeding one 2.4-second pass and work with no loaded pending CI
- **AND** cold top-left Loading retains the other right-side panel's 7px dot, 6px gap, blue 12px text and existing insets, but its dot is static in Git
- **AND** references elsewhere to a Git Loading working bulb mean this static message, not a second loading animation
- **AND** actionable failures remain visible and coherent inventory publication and count uncertainty remain unchanged

#### Scenario: Warm background and manual work
- **WHEN** a shown ordinary or coordinator list performs warm return reconciliation, verification, manual, webhook or safety work
- **THEN** only the one under-header moving line animates for panel loading and the existing list remains mounted without body Loading or Stale text
- **AND** overlapping work shares the line until the last pending operation finishes, with no separate CI-only track
- **AND** Git Refresh remains disabled with its existing feedback timing but does not rotate, including on hover during a request

#### Scenario: Idle failure cooldown and retired callbacks
- **WHEN** work completes, fails, becomes dormant awaiting a future retry, or the panel is hidden, disabled or changes context
- **THEN** no obsolete callback keeps the old loading line running or clears a newer context's work
- **AND** a dormant cooldown, uncertain count or historical failure alone does not assert an active request
- **AND** no loading animation changes another panel, tab, status slot or shared activity component

### Requirement: Shared warm Git repository entry
Coordinator and worker entry SHALL share immediate compatible cached presentation, existing header activity and coherent in-place refresh. Worker entry SHALL show only its resolved repository section with the coordinator's header, count and chevron. Warm refresh SHALL NOT show body Loading or a blank frame. An unresolved destination without compatible cached presentation SHALL use existing cold Loading, never another destination's rows.

#### Scenario: Coordinator to worker with cached section
- **WHEN** a selected worker's exact machine and current location identify a repository whose compatible section has already loaded in the coordinator
- **THEN** the first destination frame contains that repository's cached section header, count, chevron and selected-tab rows without waiting for GitHub
- **AND** other repositories are absent and the existing header updating animation runs while eligible background refresh replaces facts in place

#### Scenario: Return to coordinator
- **WHEN** the same machine, owner, home and enable generation are selected again after a worker visit
- **THEN** its compatible sections, ordering, counts, folds and reveal/anchor presentation return immediately without a blank or body Loading frame
- **AND** current verification and admitted refresh use the same warm header activity and publication behavior as worker entry

#### Scenario: Cold destination and cached empty result
- **WHEN** a destination has no compatible presentation or its repository identity cannot be safely resolved
- **THEN** existing cold Loading remains while identity and data resolve, without guessing from a space name, branch or repository basename
- **AND** a cached authoritative empty result instead shows its known empty state with header activity while refreshing, not a cold Loading state

#### Scenario: Failure or rate refusal during warm entry
- **WHEN** a background refresh fails, is deferred by cooldown or loses fresh verification
- **THEN** compatible last-good presentation remains without a Loading replacement or false completed refresh
- **AND** existing scoped failures, quiet rate refusal, verification diagnostics and guarded recovery remain authoritative

### Requirement: Qualified bounded Git entry memory
Reusable Git presentation SHALL be bounded runtime-only data qualified by machine, canonical repository, credential routing, source inventory scope and enable generations. Cached task facts SHALL NOT authorize repository-wide totals, GitHub reads or agent focus. Authoritative identity changes and absence SHALL invalidate affected presentation, while obsolete replies SHALL NOT repopulate a new selection.

#### Scenario: Same number or repository on another machine
- **WHEN** two repositories share a PR number or two machines have the same repository name
- **THEN** only facts with the destination's full qualified identity can populate its section
- **AND** one machine's response, cached totals or folder mapping cannot be reused as the other's

#### Scenario: Directory and routing change
- **WHEN** a selected terminal changes directory, its repository mapping changes, effective routing changes, or a read proves the destination is not a repository
- **THEN** incompatible rows, counts and stale request publications are rejected before the next destination presentation
- **AND** an unproven new directory never borrows a former folder's repository solely from a retained task label

#### Scenario: Lifetime and authority
- **WHEN** Git or the relevant source provider is disabled and re-enabled, ownership changes, or the app restarts
- **THEN** affected entry snapshots cannot restore prior-generation inventory or grant stale worker actions
- **AND** hidden snapshots do no reads and contain no native handles, callback trees, credentials or portable or restart-persisted PR inventory

### Requirement: Space entry preserves order without pin motion
Entering an agent space SHALL restore its cached repository section without creating a pin, reordering rows or starting move-to-top animation. Coordinator return SHALL restore its cached order directly. Existing panel-origin stage-chip and fallback robot-click pin behavior SHALL remain unchanged and separate from entry; an already-started click transition SHALL retain its existing selection acknowledgement behavior.

#### Scenario: Direct agent-space entry
- **WHEN** the user enters an agent space directly and its PR or branch matches a row in the cached section
- **THEN** the cached section is shown immediately in its existing order with header refresh activity
- **AND** entry creates no pin, moves no row to the top and starts no pin animation

#### Scenario: Return to coordinator
- **WHEN** the user returns from a worker space to the coordinator
- **THEN** the coordinator's cached sections and ordering are restored directly with existing header refresh activity
- **AND** no entry-driven pin, unpin animation or row reorder occurs

#### Scenario: Existing chip and robot navigation
- **WHEN** the user clicks another agent PR's live stage chip or fallback robot inside the panel
- **THEN** the existing click-origin navigation and move-to-top pin animation remain unchanged, including their existing confirmation and cancellation rules
- **AND** the resulting native space acknowledgement neither starts a second animation nor cancels the original merely because cached entry ran
- **AND** Approved remains non-navigating and unavailable targets retain existing refusals

### Requirement: Repository identity belongs to the Git section header
The main Git header SHALL show only its Git title/chevron, tools and existing refresh/status feedback, not a duplicate repository name or repository popup. Canonical repository identity, counts and folding SHALL remain in the section header. Code, Pull requests and Actions page shortcuts SHALL be removed, not relocated. Existing PR Open and Copy path menus SHALL remain unchanged.

#### Scenario: Worker and coordinator main headers
- **WHEN** either view renders a known repository, refresh or unverified retained data
- **THEN** the main header has no repository name, repository URL tooltip or repository context-menu entry by mouse or keyboard
- **AND** refresh/verification activity and sanitized diagnostics remain on the existing status indicator, with canonical identity/count/chevron in the section header

#### Scenario: Individual pull request actions
- **WHEN** a user opens a PR row context menu after main-header simplification
- **THEN** its captured Open and Copy path actions and keyboard handling remain intact
- **AND** no Code, Pull requests or Actions repository-page shortcuts are offered anywhere in the panel
