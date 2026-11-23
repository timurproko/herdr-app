# Spec Delta

## ADDED Requirements

### Requirement: Selected-tab coordinator repository visibility
The coordinator Git panel SHALL render a repository section only when the selected tab has an eligible PR row or a genuine repository-scoped read notice. Eligibility SHALL be evaluated before folding and on each tab change, retaining existing history limits, top-level totals and saved fold state. Enrollment SHALL use the full eligible repository inventory independently of selected-tab section visibility.

#### Scenario: Open and Closed contain different repositories
- **WHEN** one repository has only Open or Draft task PRs and another has only eligible Merged or Closed task PRs
- **THEN** Open shows only the first repository section and Closed shows only the second
- **AND** omitted sections leave no header or chevron, and switching tabs preserves both totals

#### Scenario: Genuine selected-tab notice without rows
- **WHEN** a repository has no eligible rows in the selected tab but has an applicable PR-read notice
- **THEN** its section remains available with that notice under the existing folding behavior
- **AND** a failure scoped only to the other tab does not keep an otherwise empty section visible

#### Scenario: History ages out
- **WHEN** a historical-only Merged or Closed PR is outside the existing 24-hour history limit or lacks a valid completion date
- **THEN** that PR and its expired row-specific failure do not keep a repository section visible
- **AND** other eligible rows or genuine applicable notices can still keep that section visible

#### Scenario: Folded repository disappears and returns
- **WHEN** a repository is folded, becomes ineligible in the selected tab and later reappears through a tab switch or updated PR facts
- **THEN** its saved folded state is restored
- **AND** folding an eligible section alone does not produce an empty state or change counts

#### Scenario: Empty settled tab
- **WHEN** no repository has an eligible row or applicable read notice in a settled verified tab
- **THEN** the panel uses ordinary Git's same empty-state presentation and wording, namely `No open pull requests` or `No closed pull requests`
- **AND** no empty repository header remains, while pending loading and unverified waiting states retain their existing feedback

#### Scenario: Hidden section remains an enrollment choice
- **WHEN** a confirmed unenrolled repository has eligible PRs only in the other tab
- **THEN** the single pinned enrollment footer still includes that repository in canonical inventory order
- **AND** hiding its section does not enroll it, remove its fold state, or initiate or cancel GitHub reads

## MODIFIED Requirements

### Requirement: Shared account-style choice presentation
Enrollment and status-bar accounts SHALL share the muted 12px chevron, text-relative gap, upward popup anchor, menu shift and menu surface, bounds, rows and highlights. Accounts SHALL retain their existing pill geometry. The enrollment card SHALL match ordinary Git's height, padding, icon size, gaps and single-line vertical centres, adding only a trailing chevron without extra trigger height or padding. Account operations SHALL remain independent.

#### Scenario: Actual caller presentation parity
- **WHEN** both callers render their interactive triggers and choice menus
- **THEN** their shared choice presentation uses the same chevron glyph, 12px size, inherited muted colour and 6px text-to-chevron gap
- **AND** both use an upward popup with matching 180px minimum width, 360px maximum width, 280px maximum height, row height, insets, hover/highlight and selected-slot geometry
- **AND** the enrollment trigger is on the card's text side without replacing the existing info icon or message

#### Scenario: Compact enrollment card matches ordinary Git
- **WHEN** the ordinary repository enrollment notice and coordinator enrollment footer render with the same theme, zoom and sufficient width
- **THEN** their card height, horizontal and vertical padding, icon size and icon-to-message gap match
- **AND** the coordinator icon, text, Settings link and trailing chevron have one common vertical centre without a taller wrapper
- **AND** ordinary Git's card and the status-bar account control retain their existing appearance

#### Scenario: Native opener and dismissal
- **WHEN** the user presses the enrollment trigger with the left mouse button or dismisses its open menu
- **THEN** the opener press reaches native popup handling rather than being stopped by the trigger
- **AND** Escape and a backdrop click close the menu without opening Settings or changing enrollment
