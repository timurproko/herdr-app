# Spec Delta

## MODIFIED Requirements

### Requirement: GitHub label presentation
Unmanaged labels SHALL retain exact names/emoji and rounded 18px GitHub-colour pills: dark palettes use 18% tint, readable text and 30% text-colour border; light palettes use solid fill and contrast text. Managed aliases SHALL instead use one bottom-right plain stage chip with palette text, subtle raised fill, 6px side padding and no emoji/outline or tooltip. The group SHALL stay ordered, bounded and right-aligned with informative unmanaged-label hover and no extra row height.

#### Scenario: Under review label
- **WHEN** a PR has the label named `🤖 Under review` with GitHub colour `840479`
- **THEN** the row displays one plain `Review` chip at the bottom-right content edge, without an emoji, outline or separator dot before the group
- **AND** no duplicate title-line stage or stage tooltip appears
- **AND** it uses the stage's palette purple text and existing subtle raised fill with 6px side padding rather than a GitHub-colour pill

#### Scenario: Several labels in a narrow panel
- **WHEN** assigned labels do not all fit beside the preceding metadata
- **THEN** they remain one right-aligned group in their existing relative order, except duplicate managed aliases collapse to one stage, within a bounded single-height strip rather than expanding the panel or row height
- **AND** pill words remain whole while task compaction and secondary review-text reduction can make room; only remaining overflow clips the label group without overlap or a lone ellipsis
- **AND** tooltips expose complete clipped or omitted unmanaged names without reintroducing managed-stage aliases, findings or agent-action tooltips

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

### Requirement: Three managed pull request stages
Git SHALL derive Build, Review or Approved from assigned managed labels and aliases using existing reads. Without a managed label, an Open/Draft PR with a verified live ship/fix target SHALL show Build instead of a robot. Each stage SHALL appear once on the bottom-right checks line with existing stage colours and raised fill, no emoji, outline, title reservation or tooltip. Assigned managed labels SHALL win; CI and GitHub review decisions SHALL NOT determine stage.

#### Scenario: Current and historical label names
- **WHEN** an ordinary or coordinator PR has a managed Build, Review or Approved label, with or without the managed robot prefix
- **THEN** its single bottom-right plain chip shows Build, Review or Approved, with the supplied next build round when present, and no robot emoji
- **AND** Rework and Changes needed map to Build, and Under review maps to Review, including their robot-prefixed previous names
- **AND** unrelated label names remain unchanged and managed aliases collapse without duplicate visible stage pills or stage tooltips

#### Scenario: Existing label reads and refresh
- **WHEN** a list, targeted older-active or coordinator PR read returns label arrays or a label connection, including null or empty labels
- **THEN** stage uses the same normalized assigned labels plus existing verified live build-target evidence without another per-row request
- **AND** existing webhook/manual refresh and stale-reply guards apply to stage updates and removal

#### Scenario: Approved while checks are pending or failed
- **WHEN** the assigned managed label is Approved and the PR's checks are pending, failed or successful
- **THEN** the chip remains Approved without a reviewer target and opens the PR when clicked
- **AND** CI remains exclusively in the existing checks item, with no approved-CI-running state or Review check CI chip
- **AND** GitHub's required checks remain the merge gate; the app does not promote or merge the PR

#### Scenario: No managed label
- **WHEN** an Open/Draft PR has no managed stage label and a verified live ship/fix target exists
- **THEN** one bottom-right Build chip replaces its title-line robot and retains the guarded build-agent focus action
- **AND** missing or invalid round metadata produces Build, not Build 1 or no stage
- **AND** a row with neither managed stage nor verified live build target does not invent a build stage; existing non-build fallback agent navigation remains unchanged

#### Scenario: Planning-only build owner
- **WHEN** a live ship/fix task has only planned its linked PR, including a draft plan awaiting approval
- **THEN** it uses the same Build caption and build-owner focus action as an initial implementation task without review history
- **AND** Build does not assert implementation approval or completion, and a task with no PR contributes no row or chip

#### Scenario: Multiple labels and unavailable agents
- **WHEN** several managed aliases coexist or the chosen stage has no live connected role target
- **THEN** the existing deterministic precedence produces one bottom-right plain stage chip without a separate robot or top chip
- **AND** the stage remains represented in the bounded coordinator label group even when unrelated labels precede it
- **AND** unavailable assigned Build or Review stays dimmed without a tooltip and cannot focus an agent or fall through to opening the PR

### Requirement: Optional build review history
Git SHALL read optional crew.round, crew.finding and crew.approved from matched terminal labels without inventing history or deriving stage from approval metadata. Visible stage names SHALL be Build, Review or Approved, with Build n+1 when completed review round n is supplied. Stage controls SHALL have no tooltip, including finding or round hover. Missing or invalid metadata SHALL add no invented round or finding.

#### Scenario: First return from review
- **WHEN** the Build terminal reports completed review round 1 and a finding
- **THEN** its plain chip reads `Build 2` without a finding tooltip
- **AND** later completed rounds advance the same chip's build number without adding another visible stage

#### Scenario: Older Crew has no review metadata
- **WHEN** terminal labels omit round, finding and approval metadata
- **THEN** the stage remains usable with canonical Build and no round or finding tooltip text
- **AND** absent findings are not replaced with invented text

#### Scenario: Approval metadata is not a fourth stage
- **WHEN** a terminal publishes crew.approved while GitHub labels still show Review or Build
- **THEN** the assigned managed label continues to determine the chip
- **AND** no CI-dependent chip or extra agent action is inferred from that SHA

### Requirement: Unavailable stage targets are inert
Build and Review chips SHALL be dimmed and non-clickable when their target has ended, is absent or is on a disconnected machine. Stage chips SHALL have no hover tooltip; accessible semantics SHALL identify known unavailability without inventing a target or verdict. Availability SHALL be rechecked before focus. Ended-target metadata SHALL grant no navigation authority and SHALL NOT be persisted as portable preferences.

#### Scenario: Ended build target
- **WHEN** the PR remains Build after its build terminal ends
- **THEN** its dimmed chip has accessible ended-build semantics, with the existing known CI state if available, and no tooltip
- **AND** the chip does not focus an agent or activate the row

#### Scenario: Ended reviewer
- **WHEN** the PR remains Review after its reviewer ends without a new verdict label
- **THEN** its dimmed chip has accessible reviewer-ended semantics and no tooltip
- **AND** no branch-matched worker is substituted as the reviewer

#### Scenario: Disconnected remote machine
- **WHEN** a known target belongs to a machine that is not connected
- **THEN** its chip is dimmed with accessible disconnected-machine semantics naming that machine, without a tooltip
- **AND** reconnecting with a valid live identity restores focus using its machine-qualified address

#### Scenario: No target observed
- **WHEN** no role-matched terminal is available and no prior terminal identity is known
- **THEN** the assigned managed stage is still shown dimmed with accessible unavailable-target semantics and no tooltip
- **AND** the app does not claim to know that an unobserved terminal ended

#### Scenario: Retained coordinator target loses live membership
- **WHEN** a previously verified coordinator target ends or its machine disconnects while its PR remains displayed, including historical-only rows
- **THEN** the same-home remembered identity supplies known ended or disconnected accessible semantics without requiring current live task membership for presentation
- **AND** stale membership and remembered identity authorize no focus or reads, and another home cannot borrow that identity

#### Scenario: Coordinator target reconnects before verification
- **WHEN** the target becomes live again but its coordinator membership is still unverified
- **THEN** the chip stays dimmed with accessible unavailable-target semantics and no tooltip
- **AND** only a fresh verified exact live task binding restores its focus action

### Requirement: Tight bottom-right plain stage projection
The one stage control SHALL use plain Build, Review or Approved text on the bottom-right checks line, stage-palette colour, subtle raised fill and 6px side padding, without robot emoji, outline or tooltip. Supplied completed round n SHALL show Build n+1. Titles SHALL occupy the entire row content width except an unrelated live fallback robot. Probes SHALL measure the same caption/style without navigation handlers.

#### Scenario: Full-width title and supplied round
- **WHEN** normal or narrow rows show any managed or initial-build stage, including supplied Build rounds
- **THEN** the title truncates only at the right content edge with no stage reservation
- **AND** exactly one bottom-right chip is visible, and changing the round invalidates its measured caption
- **AND** side padding is 6px, row height remains 74px and the metadata-line height and trailing anchor are unchanged

#### Scenario: Preserved role actions
- **WHEN** the visible stage is activated
- **THEN** fresh guarded Build/Review targets focus their role agent and Approved opens the PR
- **AND** unavailable targets remain dimmed/inert with accessible semantics, while probes and ghosts cannot navigate

## ADDED Requirements

### Requirement: Stage hover suppression includes parent label groups
Stage hover SHALL show no tooltip, including assigned aliases, round/finding details or agent-action text inherited from label-strip or metadata parents. Unrelated labels and metadata SHALL retain their existing informative tooltips, and PR titles SHALL retain full-title hover. This policy SHALL use existing fit facts without adding measurement work or reads.

#### Scenario: Hover any stage
- **WHEN** Build, Build 2, Build 3, Review, legacy Rework projected as Build or Approved is hovered in any row variant
- **THEN** the control has no stage tooltip, whether enabled, unavailable, ghost or clipped
- **AND** its existing click, keyboard and accessibility behavior remains available as appropriate

#### Scenario: Mixed label strip
- **WHEN** an unrelated label is clipped beside a managed stage
- **THEN** the existing label-group tooltip can expose the unrelated label's complete name
- **AND** stage aliases, agent names, findings and stage-only text are not reintroduced through that parent tooltip
