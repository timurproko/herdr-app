# Spec Delta

## ADDED Requirements

### Requirement: Installed component revision provenance
Deployment SHALL record the built source commit and clean, dirty or unknown status separately for desktop and shell output. It SHALL NOT infer installed revision from a checkout's current HEAD. Scoped deployments SHALL identify mixed output instead of claiming a complete release; legacy manifests SHALL remain readable without inventing a revision.

#### Scenario: Full deployment followed by a shell update
- **WHEN** a full deployment of one clean commit is followed by shell-only deployment of another
- **THEN** desktop and shell retain their respective installed source revisions
- **AND** shell deployment preserves non-shell files, preferences and provenance

#### Scenario: Scoped or dirty development deployment
- **WHEN** only selected desktop files are deployed or source contains uncommitted changes
- **THEN** Settings identifies the installation as mixed or a development build rather than up to date with a published release
- **AND** the ordinary one-click release update is unavailable for that development installation

#### Scenario: Legacy installation
- **WHEN** an existing deployment manifest has no source provenance
- **THEN** Settings shows an unknown installed revision and never claims it is up to date
- **AND** explicitly approved replacement with the shown main revision can establish provenance without guessing its previous commit

#### Scenario: Metadata-only deployment and recovery
- **WHEN** a deployment changes component provenance without changing payload bytes
- **THEN** that metadata change is journaled and recoverable with the same newer-record refusal guarantees as payload changes
- **AND** shell-only recovery accepts only its own shell provenance changes, never desktop metadata changes

### Requirement: Custom update row and availability indicator
Custom Settings Updates SHALL retain Herdr and herdr-core controls and add customization rows with installed revision, last successful check, availability, a bounded change summary and explicit Check now and Update actions. The Custom Settings navigation and expanded/compact sidebar indicator SHALL include confirmed actionable customization updates without masking native readiness.

#### Scenario: Published update available
- **WHEN** a successful check finds a newer main commit applicable to an eligible installed component
- **THEN** its row shows the target revision, a short change summary and Update
- **AND** Custom's Updates navigation and Settings corner indicator show availability
- **AND** opening the page alone does not clear availability

#### Scenario: Completion or failed check
- **WHEN** an update completes and installed output is verified against the advertised target
- **THEN** that component no longer contributes availability to the indicator
- **AND** other machines' available updates and native readiness remain visible
- **AND** a later failed check retains last-known facts with a stale/error label rather than claiming up to date

### Requirement: Published-source isolation for UI updates
UI updates SHALL use only a dedicated managed clone at the prescribed target-machine path and a captured commit from this repository's published main branch. They SHALL reject dirty, ahead, diverged, linked, redirected or wrong-origin checkouts without repair. They SHALL NOT operate on development clones or crew worktrees, reset history, stash changes or deploy unpublished work.

#### Scenario: Main changes after the click
- **WHEN** main advances after the user clicks Update for a displayed target commit
- **THEN** the operation deploys only that captured commit if it is still a valid published fast-forward target
- **AND** it does not silently substitute a newer commit or downgrade a newer installation

#### Scenario: Unsafe checkout
- **WHEN** the managed path is dirty, ahead, diverged, a symlink or junction, a linked checkout, a shared worktree repository or the wrong repository
- **THEN** the update refuses with the reason before changing working-tree files or installed payload
- **AND** no arbitrary development path is offered as a fallback

### Requirement: Bounded manual live customization updates
An Update click SHALL run the existing compatibility/build/full-deploy policy locally, or build/shell-only-deploy remotely, without a terminal, restart or input injection. Jobs SHALL be bounded, serialized and observable across Settings reloads, with durable phase, result, log location and backup identity. Partial or unknown results SHALL NOT be reported as success or automatically replayed.

#### Scenario: Settings is redeployed during its own update
- **WHEN** full deployment reloads the Settings or chrome mod executing the update
- **THEN** the worker continues independently within its deadline
- **AND** a reopened page reconnects to the same operation and its persisted result
- **AND** no second update starts for the same active job

#### Scenario: Conflicting deploy or failed write
- **WHEN** another deployment holds the target lock or deployment fails during writes or patch refresh
- **THEN** the row reports busy or the failed phase and any available backup identity
- **AND** partial installation remains recovery-required until reconciled, not a newly verified revision

#### Scenario: Full rollback safety
- **WHEN** recovery from a full update is requested
- **THEN** instructions preserve the explicit backup ID and Herdr/main layout requirement
- **AND** the update job never silently switches layout, bypasses later-edit checks or automatically rolls back under Custom

### Requirement: Remote existing shell installation updates
Updates SHALL show machine-qualified shell status for configured remote machines and update an existing eligible shell installation through the existing machine transport. Remote Update SHALL run only shell deployment and preserve non-shell ownership and preferences. Offline, authentication-required, absent and unsupported states SHALL be explicit, without queued updates or automatic first installation.

#### Scenario: Connected Core-only pc2-style host
- **WHEN** the user updates an existing shell installation on a connected machine with an eligible default checkout
- **THEN** fetch, build and shell-only deployment execute there using its own home and environment
- **AND** no remote Desktop, full deploy, profile rewrite or process restart is required

#### Scenario: Missing checkout or offline machine
- **WHEN** a remote machine is disconnected, needs login, has no shell installation or lacks the default checkout
- **THEN** its row explains the state, preserves any clearly marked last-known revision and disables Update
- **AND** reconnecting never replays a previous click
- **AND** first installation remains a separate explicitly documented action

### Requirement: Check-only automatic network activity
While Custom is mounted, automatic update checks SHALL be rate-limited to at most hourly, with a visible last-success timestamp and manual Check now. Checks SHALL use only public source metadata and connected-machine read-only probes. They SHALL NOT clone, fast-forward, install, deploy or change shell profiles. No updater service SHALL run when the desktop is closed, except an already-approved bounded update job finishing.

#### Scenario: Background discovery without approval
- **WHEN** an automatic check discovers a newer published revision
- **THEN** it updates availability facts and the indicator only
- **AND** installed files and all source checkouts remain unchanged

#### Scenario: Native eager checking
- **WHEN** Herdr loads the mods for an eager native check rather than normal use
- **THEN** no update network check, worker launch or machine mutation is started
