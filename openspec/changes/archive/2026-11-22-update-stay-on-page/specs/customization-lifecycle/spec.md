# Spec Delta

## MODIFIED Requirements

### Requirement: Reload-independent bounded update result
An update SHALL run independently of the mod it replaces, with a finite deadline and one latest durable status/result/log under the selected Herdr home. Reload, closing Settings or duplicate clicks SHALL NOT cancel or repeat it. A missing final result SHALL NOT imply success. No daemon, scheduler or job history SHALL be introduced. Replacement of an open Updates view SHALL preserve that section and reconcile truthful row feedback without exporting navigation state as preferences.

#### Scenario: Page replaced during deploy
- **WHEN** deployment replaces Settings or the user closes and reopens it
- **THEN** the same update continues independently and the row reattaches to its status
- **AND** its description shows Updating… with the unchanged disabled Updating… action until a result is known

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
