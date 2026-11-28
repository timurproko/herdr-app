# Spec Delta

## MODIFIED Requirements

### Requirement: Collapsible coordinator repository sections
Nonempty coordinator sections SHALL inherit the initially expanded global default with locally persisted exceptions. Headers SHALL show canonical repository, selected-tab eligible task PR count and chevron, using existing section styling and Agents number styling and number-to-chevron spacing. Names SHALL truncate only on overflow, with a full-name tooltip then. Folding SHALL preserve totals without reads. Notice-only sections SHALL have no header.

#### Scenario: First display
- **WHEN** a repository has selected-tab PRs, no saved individual exception and appears in the coordinator overview
- **THEN** its section follows the saved global disclosure default, or starts expanded when no global choice exists, with the corresponding section chevron
- **AND** its header shows canonical repository name and selected-tab count immediately before the chevron, with the same number style and number-to-chevron gap as an Agents group header

#### Scenario: Collapse and expand one repository
- **WHEN** the user clicks a nonempty repository header or its chevron
- **THEN** only that repository section toggles, using the existing section interaction and visual style
- **AND** its name, count and chevron remain visible while body rows and scoped errors or repository-specific diagnostics are hidden when folded
- **AND** reopening restores current rows and scoped body notices without changing the Open/Closed tab or selecting a PR
- **AND** the single enrollment footer remains visible independently of section folding

#### Scenario: Fold state survives panel changes
- **WHEN** a repository is collapsed and the user changes Open/Closed tabs, refreshes, changes coordinator selection, or closes and reopens the panel without a later bulk toggle
- **THEN** it retains its local folded state independently of other repositories
- **AND** panel recreation restores saved state through the same local persistence mechanism as Spaces machine folding
- **AND** this UI state is not exported as a portable preference or written to Crew records

#### Scenario: Counts update while collapsed
- **WHEN** the normal aggregate lifecycle updates PR facts or task links for a folded repository
- **THEN** its header count includes every deduplicated eligible task PR for the selected tab, including unrevealed rows, and the global totals still include folded repositories
- **AND** switching Open/Closed updates the repository count without using repository-wide inventory, removing the header if no selected-tab PRs remain
- **AND** folding performs no extra GitHub read, stops no existing webhook update, and does not create an empty-list message solely because all sections are folded

#### Scenario: Long repository name
- **WHEN** a canonical repository name is rendered in a wide or narrow panel
- **THEN** it uses all width not reserved for the count, chevron and existing header insets
- **AND** fitting names have no repeat-only tooltip, while overflowing names truncate with the full canonical name on hover
- **AND** count and chevron geometry remains stable for one-, two- and three-digit values

#### Scenario: Incomplete repository count
- **WHEN** a visible repository has authoritative selected-tab rows plus unresolved admitted identities
- **THEN** its number is the known eligible selected-tab row count, with existing loading hover and accessibility feedback identifying incomplete knowledge rather than an asserted complete total
- **AND** unread identities invent no PR state or count, while complete visible counts have no repeat-only count tooltip
- **AND** a repository with only an applicable initial failure notice has no header or count

## ADDED Requirements

### Requirement: Global Git repository disclosure control
Ordinary and coordinator Git SHALL show exactly one icon-only bulk disclosure button at the right end of the Open/Closed strip using existing button styling. The icon SHALL reflect the chosen global expanded or collapsed default and its accessible action SHALL name the opposite choice. Activation SHALL invert that default and reset all individual exceptions, including hidden repositories. No other controls, messages or options SHALL be added.

#### Scenario: Collapse globally and visit another agent
- **WHEN** the default is expanded and the person activates Collapse all repository sections, then selects another agent or space
- **THEN** every repository section without a subsequent individual exception is collapsed, including a previously unseen repository
- **AND** the icon reflects the collapsed default and offers Expand all repository sections
- **AND** the selected agent's pinned PR remains visible above its collapsed section, and a lone pin still has no empty header

#### Scenario: Expand globally across both views and tabs
- **WHEN** the default is collapsed and the person activates Expand all repository sections
- **THEN** every eligible section uses expanded disclosure in ordinary and coordinator Git and both Open/Closed tabs
- **AND** sections encountered later follow the expanded default, subject to existing reveal limits and pagination rather than automatic mounting or fetching of every PR

#### Scenario: Individual exception and next bulk action
- **WHEN** the global default is collapsed and the person opens one repository by its chevron
- **THEN** only that canonical repository opens, and the global icon remains collapsed with Expand all as its next action
- **AND** other repositories remain collapsed; returning to that repository restores the exception in either Git view
- **AND** the next bulk action expands all and clears every individual exception, including exceptions outside the current view
- **AND** the symmetric behavior applies to closing one repository under the expanded default

#### Scenario: Disclosure changes presentation only
- **WHEN** a bulk or individual fold changes
- **THEN** it changes no PR facts, counts, selected tab, repository order or agent selection and starts no Git, GitHub, filesystem or Crew request
- **AND** existing pending-read and safety-selection guards still reject obsolete work, without cancelling unrelated reads
- **AND** cold Loading, headerless actionable failures, enrollment, remaining-row counts and pin behavior retain their existing policies

### Requirement: Durable client-local Git disclosure choice
The global disclosure default and canonical repository exceptions SHALL survive panel recreation, agent/space changes, Git disable/re-enable and app restart on the same client. Without saved new-format state, existing saved folded repositories SHALL become collapsed exceptions to an expanded default. The first bulk action SHALL replace that legacy choice. This presentation state SHALL NOT be exported as portable preferences or written to native/Core or Crew documents.

#### Scenario: Upgrade preserves individual folds
- **WHEN** the client has a valid legacy saved folded-repository set and no new-format disclosure state
- **THEN** those repositories stay collapsed and other repositories default expanded until an individual or bulk action changes them
- **AND** after the first bulk action, a restart cannot reintroduce the legacy folds over the new global default

#### Scenario: Restart and disabled panel
- **WHEN** the person chooses a global default, creates one individual exception, then restarts the app or disables and re-enables Git
- **THEN** the saved default, icon and individual exception are restored before eligible repository sections paint
- **AND** restoring disclosure grants no PR-cache, worker-navigation or read authority and causes no new hidden-panel work

#### Scenario: Missing or invalid saved data
- **WHEN** saved disclosure data is missing, malformed or of an unsupported version
- **THEN** Git remains renderable using expanded disclosure and valid legacy folds when available, without a new message or overwriting unsupported-version data merely by rendering
