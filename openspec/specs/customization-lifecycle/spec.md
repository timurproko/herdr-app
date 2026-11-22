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
Native compatibility exceptions SHALL remain explicit, version/shape-gated and ownership-checked. Unknown stock or personal edits SHALL fail closed; updates SHALL refresh only prior opt-ins. Recovery SHALL refuse later personal edits and SHALL NOT replace complete live session documents or restart terminals/agents as an implicit repair.

#### Scenario: Unknown upstream patch target
- **WHEN** an existing opted-in patch encounters an unknown upstream target
- **THEN** the app leaves the unknown target unchanged and reports incompatibility
- **AND** does not manufacture a reviewed baseline or enable another patch

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
Custom Settings Updates SHALL retain its native rows and add one Customizations row with a short verified installed revision or revision unknown, a short status and one Check now or Update button. It SHALL NOT add machine rows, news, settings or rollback controls. Checking and updating SHALL disable only that row's action.

#### Scenario: Current or newer published main
- **WHEN** a successful check compares the verified desktop installation with published main
- **THEN** equality shows Up to date with local HH:MM check time and Check now
- **AND** a different or unknown installed revision shows Update available and Update

#### Scenario: Failed check or missing revision
- **WHEN** the published-main check fails or no trustworthy installed revision exists
- **THEN** failure shows a short retry message rather than claiming current status
- **AND** the revision is never inferred from a source checkout HEAD

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
An update SHALL run independently of the mod it replaces, with a finite deadline and one latest durable status/result/log under the selected Herdr home. Reload, closing Settings or duplicate clicks SHALL NOT cancel or repeat it. A missing final result SHALL NOT imply success. No daemon, scheduler or job history SHALL be introduced.

#### Scenario: Page replaced during deploy
- **WHEN** deployment replaces Settings or the user closes and reopens it
- **THEN** the same update continues independently and the row reattaches to its status
- **AND** it shows Updating all machines with a disabled action until a result is known

#### Scenario: Deadline or lost completion
- **WHEN** the update exceeds its deadline, crashes or leaves no final result
- **THEN** the row reports outcome unknown with a log path and does not replay the update
- **AND** another deployment remains blocked while the prior process or lock is unresolved

### Requirement: Durable desktop revision and partial outcomes
Real deploy:all runs SHALL record latest per-machine outcomes and successful desktop commit with evidence tied to the installed ownership record, without changing the ownership manifest schema. Dry-run SHALL NOT write these records. Desktop success SHALL remain distinguishable from peer skips/failures; uncertain desktop installation SHALL NOT claim a verified new revision.

#### Scenario: Desktop success with incomplete peers
- **WHEN** the desktop deploy succeeds but a peer is skipped, fails or machine inventory fails
- **THEN** the row shows the new desktop revision and one short partial-outcome line naming the matching captured log or durable result path
- **AND** the log/result contains machine reasons and available backup IDs without adding machine rows
- **AND** ordinary successful version checks do not erase the partial-outcome warning

#### Scenario: Other deployment changes installed evidence
- **WHEN** a later ordinary deployment or rollback changes the ownership record from the saved successful desktop evidence
- **THEN** the row reports revision unknown rather than reusing a stale installed SHA

#### Scenario: Desktop deployment failure
- **WHEN** desktop deployment is refused or fails
- **THEN** the row states a short cause and that recovery uses documented rollback, with the log path
- **AND** no automatic rollback occurs or journal, stock-layout or later-edit safety gate is bypassed

### Requirement: Custom-owned update indicators and hourly checking
Confirmed Custom availability SHALL contribute to existing Custom Settings navigation and expanded/compact chrome update dots without changing native readiness. Custom SHALL check hourly while its non-footer chrome is mounted and when explicitly requested, coalescing concurrent checks. Checks SHALL NOT deploy, inspect peers or run in eager native checking contexts.

#### Scenario: Availability and failed recheck
- **WHEN** a check confirms an available Custom update and a later check fails
- **THEN** the existing Custom indicators retain that confirmed availability without fabricating a new one
- **AND** opening Updates alone does not clear it

#### Scenario: Automatic check while mounted
- **WHEN** the hourly check is due with Custom mounted outside an eager checking context
- **THEN** one coalesced published-main check runs without cloning, deploying or contacting machines
- **AND** native Herdr and herdr-core update actions and readiness remain unchanged
