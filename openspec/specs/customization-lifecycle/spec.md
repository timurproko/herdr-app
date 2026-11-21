# customization-lifecycle Specification

## Purpose
Define how the Custom app is built, distributed and installed independently of Herdr while preserving user-owned configuration, native files and session safety.

## Requirements

### Requirement: Host-independent customization build
The app SHALL build customization packages from a standalone checkout without an installed Herdr/Core, private dotfiles, account credentials or a host preference snapshot. Generated output SHALL stay inside the checkout and SHALL NOT build or replace native binaries.

#### Scenario: Clean checkout without personal configuration
- **WHEN** a user builds the app with supported Node.js and no personal snapshot or installed Herdr
- **THEN** the build produces self-contained customization packages in the checkout
- **AND** it does not write into the user's Herdr home or invoke native deployment

### Requirement: Curated and attributable distribution
The public app distribution MUST exclude the personal host snapshot and private runtime state. Established third-party code/artwork MUST retain applicable license texts, attribution, evidence and modification notes. Artwork retained from the original project without a recorded source MUST be identified honestly, without an inferred source, license or authorship claim.

#### Scenario: Public source package
- **WHEN** the app source and generated packages are prepared for distribution
- **THEN** they retain original project assets with truthful known or source-not-recorded entries and accompanying established third-party notices
- **AND** they do not contain live sessions, credential stores or the personal host snapshot

### Requirement: Explicit conflict-safe installation
Installation SHALL target an explicitly selected Herdr home or the user's default Herdr home, independent of source checkout location. It SHALL update only owned customization output, preserve unrelated/native state and allowed visual preferences, and abort on unknown or personally modified files rather than silently overwrite them.

#### Scenario: Checkout outside the app home
- **WHEN** a user explicitly deploys from an unrelated checkout into a selected disposable Herdr home
- **THEN** installed runtime packages function without imports from the source checkout
- **AND** unrelated settings, stock mods and shared state are preserved

#### Scenario: Personal output conflict
- **WHEN** an installed owned file has an unrecognized personal modification and the user deploys again
- **THEN** deployment reports the conflict before making unrelated changes
- **AND** does not adopt or overwrite the personal bytes

### Requirement: Durable preference boundaries
The app SHALL preserve versioned durable preferences separately from generated output and SHALL require explicit restoration of host-specific snapshots. Preference filtering MUST NOT be described as anonymization: credential-filtered backups can still contain personal settings, pins, paths and infrastructure choices. Missing host snapshots SHALL NOT import another machine's profiles.

#### Scenario: Missing snapshot for this machine
- **WHEN** a preference restore is requested without a snapshot for the selected host
- **THEN** the app leaves that host's profiles unchanged rather than selecting another host's snapshot

#### Scenario: Public example configuration
- **WHEN** an example snapshot is included with the app
- **THEN** its identifiers and settings are made up and it enables no personal account or privileged automation

### Requirement: Reviewed native compatibility and recovery
Native compatibility exceptions SHALL remain explicit, version/shape-gated and ownership-checked. Unknown stock or personal edits SHALL fail closed; updates SHALL refresh only prior opt-ins. Recovery SHALL refuse later personal edits and SHALL NOT replace complete live session documents or restart terminals/agents as an implicit repair.

#### Scenario: Unknown upstream patch target
- **WHEN** an existing opted-in patch encounters an unknown upstream target
- **THEN** the app leaves the unknown target unchanged and reports incompatibility
- **AND** does not manufacture a reviewed baseline or enable another patch

#### Scenario: Rollback after a later personal edit
- **WHEN** rollback encounters bytes changed after the recorded deployment
- **THEN** it refuses to overwrite the later edit
