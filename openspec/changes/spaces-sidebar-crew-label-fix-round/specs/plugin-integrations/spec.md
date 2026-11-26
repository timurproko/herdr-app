## ADDED Requirements

### Requirement: Complete-task root retry authorization
Abandoned-root recovery SHALL remain bounded across the entire root and branch-resolution task, including internal repository resets. A successful rev-parse alone SHALL NOT renew the budget. Repeated abandonment SHALL require separate one-shot manual root authorization; retained or expired GitHub rate credit SHALL NOT authorize root retries.

#### Scenario: Branch stage is abandoned repeatedly
- **WHEN** rev-parse succeeds but symbolic-ref is abandoned twice
- **THEN** automatic recovery stops with the truthful manual-retry error
- **AND** later lifecycle/render ticks cannot dispatch more root reads until explicit authorization

#### Scenario: Manual root attempt is abandoned
- **WHEN** the person requests Refresh after automatic recovery is exhausted
- **THEN** one root attempt consumes that authorization
- **AND** abandoning it cannot reuse either the authorization or any retained rate-bypass object

### Requirement: Tab-scoped actionable page failures
Open and Closed SHALL retain their own actionable page errors. A failure in one tab SHALL NOT suppress the unread sibling's first page. Existing request, freshness, rate and obsolete-lease guards SHALL remain intact.

#### Scenario: Unread sibling after HTTP refusal
- **WHEN** one tab receives HTTP 503 and the person selects its never-loaded sibling
- **THEN** the sibling remains due and can fetch normally without manual Refresh
- **AND** returning to the failed tab restores its own error rather than inventing a successful load

### Requirement: Tight bottom-right plain stage projection
The one managed stage control SHALL use plain Build, Review or Approved text on the bottom-right checks line, stage-palette colour, subtle raised fill and tight 2px side padding, without robot emoji or outline. Supplied completed round n SHALL show Build n+1; supplied findings SHALL remain informative hover. Titles SHALL occupy the entire row content width except a live unlabelled-agent fallback robot. Probes SHALL measure the same caption/style without navigation handlers.

#### Scenario: Full-width title and supplied round
- **WHEN** normal or narrow rows show any managed stage, including supplied Build rounds
- **THEN** the title truncates only at the right content edge with no stage reservation
- **AND** exactly one tight bottom-right chip is visible, and changing the round invalidates its measured caption

#### Scenario: Preserved role actions
- **WHEN** the visible stage is activated
- **THEN** fresh guarded Build/Review targets focus their role agent and Approved opens the PR
- **AND** unavailable targets remain dimmed/inert with explanation, while probes and ghosts cannot navigate

### Requirement: Selected-agent pin and remaining-section projection
The resolved currently selected agent PR SHALL own the pin independently of clickPin state. Direct tab/sidebar/keyboard selection SHALL pin without animation; existing row-control clicks alone SHALL retain move-to-top motion. The pin SHALL appear above its section and remain visible when collapsed. A header SHALL count only unpinned rows beneath it and SHALL disappear for a lone pin; tab totals SHALL remain full.

#### Scenario: Selection follows the agent
- **WHEN** tab, sidebar or keyboard selection switches between agents or to a resolved no-PR terminal
- **THEN** the pin follows the resolved PR or clears without entry motion or stale click ownership

#### Scenario: Collapsed, lone and unpinned sections
- **WHEN** one of four PRs is pinned
- **THEN** its header shows 3 and its tab total remains 4; collapse hides only the three remaining rows
- **AND** unpinning restores header count 4, while a section consisting only of the pin has no empty header
