## MODIFIED Requirements

### Requirement: Connected space parent disclosure
Expanded connected coordinators SHALL show a far-right chevron aligned with machine headers, default expanded. Both expanded and collapsed coordinators SHALL show their connected child-space count on a fixed inner column without shifting Crew. Disclosure SHALL remain local, identity-scoped and nonportable, without changing native selection, shortcuts, paired reorder or compact membership.

#### Scenario: Parent toggle and collapsed count
- **WHEN** the user activates the coordinator's fold control
- **THEN** all that parent's child rows toggle together without starting drag, selecting a different space or making discovery reads
- **AND** the chevron glyph axis, hit target and hover bounds match the machine header in both states
- **AND** Crew precedes count then chevron in both states, with Crew and count retaining their horizontal positions
- **AND** the count excludes the coordinator and counts connected spaces, not agents, tabs or tasks

#### Scenario: Keyboard navigation to a hidden child
- **WHEN** native keyboard or external navigation selects a child hidden by a collapsed parent
- **THEN** its parent is disclosed so the selected row is visible without changing the native target or shortcut mapping
- **AND** explicit folding does not itself select the parent, and disclosure controls remain separate from row selection and reorder

#### Scenario: Reorder a collapsed connected block
- **WHEN** the user drags the collapsed parent within its machine group
- **THEN** all hidden children move with the parent through acknowledged same-machine block operations
- **AND** expanding restores every child's identity and truthful number, while cancellation or changed captured membership commits no stale move

#### Scenario: Remote pair and invalid cross-machine link
- **WHEN** ready remote groups contain valid same-machine pairs or a candidate points across machines
- **THEN** valid pairs nest and fold independently inside their own machine group
- **AND** a cross-machine candidate stays independent under its own machine header without a cross-group connector, fold or move

### Requirement: Multiple connected project spaces
One coordinator SHALL support multiple validated same-machine project children through the existing contribution boundary, with legacy single-child compatibility. Each child SHALL retain its native target and shortcut number. Dragging any member SHALL move the entire coordinator-first block in stable child order, revalidating captured membership and acknowledgements. Ambiguous ownership, cross-machine links and uncertain outcomes SHALL fail closed without replay.

#### Scenario: One, two and three project children
- **WHEN** validated contributions identify one, two or three children under one coordinator
- **THEN** all appear under that coordinator with shared connector anchors, independently selectable native numbers, and one parent fold hiding all children with the child-space count visible in both expanded and collapsed states
- **AND** selecting any hidden child discloses the parent without selecting another child or remapping shortcuts
- **AND** validated project children show the supplied registered project name rather than a worktree basename, while explicit user-renamed space titles take precedence

#### Scenario: Combined and project populations
- **WHEN** legacy combined workers, placement-v1 project workers or both coexist for the same verified home
- **THEN** every exact same-machine native space is connected after validating task identity and placement labels, without changing crew.home or inferring links from names
- **AND** unsupported placement versions, mismatching project/name labels, wrong adoption IDs and cross-machine members do not establish a link

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
- **THEN** the whole block moves with coordinator first and stable child order, without splitting another block or selecting/moving terminals
- **AND** the preview keeps the grabbed row's own number/name, and cancellation, changed captured child membership or concurrent native order stops further commands without replay

#### Scenario: Unsupported or ambiguous contribution
- **WHEN** project child identity is unverified, multiply owned, cross-machine or structurally unsupported
- **THEN** no inferred nesting or stale operational authority is granted from project names, and legacy valid single-child identities remain supported

#### Scenario: Existing Agents and compact rail
- **WHEN** the shared connector or fold primitives are used by Agents, or Spaces switches into compact rail
- **THEN** Agents retains its existing connector geometry and collapsed-count behavior
- **AND** compact Spaces retains the coordinator and every independently selectable child badge without connector, Crew label or parent disclosure

### Requirement: Shared sidebar trailing grid
Spaces and Agents SHALL share trailing label and disclosure/status rails, with existing native row semantics. Spaces Crew SHALL retain plain Agents machine-label styling and its tooltip without moving on disclosure. Spaces child counts, machine plus and rename approve SHALL share one centred inner axis; chevrons and rename cancel SHALL share one centred outer axis.

#### Scenario: Expanded and collapsed coordinator metadata
- **WHEN** a coordinator is shown expanded or collapsed in a local or remote group
- **THEN** Crew stays on the same label rail and the child count stays visible on the same inner column before the chevron
- **AND** machine-header plus, connected child count and space-rename approve are centred on the same inner axis, while all Spaces chevrons and rename cancel share the outer axis
- **AND** labels are regular 12px dim text without fill, border or pill padding; unrelated tags retain their existing styling and metadata order
- **AND** previous Spaces references to Crew pills describe the Crew role label, whose presentation remains this plain-label contract

#### Scenario: Long names and zoom
- **WHEN** long space or machine names are shown at default or narrow expanded-sidebar widths at 100% or 130% zoom with one or several connected children
- **THEN** names truncate without moving the fixed trailing columns, overlapping labels/counts or displacing connectors and numbered badges
- **AND** row height, selection, hover, compact rail, native shortcuts and captured whole-block reorder remain unchanged

#### Scenario: Missing role or children
- **WHEN** a space has no Crew label or no connected children
- **THEN** no Crew label or child count is fabricated and ordinary tag, worktree, hover, selection and truncation behavior remains unchanged
- **AND** Agents retains its existing numeric rail and collapsed-count behavior

### Requirement: Space rename trailing alignment
Inline space rename SHALL retain 24px action buttons, a 2px inter-button gap and a 4px input-to-actions gap, shared with tab rename. Cancel SHALL occupy the machine-chevron axis on every space row, replacing coordinator disclosure while editing. Confirm SHALL share the machine-plus and child-count axis immediately to its left. Editing SHALL retain its captured target, full initial selection and existing Enter, Escape and blur behavior.

#### Scenario: Parent child and ordinary inline editors
- **WHEN** rename opens on a coordinator, child or ordinary space
- **THEN** the Cancel target shares the machine/coordinator chevron centre and 24px hover bounds with the sidebar's 8px outer gutter preserved
- **AND** Confirm is 2px to its left on the machine-plus and child-count axis, the input ends 4px before Confirm, and ordinary tags/count/disclosure are suppressed while editing
- **AND** Enter saves only the captured space, Escape or blur cancels unchanged, and repeated rename does not reset an existing draft or selection

## ADDED Requirements

### Requirement: Consistent workspace inline rename presentation
Tab and space inline rename SHALL share field and action presentation: button and icon sizes, field-to-action and inter-action gaps, vertical centring, hover and focus treatment. Entering rename SHALL preserve row height and limit tab width growth to the editable field and required actions. Visual unification SHALL NOT change captured targets, native input ownership or save/cancel behavior.

#### Scenario: Default and narrow rename layouts
- **WHEN** a tab or space enters inline rename at default or narrow widths
- **THEN** both editors show the same-sized field, check and cancel controls with identical icons, gaps, vertical alignment, hover and focus styling
- **AND** fields shrink or tabs use their existing scrolling/expansion behavior without overlapping or clipping the action controls, changing row height or adding unnecessary tab-width growth

#### Scenario: Rename completion and cancellation
- **WHEN** the user submits, cancels, presses Escape or blurs a tab or space inline editor
- **THEN** the original owner-bound save, cancel and focus-restoration rules still apply without terminal input or unintended drag
- **AND** sidebar agent rows retain their existing behavior without gaining a new rename feature
