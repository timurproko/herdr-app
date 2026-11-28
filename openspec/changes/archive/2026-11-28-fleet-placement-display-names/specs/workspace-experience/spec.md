# Spec Delta

## MODIFIED Requirements

### Requirement: Multiple connected project spaces
One coordinator SHALL support multiple validated same-machine project children through the existing contribution boundary, including legacy single-child links. Children SHALL retain native targets and shortcut numbers. Coordinator drags SHALL move the whole block in saved sibling order; child drags SHALL affect only siblings. Captured membership and acknowledgements SHALL be revalidated. Ambiguous ownership, cross-machine links and uncertain outcomes SHALL fail closed without replay.

#### Scenario: One, two and three project children
- **WHEN** validated contributions identify one, two or three children under one coordinator
- **THEN** all appear under that coordinator with shared connector anchors, independently selectable native numbers, and one parent fold hiding all children with the child-space count visible in both expanded and collapsed states
- **AND** selecting any hidden child discloses the parent without selecting another child or remapping shortcuts
- **AND** validated project children show the supplied safe repository display name rather than a task worktree basename or placement project key, while explicit user-renamed space titles take precedence

#### Scenario: Combined and project populations
- **WHEN** legacy combined workers, placement-v1 project workers or both coexist for the same verified home
- **THEN** every exact same-machine native space is connected after validating task identity and placement labels, without changing crew.home or inferring links from names
- **AND** unsupported placement versions, mismatching authoritative projects or automatic IDs, conflicting same-child names, unsafe display names, wrong adoption IDs and cross-machine members do not establish a link

#### Scenario: Repository display name differs from project identity
- **WHEN** exact task, home, owner and native membership validate a per-project child whose safe repository display name differs from its authoritative placement project key
- **THEN** the name is accepted as display metadata without changing the project-derived automatic space ID or granting identity from the name
- **AND** legacy registered-name captions and directory-cased or dot-prefixed repository captions remain supported

#### Scenario: Internal repair named core beside an application project
- **WHEN** a verified home contains an application project child and an internal repair with task project crew:self, placement project crew:self, canonical self space ID and safe display name core
- **THEN** both children remain connected to their coordinator with count two and one parent disclosure
- **AND** the coordinator retains its verified recorded task-PR context rather than probing its non-repository working directory
- **AND** the legacy internal caption crew and a validated repair sharing placement project crew remain compatible

#### Scenario: Restored repository-named children
- **WHEN** verified repository-named child identities are restored after a mod reload or a preference off/on cycle
- **THEN** their safe display metadata survives validation and remembered nesting returns under the existing presentation rules
- **AND** remembered names do not grant fresh Git, worker navigation or colour authority before current verification

#### Scenario: Mixed generations within one combined space
- **WHEN** a valid same-home combined native space contains legacy workers and placement-v1 combined workers, including when the fleet view omits task projects
- **THEN** that single child remains connected after exact membership validation, with one connector and Crew only on its coordinator
- **AND** a change in the child's directory-derived title does not detach it or remove the coordinator's eligible task PRs

#### Scenario: Mixed combined fleet switched off and on
- **WHEN** the preference is switched off and on with Settings still open for a valid local or ready remote mixed combined fleet
- **THEN** off immediately hides nesting and revokes task inventory, while on immediately restores valid remembered presentation and starts current verification through the recurring Spaces owner
- **AND** without remembered identity, only successful current verification attaches the child and enables task PR reads; pending verification shows ordinary coordinator Loading rather than Not a git repository
- **AND** no dialog close, unrelated topology event, prior-toggle inventory or pre-toggle reply is required or accepted to complete the current binding

#### Scenario: Drag any member or change membership
- **WHEN** the parent or any child is dragged within its machine group
- **THEN** the parent moves the whole coordinator-first block in saved sibling order, while a child moves only among that parent's children without splitting another block or selecting/moving terminals
- **AND** the preview keeps the grabbed row's own number/name, and cancellation, changed captured child membership or concurrent native order stops further commands without replay

#### Scenario: Unsupported or ambiguous contribution
- **WHEN** project child identity is unverified, multiply owned, cross-machine or structurally unsupported
- **THEN** no inferred nesting or stale operational authority is granted from project names, and legacy valid single-child identities remain supported

#### Scenario: Existing Agents and compact rail
- **WHEN** the shared connector or fold primitives are used by Agents, or Spaces switches into compact rail
- **THEN** Agents retains its existing connector geometry and collapsed-count behavior
- **AND** compact Spaces retains the coordinator and every independently selectable child badge in saved sibling order without connector, Crew label, parent disclosure or new dragging
