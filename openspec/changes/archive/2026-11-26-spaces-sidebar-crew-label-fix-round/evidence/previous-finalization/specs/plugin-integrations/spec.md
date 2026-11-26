## MODIFIED Requirements

### Requirement: Validated task PR discovery results
The app SHALL accept discovery only for top-level version 1 with valid per-task status, URL, source and reason combinations. Known results SHALL provide canonical HTTPS GitHub PR links. None SHALL mean no PR on that read; unavailable SHALL mean unknown. Malformed task PR facts SHALL become unavailable for that task without blocking healthy tasks, never evidence of absent tasks, ownership or PRs. Identity validation SHALL remain strict.

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
- **THEN** that task contributes unavailable PR knowledge with no guessed link while healthy task results can still publish
- **AND** malformed owner or native task identity still refuses verification rather than granting another task or home authority

### Requirement: Space entry preserves order without pin motion
Entering an agent space SHALL restore its cached repository section immediately and place the selected agent's matching PR directly below its own repository header, without entry-driven motion. Remaining rows and coordinator returns SHALL retain their relative order. Panel-origin stage and fallback robot clicks SHALL retain the existing guarded animation and selection acknowledgement, ending below the destination repository header.

#### Scenario: Direct agent-space entry
- **WHEN** the user enters an agent space directly and its PR or branch matches a row in the cached section
- **THEN** the section header retains its count and chevron, followed by the selected PR as its first row and then the remaining rows in their relative order
- **AND** entry starts no pin animation, including for a selected Draft PR

#### Scenario: Return to coordinator
- **WHEN** the user returns from a worker space to the coordinator
- **THEN** the coordinator's cached sections and ordering are restored directly with existing header refresh activity
- **AND** no permanent coordinator pin or entry-driven pin motion appears

#### Scenario: Existing chip and robot navigation
- **WHEN** the user clicks another agent PR's live stage label or fallback robot inside the panel
- **THEN** the existing click-origin navigation and move-to-top animation retain confirmation and cancellation rules and settle inside the destination section directly below its header
- **AND** native selection acknowledgement neither starts a second animation nor cancels the first because cached entry ran
- **AND** Approved opens the PR and unavailable targets retain their refusals

#### Scenario: Empty or unverified coordinator seed
- **WHEN** the destination worker has no seed, a zero-count empty seed or an unverified coordinator source
- **THEN** it independently resolves its repository and requests its own selected page rather than treating seed counts as complete data
- **AND** successful reads clear Loading and a selected matching Draft PR appears directly below its section header

### Requirement: Diagnosable coordinator render failures
Caught Git row failures SHALL log the actual error and failing component and show a fixed-height row-local fallback without blocking healthy rows. Other caught panel failures SHALL preserve native last-frame diagnostics. A native abort's surviving marker SHALL remain distinguishable from a caught exception. An incomplete frame SHALL receive at most one deferred retry; repeated failure SHALL NOT create a render loop or new read/focus authority.

#### Scenario: Caught failure while rendering mixed history
- **WHEN** Closed contains two repositories with mixed rows and notices and one row renderer throws
- **THEN** the log identifies its actual error and innermost row component and that row has a safe 74px fallback while healthy rows still render
- **AND** a non-row failure retains the host's last-good-frame fallback and actual diagnostic

#### Scenario: Native interruption leaves a surviving marker
- **WHEN** a native abort bypasses JavaScript catch/finally and a later render observes the prior component marker
- **THEN** the log identifies an incomplete render rather than inventing an exception or row-removal cause
- **AND** a deferred once-only retry can replace the stale frame after the interruption settles; repeated failure or view retirement cannot keep notifying

#### Scenario: Synchronous notice transport refusal
- **WHEN** the host begins a notice request inline during render and its transport fails synchronously
- **THEN** request fallback and notification happen only after yielding out of render
- **AND** healthy repository rows and section notices retain their ordinary presentation

#### Scenario: Row removal during render or pin motion
- **WHEN** accepted facts remove a merged PR from Open while a replacement is built or click-origin pin motion is waiting or moving
- **THEN** the next coherent render excludes the removed row and cancels incompatible motion without replaying focus
- **AND** surviving sections, rows, counts and geometry remain usable without an indefinitely stale frame

#### Scenario: Abandoned native read task
- **WHEN** a native read Task is definitively done but its root or page busy latch remains set because cleanup was interrupted
- **THEN** the next existing lifecycle/render releases that obsolete latch and permits one guarded replacement read
- **AND** a repeated interruption shows a truthful retry message with accessible manual Refresh even before root resolution, rather than looping
- **AND** only all-obsolete shared read leases/tails may be retired; healthy consumers, cached facts, rate cooldowns and stale-reply ordering remain intact

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

### Requirement: Three managed pull request stages
Git SHALL derive Build, Review or Approved from assigned managed label names and their previous names using existing reads. A managed stage SHALL appear exactly once as the bottom-right emoji label pill, using the existing GitHub label shape and colour treatment, with no title-line stage or robot. Stage SHALL remain independent of CI and GitHub's review decision. Rows without managed labels SHALL retain only a live linked robot fallback.

#### Scenario: Current and historical label names
- **WHEN** an ordinary or coordinator PR has a managed Build, Review or Approved label, with or without the managed robot prefix
- **THEN** its single bottom-right stage pill shows the robot emoji and canonical Build, Review or Approved name
- **AND** Rework and Changes needed map to Build, and Under review maps to Review, including their robot-prefixed previous names
- **AND** unrelated label names remain unchanged and raw assigned managed names remain available as additional hover information without duplicate visible stage pills

#### Scenario: Existing label reads and refresh
- **WHEN** a list, targeted older-active or coordinator PR read returns label arrays or a label connection, including null or empty labels
- **THEN** stage uses the same normalized assigned labels without another per-row request
- **AND** existing webhook/manual refresh and stale-reply guards apply to stage updates and removal

#### Scenario: Approved while checks are pending or failed
- **WHEN** the assigned managed label is Approved and the PR's checks are pending, failed or successful
- **THEN** the chip remains Approved without a reviewer target and opens the PR when clicked
- **AND** CI remains exclusively in the existing checks item, with no approved-CI-running state or Review check CI chip
- **AND** GitHub's required checks remain the merge gate; the app does not promote or merge the PR

#### Scenario: No managed label
- **WHEN** a PR has no managed stage label and a live linked agent exists
- **THEN** its existing robot action, known-agent tooltip and focus behavior remain available
- **AND** a row with neither managed stage nor live related agent has no stage control or unnecessary title-stage reservation

#### Scenario: Multiple labels and unavailable agents
- **WHEN** several managed aliases coexist or the chosen stage has no live connected role target
- **THEN** the existing deterministic precedence produces one bottom-right managed-stage pill without a separate robot or top chip
- **AND** the stage remains represented in the bounded coordinator label group even when unrelated labels precede it
- **AND** unavailable Build or Review retains its dimmed explanatory tooltip and cannot focus an agent or fall through to opening the PR

### Requirement: GitHub label presentation
Assigned labels SHALL use fully rounded 18px pills derived from GitHub colours, preserving exact names and emoji except that managed aliases collapse into one canonical emoji stage pill. Dark palettes SHALL use GitHub's 18% tint, readable coloured text and 30% text-colour border; light palettes SHALL use solid fill and contrasting text. Pills SHALL remain bounded in one ordered right-aligned group with informative full-value hover and no extra row height.

#### Scenario: Under review label
- **WHEN** a PR has the label named `🤖 Under review` with GitHub colour `840479`
- **THEN** the row displays one `🤖 Review` pill derived from that colour at the bottom-right content edge, with no separator dot before the label group
- **AND** the assigned alias remains available in informative hover and no duplicate title-line stage appears
- **AND** on a dark palette it uses a translucent purple tint, lightened purple text and a thin translucent purple border rather than a solid purple block

#### Scenario: Several labels in a narrow panel
- **WHEN** assigned labels do not all fit beside the preceding metadata
- **THEN** they remain one right-aligned group in their existing relative order, except duplicate managed aliases collapse to one stage, within a bounded single-height strip rather than expanding the panel or row height
- **AND** pill words remain whole while task compaction and secondary review-text reduction can make room; only remaining overflow clips the label group without overlap or a lone ellipsis
- **AND** tooltips expose complete assigned names, including clipped names and managed aliases

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
- **AND** an invalid or missing colour uses the existing neutral theme fallback rather than producing invalid colours or hiding its label
- **AND** native measurement probes and motion-preview pills are noninteractive

#### Scenario: Stable right content anchor
- **WHEN** rows with different task progress, check widths, absent checks or absent tasks display assigned labels at the same panel width and zoom
- **THEN** each label group's rightmost visible pill ends at the same right content edge whether or not a title-line fallback robot is present
- **AND** the anchor uses the content edge, not an inset SVG glyph or the panel border
- **AND** adding or removing the final label adds no separator and does not alter line geometry or row height

### Requirement: Git trailing alignment with Spaces
Git PR rows and coordinator repository headers SHALL retain their 3px logical trailing inset inside each highlight, independent of Spaces Crew. Bottom-right labels and the 24px header chevron SHALL share the trailing edge. Managed stages SHALL have no title-line reservation or separate robot; only a live no-managed-stage fallback robot SHALL occupy its existing 24px target. All row variants SHALL retain captured actions and vertical geometry.

#### Scenario: Complete panel alignment
- **WHEN** ordinary or coordinator Git panels render at 280, 320, 360, 390 or 480 logical pixels and 75%, 100%, 125%, 130%, 150% or 200% zoom
- **THEN** repository-header chevron slots, live fallback robot controls and actual trailing Git label pill right edges retain a 3px inset from their own row highlight edge
- **AND** complete-panel border and list padding are included without using the restyled Spaces Crew label as a pill-edge oracle
- **AND** Git and Spaces highlights retain equal 8px left and right panel/sidebar gutters, with Git's control-to-panel inset remaining 11px
- **AND** Git row highlights match Spaces' 6px corner radius and their leading content starts 8px inside the highlight, matching Spaces' highlight-to-badge inset

#### Scenario: Different glyph sizes
- **WHEN** a 16px robot glyph and a 14px repository-header chevron are shown
- **THEN** each remains centred within its 24px control at the shared trailing edge
- **AND** their literal SVG right edges may differ by 1px without shifting control or pill edges

#### Scenario: Missing agent, folded header and motion preview
- **WHEN** an agent is absent, a repository header folds or a PR is pinned, scrolled or shown as a motion-preview row
- **THEN** the existing trailing edge and row/header heights and line positions are preserved without an empty 80px stage reservation
- **AND** live fallback robot hit targets remain 24px square, ghost controls remain noninteractive and existing captured actions remain guarded
- **AND** hover, selected/pinned and ghost highlights retain equal Spaces-derived left and right gutters and corner radius

#### Scenario: Text chips replace the robot
- **WHEN** otherwise identical rows show Build, Review, Approved, a fallback robot or no control
- **THEN** managed stages appear only in the bottom-right label group and titles reclaim the removed stage reservation without overlap or an additional line
- **AND** all retain the existing 74px height, three fixed line boxes and label right anchor

### Requirement: Optional build review history
Git SHALL read optional crew.round, crew.finding and crew.approved from matched terminal labels without inventing history or deriving stage from approval metadata. Visible stage names SHALL remain Build, Review or Approved. After completed review round n, informative hover SHALL expose the next build round and any supplied finding as back from review n: finding. Missing or invalid metadata SHALL add no invented round or finding.

#### Scenario: First return from review
- **WHEN** the Build terminal reports completed review round 1 and a finding
- **THEN** its chip still reads `🤖 Build` and its tooltip identifies build round 2 and includes back from review 1: followed by that finding
- **AND** later completed rounds advance the hover's build number by one without adding another visible stage

#### Scenario: Older Crew has no review metadata
- **WHEN** terminal labels omit round, finding and approval metadata
- **THEN** the stage remains usable with canonical Build and no round or finding tooltip text
- **AND** absent findings are not replaced with invented text

#### Scenario: Approval metadata is not a fourth stage
- **WHEN** a terminal publishes crew.approved while GitHub labels still show Review or Build
- **THEN** the assigned managed label continues to determine the chip
- **AND** no CI-dependent chip or extra agent action is inferred from that SHA

## ADDED Requirements

### Requirement: Isolated targeted pull facts
Targeted reads SHALL refuse invalid per-alias PR identity or row shapes without publishing those facts or blocking healthy sibling aliases. Transport, rate and unscoped failures SHALL retain existing whole-read refusal rules.

#### Scenario: Malformed alias beside healthy PR
- **WHEN** one targeted alias has a mismatching number/URL, unknown state, invalid title or failing normalization beside a valid sibling
- **THEN** that alias returns an entry-local error and contributes no new cached facts while the valid sibling publishes normally
- **AND** a malformed owner/native envelope or whole-read rate/transport failure cannot gain authority from partial data

### Requirement: Frame-local Git presentation snapshots
Git MAY reuse native identity collections and verified/presentation provider contexts within one frame to bound repeated presentation work. Snapshots SHALL NOT grant read or focus authority after that frame.

#### Scenario: Many rows and a changed captured target
- **WHEN** several Git rows render against the same native collections and provider context
- **THEN** presentation reuses those frame-local facts without per-row transport or repeated native collection reads
- **AND** a subsequent click resolves current role, PR, membership and native identity again, refusing a stale or changed target
