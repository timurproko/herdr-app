# Spec Delta

## MODIFIED Requirements

### Requirement: Reviewed native compatibility and recovery
Native exceptions SHALL remain explicit, ownership-checked and limited to existing opt-ins during automatic refresh. Palette and feedback SHALL use proven current stock, required capabilities and guarded structural compatibility rather than reviewed-version or whole-file review membership. Unsafe writes, corrupt records and personal edits SHALL remain failures. Recovery SHALL preserve originals and SHALL NOT replace live session documents or restart terminals/agents.

#### Scenario: Unknown upstream patch target
- **WHEN** an opted-in patch encounters a target whose current-stock provenance cannot be established or whose necessary structure is incompatible
- **THEN** the app leaves target, helpers, opt-in and recovery record unchanged and identifies the concrete incompatibility in a visible optional-patch advisory
- **AND** unrelated deployment succeeds if its other required checks succeed, while diagnostics distinguish inactive stock from retained old output
- **AND** no reviewed baseline is manufactured and no additional patch is enabled

#### Scenario: Recognized owned or reviewed patch target
- **WHEN** an opted-in patch has positively identified current-host stock, compatible required structures/capabilities and no ownership conflict
- **THEN** automatic refresh applies the structurally derived customization with guarded activation and recovery
- **AND** the same decision is made regardless of whether the release or complete source bytes have been reviewed before

#### Scenario: Old owned patch masks a changed host
- **WHEN** an old owned patch remains installed after a host change
- **THEN** automatic refresh establishes the current native source independently of the owned patch hash before transforming it
- **AND** a compatible current source permits refresh without another whole-file review
- **AND** unavailable current-source evidence leaves the old output and recovery records untouched with an explicit retained-but-unverified advisory

#### Scenario: Patch safety conflict
- **WHEN** refresh encounters a corrupt record, personal dependency conflict or concurrent edit while applying a supported patch
- **THEN** it retains hard failure reporting and never treats that unsafe operation as a harmless compatibility skip
- **AND** it restores transaction-owned unchanged bytes on failure or reports recovery-required with retained backups if restoration is obstructed

#### Scenario: Rollback after a later personal edit
- **WHEN** rollback encounters bytes changed after the recorded deployment
- **THEN** it refuses to overwrite the later edit

## ADDED Requirements

### Requirement: Preserved stock and checked native transforms
Palette and feedback customization SHALL retain raw native originals and transform positively identified current stock without executing it during inspection. Necessary edit sites SHALL be uniquely identified and the resulting source and dependency graph SHALL pass self-checks before activation. Native behavior outside authorized Custom edit sites SHALL be preserved.

#### Scenario: Compatible source without a release review
- **WHEN** a new stock version preserves necessary structures and required capabilities, including with changed whitespace or line endings
- **THEN** the patch can activate without adding the version or complete source to an allowlist
- **AND** restoration preserves the raw original bytes rather than a parser-normalized copy

#### Scenario: Missing ambiguous or invalid edit site
- **WHEN** an essential site is missing or ambiguous, required capabilities are absent, or transformed output fails its self-check
- **THEN** the patch is skipped before live mutation with the failed site or capability named
- **AND** no partial set of Custom behaviors is certified as active

#### Scenario: Unknown personal source
- **WHEN** a target parses and contains plausible anchors but is neither positively current native stock nor recognized owned output
- **THEN** it is not adopted as stock or overwritten by the transform

### Requirement: Recoverable native patch activation
Native patch activation SHALL publish only a complete dependency graph through an atomic entrypoint change and retain durable recovery information. Apply, refresh and restore SHALL serialize their own mutations, recheck ownership and report detected interference. Interrupted or failed work SHALL never silently report complete success.

#### Scenario: Preparation or activation failure
- **WHEN** staging, writing, activating or checking a patch fails
- **THEN** the previous entrypoint and recoverable state are retained or restored without exposing missing dependencies
- **AND** no unrelated personal files are overwritten

#### Scenario: Interrupted operation or obstructed recovery
- **WHEN** a previous mutation was interrupted or safe rollback is blocked by another writer or filesystem failure
- **THEN** diagnostics report interrupted or recovery-required state and retain original backups and the transaction record
- **AND** a later mutation resolves that state before starting another patch operation rather than silently adopting it

#### Scenario: Repeated apply and restore after upgrade
- **WHEN** an unchanged complete patch is refreshed again, or a verified patch is explicitly restored after a stock update
- **THEN** refresh is an idempotent no-op and restore uses current proven stock rather than downgrading it to an older release
- **AND** unknown newer stock and later personal edits remain protected

### Requirement: Unified optional patch diagnostics
Deployment, startup refresh, explicit patch operations and doctor SHALL use the same compatibility and ownership verdict. Diagnostics SHALL distinguish active checked output, repair-needed output, retained unverified output, concrete incompatibility and unsafe recovery/conflict states. Read-only inspection SHALL NOT mutate patch files or records.

#### Scenario: Prior opt-in after native startup reset
- **WHEN** native startup replaces an opted-in frame with compatible current stock and removes its helper files
- **THEN** the shared repair path can reconstruct and activate the complete customization without another release review
- **AND** an otherwise identical installation without a prior opt-in is left untouched

#### Scenario: Read-only doctor
- **WHEN** doctor inspects an incompatible or interrupted patch
- **THEN** it names the unmet requirement or recovery condition without applying or repairing the patch
- **AND** advisory incompatibility and hard ownership/recovery errors remain distinct
