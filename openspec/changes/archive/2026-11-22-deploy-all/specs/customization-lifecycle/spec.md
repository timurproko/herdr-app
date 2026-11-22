## ADDED Requirements

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
