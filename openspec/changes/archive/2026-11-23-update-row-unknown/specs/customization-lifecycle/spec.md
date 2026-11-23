# Spec Delta

## MODIFIED Requirements

### Requirement: Single Custom customization update row
Custom Settings Updates SHALL retain its native rows and add one herdr-app-custom row with a short verified installed revision when known, a short status and one action slot. Without a verified revision, its title SHALL be only herdr-app-custom. The slot SHALL show Check now, Update or transient busy/current feedback matching the native rows. It SHALL NOT add machine rows, news, settings or rollback controls. Checking and updating SHALL disable only that row's action.

#### Scenario: Current or newer published main
- **WHEN** a successful check compares the verified desktop installation with published main
- **THEN** equality shows Up to date with local HH:MM check time
- **AND** a different or unknown installed revision shows Update available and Update

#### Scenario: Recently requested check confirms current
- **WHEN** a user-requested custom check succeeds and confirms the installed revision is current
- **THEN** its action slot shows disabled ✓ Up to date with the native rows' markup, styling and recent-check condition
- **AND** the confirmation uses the native three-second recent-request window, refreshed during checking on the existing 300 ms cadence, before returning to Check now
- **AND** the Up to date description and check time remain after the confirmation expires

#### Scenario: Idle or busy row
- **WHEN** the custom row has no recent successful current check or an operation is in progress
- **THEN** it retains Check now otherwise, Checking… during a check and Updating… during an update
- **AND** an old cached current result alone does not start a new confirmation

#### Scenario: Failed check or missing revision
- **WHEN** the published-main check fails or no trustworthy installed revision exists
- **THEN** failure shows a short retry message rather than claiming current status
- **AND** the revision is never inferred from a source checkout HEAD
- **AND** failures and unknown outcomes do not show the current confirmation and retain their existing action and safety guards

#### Scenario: Title across all update states
- **WHEN** the row is checking, update available, updating, failed or up to date
- **THEN** a known revision retains its existing seven-character suffix and an unknown revision adds no suffix or trailing space to herdr-app-custom
- **AND** no tooltip, footer or menu repeats the revision unknown placeholder
- **AND** an unknown revision cannot produce an up-to-date claim, even if a cached check says no update is available
- **AND** unknown-update-outcome and failure diagnostics retain their meaning

### Requirement: Durable desktop revision and partial outcomes
Real deploy:all runs SHALL record latest per-machine outcomes and successful desktop commit with evidence tied to the installed ownership record, without changing the ownership manifest schema. Dry-run SHALL NOT write these records. Desktop success SHALL remain distinguishable from peer skips/failures; uncertain desktop installation SHALL NOT claim a verified new revision.

#### Scenario: Desktop success with incomplete peers
- **WHEN** the desktop deploy succeeds but a peer is skipped, fails or machine inventory fails
- **THEN** the row shows the new desktop revision and one short partial-outcome line naming the matching captured log or durable result path
- **AND** the log/result contains machine reasons and available backup IDs without adding machine rows
- **AND** ordinary successful version checks do not erase the partial-outcome warning

#### Scenario: Other deployment changes installed evidence
- **WHEN** a later ordinary deployment or rollback changes the ownership record from the saved successful desktop evidence
- **THEN** the row omits the installed revision from its title rather than reusing a stale installed SHA or showing a revision unknown placeholder
- **AND** unknown installed evidence still offers Update after a successful published-main check, subject to existing safety guards

#### Scenario: Desktop deployment failure
- **WHEN** desktop deployment is refused or fails
- **THEN** the row states a short cause and that recovery uses documented rollback, with the log path
- **AND** no automatic rollback occurs or journal, stock-layout or later-edit safety gate is bypassed

## ADDED Requirements

### Requirement: Accurate update cadence explanation
The Settings Updates explanation SHALL distinguish the native Herdr and herdr-core hourly checks from Custom's healthy 2–3 minute checks while mounted and optional configured merge hints. It SHALL NOT imply that all three rows check hourly or promise that merge hints always operate. Existing terminal-continuity guidance SHALL remain accurate.

#### Scenario: Reading the Updates explanation
- **WHEN** a person opens Settings Updates
- **THEN** the explanation identifies Herdr and herdr-core as hourly checks and Custom as normally checking every 2–3 minutes while mounted
- **AND** any mention of faster merge hints is conditional on an enabled, configured relay
- **AND** herdr-core's role running terminals and their continuity through its updates remains explained
