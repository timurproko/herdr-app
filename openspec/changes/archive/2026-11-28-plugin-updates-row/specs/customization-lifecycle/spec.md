# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Connected-machine plugin updates section`
- TO: `### Requirement: Connected-machine plugin updates row`

## MODIFIED Requirements

### Requirement: Connected-machine plugin updates row
Settings Updates SHALL show one `herdr-app-plugins` row directly below `herdr-app-custom` in the Herdr list, using the same row and action-slot presentation. It SHALL summarize connected-machine plugin availability, checks and batch outcomes in its status text, without a separate Plugins heading, section or machine rows. Existing Herdr rows, explanation and notification-dot behavior SHALL remain unchanged.

#### Scenario: Crew update on another machine
- **WHEN** a connected peer's installed Crew tool has a confirmed available update
- **THEN** the row says Update available and identifies Crew and that peer in a concise one- or two-line status without machine switching
- **AND** its single action is Update for all connected pending plugin updates

#### Scenario: No pending updates or unconfirmed evidence
- **WHEN** an authoritative completed check confirms no pending plugin update on this computer or any connected machine
- **THEN** the row remains visible with `Up to date. Checked at HH:MM.` using the local completion time and a Check now action
- **AND** missing tools, optional recommendations and failed checks are not presented as pending updates
- **AND** merely opening Updates, checking or reconnecting does not install anything

#### Scenario: Unknown or failed first check
- **WHEN** there is no successful complete discovery or the check fails
- **THEN** the row uses the existing short not-checked or check-failed style and Check now rather than inventing an up-to-date claim or check time
- **AND** confirmed pending facts survive uncertain rechecks and continue contributing to the existing dots

#### Scenario: Explicit check and busy feedback
- **WHEN** Check now is used
- **THEN** it requests read-only discovery across this computer and connected peers through the existing single-flight path
- **AND** its action shows Checking while the unexpired scan runs and matches the sibling row's recent successful-check feedback
- **AND** completion replaces the status immediately without adding controls or changing native or customization checks

### Requirement: One explicit local-first plugin batch update
The row's explicit Update SHALL use existing per-plugin actions and safety rules, processing this computer first and connected peers sequentially in all-machine inventory order. Its status text SHALL summarize progress, named machine failures and results within the same row. Failures SHALL NOT prevent remaining machines from being attempted, successful results SHALL be retained and uncertain writes SHALL NOT be automatically replayed.

#### Scenario: Multiple pending updates
- **WHEN** Update is activated with pending updates on this computer and two connected peers
- **THEN** existing plugin update actions run for this computer first and then each peer in inventory order, without overlapping machine updates
- **AND** each action uses its captured machine rather than the currently selected Settings machine
- **AND** the row's concise status identifies the active plugin and machine and its action shows disabled Updating while duplicate clicks cannot start another batch

#### Scenario: Failed or disconnected machine during update
- **WHEN** one machine refuses, disconnects or returns an uncertain update outcome
- **THEN** the same row's status names the affected plugin, machine and short failure or uncertainty without navigating away or adding a block
- **AND** remaining machines are still attempted and confirmed successes remain represented in the final result
- **AND** a timeout or missing result is not reported as success or automatically retried

#### Scenario: Recheck replaces stale availability
- **WHEN** a captured pending update is no longer pending before its turn, or an update action finishes
- **THEN** authoritative plugin checks determine the resulting pending state
- **AND** already-current targets are not updated unnecessarily and successful invocation alone does not invent currency
- **AND** existing per-plugin enablement, confirmation and execution-safety restrictions remain effective

#### Scenario: Successful batch result
- **WHEN** the batch completes and authoritative rechecks confirm all connected targets are current
- **THEN** the single row shows its up-to-date result with the successful check time and returns to Check now after the standard recent-check feedback
- **AND** plugin availability dots clear without changing independently required native or customization dots

### Requirement: Accurate update cadence explanation
The Settings Updates explanation SHALL use exactly: “Herdr looks for both every hour and tells you in the corner. herdr-core runs your terminals, so they keep running through its updates.” It SHALL NOT mention Custom's check cadence or the Git relay. Detailed cadence documentation and actual update behavior SHALL remain unchanged.

#### Scenario: Reading the Updates explanation
- **WHEN** a person opens Settings Updates
- **THEN** the paragraph beneath the four rows reads exactly “Herdr looks for both every hour and tells you in the corner. herdr-core runs your terminals, so they keep running through its updates.”
- **AND** it contains no Custom check cadence or relay explanation
- **AND** herdr-core's role running terminals and their continuity through its updates remains explained

## ADDED Requirements

### Requirement: Expiring plugin discovery action guard
An abandoned plugin discovery scan SHALL disable the plugin row's action only until its 90-second lease expires. Retired owners and obsolete reads SHALL NOT replace current facts. Expiry SHALL release the scan-only action guard without starting work, bypassing batch or plugin-fix ownership, or authorizing uncertain-write replay.

#### Scenario: Owner retires before discovery cleanup
- **WHEN** the discovery owner closes before its scan metadata is cleared
- **THEN** a replacement Settings row respects the still-unexpired lease and preserves confirmed pending facts
- **AND** retired results cannot overwrite newer facts

#### Scenario: Discovery lease reaches expiry
- **WHEN** an abandoned scan reaches its expiry without a fresh discovery
- **THEN** its metadata no longer disables Check now or Update, including at the exact expiry boundary
- **AND** rendering and expiry perform no check or update by themselves

#### Scenario: Other action ownership remains active
- **WHEN** discovery expires while a batch or ordinary plugin fix still owns an action
- **THEN** its existing action guard remains effective and expiry does not start or replay a write
