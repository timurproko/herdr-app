# Spec Delta

## MODIFIED Requirements

### Requirement: Collapsible coordinator repository sections
Each consolidated coordinator repository section SHALL use the Spaces machine-header control and style, default expanded, with independent locally persisted fold state. Expanded and collapsed headers SHALL show only the canonical repository name and chevron, without Open/Closed counts. The name SHALL use the available width, truncating only on overflow with a full-name tooltip then. Top-level Open/Closed totals SHALL remain unchanged.

#### Scenario: First display
- **WHEN** a repository has no saved folded state and appears in the coordinator overview
- **THEN** its section is expanded with a machine-style header and expanded chevron
- **AND** its header shows the canonical repository name and chevron without repository counts, allowing the name to use the width freed by their removal

#### Scenario: Collapse and expand one repository
- **WHEN** the user clicks a repository header or its chevron
- **THEN** only that repository section toggles, using the same interaction and visual style as a Spaces machine header
- **AND** its name and chevron remain visible while its body rows and scoped errors or repository-specific diagnostics are hidden when folded
- **AND** reopening restores its current rows and scoped body notices without changing the Open/Closed tab or selecting a PR
- **AND** the single enrollment footer remains visible independently of section folding

#### Scenario: Fold state survives panel changes
- **WHEN** a repository is collapsed and the user changes Open/Closed tabs, refreshes, changes coordinator selection, or closes and reopens the panel
- **THEN** the repository retains its local folded state independently of other repositories
- **AND** panel recreation restores saved state through the same local persistence mechanism as Spaces machine folding
- **AND** that UI state is not exported as a portable preference or written to Crew records

#### Scenario: Counts update while collapsed
- **WHEN** the normal aggregate lifecycle updates PR facts or task links for a folded repository
- **THEN** global Open/Closed counts still include eligible task PRs in collapsed sections and update without expanding the section
- **AND** no per-repository counts appear in expanded or collapsed headers
- **AND** folding itself performs no extra GitHub read, stops no existing webhook update, and does not create an empty-list message solely because all sections are folded

#### Scenario: Long repository name
- **WHEN** a canonical repository name is rendered in a wide or narrow panel
- **THEN** the name uses all header width not reserved for the chevron and existing header insets
- **AND** a fitting name stays complete without a tooltip, while a genuinely overflowing name truncates with its full canonical name available on hover

## ADDED Requirements

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
The enrollment picker and status-bar account control SHALL share identical pure choice-menu presentation, with the same muted 12px chevron glyph, text-relative gap and placement, pill trigger, upward menu anchor and menu shift. Menu surface, width/height bounds, row geometry, padding, hover, keyboard highlight and selected-slot treatment SHALL match the existing account control. Account loading, authentication and switching SHALL remain independent.

#### Scenario: Actual caller presentation parity
- **WHEN** both callers render their interactive triggers and choice menus
- **THEN** their actual shared component output has the same chevron glyph, 12px size, inherited muted colour and 6px text-to-chevron gap
- **AND** both use an upward popup with matching 180px minimum width, 360px maximum width, 280px maximum height, row height, insets, hover/highlight and selected-slot geometry
- **AND** the enrollment trigger is on the card's text side without replacing the existing info icon or message

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
