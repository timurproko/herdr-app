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
Custom Settings Updates SHALL retain its native rows and add one herdr-app-custom row with a short verified installed revision when known, a short status and one action slot. Without a verified revision, its title SHALL be only herdr-app-custom. The slot SHALL show Check now, Update, Retry update, Recover update or busy/current feedback matching the native rows. It SHALL NOT add machine rows, news, settings or rollback controls. Checking and updating SHALL disable only that row's action.

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
- **AND** failures and unknown outcomes do not show the current confirmation and retain their action and safety guards, with eligible unknowns using only the separately confirmed Retry update path

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
An update SHALL run independently of the mod it replaces, with a finite deadline and one latest durable status/result/log under the selected Herdr home. Reload, closing Settings or duplicate clicks SHALL NOT cancel or repeat it. Missing results SHALL NOT imply success or automatic replay. No daemon, scheduler or job history SHALL be introduced. Replacement of an open Updates view SHALL preserve that section and reconcile truthful row feedback without exporting navigation state as preferences.

#### Scenario: Page replaced during deploy
- **WHEN** deployment replaces Settings or the user closes and reopens it
- **THEN** the same update continues independently and the row reattaches to its status
- **AND** its description retains the target-aware running wording, or `Updating.` until the target is known, with the unchanged disabled Updating… action until a result is known
- **AND** a verified peer-only update retains its Updating other machines wording and known target

#### Scenario: Open Updates view replaced
- **WHEN** an update started from Updates replaces the still-open Settings view, while the runner is active or has just finished
- **THEN** the dialog remains on Updates without requiring another navigation click
- **AND** a pending or running update never flashes a stale actionable Update or Up to date result
- **AND** completion reconciles the verified revision and published-main check, retaining failure and partial-outcome feedback and the evidence-based unknown-result recovery rules

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
- **THEN** the row reports outcome unknown with a log path unless matching settled terminal evidence proves a precise outcome
- **AND** it never automatically replays; another deployment remains blocked while prior work is active or unresolved, except through the explicit quiescence-checked unknown-retry confirmation

### Requirement: Durable desktop revision and partial outcomes
Real deploy:all runs SHALL record latest per-machine outcomes and successful desktop commit with installed ownership evidence, without changing the ownership manifest schema. Dry-run SHALL NOT write these records. Desktop success SHALL remain distinct from peer skips/failures; uncertain installation SHALL NOT claim a verified revision. Definite failures SHALL retain an actionable stage and cause through the result, runner and Settings row, including the App version for a host-check refusal.

#### Scenario: Desktop success with incomplete peers
- **WHEN** the desktop deploy succeeds but a peer fails, has an unclassified or non-benign skip, or machine inventory fails
- **THEN** the row shows the new desktop revision and one short partial-outcome line naming the matching captured log or durable result path
- **AND** the log/result contains machine reasons and available backup IDs without adding machine rows
- **AND** ordinary successful version checks do not erase the partial-outcome warning
- **AND** reachable deployment errors, locks and post-dispatch unknown outcomes never become benign offline skips

#### Scenario: Offline peers do not imply partial failure
- **WHEN** the desktop deploy succeeds and every other outcome is deployed, already current, a positively identified pre-dispatch offline/unreachable skip, or the deliberate needs-its-own-full-deploy exclusion
- **THEN** completion is successful rather than partial and the reconciled current desktop row shows Up to date without a warning or log pointer
- **AND** Custom update-available badges clear when the verified desktop matches published main
- **AND** the log and durable result still plainly record each skipped machine and reason

#### Scenario: Desktop-equipped peer remains independently updated
- **WHEN** a reachable peer is deliberately excluded because its installed non-shell output needs its own full deploy
- **THEN** the exclusion is benign for this desktop's result and creates no deferred shell deployment work
- **AND** that other desktop still needs its own full Update, with no remote full deployment or process restart

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
- **THEN** the paragraph beneath the four rows reads exactly “Herdr looks for both every hour and tells you in the corner. herdr-core runs your terminals, so they keep running through its updates.”
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

### Requirement: Byte-faithful reviewed frame originals
Reviewed palette and feedback originals MUST retain actual stock bytes, including native imports and recorded newline formats, with release tag, immutable commit, upstream source path and SHA-256 provenance. A transformed or previously patched file MUST NOT authorize native compatibility. Review status SHALL remain based on exact bytes, not version membership alone.

#### Scenario: Feedback shared by two reviewed releases
- **WHEN** the unchanged feedback source from pinned 0.1.16 and 0.1.17 is recorded as a reviewed original
- **THEN** its stored bytes and recorded digest match the corresponding native stock format rather than a facade-rewritten copy
- **AND** supported release-source and installed embedded byte formats are recorded distinctly when they differ

#### Scenario: Old owned feedback on reviewed 0.1.17
- **WHEN** an existing feedback opt-in is refreshed and the installed executable supplies the exact reviewed 0.1.17 native original
- **THEN** the existing Custom feedback replacement refreshes without an unreviewed-original advisory
- **AND** original backup bytes, ownership checks and safe restoration remain available

### Requirement: Reviewed per-original Custom palette behavior
Until owned-palette migration, reviewed opted-in stock SHALL retain Custom styling, fixed headings/fades, keyboard navigation, enabled Usage, Custom Settings/pickers, inline rename and last-tab-aware close. The 0.1.17/0.1.18 replacements SHALL retain native dynamic theme filtering, plus 0.1.18 manifest entries/dispatch. Other layouts SHALL retain native presentation/routing. Owned-palette migration SHALL retire only this palette exception, not feedback.

#### Scenario: Dynamic 0.1.17 theme choices
- **WHEN** the reviewed 0.1.17 palette is used with available themes, a light/dark setting and an active layout
- **THEN** the palette offers native dynamically discovered themes matching that mode, including non-hardcoded choices
- **AND** themes owned by another listed layout are excluded while the active layout's matching theme remains available
- **AND** selecting a theme retains its native command ID and arguments

#### Scenario: Supported 0.1.16 palette
- **WHEN** a previous palette opt-in refreshes on reviewed 0.1.16 stock before owned-palette migration
- **THEN** its Custom behavior and the release's native theme choices remain available
- **AND** removal restores the backed-up reviewed stock bytes for that release rather than another release's original

#### Scenario: Owned patch masks a release update
- **WHEN** an owned palette remains after a native update and exact reviewed embedded stock identifies the current release's palette original before owned-palette migration
- **THEN** refresh chooses the corresponding reviewed replacement without relying solely on the old patch's ownership hash
- **AND** safe removal does not downgrade the native original to the older release

#### Scenario: Unknown stock remains optional
- **WHEN** deploy, startup repair or a customization update encounters an unrecognized palette or feedback stock file
- **THEN** that patch is skipped with a clear advisory without blocking otherwise successful deployment, startup or update
- **AND** its target, helpers, opt-in and original backup remain unchanged
- **AND** missing opt-ins never enable a patch automatically, while personal conflicts, corrupt records and concurrent writes remain failures

#### Scenario: Temporary reviewed 0.1.18 restoration
- **WHEN** an existing palette opt-in refreshes against exact reviewed 0.1.18 stock before owned-palette migration
- **THEN** Custom presentation and safe routing return while native manifest contributions, argument validation, deduplication, shortcut matching and explicit clone arguments remain available
- **AND** 0.1.17 continues selecting its own reviewed replacement

#### Scenario: Native 0.1.18 manifest contributions
- **WHEN** reviewed 0.1.18 stock is replaced and installed mods provide palette metadata
- **THEN** the palette retains native asynchronous manifest discovery, the Mod group, required-argument and target validation, canonical deduplication and object or index-shorthand hotkey matching
- **AND** malformed or unreadable contributions, missing mod entrypoints and invalid foreign mod commands are skipped with native semantics
- **AND** dynamic themes, entry IDs, history and explicit clone arguments retain their native behavior

#### Scenario: Custom 0.1.18 presentation and Usage policy
- **WHEN** the 0.1.18 palette opens in Custom
- **THEN** it retains the live theme and selection tint, shared search/clear/empty presentation, fixed 408px skin and 57px search header, pinned group or result count, overflow fade and keyboard/scroll navigation
- **AND** searching and clearing reset selection, scroll and heading/fade state
- **AND** the Usage entry is available only while its plugin is enabled, without deleting stored preferences when disabled

#### Scenario: Explicit 0.1.18 command arguments
- **WHEN** a manifest palette entry supplies explicit tab or space rename, pane/tab/space close, or clone arguments
- **THEN** activation preserves those arguments instead of replacing them with untargeted Custom handlers or default clone sources
- **AND** untargeted built-in entries retain Custom inline rename and last-tab-aware close routing, and Settings, picker, machine and worktree destinations retain Custom routing

#### Scenario: Existing 0.1.17 support after the rebase
- **WHEN** the installed native palette matches either reviewed 0.1.17 newline format
- **THEN** it still selects the unchanged 0.1.17 replacement rather than the new 0.1.18 variant
- **AND** capable newer hosts are not refused solely for lacking review-list membership, while unknown native palette bytes still fail closed

### Requirement: Quiet deferred peer catch-up through explicit Update
An offline skip SHALL retain a host-local deferred peer fact outside portable preferences. Deferred work SHALL NOT imply published-main availability, a warning or a badge. After a successful main check it SHALL permit the existing explicit Update action even when the desktop is current, subject to all existing failure, lock and unknown-outcome guards. Checks and reconnects SHALL NOT deploy or probe peers.

#### Scenario: pc2 returns after the desktop is current
- **WHEN** pc2 was skipped offline and a later explicit Update runs while pc2 is reachable and eligible, even with unchanged published main
- **THEN** the all-machine run revisits pc2 and runs its guarded shell deployment without any special retry command or source change
- **AND** successful deployed or already-current evidence clears its deferred fact
- **AND** merely powering pc2 on does not install anything before that later explicit Update

#### Scenario: Reload and repeated offline runs
- **WHEN** Settings or the app reloads after an offline skip, or another explicit update still finds that peer offline
- **THEN** its deferred fact survives and the current desktop remains warning-free and badge-free
- **AND** Update remains available after a successful main check without describing the desktop as outdated

#### Scenario: Selection and later failures do not lose catch-up needs
- **WHEN** a later run omits a deferred peer, encounters an inventory failure, or fails to deploy that peer
- **THEN** the unresolved deferred fact is not erased by replacement of the latest result
- **AND** genuine failures and unknown outcomes retain their existing diagnostics and refusal behavior instead of authorizing automatic replay

#### Scenario: Confirmed exclusion or removal
- **WHEN** a later run positively identifies a deferred peer as desktop-equipped or a complete successful inventory confirms it is no longer configured
- **THEN** obsolete shell catch-up work is removed without treating a missing or failed inventory as proof of removal

#### Scenario: Dry-run and preference export
- **WHEN** an update is previewed or portable preferences are exported
- **THEN** dry-run leaves deferred-peer bookkeeping unchanged and preference exports include no deferred peers, update receipts or locks

### Requirement: Consistent update description sentence punctuation
Every description sentence in the Custom row and sibling Settings update rows built by this project SHALL end with a full stop without duplicated stops. Button ellipses, diagnostic content, revision provenance, update scope, layout and action guards SHALL remain unchanged.

#### Scenario: All description states use sentence punctuation
- **WHEN** a Custom or sibling update row displays an idle, checking, current, available, updating, failed, partial, unknown or restart-ready description
- **THEN** each description sentence ends with a full stop, including error causes and log or details suffixes
- **AND** already-terminated errors do not introduce double stops between sentences or at the end
- **AND** diagnostic paths and revision values remain intact and button labels retain their existing ellipses

### Requirement: Custom-owned command palette
Custom SHALL provide its command palette as owned customization output using public host/UI capabilities, without requiring a native palette patch. The Custom shortcut and status-bar opener SHALL open the same focused overlay, with repeat-shortcut toggle and dismissal returning focus normally. Other layouts, the native command and reserved escape hatch SHALL retain native behavior.

#### Scenario: Open and dismiss the owned palette
- **WHEN** the user presses Ctrl+Shift+P or clicks Custom's commands status-bar opener on a capable host
- **THEN** one owned palette opens with focused text input, preserving its top-centered popup presentation
- **AND** repeated shortcut, Escape or backdrop dismissal closes it without changing sessions or injecting input

#### Scenario: Native opener outside Custom
- **WHEN** a non-Custom layout or an explicit native app.palette command opens the native palette
- **THEN** the native palette remains available without the owned implementation globally overriding that command

### Requirement: Preserved Custom palette interaction
The owned palette SHALL preserve Custom's live theme/selection tint, shared search/clear and empty states, fixed search header, virtual rows/native scrollbar, pinned group/result-count heading, scroll fade, highlighted fuzzy search, shortcut chips and bounded keyboard/mouse navigation. Recent history SHALL persist independently of transient overlay IDs across ordinary restarts and customization updates.

#### Scenario: Search navigation and scroll
- **WHEN** the user types, clears, pages, uses arrows, clicks a result or scrolls through grouped results
- **THEN** only command rows are selectable, search/clear resets selection and scroll coherently, and keyboard selection remains reachable
- **AND** pinned headings and fades reflect native scrolling without obstructing scrollbar hits, including at 100% and 130% zoom and empty results

#### Scenario: History after reload
- **WHEN** an entry was invoked and the palette, customization or desktop reloads
- **THEN** its stable command/argument identity remains eligible for Recent without copying unrelated native runtime state
- **AND** malformed or unsupported legacy history is preserved and reported rather than executed or guessed

### Requirement: Native catalog parity with safe Custom routing
The owned palette SHALL retain dynamic host commands, layouts, mode/layout-filtered themes and valid manifest palette contributions, including native validation, canonical deduplication and shortcut matching. Activation SHALL retain native IDs/arguments while routing Custom settings/pickers, inline rename and untargeted close through existing Custom handlers. Usage SHALL appear only while enabled.

#### Scenario: Manifest contribution on a capable host
- **WHEN** a valid manifest contributes a native command or a declaring mod command
- **THEN** its title, group, keywords, arguments and matching shortcut appear without duplicate command/argument pairs
- **AND** malformed entries are omitted, explicit clone arguments are preserved and mod commands still require a shown listener

#### Scenario: Target-bound routing
- **WHEN** an untargeted built-in rename or close is activated in Custom
- **THEN** existing inline rename and last-tab-aware close policies apply
- **AND** an explicit argument-bearing command retains its captured arguments and is not broadened to the current selection

### Requirement: Persistent owned palette binding
Full customization installation SHALL establish the Custom-scoped owned palette binding in the selected desktop home's user keys. After successful installation, restarts, stock rewrites, key-default resets, Core updates and customization reloads SHALL not require re-enabling. Installation and mounted Custom self-checks SHALL repair stock or missing mappings automatically, check configured bindings and reload errors, and log outcomes without overwriting unrelated or unknown personal mappings.

#### Scenario: Simulated stock update resets keys
- **WHEN** an installed desktop's keys are replaced by stock defaults and its native frame is rewritten
- **THEN** the next mounted Custom startup or lifecycle self-check restores the owned shortcut and reconciles host reload diagnostics without re-enabling, a native patch or process restart
- **AND** unrelated stock additions remain, one bounded repair is logged and the next shortcut opens the owned overlay

#### Scenario: Hot reload and duplicate windows
- **WHEN** customization output reloads or multiple mounted copies observe the same reset
- **THEN** repair is coalesced and generation-bound without losing durable intent/history or creating repeated writes
- **AND** checking contexts perform no repair side effects

#### Scenario: More than one desktop
- **WHEN** this computer and pc2 each receive an ordinary full desktop customization installation
- **THEN** each owns and repairs its local app-home binding independently of selected remote terminals
- **AND** Core-only shell deployment neither installs a palette nor silently becomes full remote desktop deployment

### Requirement: Palette policy follows installed payload
Every Desktop deploy, rollback and Custom startup/reload SHALL apply the same installed-state binding rule. A present capable palette SHALL own its scoped action subject to collision checks. An absent palette SHALL restore only its reserved owned action to stock and remove stale ownership, preserving personal rebindings. Binding policy SHALL NOT depend on palette-specific deployment journal entries.

#### Scenario: Deferred installation followed by rollback
- **WHEN** installation defers for missing SDK files, later startup establishes owned routing, and the user rolls back to a payload without the owned palette
- **THEN** reconciliation restores stock routing and removes the sidecar although deployment never observed startup ownership
- **AND** reinstall applies the same rule and restores owned routing when capabilities pass

#### Scenario: Personal rebind during rollback
- **WHEN** the person changes the shortcut to another command before rollback removes the owned mod
- **THEN** reconciliation preserves that command and unrelated keys byte-for-byte while removing stale ownership
- **AND** a conflicting reinstall reports the collision rather than overwriting it

#### Scenario: Orphaned owned routing on startup
- **WHEN** Custom starts or reloads with the owned action but its target mod is absent
- **THEN** reconciliation returns the action to stock and removes stale ownership, even without a sidecar or generated SDK files
- **AND** the status-bar opener follows the installed native mode rather than opening a missing mod

### Requirement: Visible palette compatibility and persistence failures
The owned palette SHALL depend on minimum supported host and required capabilities rather than reviewed-version membership. Missing capabilities, unreadable configuration, unsafe writes or conflicting bindings SHALL be reported visibly and in bounded local diagnostics, never described as successful persistence or silently substituted with vanilla. A keyboard repair failure SHALL retain the Custom status-bar opener when its overlay capabilities remain available.

#### Scenario: Capable newer host
- **WHEN** 0.1.17, 0.1.18 or a newer unreviewed host supplies the required capabilities
- **THEN** the owned palette remains available even if private native palette bytes change
- **AND** any newer-than-reviewed advisory does not become a version allowlist

#### Scenario: Repair refused
- **WHEN** keys are malformed, a personal higher-priority shortcut conflicts, permissions deny a write, or host reload reports an error
- **THEN** mounted Custom shows a persistent actionable warning and a deduplicated notification with sanitized local diagnostic facts
- **AND** personal bytes remain protected, retry is bounded and no native patch is applied as fallback

### Requirement: Safe retirement of palette patch ownership
Owned-palette migration SHALL stage the new entrypoint and binding before retiring automatic palette patch refresh. Removal SHALL preserve current stock, unrelated feedback and personal edits, use only exact owned/reviewed recovery evidence, and never downgrade a newer native frame from an older backup. Unknown stock SHALL not affect owned-palette eligibility.

#### Scenario: Migration from the temporary patch
- **WHEN** the owned entrypoint and binding configuration pass guarded checks after installation over a reviewed patch
- **THEN** palette native refresh is disabled and only safely recognized palette patch files/opt-in are retired, retaining recovery evidence
- **AND** current native restore bytes match the current host rather than an older release and feedback behavior is unchanged

#### Scenario: Unknown stock or later personal edit
- **WHEN** migration sees newer unknown native stock or an unrecognized personal patch dependency edit
- **THEN** unknown stock is left unchanged and personal conflicts are reported without destructive cleanup
- **AND** the owned palette does not require native-source review, while incomplete retirement is never reported as complete

#### Scenario: Rollback of migration from the reviewed stop-gap
- **WHEN** the user rolls back the reported owned-palette deployment backup after migrating an installed reviewed native palette patch
- **THEN** recovery restores the previous payload, derives binding policy from installed files, and restores native opt-in from independent retirement evidence before guarded refresh
- **AND** a successful rollback restores the previous Custom palette, including startup repair after a native frame reset, rather than silently returning to vanilla
- **AND** later native edits refuse before recovery writes, personal shortcut rebindings remain untouched, and a skipped or failed guarded refresh reports failure with the opt-in retained
- **AND** reinstalling through normal Update safely returns to the owned palette without changing feedback or running terminals

### Requirement: Sharing-tolerant updater persistence
Updater receipts, status, availability checks and lock helpers SHALL tolerate bounded transient file-sharing failures without losing complete final deployment content. Exhausted replacement retries SHALL use a safe fallback publication or retain complete content that the reader can accept. Exclusive ownership and unreadable-state refusal SHALL remain intact.

#### Scenario: Final receipt target temporarily locked
- **WHEN** a finished deployment encounters a transient sharing failure replacing its final receipt
- **THEN** bounded retries publish a complete same-run receipt after the target becomes available
- **AND** Settings reconciles completion rather than remaining permanently unknown

#### Scenario: Replacement persistently refused
- **WHEN** replacement remains refused throughout the retry budget but fallback storage is writable
- **THEN** complete final content remains readable through fallback publication or validated recovery content
- **AND** an intermediate incomplete receipt does not indefinitely mask that final content

#### Scenario: State read overlaps publication
- **WHEN** a read encounters a transient sharing failure or incomplete fallback publication
- **THEN** bounded read-and-close retries tolerate the transient failure without retaining an open file
- **AND** exhausted or malformed reads never authorize another update as though no lock or unknown job existed

#### Scenario: Lock and non-receipt writes encounter contention
- **WHEN** status, availability or lock IO encounters a sharing failure
- **THEN** the same bounded fault policy applies without overwriting another exclusive lock
- **AND** failed IO closes owned descriptors and retains conservative action guards

#### Scenario: All persistence is unavailable
- **WHEN** storage cannot accept either normal or fallback content
- **THEN** the updater reports the persistence limitation without fabricating deployment failure or success
- **AND** it retains any complete evidence already written instead of deleting it during error cleanup

### Requirement: Explicit stopped-state recovery
Settings and the updater command SHALL offer explicit stopped-state recovery for dead installer locks, orphaned launches and malformed legacy state. It SHALL require dead recorded owners, complete local process proof, settled bounds and confirmation that local/remote work stopped; archive stale files and log consent while preserving payload, ownership and journals. Recovery SHALL NOT deploy, retry or force active, unreadable or redirected state.

#### Scenario: Dead installer or orphaned launch
- **WHEN** an interrupted installer or launch leaves stale metadata and every recorded owner is dead with settled evidence and no local updater process
- **THEN** the row offers Recover update with one explanation of what is cleared and why stopped-work proof is required
- **AND** the person must confirm all local and remote work has stopped before clearing anything

#### Scenario: Malformed legacy check and claim files
- **WHEN** malformed legacy state or a lock created before status publication prevents ordinary checking or updating
- **THEN** expired lease/deadline bounds, recorded-owner death and a complete local process survey permit the separate confirmed recovery action
- **AND** malformed bytes are preserved as evidence, not treated as a successful deployment or permission to replay

#### Scenario: Evidence-preserving clear without deployment
- **WHEN** the person confirms stopped-state recovery against the unchanged captured identity
- **THEN** stale updater locks, status, result and cache files move to private recovery, the previous log is preserved and consent is logged
- **AND** installed payload, ownership, preferences and rollback journals remain unchanged
- **AND** the row returns to Check now without starting a deployment, retry or rollback

#### Scenario: Lost runtime intent without a receipt
- **WHEN** an expired launch intent has no saved job or receipt after the deployment bound
- **THEN** Settings can offer explicit recovery only after complete stopped-process proof and local/remote stopped-work confirmation
- **AND** successful recovery clears the old intent/resume despite a later stale read, without replacing a newer launch or a different run
- **AND** normal empty homes never offer recovery merely because no update has run

#### Scenario: Documented command and cancellation
- **WHEN** the updater command previews recovery, or the person cancels or supplies obsolete confirmation
- **THEN** no deployment or authoritative-state recovery is dispatched
- **AND** the documented explicit confirmation flag uses the same stopped-work and preservation gates as Settings

#### Scenario: Active or unavailable process evidence
- **WHEN** any recorded owner is alive, local process discovery is incomplete, a lease remains unsettled, or state cannot safely be read
- **THEN** recovery is refused without a force option or silent installer-lock deletion
- **AND** newly launched ordinary all-machine CLIs refuse an active recovery claim before writing receipts or dispatching

#### Scenario: Abandoned retry claim after completion
- **WHEN** a retry request dies leaving an expired claim after its detached update completes
- **THEN** ordinary inspection archives only that dead owner's claim and another explicit Update can proceed
- **AND** the same housekeeping never clears an unknown deployment outcome or automatically replays work

### Requirement: Evidence-based unknown outcome recovery
Unknown runs SHALL settle only from attributable completion evidence after recorded processes are dead and a settle interval or deadline has passed. Proven deployment with an unsaved result SHALL be distinguished from genuine uncertainty. Genuine unknowns SHALL permit only a separately confirmed retry after quiescence checks; inspection, deadlines and availability checks SHALL NOT replay work.

#### Scenario: Deployment finished but final receipt was not saved
- **WHEN** a dead settled run has matching terminal deployment evidence and a final receipt-publication failure
- **THEN** the row states that deployment completed but the result could not be saved and names its matching details
- **AND** only that run's stale update lock is eligible for release, with installed revision still requiring matching ownership evidence

#### Scenario: Genuine unknown becomes eligible for deliberate retry
- **WHEN** recorded processes and known descendants are dead, the required settle/deadline boundary has passed, and a fresh main check succeeds without conclusive completion evidence
- **THEN** the row offers Retry update with a one-line explanation that the previous update may have finished
- **AND** no new update starts until the person confirms local and dispatched remote work has stopped and explicitly confirms retry

#### Scenario: Remote or descendant work might still run
- **WHEN** recorded local processes died but descendants are active, process facts are unreadable, or dispatched work lacks completion evidence
- **THEN** local PID death alone never declares success or authorizes ordinary Update
- **AND** unresolved dispatch waits through the original deadline and still requires explicit stopped-work confirmation before a retry

#### Scenario: Canceled or obsolete confirmation
- **WHEN** a person cancels, closes or reloads a retry confirmation, or a newer run or late complete receipt changes its captured identity
- **THEN** the confirmation cannot start another update
- **AND** competing confirmations and duplicate clicks can dispatch at most one guarded new run

#### Scenario: Automatic triggers encounter an eligible unknown
- **WHEN** status reads, Check now, startup, timer checks, focus catch-up or relay hints observe retry eligibility
- **THEN** they do not clear uncertainty as authorization or dispatch another update
- **AND** unknown diagnostics and evidence remain until conclusive settlement or an explicitly claimed retry

#### Scenario: Newer CLI remains authoritative
- **WHEN** an old terminal Settings job coexists with a newer incomplete CLI receipt, including a timed-out peer while other peer work continues
- **THEN** recovery uses the current receipt's matching run owner and deadline, not the old Settings PID or log
- **AND** a live current CLI blocks ordinary Update, Retry update and stopped-state recovery

#### Scenario: Legacy or foreign evidence is insufficient
- **WHEN** an old or tokenless CLI unknown lacks attributable process/dispatch evidence, or a log or recovery receipt belongs to another run
- **THEN** it remains unknown with investigation guidance rather than automatically becoming success or retryable
- **AND** the documented manual recovery path remains available without bypassing deployment locks or ownership gates

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

### Requirement: Plugin availability contributes to existing update dots
Confirmed pending plugin updates on connected machines SHALL contribute to the existing Settings icon and Updates navigation notification dots using the same visual markers as Herdr readiness. Native and customization readiness SHALL retain their existing meaning. Opening Updates SHALL NOT acknowledge away a pending plugin update, and unknown checks SHALL NOT invent availability or success.

#### Scenario: Plugin-only availability
- **WHEN** a plugin update is pending on a connected machine with native and customization availability off
- **THEN** the mounted expanded Settings icon, compact Settings presentation and Updates entry show their existing update dots without a remount
- **AND** no plugin-specific count, tooltip or badge is added

#### Scenario: Successful update and independent native readiness
- **WHEN** authoritative checks confirm all connected-machine plugin updates were applied
- **THEN** the plugin contribution to the dots clears
- **AND** dots required by native or customization readiness remain visible

#### Scenario: Failed recheck or disconnected peer
- **WHEN** a check fails for a still-connected machine with a confirmed pending update
- **THEN** its confirmed pending contribution remains until an authoritative result replaces it
- **AND** disconnecting a peer excludes it from connected-machine availability without claiming it was updated

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

### Requirement: Installation waits out transient native patch refresh locks
Installation and rollback SHALL treat a busy native patch refresh, whether the lock is held by the running App's own startup repair or was just cleared as stale, as transient and SHALL retry it within a bounded time instead of failing the update. A refresh that stays busy beyond the bound, or fails otherwise, SHALL report the step's own diagnostic rather than the child process command line. Lock ownership rules SHALL remain unchanged: a live repair's lock is never removed.

#### Scenario: Startup repair runs while Update installs
- **WHEN** Update installs new mods while the running App's mount-time native repair holds the refresh lock
- **THEN** the install step waits for that repair and completes its own refresh on the first Update

#### Scenario: Stale lock from an interrupted repair
- **WHEN** a previous repair was killed and left a lock with a dead process ID
- **THEN** the install step's first refresh clears it, retries and succeeds without a second Update

#### Scenario: Lock held beyond the bound
- **WHEN** the refresh lock stays held by a live process for the whole bound
- **THEN** the update fails with a reason naming the busy refresh lock, not a truncated command line

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
