# Spec Delta

## MODIFIED Requirements

### Requirement: Crew project names preserve safe dots
Crew Projects settings SHALL derive registration names from folder basenames while preserving safe dots. Accepted names SHALL contain 1–40 lowercase ASCII letters, digits, dashes or dots, start with a letter or digit or with one dot followed by a letter or digit, contain no consecutive dots and end with no dot. Naming guidance SHALL describe these constraints. Existing valid dotted registrations SHALL remain visible and removable by their exact registered names.

#### Scenario: Dotted project folder
- **WHEN** the user adds `D:/Git/agentnumberone.dev` to Crew Projects
- **THEN** the app requests registration as `agentnumberone.dev` rather than `agentnumberone-dev`

#### Scenario: Dot folder keeps its dot
- **WHEN** Crew lists `xrbuild` for `D:/Git/xrbuild` and the user adds `D:/Git/xrbuild/.xrbuild`
- **THEN** the app requests registration as `.xrbuild`, distinct from `xrbuild`
- **AND** Settings shows the `.xrbuild` row and removing it requests removal of the exact name `.xrbuild`

#### Scenario: Dotted registration returned by Crew
- **WHEN** Crew lists a registration named `agentnumberone.dev` with its folder
- **THEN** Settings shows that folder as a project row
- **AND** removing or unticking it requests removal of the exact name `agentnumberone.dev`

#### Scenario: Invalid derived name
- **WHEN** a folder basename cannot produce a name under the naming policy
- **THEN** Settings reports the naming constraints without sending a registration request

#### Scenario: Name boundaries
- **WHEN** Settings derives a project name or interprets a listed registration
- **THEN** its accepted name satisfies the length, starting-character and dot restrictions, counting a leading dot within the 40 characters
- **AND** safe dots within the 40-character result are not replaced with dashes

## ADDED Requirements

### Requirement: Crew project folders register once
Settings SHALL NOT request registration of a folder that Crew already lists under another project name, and SHALL show that the folder is already added.

#### Scenario: Folder already registered under another name
- **WHEN** the user adds a folder that Crew already lists under a different name
- **THEN** Settings sends no registration request and shows that the folder is already added
