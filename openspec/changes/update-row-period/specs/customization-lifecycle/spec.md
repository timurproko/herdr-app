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
- **WHEN** Custom is launching an update, waiting for its launch receipt or running the update with a known published target
- **THEN** the row description says Updating to followed by that target's first seven characters and a full stop, such as `Updating to 4c4bff1.`
- **AND** the target comes from the update check or the active run's target receipt, never from an invented value or unverified installed revision
- **AND** its disabled Updating… button and row layout remain unchanged, and other states change only where needed for consistent sentence punctuation

#### Scenario: Target becomes known after launch
- **WHEN** Custom is launching, waiting for a launch receipt or running without a trustworthy target yet
- **THEN** its description is `Updating.` without an ellipsis
- **AND** it switches to the target-aware description as soon as the update flow supplies the target

#### Scenario: Only other machines need updating
- **WHEN** an explicit update is catching up other machines and this computer is already verified current for the update target
- **THEN** the running description says Updating other machines to followed by the seven-character target and a full stop, such as `Updating other machines to 4c4bff1.`
- **AND** if the peer-only scope is known but its target is not yet known, the description is `Updating other machines.` without an ellipsis
- **AND** unknown desktop currency never claims that only other machines need updating

### Requirement: Reload-independent bounded update result
An update SHALL run independently of the mod it replaces, with a finite deadline and one latest durable status/result/log under the selected Herdr home. Reload, closing Settings or duplicate clicks SHALL NOT cancel or repeat it. A missing final result SHALL NOT imply success. No daemon, scheduler or job history SHALL be introduced. Replacement of an open Updates view SHALL preserve that section and reconcile truthful row feedback without exporting navigation state as preferences.

#### Scenario: Page replaced during deploy
- **WHEN** deployment replaces Settings or the user closes and reopens it
- **THEN** the same update continues independently and the row reattaches to its status
- **AND** its description retains the target-aware running wording, or `Updating.` until the target is known, with the unchanged disabled Updating… action until a result is known
- **AND** a verified peer-only update retains its Updating other machines wording and known target

#### Scenario: Open Updates view replaced
- **WHEN** an update started from Updates replaces the still-open Settings view, while the runner is active or has just finished
- **THEN** the dialog remains on Updates without requiring another navigation click
- **AND** a pending or running update never flashes a stale actionable Update or Up to date result
- **AND** completion reconciles the verified revision and published-main check, retaining existing failure, partial-outcome and unknown-result behavior

#### Scenario: Navigation and dismissal remain deliberate
- **WHEN** the person changes section or explicitly dismisses Settings before replacement
- **THEN** restoration does not force Updates over their newer selection or reopen the dismissed dialog
- **AND** a new dialog honors its requested destination or the ordinary Look default
- **AND** remembered navigation is not included in portable preference snapshots

#### Scenario: Reused native overlay ID
- **WHEN** native or backdrop dismissal or a Desktop restart reuses a previous Settings overlay ID
- **THEN** a new opening honors its requested destination or the Look default rather than borrowing the old opening's selection
- **AND** only the initiating opening's distinct identity permits update-triggered restoration while its job is pending or running, or for two minutes after completion
- **AND** openings without that identity do not restore a section from the native overlay ID

#### Scenario: Deadline or lost completion
- **WHEN** the update exceeds its deadline, crashes or leaves no final result
- **THEN** the row reports outcome unknown with a log path and does not replay the update
- **AND** another deployment remains blocked while the prior process or lock is unresolved

## ADDED Requirements

### Requirement: Consistent update description sentence punctuation
Every description sentence in the Custom row and sibling Settings update rows built by this project SHALL end with a full stop without duplicated stops. Button ellipses, diagnostic content, revision provenance, update scope, layout and action guards SHALL remain unchanged.

#### Scenario: All description states use sentence punctuation
- **WHEN** a Custom or sibling update row displays an idle, checking, current, available, updating, failed, partial, unknown or restart-ready description
- **THEN** each description sentence ends with a full stop, including error causes and log or details suffixes
- **AND** already-terminated errors do not introduce double stops between sentences or at the end
- **AND** diagnostic paths and revision values remain intact and button labels retain their existing ellipses
