# Spec Delta

## ADDED Requirements

### Requirement: Owned installed shell integration
Full deployment SHALL install and track `bash-cwd-loader.sh`, `bash-cwd.sh`, `powershell-cwd.ps1` and a content `revision` under the selected home's `.customizations/runtime/shell/`. Installation and recovery SHALL preserve existing ownership, conflict, locking and later-edit refusal safeguards. Bash SHALL resolve its payload and revision beside the sourced loader without checkout or yadm-state dependencies.

#### Scenario: Alternate home and absent historical checkout
- **WHEN** shell profiles source the installed scripts from a selected disposable home and the historical source folder and yadm marker do not exist
- **THEN** directory reporting uses the installed scripts without accessing either historical path
- **AND** changing the shell's current directory does not change the loader's payload location

#### Scenario: Compatible payload update in an existing idle Bash shell
- **WHEN** deployment publishes a changed content revision after updating the shell files and an existing interactive Herdr terminal reaches its next idle prompt
- **THEN** its dispatcher reloads the compatible Bash payload and reports the directory while preserving the prior command's exit status
- **AND** repeated sourcing retains existing string or array prompt hooks without duplicate Herdr dispatchers

#### Scenario: Captured tool shell or terminal without Core identity
- **WHEN** the Bash hook is sourced without an interactive TTY or without `HC_TERMINAL_ID`
- **THEN** it neither registers a reporting hook nor invokes Core
- **AND** the PowerShell reporter retains its existing console and Core-identity guards

#### Scenario: Modified installed shell file
- **WHEN** a user edits an owned shell file and deployment would replace those unrecognized bytes
- **THEN** deployment reports a conflict before unrelated writes
- **AND** no new revision is published

### Requirement: Checkout-independent installed preference export
Full deployment SHALL provide `.customizations/runtime/scripts/export-preferences.mjs` accepting `export <home>` without a source checkout. It SHALL export the existing lowercase-hostname, layout, palette and native-theme snapshots into that home's `preferences/` when available, retaining existing schemas, filtering and palette ownership checks. Installed layout validation SHALL use the deployment's recorded layout base. The entrypoint SHALL reject import and other actions.

#### Scenario: Snapshot parity without source access
- **WHEN** the installed entrypoint exports a disposable home whose deployment matches the source command's baseline, with the originating checkout unavailable
- **THEN** its host, layout, palette and theme snapshot bytes match the source export for the same inputs
- **AND** it leaves live shared state, settings, ownership, palette metadata, layout and native theme unchanged

#### Scenario: Explicit export home overrides environment
- **WHEN** the installed entrypoint receives `export` and an explicit disposable home while the environment selects another home
- **THEN** it writes snapshots only under the explicit home's `preferences/`

#### Scenario: Export refusal safeguards
- **WHEN** export encounters an invalid layout override, missing required deployment layout baseline, palette ownership conflict or a credential rejected by the existing filter
- **THEN** it fails rather than substituting checkout state or weakening the existing validation

#### Scenario: No automatic restoration
- **WHEN** the installed entrypoint receives `import` or another unsupported action
- **THEN** it exits unsuccessfully without writing live state or snapshots
- **AND** build, deploy and pull do not trigger preference import

### Requirement: Explicit shell-only installation and recovery
An explicit shell-only deployment SHALL install the same four shell files using the shared ownership record and recovery journals without requiring Desktop, a Custom layout or an existing installation. It SHALL preserve all other owned assets and layout preferences and SHALL NOT invoke native checks or patch refreshes. A later full deployment SHALL recognize its shell ownership. Shell-only rollback SHALL require a valid backup ID and a verified shell-only journal.

#### Scenario: Fresh Core-only host
- **WHEN** shell-only installation targets a disposable home with no Desktop or Custom layout
- **THEN** only the four shell runtime files and normal deployment bookkeeping are created
- **AND** no mods, layout, theme, preference projection, process changes or remote installation are performed

#### Scenario: Full and shell-only deploy coexist
- **WHEN** a full deployment follows shell-only installation, or shell-only deployment follows a full installation
- **THEN** both use the same shell ownership hashes and paths without conflicts from installer provenance
- **AND** shell-only updates preserve non-shell bytes, ownership entries, layout base and preference files

#### Scenario: Core-only shell rollback
- **WHEN** explicit shell-only rollback selects a verified shell-only deployment journal with no later edits or newer deployment
- **THEN** it restores the recorded shell bytes and ownership without invoking Desktop or native patch workers
- **AND** ordinary rollback retains its stock-layout requirement and backup-ID requirement

#### Scenario: Shell rollback cannot bypass full-deployment safeguards
- **WHEN** shell-only rollback receives a mixed journal, changed non-shell ownership or layout metadata, modified preferences, later personal edits or a newer ownership record
- **THEN** it refuses before writing rather than bypassing ordinary recovery gates
