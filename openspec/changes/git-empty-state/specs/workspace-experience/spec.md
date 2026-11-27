# Spec Delta

## ADDED Requirements

### Requirement: Quiet missing keyboard navigation targets
Missing keyboard-navigation targets SHALL be silent no-ops, without a toast, error entry or other visible feedback. Ctrl+number for an absent tab and Alt+number for an absent space SHALL obey this rule explicitly. Real command failures unrelated to target absence SHALL retain existing error feedback.

#### Scenario: Missing numbered tab
- **WHEN** Ctrl+number selects a tab index that does not exist, including repeated presses
- **THEN** selection remains unchanged and no toast or error entry is produced

#### Scenario: Missing numbered space
- **WHEN** Alt+number selects a space index that does not exist, including repeated presses
- **THEN** selection remains unchanged and no toast or error entry is produced

## MODIFIED Requirements

### Requirement: Shared sidebar trailing grid
Spaces and Agents SHALL share trailing label and disclosure/status rails, with existing native row semantics. Spaces' coordinator role label SHALL read lowercase `crew`, retaining plain Agents machine-label styling and its tooltip without moving on disclosure. Spaces child counts, machine plus and rename approve SHALL share one centred inner axis; chevrons and rename cancel SHALL share one centred outer axis. The terminal-pane Crew badge SHALL remain unchanged.

#### Scenario: Expanded and collapsed coordinator metadata
- **WHEN** a coordinator is shown expanded or collapsed in a local or remote group
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

#### Scenario: Sidebar-only casing
- **WHEN** the same coordinator is represented in Spaces and a terminal-pane header
- **THEN** its Spaces role text is `crew` while the terminal-pane badge remains `Crew`
- **AND** the sidebar casing does not rename plugin identity, alter role authority, change unrelated labels or rewrite shared tag contributions
