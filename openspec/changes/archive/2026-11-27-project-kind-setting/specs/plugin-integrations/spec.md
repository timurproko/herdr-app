# Spec Delta

## ADDED Requirements

### Requirement: Authoritative Crew project kinds
Crew Projects SHALL show kind labels only with supported versioned Crew capabilities and valid machine-readable project data. The labels SHALL be Delivery workflow, Plain and Gate. The app SHALL NOT infer kinds from human-readable output, repository files or task history. Older Crew SHALL retain existing path, Add and Remove behavior without a kind label or editor.

#### Scenario: Supported authoritative listing
- **WHEN** the selected machine advertises supported JSON listing and kind-only editing and returns valid project rows
- **THEN** each row shows its folder and Crew-supplied kind using Delivery workflow, Plain or Gate
- **AND** exact registered names, including valid dotted names, remain the operation identities

#### Scenario: Older or unrecognized Crew
- **WHEN** capability probing returns help text, ignored flags, missing support, malformed JSON or an unknown version
- **THEN** kind labels and editors are absent without breaking existing folder listing, Add or Remove
- **AND** existing legacy path parsing is not extended to interpret delivery-related human text

#### Scenario: Invalid advertised listing
- **WHEN** a supported API returns malformed project facts, unknown kinds, duplicate names or invalid home identity
- **THEN** no guessed kind or editable target is published
- **AND** the failed read does not become an authoritative empty list or a successful kind change

### Requirement: Shared hover and focus project-kind editing
A supported project row SHALL display a quiet right-aligned kind label at rest and reveal the standard Settings dropdown on hover or keyboard focus. Remove SHALL remain in its separate trailing action slot, with no overlap or horizontal jump. The shared declarative renderer SHALL own this optional row control, leaving other plugin rows unchanged.

#### Scenario: Pointer editing and stable geometry
- **WHEN** the pointer enters a supported project row
- **THEN** its kind label becomes the shared Settings dropdown with all three named choices
- **AND** Remove remains available beside it without overlap, while the folder truncates within its own remaining width

#### Scenario: Keyboard editing and dismissal
- **WHEN** keyboard focus reaches the project row or its controls
- **THEN** the dropdown and Remove are discoverable and operable without a pointer
- **AND** opening a dropdown keeps it revealed when the pointer leaves; Escape dismisses without writing, and focus leaving a closed row restores its quiet label

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

#### Scenario: Refused or uncertain change
- **WHEN** Crew refuses ownership, rejects a kind, reports a changed registration, disconnects or returns an invalid or uncertain acknowledgement
- **THEN** Settings retains the last confirmed kind and shows a short inline failure sentence without a raw usage dump
- **AND** pending controls prevent duplicate changes; an uncertain outcome requires a fresh read before a further write and is never automatically replayed

#### Scenario: Context changes during editing
- **WHEN** the machine changes, Settings closes, the plugin is disabled or the row registration is replaced while a dropdown or request is pending
- **THEN** obsolete controls cannot dispatch, retarget or publish into the replacement context
- **AND** an already-submitted write is not falsely claimed to have been cancelled

#### Scenario: Fake-only verification
- **WHEN** capability, local and remote transport, hover, keyboard focus, success, refusal or obsolete response behavior is exercised in tests
- **THEN** tests use fake Crew replies and isolated UI/transport fixtures without the person's real Crew homes, running app or SSH machines
