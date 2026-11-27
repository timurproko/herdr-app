# Spec Delta

## MODIFIED Requirements

### Requirement: Authoritative Crew project kinds
Crew Projects SHALL show kind labels only with supported versioned Crew capabilities and valid machine-readable project data. The labels SHALL be Plain, Delivery and Gate, in that dropdown order. The app SHALL NOT infer kinds from human-readable output, repository files or task history. Older Crew SHALL retain existing path, Add and Remove behavior without a kind label or editor.

#### Scenario: Supported authoritative listing
- **WHEN** the selected machine advertises supported JSON listing and kind-only editing and returns valid project rows
- **THEN** each row shows its folder and Crew-supplied kind using Plain, Delivery or Gate, without a truncated kind caption
- **AND** exact registered names, including valid dotted names, remain the operation identities
- **AND** the dropdown lists Plain, Delivery and Gate in that order, without option tooltips

#### Scenario: Older or unrecognized Crew
- **WHEN** capability probing returns help text, ignored flags, missing support, malformed JSON or an unknown version
- **THEN** kind labels and editors are absent without breaking existing folder listing, Add or Remove
- **AND** existing legacy path parsing is not extended to interpret delivery-related human text

#### Scenario: Invalid advertised listing
- **WHEN** a supported API returns malformed project facts, unknown kinds, duplicate names or invalid home identity
- **THEN** no guessed kind or editable target is published
- **AND** the failed read does not become an authoritative empty list or a successful kind change

### Requirement: Shared hover and focus project-kind editing
A supported project row SHALL display a quiet left-aligned kind label in a shared fixed column and reveal the standard Settings dropdown at the same text position on pointer hover or keyboard focus. Remove SHALL retain its separate trailing slot without overlap or horizontal jump. Dismissed menu focus alone SHALL NOT keep a row revealed. The shared declarative renderer SHALL own this optional control, leaving other plugin rows unchanged.

#### Scenario: Pointer editing and stable geometry
- **WHEN** the pointer enters a supported project row
- **THEN** its kind label becomes the shared Settings dropdown with all three named choices
- **AND** quiet labels and revealed trigger text share the same left edge across every row
- **AND** Remove remains available beside it without overlap, while only the folder truncates within its own remaining width
- **AND** no Projects column header is added

#### Scenario: Keyboard editing and dismissal
- **WHEN** keyboard focus reaches the project row or its controls
- **THEN** the dropdown and Remove are discoverable and operable without a pointer
- **AND** opening a dropdown keeps it revealed when the pointer leaves; Escape dismisses without writing, and focus leaving a closed row restores its quiet label
- **AND** genuine keyboard navigation retains operability without treating pointer-origin restored focus as keyboard intent

#### Scenario: Open close and move to another row
- **WHEN** a row's menu closes after selection, Escape or outside dismissal and the pointer moves to another row
- **THEN** the former row returns to its quiet label unless it holds genuine keyboard focus
- **AND** the row under the pointer reveals normally without the dismissed menu leaving a second stale reveal
- **AND** closing while the pointer remains on the original row keeps that row revealed

#### Scenario: Other list rows
- **WHEN** a list has no declared row choice
- **THEN** its existing path or label and hover-Remove layout and behavior remain unchanged

### Requirement: Acknowledged machine-bound project-kind changes
Kind edits SHALL target the captured machine, home and existing registration through Crew's advertised kind-only API. The confirmed label SHALL remain until matching stored-value acknowledgement; failures SHALL show one short inline sentence. The app SHALL NOT re-add projects, edit Crew files, bypass ownership or replay uncertain writes. Stale callbacks SHALL NOT dispatch or publish into another context.

#### Scenario: Successful local or remote selection
- **WHEN** a person chooses a different kind for a local or SSH-selected project
- **THEN** one explicit request goes through the existing selected-machine transport for that captured home, registered name and folder
- **AND** only a matching successful stored-value result updates the label, followed by the authoritative list refresh
- **AND** folder, unrelated project settings and existing tasks remain untouched

#### Scenario: Supported coordinator-owned home
- **WHEN** Crew advertises safe kind editing and acknowledges the matching stored value while a coordinator owns the captured home
- **THEN** Settings applies the normal successful update without an ownership warning or a separate app-side ownership restriction

#### Scenario: Refused or uncertain change
- **WHEN** Crew refuses ownership, rejects a kind, reports a changed registration, disconnects or returns an invalid or uncertain acknowledgement
- **THEN** Settings retains the last confirmed kind and shows a short inline failure sentence without a raw usage dump
- **AND** an older Crew's ownership refusal shows neutral wording without the instruction to change projects from another session
- **AND** pending controls prevent duplicate changes; an uncertain outcome requires a fresh read before a further write and is never automatically replayed

#### Scenario: Context changes during editing
- **WHEN** the machine changes, Settings closes, the plugin is disabled or the row registration is replaced while a dropdown or request is pending
- **THEN** obsolete controls cannot dispatch, retarget or publish into the replacement context
- **AND** an already-submitted write is not falsely claimed to have been cancelled

#### Scenario: Fake-only verification
- **WHEN** capability, local and remote transport, hover, keyboard focus, success, refusal or obsolete response behavior is exercised in tests
- **THEN** tests use fake Crew replies and isolated UI/transport fixtures without the person's real Crew homes, running app or SSH machines

## ADDED Requirements

### Requirement: Consistent Git stage and verdict boxes
Git stage and verdict controls SHALL share one measured minimum width covering all fixed captions and two-digit Build rounds, equal height and padding, and centred text. Longer round captions SHALL grow only their own box. Interaction bounds SHALL match that box. Existing right alignment, title truncation, row height, guarded actions and tooltip suppression SHALL remain unchanged.

#### Scenario: Common geometry across captions
- **WHEN** ordinary or coordinator rows show Build, Build 2 through Build 99, Review, Approved or another fixed verdict such as Changes requested at 100% or 130% zoom
- **THEN** each control has the same outer width and height, padding and centred caption, sized from native text measurements rather than assuming Approved is widest
- **AND** hover, focus and click share that box without tooltip or a changed right rail, title reservation or block height

#### Scenario: Rare longer round
- **WHEN** a supported Build caption contains more than two round digits and exceeds the common width
- **THEN** only that control grows to fit it while keeping its right anchor
- **AND** ordinary two-digit and fixed-caption controls retain the common width

#### Scenario: Long title and retained presentations
- **WHEN** long-title rows appear in ordinary, coordinator, pinned, scrolling, probe or ghost presentations at either zoom
- **THEN** the existing title truncation and full-title hover remain intact and the stage/verdict does not gain a title-line reservation


### Requirement: Non-actionable delivery kind explanation
The Projects description SHALL append Delivery kinds in inline accent styling with a dashed underline. Hover or keyboard focus SHALL show the sidebar Usage tooltip's visual treatment with aligned columns Kind, Plan first, Who reviews and Who opens the pull request. Clicking SHALL do nothing. If aligned columns cannot be rendered, equivalent dotted rows SHALL preserve all content and the limitation SHALL be reported.

#### Scenario: Complete explanation
- **WHEN** the person hovers or focuses Delivery kinds after Git folders crew may work in on this machine.
- **THEN** the explanation shows Plain, no, a crew reviewer, crew after review
- **AND** it shows Delivery, yes, a crew reviewer, the worker as a draft at the start
- **AND** it shows Gate, no, the gate tool, the gate tool
- **AND** the explanatory headers belong only to the tooltip, not a Projects list column header
- **AND** clicking does not open a URL, menu or action, and no command or machine read is started

### Requirement: Concurrency-safe Settings checks
Settings SHALL queue execution within available transport capacity and retry confirmed pre-start concurrency refusals without showing their raw text, an Error badge or an invented to-fix count. Waiting refreshes SHALL retain the same context's last-good project list and confirmed requirement badges. Invalidated queued work SHALL stop before dispatch, and uncertain submitted writes SHALL NOT be replayed.

#### Scenario: Plugins opens during execution saturation
- **WHEN** Plugins checks encounter a refusal such as 16 execs are running already before a command starts
- **THEN** requests wait and retry with bounded active concurrency instead of publishing failure or missing-install results
- **AND** known rows, confirmed badges and the true fix count remain while waiting
- **AND** a cold check stays pending without claiming ready, error or missing setup
- **AND** when capacity becomes available a successful read replaces the retained facts coherently

#### Scenario: Reduced check fan-out
- **WHEN** Plugins checks a list of installed tools whose status one read-only command can supply
- **THEN** it uses batched facts rather than launching a separate transport for every tool
- **AND** each tool retains its own truthful ready, missing, optional or actionable-failure result

#### Scenario: Context retirement and genuine failure
- **WHEN** queued work becomes obsolete through machine change, Settings close, plugin disablement or a superseding check
- **THEN** it cannot dispatch follow-up work or replace another context's facts
- **AND** genuine non-concurrency failures keep their normal actionable diagnostics rather than being hidden as capacity contention

#### Scenario: A setter meets capacity refusal or uncertain submission
- **WHEN** a kind setter is queued, receives a proven pre-start refusal or has an uncertain outcome after submission
- **THEN** only unsent work and proven pre-start refusals are eligible for automatic dispatch retry
- **AND** ambiguous or already-submitted writes require authoritative reconciliation rather than automatic write replay
