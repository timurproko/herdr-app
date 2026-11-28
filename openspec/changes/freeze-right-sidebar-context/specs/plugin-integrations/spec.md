# Spec Delta

## ADDED Requirements

### Requirement: Sidebar source selection respects the header pin
Files and Git source-selection requirements SHALL use the sidebar's held source while its header pin is pressed, and the current native selection otherwise. This scope SHALL cover directory, machine, agent association and ordinary or coordinator Git mode. Navigation SHALL NOT replace held content; existing refresh, plugin lifecycle, identity and action-safety checks SHALL remain authoritative.

#### Scenario: Different repositories and machines
- **WHEN** a sidebar held for A remains shown while the person selects B with another directory, repository or machine
- **THEN** Files retains A's directory and machine, and Git retains A's repository and agent association or coordinator scope
- **AND** selection alone does not reset the held list, pagination, folds or scroll or initiate source reads for B

#### Scenario: Coordinator source remains selected for the panel
- **WHEN** a verified coordinator's Git overview is held and a worker or unrelated space is selected
- **THEN** the sidebar stays in that coordinator's task-repository mode rather than switching to the selected space's folder mode
- **AND** current same-home verification still gates inventory reads and worker actions; the pin grants no fresh authority

#### Scenario: Plugin availability masks the view
- **WHEN** a held view is disabled or both sidebar plugins are disabled
- **THEN** existing enabled-view fallback or sidebar hiding applies without erasing the held source or preferred view
- **AND** re-enabling restores the held choice unless the person explicitly chose another enabled view

#### Scenario: Refresh and late replies
- **WHEN** manual or existing automatic refresh runs while pinned, or a reply arrives after unpinning or recapturing a different source
- **THEN** refresh updates only the held source under existing lifecycle rules, and obsolete replies cannot populate a newer effective context
- **AND** hidden or disabled plugins start no new work and the pin persists no file tree, PR inventory, callbacks or credentials

## MODIFIED Requirements

### Requirement: Space entry preserves order without pin motion
The effective sidebar agent's resolved PR SHALL pin above its section for every selection path, without direct-entry motion. A pressed header pin SHALL hold that agent context across native selection changes. Only panel stage/robot activation SHALL animate under existing guards when following selection. Collapse SHALL retain the PR pin; headers SHALL count only remaining rows and disappear for lone pins, while tab totals stay full. Remaining rows and coordinator returns SHALL retain relative order.

#### Scenario: Direct agent-space entry
- **WHEN** the unheld sidebar follows direct entry to an agent space and its PR or branch matches a row in the cached section
- **THEN** the selected PR pins first, followed by a section header only if other rows remain; that header counts only those remaining rows
- **AND** entry starts no pin animation, including for a selected Draft PR

#### Scenario: Return to coordinator
- **WHEN** the unheld sidebar follows a return from a worker space to the coordinator
- **THEN** the coordinator's cached sections and ordering are restored directly with existing header refresh activity
- **AND** no permanent coordinator PR pin or entry-driven pin motion appears

#### Scenario: Existing chip and robot navigation
- **WHEN** the user clicks another agent PR's live stage label or fallback robot inside the unheld panel
- **THEN** existing click-origin navigation and move-to-top animation retain confirmation and cancellation rules and settle above the destination repository header
- **AND** native selection acknowledgement neither starts a second animation nor cancels the first because cached entry ran
- **AND** existing role-aware Approved navigation and unavailable-target refusals remain unchanged

#### Scenario: Empty or unverified coordinator seed
- **WHEN** the destination worker has no seed, a zero-count empty seed or an unverified coordinator source
- **THEN** it independently resolves its repository and requests its own selected page rather than treating seed counts as complete data
- **AND** successful reads clear Loading and the selected matching Draft PR pins above its section, without an empty header if it is alone

#### Scenario: Collapsed section and remaining counts
- **WHEN** one of four repository PRs is selected and its section is expanded or collapsed
- **THEN** the PR pin stays visible above the header, its header count is 3 and the tab total is 4
- **AND** releasing that PR selection restores header count 4, while a lone PR pin has no empty section header

#### Scenario: Agent selection changes without a chip click
- **WHEN** tab, sidebar or keyboard selection changes between two agents or to a terminal with no PR while the header pin is unpressed
- **THEN** the PR pin follows the resolved selected-agent PR or clears for a resolved no-PR target, without entry animation or clickPin authority

#### Scenario: Header pin takes precedence over navigation
- **WHEN** the header pin holds agent A and native selection changes to B
- **THEN** A's effective PR association remains above the section without navigation-driven pin motion, removal or replacement by B
- **AND** unpinning the header resolves B under the ordinary coherent-entry rules

### Requirement: Selected-agent pin and remaining-section projection
The resolved effective sidebar agent PR SHALL own the PR pin independently of clickPin state. The effective agent SHALL remain the captured source while the header pin is pressed. Unheld direct tab/sidebar/keyboard selection SHALL pin without animation; existing row-control clicks alone SHALL retain move-to-top motion. The PR pin SHALL appear above its section and remain visible when collapsed. A header SHALL count only unpinned rows beneath it and SHALL disappear for a lone PR pin; tab totals SHALL remain full.

#### Scenario: Selection follows the agent
- **WHEN** tab, sidebar or keyboard selection switches between agents or to a resolved no-PR terminal while the header pin is unpressed
- **THEN** the PR pin follows the resolved PR or clears without entry motion or stale click ownership

#### Scenario: Collapsed, lone and unpinned sections
- **WHEN** one of four PRs is pinned above its section
- **THEN** its header shows 3 and its tab total remains 4; collapse hides only the three remaining rows
- **AND** releasing the PR selection restores header count 4, while a section consisting only of the PR pin has no empty header

#### Scenario: Held agent remains the association source
- **WHEN** the header pin is pressed and another agent or space is selected
- **THEN** the panel's PR pin is still resolved against the held agent, not current focus
- **AND** the header pin is independent of the PR row's selected presentation

### Requirement: Agent navigation shares pin motion
Build and Review chips and fallback robots SHALL share one navigation-first pin-motion controller in ordinary and coordinator views, with or without an existing PR pin, when the sidebar follows selection. The clicked row SHALL rise after destination selection resolves using native 320ms motion and guarded settlement. A held header pin SHALL permit guarded navigation but SHALL NOT retarget or animate its content into the destination. Handoff SHALL grant no read or action authority.

#### Scenario: Ordinary click with an existing pin
- **WHEN** a live Build or Review chip or fallback robot links another agent PR and the user clicks it from an unheld list with a selected PR
- **THEN** focus changes immediately and the existing row slots are retained while the destination resolves
- **AND** the clicked row moves to the pinned position, the former PR pin returns to the list and affected rows move without a final jump

#### Scenario: Ordinary click before any pin exists
- **WHEN** the user clicks a live Build or Review chip or fallback robot from an initially unpinned ordinary list with the header pin unpressed
- **THEN** the same controller moves that row to the pinned position with no former-pin return
- **AND** timing, overlay, affected-row motion, cancellation and settlement remain the same as for a list with a selected PR

#### Scenario: Coordinator click into another agent space
- **WHEN** the user clicks a live Build or Review chip or fallback robot in an unheld verified coordinator list
- **THEN** focus changes immediately to that exact agent and a bounded inert source presentation retains the clicked row's measured origin
- **AND** the same controller moves that row to the destination's ordinary pinned position after selection resolves, without a permanent active PR pin in the coordinator list
- **AND** the destination independently reads its repository inventory and totals rather than treating the coordinator subset as complete

#### Scenario: Reviewer on its base branch
- **WHEN** a clicked reviewer has a matching full crew.pr but remains on the base branch without a PR footer in an unheld panel
- **THEN** that current label resolves the destination PR pin for the animation without a fabricated head-branch match or transcript read

#### Scenario: Cancelled or ghost navigation
- **WHEN** a destination cannot resolve within three seconds, context or Open/Closed changes, scrolling cancels the motion, or a different target is selected
- **THEN** the existing controller cancels retention without replaying focus or committing a false settled PR pin
- **AND** moving ghost rows and retained coordinator presentation never become navigation or worker authority

#### Scenario: Navigation from a held panel
- **WHEN** the user activates a currently valid stage or robot target while the header pin is pressed
- **THEN** native navigation still targets that exact live agent, but the sidebar remains on its held source and view
- **AND** no destination pin-swap animation, optimistic source change or automatic unpin occurs
