# Spec Delta

## MODIFIED Requirements

### Requirement: Durable preference boundaries
The app SHALL preserve versioned durable preferences separately from generated output and SHALL require explicit restoration of host-specific snapshots. Preference filtering MUST NOT be described as anonymization: credential-filtered backups can still contain personal settings, pins, paths and infrastructure choices. Missing host snapshots SHALL NOT import another machine's profiles.

#### Scenario: Missing snapshot for this machine
- **WHEN** a preference restore is requested without a snapshot for the selected host
- **THEN** the app leaves that host's profiles unchanged rather than selecting another host's snapshot

#### Scenario: Public example configuration
- **WHEN** an example snapshot is included with the app
- **THEN** its identifiers and settings are made up and it enables no personal account or privileged automation

#### Scenario: Snapshot restore safeguards remain unchanged
- **WHEN** a user explicitly restores preferences from the new snapshot directory
- **THEN** restore still requires the desktop to be closed, refuses conflicting personal palettes and preserves unrelated runtime/session state
- **AND** snapshot schemas and credential filtering remain unchanged

## ADDED Requirements

### Requirement: Private preference snapshot storage
Preference export/import SHALL use `preferences/` inside the selected Herdr home for host snapshots and portable visual snapshots, never the source checkout. Home selection SHALL match deployment: an explicit home argument, otherwise nonempty `HERDR_APP_HOME`, otherwise `~/.config/herdr-app`. Host filenames SHALL retain lowercase hostname naming. Visual snapshots SHALL NOT be shipped defaults; authored defaults SHALL remain independent.

#### Scenario: Selected home from the environment
- **WHEN** export is invoked from a checkout with `HERDR_APP_HOME` set to a disposable home
- **THEN** the host snapshot is written to that home's `preferences/<lowercase-hostname>.json`
- **AND** portable `layout.json`, `palette.json` and `theme.json` snapshots use that same preference directory when available
- **AND** no snapshot is written into the checkout

#### Scenario: Default home without environment override
- **WHEN** export/import is invoked without an explicit home and with `HERDR_APP_HOME` unset or empty
- **THEN** snapshots are read from or written to `~/.config/herdr-app/preferences/`

#### Scenario: Explicit home argument
- **WHEN** export/import selects an explicit disposable home while `HERDR_APP_HOME` names another fixture
- **THEN** snapshot access uses only the explicit home's preference directory

#### Scenario: Portable visual snapshot restore
- **WHEN** the selected home contains visual snapshots and the user explicitly imports with the desktop closed
- **THEN** layout overrides, palette picker metadata and native-schema theme are restored through the existing validation and conflict checks
- **AND** neither import nor build depends on tracked visual snapshot files in the checkout

#### Scenario: Legacy checkout host snapshot is not migrated
- **WHEN** an old checkout contains a host snapshot and the selected home has none for this host
- **THEN** restore ignores the old checkout snapshot and leaves local profiles unchanged
- **AND** export/import neither moves nor deletes the old snapshot
- **AND** documentation tells the user to relocate it manually into the selected home's preference directory
