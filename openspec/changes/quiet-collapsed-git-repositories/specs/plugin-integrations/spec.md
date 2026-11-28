# Spec Delta

## MODIFIED Requirements

### Requirement: Collapsible coordinator repository sections
Nonempty coordinator sections SHALL inherit the initially expanded global default with locally persisted exceptions. Headers SHALL show canonical repository, last-known selected-tab eligible task PR count and chevron, using existing section styling and Agents number styling and number-to-chevron spacing. Names SHALL truncate only on overflow, with a full-name tooltip then. Folding SHALL quiet repository PR reads and retain last-known counts until expansion. Notice-only sections SHALL have no header.

#### Scenario: First display
- **WHEN** a repository has known selected-tab PRs, no saved individual exception and appears in the coordinator overview
- **THEN** its section follows the saved global disclosure default, or starts expanded when no global choice exists, with the corresponding section chevron
- **AND** its header shows canonical repository name and last-known selected-tab count immediately before the chevron, with the same number style and number-to-chevron gap as an Agents group header

#### Scenario: Collapse and expand one repository
- **WHEN** the user clicks a nonempty repository header or its chevron
- **THEN** only that repository section toggles, using the existing section interaction and visual style
- **AND** its name, last-known count and chevron remain visible while body rows and scoped errors or repository-specific diagnostics are hidden when folded
- **AND** reopening immediately requests its normal eligible refresh and restores retained rows and scoped notices without changing the Open/Closed tab or selecting a PR
- **AND** the single enrollment footer remains visible independently of section folding

#### Scenario: Fold state survives panel changes
- **WHEN** a repository is collapsed and the user changes Open/Closed tabs, refreshes, changes coordinator selection, or closes and reopens the panel without a later bulk toggle
- **THEN** it retains its local folded state independently of other repositories and starts no repository PR refresh while folded
- **AND** panel recreation restores saved state before PR-read admission through the same local persistence mechanism as Spaces machine folding
- **AND** this UI state is not exported as a portable preference or written to Crew records

#### Scenario: Counts update while collapsed
- **WHEN** events, task-link updates, manual Refresh or local lifecycle work concern a folded repository
- **THEN** its header retains its last-known count for the selected tab, without new PR reads or count-only reads
- **AND** switching Open/Closed uses that tab's last-known count and eligibility without reading the folded repository or asserting unknown totals as complete
- **AND** expanding refreshes eligible PR facts and reconciles counts under the ordinary history and membership rules
- **AND** folding does not create an empty-list message solely because all known sections are folded

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

### Requirement: Global Git repository disclosure control
Ordinary and coordinator Git SHALL show exactly one icon-only bulk disclosure button at the right end of the Open/Closed strip using existing button styling. The icon SHALL reflect the chosen global expanded or collapsed default and its accessible action SHALL name the opposite choice. Activation SHALL invert that default and reset all individual exceptions, including hidden repositories. No other controls, messages or options SHALL be added.

#### Scenario: Collapse globally and visit another agent
- **WHEN** the default is expanded and the person activates Collapse all repository sections, then selects another agent or space
- **THEN** every repository section without a subsequent individual exception is collapsed, including a previously unseen repository
- **AND** the icon reflects the collapsed default and offers Expand all repository sections
- **AND** the selected agent's pinned PR remains visible and live above its collapsed section, and a lone pin still has no empty header
- **AND** collapsed repositories start no panel list or sibling PR refreshes

#### Scenario: Expand globally across both views and tabs
- **WHEN** the default is collapsed and the person activates Expand all repository sections
- **THEN** every eligible section uses expanded disclosure in ordinary and coordinator Git and both Open/Closed tabs
- **AND** newly expanded repositories in the shown context immediately resume normal eligible refresh, subject to existing request, machine, authority and cooldown guards
- **AND** sections encountered later follow the expanded default, subject to existing reveal limits and pagination rather than automatic mounting or fetching of every PR or hidden context

#### Scenario: Individual exception and next bulk action
- **WHEN** the global default is collapsed and the person opens one repository by its chevron
- **THEN** only that canonical repository opens and immediately resumes normal eligible refresh, and the global icon remains collapsed with Expand all as its next action
- **AND** other repositories remain collapsed and quiet; returning to that repository restores the exception in either Git view
- **AND** the next bulk action expands all and clears every individual exception, including exceptions outside the current view
- **AND** the symmetric behavior applies to closing one repository under the expanded default

#### Scenario: Disclosure changes presentation only
- **WHEN** a bulk or individual fold changes
- **THEN** collapsing stops new group PR work and expanding admits normal refresh without changing the selected tab, repository order, agent selection, icon positions or alignment
- **AND** existing pending-read and safety-selection guards reject obsolete work, including collapse followed by expansion before a response returns, without cancelling unrelated reads
- **AND** cold Loading represents admitted work only; headerless actionable failures, enrollment, remaining-row counts and pin behavior otherwise retain their existing policies

## ADDED Requirements

### Requirement: Collapsed Git repositories admit no group refresh
Ordinary and coordinator Git SHALL use canonical saved disclosure to gate panel repository PR reads, independently of section visibility or tab filter. Collapsed groups SHALL start no list, pagination, count-only, targeted sibling, check, checklist or stage/label refresh. Last-known per-tab group counts SHALL remain until expansion. Only the resolved selected-agent pin SHALL retain its independent PR refresh.

#### Scenario: All refresh triggers while collapsed
- **WHEN** a collapsed repository receives manual Refresh, webhook, reconnect, show, local-context, new task-link, safety or retry demand
- **THEN** no group list or per-PR request starts for that repository, including follow-up details and access diagnosis
- **AND** unrelated expanded repositories retain their normal bounded reads and ordinary/coordinator views use the same disclosure choice

#### Scenario: Filter-hidden repository and both tabs
- **WHEN** a repository is collapsed but hidden by current Open/Closed eligibility, pagination or reveal limits
- **THEN** it remains quiet by canonical identity rather than relying on a mounted header or visible row
- **AND** switching tabs or revealing more does not bypass its saved collapse policy

#### Scenario: Collapse during a read
- **WHEN** group metadata or detail work is already in flight when the repository collapses
- **THEN** the dispatched request may finish but starts no group follow-up reads or publication into the frozen group presentation
- **AND** later expansion starts or joins only currently eligible work, and an older pre-collapse reply cannot count as the expansion refresh

#### Scenario: Saved collapsed startup
- **WHEN** Git starts or is recreated with saved collapsed defaults or exceptions
- **THEN** disclosure is restored before any group PR request starts, including for repositories hidden in the selected tab
- **AND** compatible runtime snapshots retain known folded headers and per-tab counts, but a restart without PR snapshots invents no header, count or authoritative empty result for unread collapsed repositories
- **AND** deliberately quiet unread groups do not hold admitted expanded siblings behind Loading or leave a perpetual loading animation by themselves; existing bulk expansion remains available

### Requirement: Selected Git pin remains live while groups are quiet
The ordinary selected-agent PR pin SHALL retain existing targeted mutable-fact refresh and safety cadence when its repository is collapsed, without refreshing the group list or sibling PRs. Its checks, checklist, stage and state SHALL update from existing PR reads. The pin SHALL remain isolated to the effective held or selected agent and coordinator mode SHALL gain no permanent pin.

#### Scenario: Collapse all with a pin
- **WHEN** all repositories are collapsed and an ordinary selected-agent PR is resolved
- **THEN** only that PR is eligible for panel PR refresh, including an older linked PR outside the loaded page
- **AND** sibling PRs and last-known group header counts remain quiet even when the pin's state changes
- **AND** its existing final-row cache, event, rate refusal and safety policies remain in force rather than adding a polling loop

#### Scenario: No pin or agent replacement
- **WHEN** the effective agent has no linked PR, resolves a different PR, or the source is held by the header pin
- **THEN** no-PR contexts start no collapsed group PR reads, replacement targets only the newly resolved pin, and held context never borrows another selection's PR
- **AND** pin selection does not require downloading a collapsed list solely to discover a branch match; known cached branch matches remain usable

### Requirement: Collapse preserves independent integration freshness
Repository collapse SHALL quiet panel-derived PR facts and totals only. Independent update attention, native/Crew agent state, enrollment/setup checks and Core-side CI/conflict/merge automation SHALL retain their existing sources and lifecycle. Collapse SHALL NOT disable automation, close the shared relay or silently pause an outside-panel consumer of panel-read facts.

#### Scenario: Update attention and automation while all groups are collapsed
- **WHEN** a fixed-repository update event or independently configured Core monitor event arrives with every Git section collapsed
- **THEN** update attention and permitted automation continue from their independent evidence without a group panel PR read
- **AND** hidden panel labels/stages, checks, checklists and totals remain last-known until expansion, except for the selected-agent PR pin
