## ADDED Requirements

### Requirement: Agents group chevrons match Spaces
Agents group-header chevrons SHALL use the same small square hover and focus treatment as Spaces disclosure controls. Existing header folding, group order, counts, status indicators and row geometry SHALL remain. Hovering a chevron SHALL NOT activate or select an agent.

#### Scenario: Chevron hover and activation
- **WHEN** an expanded or folded Agents group chevron is hovered at 100% or 130% zoom
- **THEN** the chevron has Spaces' 24px square control treatment rather than only a whole-header highlight
- **AND** activating it toggles that group exactly once without selecting an agent or changing its membership, count or ordering

#### Scenario: Existing header and compact behavior
- **WHEN** the user activates the rest of a group header or switches Agents into its compact rail
- **THEN** ordinary header folding remains available and the compact rail gains no group-header controls
- **AND** numeric/status rails, child-agent folding, sidebar gutters and row heights retain their existing geometry

### Requirement: Independently visible Spaces Crew labels
Spaces' Show icons menu SHALL include a Crew label toggle only while Crew is enabled, using the existing checked menu-row treatment and defaulting on. Its saved choice SHALL affect only Crew labels in Spaces, not terminal-pane badges, unrelated tags, fleet attachment, counts, disclosure, selection or Crew operations.

#### Scenario: Default and toggled label
- **WHEN** Crew is enabled and no visibility preference exists
- **THEN** Show icons contains a checked Crew label entry after Machine status and Worktree icon, and eligible space rows show their existing lowercase crew label
- **AND** clicking the entry hides or restores only those labels in the next render, updates its check and keeps the menu open like the existing entries

#### Scenario: Hidden labels retain workspace behavior
- **WHEN** Crew labels are hidden on attached or independent local or remote space rows
- **THEN** numbered badges, child connectors, counts, parent chevrons, selection, worktree metadata and unrelated plugin tags retain their existing behavior
- **AND** terminal-pane Crew badges and all verification, grouping and task behavior remain unchanged

#### Scenario: Disable and restore
- **WHEN** Crew is disabled and later enabled again
- **THEN** its Show icons entry is absent while disabled and returns with the prior saved visibility choice when enabled
- **AND** disabling does not erase that choice or alter Machine status and Worktree icon choices
