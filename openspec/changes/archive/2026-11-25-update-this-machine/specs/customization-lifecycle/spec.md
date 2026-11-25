# Spec Delta

## MODIFIED Requirements

### Requirement: Single Custom customization update row
Custom Settings Updates SHALL retain its native rows and add one herdr-app-custom row with a short verified installed revision when known, a short status and one action slot. Without a verified revision, its title SHALL be only herdr-app-custom. The slot SHALL show Check now, Update or transient busy/current feedback matching the native rows. It SHALL NOT add machine rows, news, settings or rollback controls. Checking and updating SHALL disable only that row's action.

#### Scenario: Current or newer published main
- **WHEN** a successful check compares the verified desktop installation with published main
- **THEN** equality shows Up to date with local HH:MM check time
- **AND** a different or unknown installed revision shows Update available and Update
- **AND** deferred offline peer work can independently offer Update without changing the current desktop description or raising availability badges

#### Scenario: Recently requested check confirms current
- **WHEN** a user-requested custom check succeeds and confirms the installed revision is current with no deferred peer work
- **THEN** its action slot shows disabled ✓ Up to date with the native rows' markup, styling and recent-check condition
- **AND** the confirmation uses the native three-second recent-request window, refreshed during checking on the existing 300 ms cadence, before returning to Check now
- **AND** the Up to date description and check time remain after the confirmation expires

#### Scenario: Idle or busy row
- **WHEN** the custom row has no recent successful current check or an operation is in progress
- **THEN** it retains Check now otherwise, Update for safely retryable deferred peer work after a successful check, Checking… during a check and Updating… during an update
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

#### Scenario: Concise running description
- **WHEN** Custom is launching an update, waiting for its launch receipt or running the local update with a known published target, including when no other machines exist
- **THEN** the row description says Updating this machine to followed by that target's first seven characters and a full stop, such as `Updating this machine to 4c4bff1.`
- **AND** the target comes from the update check or the active run's target receipt, never from an invented value or unverified installed revision
- **AND** its disabled Updating… button and row layout remain unchanged, and every other phase text, timing and update logic remain unchanged

#### Scenario: Target becomes known after launch
- **WHEN** Custom is launching, waiting for a launch receipt or running without a trustworthy target yet
- **THEN** its description is `Updating.` without an ellipsis
- **AND** it switches to the target-aware description as soon as the update flow supplies the target

#### Scenario: Only other machines need updating
- **WHEN** an explicit update is catching up other machines and this computer is already verified current for the update target
- **THEN** the running description says Updating other machines to followed by the seven-character target and a full stop, such as `Updating other machines to 4c4bff1.`
- **AND** if the peer-only scope is known but its target is not yet known, the description is `Updating other machines.` without an ellipsis
- **AND** unknown desktop currency never claims that only other machines need updating
