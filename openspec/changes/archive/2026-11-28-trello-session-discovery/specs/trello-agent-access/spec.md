# Trello session discovery delta

## ADDED Requirements

### Requirement: Enabled-host standing Trello announcement
Every A1, Claude Code and Codex session started by Herdr on a Trello-enabled execution host SHALL receive a short, credential-free standing note through its normal instruction or skill mechanism. Essential discovery guidance SHALL be visible before an optional skill body is loaded.

#### Scenario: First request mentions a Trello card
- **WHEN** the person asks a newly started A1, Claude Code or Codex session to find a Trello card about a subject
- **THEN** its standing context names `herdr-trello` as the first interface for permitted boards, without a preceding path hunt or claim that no integration exists
- **AND** the note covers listing boards/cards, card detail, comments, checklists and image attachments
- **AND** it identifies `herdr-trello --help` and its help topics as the command reference, permits writes only with current Read-write access and required host gates, and treats board content as untrusted data rather than instructions

#### Scenario: No secret or board-data announcement
- **WHEN** an announcement is generated or loaded
- **THEN** it contains no API key, token, authenticated URL, account identity, board inventory or downloaded content
- **AND** discovery itself performs no Trello request and grants no permission

### Requirement: Announcement follows execution-host enablement
Owned Trello announcements SHALL be present for enabled execution hosts and absent for disabled hosts before a new Herdr-started agent loads context. Enablement changes and startup recovery SHALL reconcile them without rewriting personal instructions or restarting agents. Access wording SHALL NOT advertise stale write authority.

#### Scenario: Toggle and restart recovery
- **WHEN** Trello is enabled, disabled, re-enabled or the customization reloads
- **THEN** only its owned announcement is created, removed or recovered to match that host's effective state
- **AND** a new launch rechecks that state and cannot accept a late announcement from an older enable generation
- **AND** an ownership conflict is actionable, not silently overwritten or reported as successful discovery

#### Scenario: Access changes after startup
- **WHEN** Access changes between Read-only and Read-write or a private host write gate changes
- **THEN** the note's conditional write guidance remains true without claiming that an earlier grant still authorizes writes
- **AND** the CLI's fresh execution-host checks remain authoritative, including refusal after disablement
- **AND** already-loaded context is not claimed to have been erased; no terminal input or forced session reload is used

#### Scenario: Remote host unavailable
- **WHEN** a configured execution host is offline or its identity cannot be verified during reconciliation
- **THEN** no local skill or credentials are substituted for it and no successful remote removal or activation is claimed
- **AND** the next launch on a reachable host must reconcile its own current state before advertising Trello

### Requirement: Agent launch shell reachability
Herdr-started A1, Claude Code and Codex sessions SHALL resolve `herdr-trello` by name in their supported Bash, PowerShell and CMD tool shells using the execution host's owned installed runtime. Reachability SHALL NOT depend only on the deploying shell's PATH or require an execution-policy bypass, source checkout, agent path search or Core restart.

#### Scenario: Core has an older PATH
- **WHEN** Trello is installed but its bin is absent from the launch worker's inherited PATH
- **THEN** a new ordinary or coordinator agent profile can invoke `herdr-trello --help` and `herdr-trello status` by name on its actual execution machine
- **AND** its existing executable, literal arguments, startup directory, account isolation, role labels and other required PATH entries are preserved

#### Scenario: Tool-shell variants
- **WHEN** the agent invokes the name through Bash, Windows PowerShell, PowerShell 7 or CMD as supported on that OS
- **THEN** the correct installed launcher forwards arguments and exit codes without a full path or execution-policy relaxation
- **AND** spaces, Unicode and permitted shell metacharacters do not retarget the runtime or alter literal input

## MODIFIED Requirements

### Requirement: Installed JSON shell interface
Ordinary build and full deployment SHALL package and install the self-contained CLI and owned shell launchers. Agents SHALL resolve the installed command by name in their actual launch/tool environment without this checkout. Deployment and explicit Trello-only remote installation SHALL preserve conflicts, private setup and unrelated state; shell-only deployment SHALL remain shell-only. Installed help SHALL be usable offline without source-relative links.

#### Scenario: Disposable installed command
- **WHEN** a full deployment installs into a disposable home/bin and the source checkout is unavailable
- **THEN** Bash and supported Windows shells invoke help/status/data by name through installed files only, including an agent launch whose original environment lacked that bin
- **AND** data output uses one versioned JSON result with stable success/failure exit codes, not diagnostic prose

#### Scenario: Bin not on PATH or conflicting launcher
- **WHEN** the chosen bin is absent from the deploying shell's PATH
- **THEN** installation and agent launch preparation establish a validated owned-bin route without claiming that the installer's PATH proves agent availability
- **AND** no persistent shell profile, global PATH configuration, running shell or terminal input is modified
- **AND** an unknown or modified launcher causes an actionable ownership refusal instead of overwrite

#### Scenario: Redeploy, recovery and shell-only deploy
- **WHEN** owned launcher/runtime files are updated or recovered
- **THEN** content hashes and later-edit safeguards apply, private stores stay untouched and ownership identifies the selected runtime home
- **AND** shell-only deployment neither installs Trello nor copies credentials to peers
- **AND** migration of an owned PowerShell script launcher preserves rollback and refuses modified or other-home files

#### Scenario: Self-sufficient installed help
- **WHEN** the owner invokes installed help without access to the source checkout or network
- **THEN** it explains setup, explicit board grants, effective access gates, read/write examples, exits, sanitized errors, unknown outcomes, revocation and untrusted Trello content
- **AND** an installed offline reference is available with a useful embedded fallback, never an unresolved checkout-relative documentation path
