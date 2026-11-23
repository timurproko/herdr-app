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

#### Scenario: Snapshot restore safeguards remain unchanged
- **WHEN** a user explicitly restores preferences from the new snapshot directory
- **THEN** restore still requires the desktop to be closed, refuses conflicting personal palettes and preserves unrelated runtime/session state
- **AND** snapshot schemas and credential filtering remain unchanged

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

### Requirement: Private preference snapshot storage
Preference export/import SHALL use `preferences/` inside the selected Herdr home for host snapshots and portable visual snapshots, never the source checkout. Home selection SHALL match deployment: an explicit home argument, otherwise nonempty `HERDR_APP_HOME`, otherwise `~/.config/herdr-app`. Host filenames SHALL retain lowercase hostname naming. Visual snapshots SHALL NOT be shipped defaults; authored defaults SHALL remain independent.

#### Scenario: Selected home from the environment
- **WHEN** export is invoked from a checkout with `HERDR_APP_HOME` set to a disposable home
- **THEN** the host snapshot is written to that home's `preferences/<lowercase-hostname>.json`
- **AND** portable `layout.json`, `palette.json` and `theme.json` snapshots use that same preference directory when available
- **AND** no snapshot is written into the checkout

#### Scenario: Default home without environment override
- **WHEN** export/import is invoked without an explicit home and with `HERDR_APP_HOME` unset or empty
- **THEN** snapshots are read from or written to `~/.config/herdr-app/preferences/`

#### Scenario: Explicit home argument
- **WHEN** export/import selects an explicit disposable home while `HERDR_APP_HOME` names another fixture
- **THEN** snapshot access uses only the explicit home's preference directory

#### Scenario: Portable visual snapshot restore
- **WHEN** the selected home contains visual snapshots and the user explicitly imports with the desktop closed
- **THEN** layout overrides, palette picker metadata and native-schema theme are restored through the existing validation and conflict checks
- **AND** neither import nor build depends on tracked visual snapshot files in the checkout

#### Scenario: Legacy checkout host snapshot is not migrated
- **WHEN** an old checkout contains a host snapshot and the selected home has none for this host
- **THEN** restore ignores the old checkout snapshot and leaves local profiles unchanged
- **AND** export/import neither moves nor deletes the old snapshot
- **AND** documentation tells the user to relocate it manually into the selected home's preference directory

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

### Requirement: Published-main source gate for all-machine deployment
`npm run deploy:all` SHALL fetch origin and require its source checkout to be clean main of this repository, equal to or behind origin/main, before deploying or contacting peers. Unsafe or unverifiable source SHALL refuse the entire run without stashing, resetting or switching branches. Selection options SHALL NOT bypass this gate.

#### Scenario: Clean source behind published main
- **WHEN** a selected desktop checkout is clean main and behind origin/main
- **THEN** the command fast-forwards it and runs the existing full deploy pipeline
- **AND** records the source commit used by that deployment

#### Scenario: Unsafe source blocks every machine
- **WHEN** the source is dirty, on another branch, ahead, diverged, from another repository or cannot be safely compared with origin/main
- **THEN** the command exits non-zero with a clear refusal before local deployment or peer discovery/execution
- **AND** it leaves source files and branch unchanged, including with --skip-local or remote-only selection

#### Scenario: Equal checkout commits do not imply installed currency
- **WHEN** the source HEAD already equals origin/main and local deployment is selected
- **THEN** the existing full deployment still runs to determine whether installed output needs updating

### Requirement: Existing remote checkout shell deployment
The command SHALL discover peers with `hc machine ls --json` and use bounded terminal-free `hc exec --on` for selected connected peers. It SHALL fast-forward eligible existing clean main checkouts of this repository at `~/.local/share/herdr-app` and run shell-only deployment into that peer's default Herdr home. It SHALL NOT remotely clone, install tools, repair checkouts or update full desktop installations.

#### Scenario: Eligible Core-only peer
- **WHEN** a connected peer has the expected clean main checkout, required tools and equal-or-behind history
- **THEN** the command fetches, fast-forwards when needed and runs the existing shell-only deployment
- **AND** the target is that peer's ~/.config/herdr-app, never the desktop's home or a nondefault environment override

#### Scenario: Ineligible or unavailable peer
- **WHEN** a peer is offline, lacks the checkout or git/node/npm, has unsupported Node, wrong repository, non-main, dirty, ahead or diverged history, or an unreadable ownership record
- **THEN** the command skips that peer with one clear reason without provisioning or repairing it
- **AND** continues to the other selected peers

#### Scenario: Peer has a full desktop deployment
- **WHEN** the remote installation owns non-shell output or records a full layout baseline
- **THEN** the command skips it with a line saying it needs its own full deploy
- **AND** does not fast-forward or run shell-only deployment there

#### Scenario: Local or remote deployment fails
- **WHEN** one selected machine's deployment or fetch fails or a dispatched remote call times out or disconnects
- **THEN** that machine reports failure and remaining selected peers are still attempted
- **AND** an unknown outcome is not automatically retried or declared successful

### Requirement: Explicit deployment selection and read-only preview
The command SHALL accept --only with comma-separated machine names and --skip-local. It SHALL accept --dry-run to compare fetched main and report intended actions without fast-forward, build or deployment. Fetching objects and remote-tracking refs SHALL be the only dry-run mutation exception.

#### Scenario: Selected peers only
- **WHEN** --only names specific peers and --skip-local is supplied
- **THEN** only those peers are eligible for deployment and the desktop is skipped
- **AND** the source safety gate still runs and unknown selector names fail clearly before deployment

#### Scenario: Dry-run with available updates
- **WHEN** --dry-run examines safe local and remote checkouts behind published main
- **THEN** it fetches to compare and prints would-deploy actions with target commits
- **AND** leaves branch HEADs, working files, generated output, installed homes and backup journals unchanged

### Requirement: Per-machine deployment outcome summary
The command SHALL end with machine, action, source commit and printed backup ID for each machine, using a missing-value marker when unavailable. It SHALL distinguish deployed, already current, stated skips and failures, and SHALL NOT present checkout HEAD as installed provenance. Any failure SHALL yield non-zero exit; successful, current and stated-skip outcomes alone SHALL yield zero.

#### Scenario: Changed and unchanged deployment results
- **WHEN** one installer reports changed output and a backup while another succeeds with no changes
- **THEN** the summary reports deployed with its commit/backup and already current with its source commit and no fabricated backup

#### Scenario: Mixed success skip and failure
- **WHEN** some peers succeed, another is skipped for a stated reason and one fails
- **THEN** every outcome appears in the final summary and the command exits non-zero
- **AND** the failing row labels its SHA as attempted rather than successfully installed

#### Scenario: Only successful and skipped machines
- **WHEN** all selected machines deploy, are already current or are skipped with reasons
- **THEN** the command exits zero and preserves each deploy's printed backup ID

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

### Requirement: Managed desktop all-machine update
The row's explicit Update SHALL use only a managed desktop clone at ~/.local/share/herdr-app, created on first Update if absent. It SHALL invoke the existing deploy:all policy for full desktop and eligible existing peer shell updates, retaining clean-main and ownership gates. It SHALL NOT touch development checkouts, repair unsafe source or provision missing peer clones.

#### Scenario: Managed clone absent
- **WHEN** Update is clicked without a managed desktop clone
- **THEN** the action creates that clone from the fixed public main and deploy:all fetches and fast-forwards safe source there
- **AND** Check now never creates a clone or deploys

#### Scenario: Unsafe managed source
- **WHEN** the managed path redirects into another checkout, is a linked worktree, or fails the existing source gate
- **THEN** Update refuses without stashing, resetting, switching or repairing source
- **AND** the maintainer's development checkout and crew worktrees remain untouched

### Requirement: Reload-independent bounded update result
An update SHALL run independently of the mod it replaces, with a finite deadline and one latest durable status/result/log under the selected Herdr home. Reload, closing Settings or duplicate clicks SHALL NOT cancel or repeat it. A missing final result SHALL NOT imply success. No daemon, scheduler or job history SHALL be introduced. Replacement of an open Updates view SHALL preserve that section and reconcile truthful row feedback without exporting navigation state as preferences.

#### Scenario: Page replaced during deploy
- **WHEN** deployment replaces Settings or the user closes and reopens it
- **THEN** the same update continues independently and the row reattaches to its status
- **AND** it shows Updating all machines with a disabled action until a result is known

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

### Requirement: Custom-owned update indicators and hourly checking
Confirmed Custom availability SHALL contribute to existing Custom Settings navigation and expanded/compact chrome update dots without changing native readiness. Custom SHALL check every 120–180 seconds while its non-footer chrome is mounted, with jitter, bounded failure backoff, startup and supported resume/focus catch-up, and when explicitly requested, coalescing concurrent checks. Checks SHALL NOT deploy, inspect peers or run in eager native checking contexts.

#### Scenario: Availability and failed recheck
- **WHEN** a check confirms an available Custom update and a later check fails
- **THEN** the existing Custom indicators retain that confirmed availability without fabricating a new one
- **AND** opening Updates alone does not clear it

#### Scenario: Automatic check while mounted
- **WHEN** the automatic check is due with Custom mounted outside an eager checking context
- **THEN** one coalesced published-main check runs without cloning, deploying or contacting machines
- **AND** native Herdr and herdr-core update actions and readiness remain unchanged

#### Scenario: Manual availability reaches existing visible markers
- **WHEN** a manual Settings check confirms a Custom update is available with native App readiness off
- **THEN** the already-mounted expanded footer Settings icon, compact More trigger and Settings Updates navigation item show the same markers used for native readiness without reopening or remounting
- **AND** the compact More popup Settings entry carries the same six-pixel accent-circle indicator
- **AND** there is no new update-specific tooltip, badge or count

#### Scenario: Native and Custom availability combinations
- **WHEN** native App readiness and Custom availability independently change between available and current
- **THEN** each footer marker is visible when either is available and absent when both are current
- **AND** Settings Updates navigation additionally retains its native unmanaged-Core-ready condition and managed-Core exclusion
- **AND** native-only and Custom-only availability produce identical marker markup and styling on each surface

#### Scenario: Startup and return after idle
- **WHEN** Custom starts, its supported window activation signal returns after at least two minutes idle, or a delayed timer detects a sleep gap
- **THEN** it schedules one bounded catch-up check, reusing an active check and respecting persisted failure backoff
- **AND** rapid focus changes do not issue repeated checks or arm manual recent-check feedback

#### Scenario: Healthy independent desktops
- **WHEN** two running Desktop/Custom machines have different installed revisions and neither has a relay configured
- **THEN** each checks public main using its own installed evidence on the 120–180 second healthy cadence without opening Settings
- **AND** neither relies on the merging computer or the other's state

#### Scenario: Offline machine and manual retry
- **WHEN** automatic main checks repeatedly fail
- **THEN** retries back off with jitter to a bounded maximum of 30 minutes and survive view replacement or app restart
- **AND** automatic triggers cannot repeatedly bypass the failure delay, while explicit Check now retains its cache-bypass behavior and check lease
- **AND** a successful check restores the healthy cadence without clearing deployment failures, locks or unknown outcomes

### Requirement: Merge hints trigger authoritative availability checks
With an enabled, configured Git relay, mounted Custom updates SHALL subscribe independently of Git panel visibility or selected repository. Only pushes to refs/heads/main or closed merged PRs targeting main in timurproko/herdr-app SHALL invalidate its healthy cache. Hints SHALL trigger bounded coalesced authoritative main checks, never set availability directly or launch an update. Polling SHALL remain the fallback.

#### Scenario: Merge while Git panel is hidden or elsewhere
- **WHEN** an authenticated matching main push or merged-PR notice arrives while Git is hidden or showing another repository
- **THEN** an authoritative main check is scheduled promptly without waiting for the normal healthy cache expiry
- **AND** only the main comparison with verified installed evidence decides the shared badge
- **AND** no fetch into a checkout, deployment, native update or agent action is started by this update subscriber

#### Scenario: Irrelevant or incomplete event
- **WHEN** a notice names another repository, another branch, an unmerged PR closure, a CI event, or lacks valid branch/merge metadata
- **THEN** it does not invalidate Custom's main cache or change its badge

#### Scenario: Duplicate burst during a check
- **WHEN** duplicate or related push and PR notices arrive together or while a main check is running
- **THEN** delivery deduplication, a short debounce and a bounded rate limit coalesce them into one check with at most one pending catch-up
- **AND** late older results cannot overwrite newer update state or bypass failure backoff

#### Scenario: Missed event and reconnection
- **WHEN** relay authentication reconnects successfully after missed deliveries
- **THEN** updates request one coalesced authoritative catch-up, subject to failure backoff
- **AND** missing or old relay metadata still leaves polling, startup and idle-return checks working

#### Scenario: Availability only under every trigger
- **WHEN** an automatic or event-driven check finds main newer than the installed revision
- **THEN** existing dots and the Custom row reflect availability without requiring Check now
- **AND** installation still requires the person's explicit Update action with every existing source, ownership, lock and uncertain-outcome gate intact

### Requirement: Accurate update cadence explanation
The Settings Updates explanation SHALL use exactly: “Herdr looks for both every hour and tells you in the corner. herdr-core runs your terminals, so they keep running through its updates.” It SHALL NOT mention Custom's check cadence or the Git relay. Detailed cadence documentation and actual update behavior SHALL remain unchanged.

#### Scenario: Reading the Updates explanation
- **WHEN** a person opens Settings Updates
- **THEN** the paragraph beneath the three rows reads exactly “Herdr looks for both every hour and tells you in the corner. herdr-core runs your terminals, so they keep running through its updates.”
- **AND** it contains no Custom check cadence or relay explanation
- **AND** herdr-core's role running terminals and their continuity through its updates remains explained

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
