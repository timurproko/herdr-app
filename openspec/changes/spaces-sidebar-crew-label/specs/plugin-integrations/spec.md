## MODIFIED Requirements

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
