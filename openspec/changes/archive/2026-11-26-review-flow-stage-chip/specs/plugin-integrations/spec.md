# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Git trailing alignment with Spaces
Git PR rows and coordinator repository headers SHALL match the actual Spaces Crew pill inset inside its own row highlight: 3 logical pixels. Title-line stage or robot reservations SHALL share a stable trailing edge with label pills and the 24px header chevron reservation. Robot glyphs and hit targets SHALL retain their sizes. All row variants SHALL preserve absent-control title reservations, captured actions and vertical geometry.

#### Scenario: Complete panel alignment
- **WHEN** ordinary or coordinator Git panels render at 280, 320, 360, 390 or 480 logical pixels and 75%, 100%, 125%, 130%, 150% or 200% zoom
- **THEN** stage/robot reservation, repository-header chevron slot and actual trailing label pill right edges are inset from their own row highlight edge by the same amount as the actual Spaces Crew pill from its own row highlight edge
- **AND** complete-panel border, list padding and Spaces negative trailing pill margin are included in the comparison, yielding a 3px logical row-relative inset
- **AND** Git and Spaces highlights have equal 8px left and right panel/sidebar gutters, yielding equal 11px control-to-panel/sidebar insets
- **AND** Git row highlights match Spaces' 6px corner radius and their leading content starts 8px inside the highlight, matching Spaces' highlight-to-badge inset

#### Scenario: Different glyph sizes
- **WHEN** a 16px robot glyph and a 14px repository-header chevron are shown
- **THEN** each remains centred within its 24px control at the shared trailing edge
- **AND** their literal SVG right edges may differ by 1px without shifting control or pill edges

#### Scenario: Missing agent, folded header and motion preview
- **WHEN** an agent is absent, a repository header folds or a PR is pinned, scrolled or shown as a motion-preview row
- **THEN** the shared trailing edge and existing row/header heights and line positions are preserved
- **AND** the absent control reservation remains inert, live robot hit targets remain 24px square, ghost controls remain noninteractive and existing captured actions remain guarded
- **AND** hover, selected/pinned and ghost highlights retain equal Spaces-derived left and right gutters and corner radius

#### Scenario: Text chips replace the robot
- **WHEN** otherwise identical rows show Build, Review, Approved, a robot or no control
- **THEN** they reserve the same bounded title-line space sufficient for the stage words, with no overlapping title or additional line
- **AND** all retain the existing 74px height, three fixed line boxes and label right anchor
