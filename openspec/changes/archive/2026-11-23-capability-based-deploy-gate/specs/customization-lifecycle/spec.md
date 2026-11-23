# Spec Delta

## ADDED Requirements

### Requirement: Capability-based desktop host compatibility
Desktop deployment SHALL require the minimum supported App version, all required public APIs and commands, and compliance with the direct-import boundary. Review-list membership SHALL be metadata rather than permission. Newer unreviewed capable releases SHALL pass with a visible newer-than-last-reviewed advisory. Tab-move source audits SHALL remain advisory, independently of runtime capability, generation and document-shape checks.

#### Scenario: Capable newer unreviewed host
- **WHEN** an installed App newer than the last reviewed release meets the minimum version and all public capability and import checks
- **THEN** the host check succeeds while reporting the installed version, unreviewed status and newer-than-last-reviewed advisory
- **AND** a tab-move audit reporting needs-review, source-unavailable or fixture failure does not change that public-host verdict

#### Scenario: Actual incompatibility
- **WHEN** the App is older than the minimum, lacks a required API or command, or customization code violates the direct-import boundary
- **THEN** the host check fails and names the unmet requirement even if the version is reviewed
- **AND** malformed or unavailable version/capability evidence does not claim compatibility

### Requirement: Honest unreviewed stock baseline coverage
Stock integration checks SHALL distinguish unreviewed baseline coverage from a real stock-byte mismatch. They SHALL NOT silently reuse an older release baseline for a newer App, adopt personal or patched bytes as stock, or imply a release review from capability-check success. Version-independent regression checks SHALL remain executable when release-specific stock coverage is unavailable.

#### Scenario: Installed release has no reviewed baseline
- **WHEN** integration checks run against a release without a reviewed stock baseline
- **THEN** they report the missing stock-review coverage explicitly without a missing-file crash or a fabricated reviewed result
- **AND** version-independent fixture checks still execute

#### Scenario: Reviewed stock mismatch
- **WHEN** a reviewed release's stock file differs from its recorded baseline without an existing authorized exception
- **THEN** stock validation continues to fail rather than adopting the changed bytes

## MODIFIED Requirements

### Requirement: Reviewed native compatibility and recovery
Native exceptions SHALL remain explicit, reviewed-byte-gated and ownership-checked; updates SHALL refresh only prior opt-ins. Unknown targets SHALL remain untouched and automatic refresh SHALL skip unsupported entrypoints with a visible advisory, not fail unrelated deployment. Personal dependency conflicts, corrupt records and unsafe writes SHALL remain failures. Recovery SHALL refuse later personal edits and SHALL NOT replace live session documents or restart terminals/agents.

#### Scenario: Unknown upstream patch target
- **WHEN** an existing opted-in patch encounters an unknown upstream target
- **THEN** the app leaves the target, helpers and recovery record unchanged and reports that the optional patch was skipped pending review
- **AND** ordinary customization deployment succeeds if its other required checks succeed, while diagnostics report the inactive patch as advisory
- **AND** no reviewed baseline is manufactured and no additional patch is enabled

#### Scenario: Recognized owned or reviewed patch target
- **WHEN** an opted-in patch has reviewed current-host native provenance, a recognized installed target or reviewed upstream original, and no dependency conflict
- **THEN** automatic refresh retains the existing guarded apply and recovery behavior

#### Scenario: Old owned patch masks a changed host
- **WHEN** a previous owned patch remains installed but the current host's native original cannot be verified against reviewed bytes
- **THEN** automatic refresh leaves that patch and its recovery records unchanged and reports retained but unreviewed compatibility
- **AND** an ownership hash alone does not authorize patch reapplication against the new host

#### Scenario: Patch safety conflict
- **WHEN** refresh encounters a corrupt record, personal dependency conflict or concurrent edit while applying a supported patch
- **THEN** it retains failure reporting and never treats that unsafe operation as a harmless unreviewed-target skip

#### Scenario: Rollback after a later personal edit
- **WHEN** rollback encounters bytes changed after the recorded deployment
- **THEN** it refuses to overwrite the later edit

### Requirement: Durable desktop revision and partial outcomes
Real deploy:all runs SHALL record latest per-machine outcomes and successful desktop commit with installed ownership evidence, without changing the ownership manifest schema. Dry-run SHALL NOT write these records. Desktop success SHALL remain distinct from peer skips/failures; uncertain installation SHALL NOT claim a verified revision. Definite failures SHALL retain an actionable stage and cause through the result, runner and Settings row, including the App version for a host-check refusal.

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
- **THEN** the row states the failed stage and a short cause, including the App version for a host-check refusal, with documented rollback and matching log path
- **AND** no automatic rollback occurs or journal, stock-layout or later-edit safety gate is bypassed

#### Scenario: Advisory optional patches do not undo success
- **WHEN** customization deployment succeeds while an unsupported optional frame target is skipped
- **THEN** all-machine results and Settings retain the successful desktop revision rather than reporting deployment failure
- **AND** the detailed deployment result exposes which patch was skipped and why
