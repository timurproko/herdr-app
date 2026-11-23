# Spec Delta

## ADDED Requirements

### Requirement: Crew project names preserve safe dots
Crew Projects settings SHALL derive registration names from folder basenames while preserving safe dots. Accepted names SHALL contain 1–40 lowercase ASCII letters, digits, dashes or dots, start with a letter or digit, contain no consecutive dots and end with no dot. Naming guidance SHALL describe these constraints. Existing valid dotted registrations SHALL remain visible and removable by their exact registered names.

#### Scenario: Dotted project folder
- **WHEN** the user adds `D:/Git/agentnumberone.dev` to Crew Projects
- **THEN** the app requests registration as `agentnumberone.dev` rather than `agentnumberone-dev`

#### Scenario: Dotted registration returned by Crew
- **WHEN** Crew lists a registration named `agentnumberone.dev` with its folder
- **THEN** Settings shows that folder as a project row
- **AND** removing or unticking it requests removal of the exact name `agentnumberone.dev`

#### Scenario: Invalid derived name
- **WHEN** a folder basename cannot produce a name under the naming policy
- **THEN** Settings reports the naming constraints without sending a registration request

#### Scenario: Name boundaries
- **WHEN** Settings derives a project name or interprets a listed registration
- **THEN** its accepted name satisfies the length, starting-character and dot restrictions
- **AND** safe dots within the 40-character result are not replaced with dashes

### Requirement: Crew project refusals retain authority and origin
Settings SHALL present Crew's project-change refusals as messages from Crew, separately from the selected folder's operation context. Home-ownership refusals SHALL remain about Crew's home. An older Crew refusing a dotted name SHALL expose its refusal without a silent alternative-name retry or false success. Batch changes SHALL retain successful operations and identify failed operations.

#### Scenario: Older Crew rejects dotted registration
- **WHEN** Crew refuses a requested dotted project name
- **THEN** Settings shows Crew's refusal as a message from Crew
- **AND** the app does not retry with a dash-only name or show the project as registered

#### Scenario: Crew home owned by another terminal
- **WHEN** an add fails because Crew reports that its home is read-only and owned by another terminal
- **THEN** Settings identifies Crew as the source and preserves the home-ownership explanation
- **AND** the selected folder is shown only as the attempted operation's target, not as the owner-locked resource

#### Scenario: Partial batch failure
- **WHEN** one folder change fails while other selected changes succeed
- **THEN** Settings retains the successes, identifies the failed operation and shows its attributed refusal
- **AND** the project list is refreshed using Crew's authoritative result
