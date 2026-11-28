## MODIFIED Requirements

### Requirement: Shared sidebar trailing grid
Spaces and Agents SHALL share trailing label and disclosure/status rails without changing native row semantics. Spaces SHALL show lowercase `crew` in plain Agents machine-label style with its tooltip: before count/disclosure with children, at the machine-chevron column without empty rails otherwise. Counts, machine plus and rename approve SHALL share an inner axis; chevrons and rename cancel an outer axis. Terminal Crew SHALL remain unchanged.

#### Scenario: Expanded and collapsed coordinator metadata
- **WHEN** a coordinator with connected children is shown expanded or collapsed in a local or remote group
- **THEN** its role text reads `crew` on the same label rail and the child count stays visible on the same inner column before the chevron
- **AND** machine-header plus, connected child count and space-rename approve are centred on the same inner axis, while all Spaces chevrons and rename cancel share the outer axis
- **AND** labels are regular 12px dim text without fill, border or pill padding; unrelated tags retain their existing styling and metadata order
- **AND** previous Spaces references to Crew pills describe the Crew role label, whose presentation remains this plain-label contract with lowercase visible text

#### Scenario: Long names and zoom
- **WHEN** long space or machine names are shown at default or narrow expanded-sidebar widths at 100% or 130% zoom with one or several connected children
- **THEN** names truncate without moving the fixed trailing columns, overlapping labels/counts or displacing connectors and numbered badges
- **AND** row height, selection, hover, compact rail, native shortcuts and captured whole-block reorder remain unchanged

#### Scenario: Missing role or children
- **WHEN** a space has no Crew role label or no connected children
- **THEN** no role label or child count is fabricated and ordinary tag, worktree, hover, selection and truncation behavior remains unchanged
- **AND** Agents retains its existing numeric rail and collapsed-count behavior

#### Scenario: Crew label without child controls
- **WHEN** a space row has a crew label but no child spaces, or combined view is off
- **THEN** the label sits at the right with its text right edge on the machine-header chevron column at both 100% and 130% zoom
- **AND** absent count and disclosure reserve no empty rails; when real child controls exist, Crew stays immediately before them in its existing inner column

#### Scenario: Sidebar-only casing
- **WHEN** the same coordinator is represented in Spaces and a terminal-pane header
- **THEN** its Spaces role text is `crew` while the terminal-pane badge remains `Crew`
- **AND** the sidebar casing does not rename plugin identity, alter role authority, change unrelated labels or rewrite shared tag contributions

## ADDED Requirements

### Requirement: Agents group chevrons match Spaces
Agents group-header chevrons SHALL use the same small square hover and focus treatment as Spaces disclosure controls. Existing header folding, counts, status indicators and row geometry SHALL remain. Hovering a chevron SHALL NOT activate or select an agent.

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
