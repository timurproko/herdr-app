# Spec Delta

## MODIFIED Requirements

### Requirement: Optional headless integration
Trello SHALL be a declarative plugin that defaults to disabled and read-only. Its agent surface SHALL be a JSON command-line tool, without MCP, a board panel, background Trello-content synchronization or automatic remote provisioning. Explicit Settings actions SHALL support installation and setup on safely identified execution hosts.

#### Scenario: Fresh installation
- **WHEN** a host installs the customization without configuring Trello
- **THEN** Trello data commands refuse before network access, and installation neither creates credentials nor enables the plugin

#### Scenario: Disabled during a command
- **WHEN** the plugin is disabled while an earlier request is in flight
- **THEN** it starts no follow-up request or mutation and returns no obsolete data as a current successful result
- **AND** a write already accepted by Trello is not claimed to have been cancelled

### Requirement: Explicit private credential setup
Setup SHALL accept an API key and user token through protected headless input or transient owner Settings inputs, never persistent plugin settings or command arguments. Only the Node worker SHALL write the private per-machine credential file under the resolved execution-host home. Unsafe or malformed stores SHALL be refused and secrets SHALL NOT appear in output, logs, shared state, exports or deployment payloads.

#### Scenario: Protected setup and rotation
- **WHEN** the owner explicitly imports credential input through the documented headless setup mechanism
- **THEN** only the selected home's protected store receives it, and results reveal no key, token or authenticated URL
- **AND** replacement requires explicit headless rotation or confirmed Settings removal followed by a new save, never silently overwriting malformed or unrelated files

#### Scenario: Unsafe store
- **WHEN** credential storage is linked, inside a source checkout, permissive to other ordinary users or otherwise unverifiable
- **THEN** setup and data commands refuse without weakening protections or seeking another credential store

#### Scenario: Authentication choice
- **WHEN** an authorized data command sends a request
- **THEN** it uses the configured API key and user token as Trello REST query authentication over HTTPS
- **AND** no OAuth 2.0 flow, application secret, subprocess argument or external credential discovery is used

#### Scenario: Save and verify from Settings
- **WHEN** the owner explicitly submits an API key and masked user token from the selected machine's Trello card
- **THEN** the worker on that machine verifies the token before saving and persists its bounded non-secret account identity
- **AND** the inputs and their undo state are retired without reading saved secrets back into Settings

#### Scenario: Saved verification and failed replacement
- **WHEN** the owner presses Requirements Check for saved credentials or a headless rotation fails verification
- **THEN** explicit verification returns only sanitized account/status facts and a failed verified rotation preserves the prior credentials and policy
- **AND** opening the card or changing machine reads saved status without an automatic Trello verification request

#### Scenario: Explicit replacement or removal
- **WHEN** the owner confirms removing the saved Settings account or explicitly replaces it through headless rotation
- **THEN** only the captured protected execution-host store changes and its board and write authority are cleared
- **AND** Settings removal names the selected machine and explains that deleting this copy does not revoke the token at Trello
- **AND** Settings offers a new account's inputs only after removal succeeds

### Requirement: Explicit local board and write authority
Every agent data command SHALL require execution-host activation and an explicit host-local allowlist of canonical board IDs. Empty or invalid policy SHALL deny all boards, without wildcards. Writes SHALL additionally require explicit owner authorization applied from the card's one global Access setting; portable preferences and command flags SHALL NOT grant that authority. Owner discovery SHALL remain separate from agent listing.

#### Scenario: Disallowed board read or write
- **WHEN** a request names a board absent from the local allowlist
- **THEN** it fails before any Trello request, including existence checks or object lookup for that board

#### Scenario: Empty scope and allowed boards listing
- **WHEN** an agent lists allowed boards through the CLI
- **THEN** only explicitly permitted boards are queried and returned, never an account-wide board inventory
- **AND** an empty allowlist performs no Trello request

#### Scenario: Read-only and imported preferences
- **WHEN** the host lacks acknowledged private write authorization, even if imported public preferences request writes
- **THEN** every mutation is refused before a mutation request and no flag or preference import grants board scope or write authority

#### Scenario: Authority changes during preflight
- **WHEN** the allowlist, access policy or plugin enablement changes on the execution host after a command begins
- **THEN** the command rechecks current authority before every follow-up and mutation, refusing superseded work

#### Scenario: Owner chooses boards by name
- **WHEN** saved credentials are available and the owner opens the Trello board picker
- **THEN** Settings explicitly discovers token-visible boards and offers named checkboxes without typed IDs
- **AND** only committed choices update the captured machine's protected policy
- **AND** incomplete discovery grants nothing by itself and never erases unseen existing board grants

#### Scenario: Local access switch
- **WHEN** the owner explicitly chooses Read-only or Read-write in the card's global Settings control
- **THEN** the global value is the same regardless of the machine selected in the header and is applied through acknowledged protected operations to configured account hosts
- **AND** each host's CLI enforces its applied activation/access record as well as its private board and write policy
- **AND** a write-capable Trello token is still required for writes

### Requirement: Installed JSON shell interface
Ordinary build and full deployment SHALL package and install the self-contained CLI and owned shell launchers. Agents SHALL resolve the installed command through their user bin on PATH without this checkout. Deployment and explicit Trello-only remote installation SHALL preserve conflicts, private setup and unrelated state; shell-only deployment SHALL remain shell-only. Installed help SHALL be usable offline without source-relative links.

#### Scenario: Disposable installed command
- **WHEN** a full deployment installs into a disposable home/bin on PATH and the source checkout is unavailable
- **THEN** Bash and supported Windows shells invoke help/status/data through installed files only
- **AND** data output uses one versioned JSON result with stable success/failure exit codes, not diagnostic prose

#### Scenario: Bin not on PATH or conflicting launcher
- **WHEN** the chosen bin is off PATH or an unknown/personal launcher occupies the command name
- **THEN** installation reports actionable discovery or ownership failure rather than claiming availability or overwriting the file
- **AND** it does not edit shell profiles, restart shells or inject input

#### Scenario: Redeploy, recovery and shell-only deploy
- **WHEN** owned launcher/runtime files are updated or recovered
- **THEN** content hashes and later-edit safeguards apply, private stores stay untouched and ownership identifies the selected runtime home
- **AND** shell-only deployment neither installs Trello nor copies credentials to peers

#### Scenario: Self-sufficient installed help
- **WHEN** the owner invokes installed help without access to the source checkout or network
- **THEN** it explains setup, explicit board grants, effective access gates, read/write examples, exits, sanitized errors, unknown outcomes, revocation and untrusted Trello content
- **AND** an installed offline reference is available with a useful embedded fallback, never an unresolved checkout-relative documentation path

### Requirement: Owner guidance and isolated verification
Documentation SHALL cover Settings/headless setup, token generation, authorization, commands, safe errors, revocation and remote provisioning, including same-user credential access and client-policy bypass. Tests SHALL use fake credentials, disposable stores and injected provider/SSH transport only. Running-card evidence SHALL use an isolated disposable app, and implementation handoff SHALL identify green Windows and Ubuntu hosted checks on its reported head.

#### Scenario: Documented security boundary
- **WHEN** the owner follows README's Trello link
- **THEN** guidance distinguishes client read-only policy from a server-issued read-only token, explains revocation and same-user limitations, and discloses offline global-access propagation limits

#### Scenario: Offline regression execution
- **WHEN** Trello regressions execute
- **THEN** no real Trello request, credential discovery, user-home read, real remote machine, production deployment or live agent action occurs

#### Scenario: Card help and readiness
- **WHEN** the owner views the Trello card
- **THEN** its short description links to https://trello.com/apps/admin and Requirements distinguishes missing credentials, saved account needing boards, blocked checks and ready configuration
- **AND** cached saved status does not claim a still-valid token without successful explicit verification

#### Scenario: Disposable native proof
- **WHEN** the changed card is demonstrated in a running app
- **THEN** fake inputs, injected provider and SSH responses, and disposable local/remote homes exercise the actual packaged card
- **AND** evidence is outside the checkout and every started app, Core and handoff server is stopped before handoff

### Requirement: Trello setup machine isolation
Trello Settings SHALL bind status, runtime installation and every account/board operation to the captured machine identity, Core session and execution user/home. Safely configured direct-SSH hosts SHALL support the same account and board lifecycle as this computer, using SSH stdin for secrets and never local-store fallback. Headless setup SHALL remain available on each host.

#### Scenario: SSH-selected machine
- **WHEN** Settings selects a safely configured SSH machine
- **THEN** account save, explicit verification, removal, board discovery, addition and removal operate only on that machine's private store
- **AND** no local account, board inventory or private policy is substituted for the selected host

#### Scenario: Machine changes while action is pending
- **WHEN** the selected machine, identity/session, execution user/home or mounted view generation changes before dispatch or during an operation
- **THEN** obsolete inputs and callbacks cannot dispatch new work or publish into the replacement selection
- **AND** already-dispatched effects remain attributed to their captured target without retargeting or replay

#### Scenario: Private remote transport
- **WHEN** credentials are submitted to a remote host
- **THEN** they are sent only through the authenticated SSH channel's stdin after destination identity/readiness validation
- **AND** they never occur in argv, environment, logs, shared state, installation payloads or temporary credential input files
- **AND** the protected final store's existing atomic replacement files remain permitted

#### Scenario: Unsupported or unavailable host
- **WHEN** a target is temporary, custom-via, identity-ambiguous, unexpectedly elevated, untrusted, disconnected or lacks supported execution prerequisites
- **THEN** Requirements names the refused arrangement or missing prerequisite with a sanitized code
- **AND** no local fallback, new host-key acceptance, password prompt or blind credential dispatch occurs

#### Scenario: Missing remote runtime
- **WHEN** the selected host lacks the compatible Trello runtime
- **THEN** Requirements offers an explicit Trello-only Install or Update action in the existing prerequisite pattern
- **AND** installation changes only owned runtime/help/launchers, never credentials, board grants, activation, write authority, PATH or shell-only deployment behavior

#### Scenario: Indeterminate private change
- **WHEN** SSH disconnects or times out after a private operation may have committed
- **THEN** Settings reports an unknown configuration outcome and requires a fresh destination status before an explicit retry
- **AND** it neither claims rollback nor replays the operation

## ADDED Requirements

### Requirement: Verifiable Windows storage checks
Windows private-store permission checks SHALL remain fail-closed and independent of a calling PowerShell 7 session's module path. Only the ACL subprocess environment SHALL change; caller state, owner checks and broad-access refusals SHALL remain intact.

#### Scenario: PowerShell 7 inherited environment
- **WHEN** the CLI or owner worker reads valid protected fake setup from a PowerShell 7 process
- **THEN** the legacy PowerShell ACL child uses its own module discovery rather than inherited case-insensitive PSModulePath entries, without mutating the caller's environment
- **AND** valid setup reads succeed while wrong-owner and overbroad ACL stores remain refused

#### Scenario: Permission tooling fails
- **WHEN** the ACL executable, security module or permission query cannot run or exceeds its deadline
- **THEN** access is refused as an unverifiable permission check, not missing credentials or a successful check

### Requirement: Secret-free actionable diagnostics
CLI and Settings SHALL distinguish missing setup, malformed schema/JSON, unsafe paths, checkout-local storage, wrong owner/permissions, failed permission tooling, busy storage, filesystem IO, disabled integration, invalid public authority and internal failures. Public messages SHALL use fixed safe categories, never raw subprocess/provider exceptions or private paths.

#### Scenario: Missing versus blocked status
- **WHEN** status encounters absent credentials, corrupt policy or an ACL check that failed to execute
- **THEN** the outcomes distinguish ordinary unconfigured setup from malformed storage and unverifiable permissions
- **AND** a blocked status does not advertise Save as a repair and board checks retain the underlying diagnostic

#### Scenario: Hostile diagnostic material
- **WHEN** a provider, parser, filesystem or SSH error contains fake secret sentinels, URLs, paths or stacks
- **THEN** output exposes only an allowlisted code/message and safe resource or machine reference
- **AND** existing STALE, UNKNOWN_WRITE and WRITE_CHANGED outcome semantics remain intact

### Requirement: Durable non-secret setup names
Successful owner verification and board addition SHALL persist bounded, validated account/added-board display names beside private setup, bound to the current credentials and grants. Opening the card SHALL use these hints without Trello requests; names SHALL NOT become authority or portable preferences.

#### Scenario: Reopen with saved setup
- **WHEN** the owner closes and reopens a configured machine's card
- **THEN** the saved account and board names appear without a click or provider request, including Unicode names
- **AND** the card uses no Saved prefix or Saved board ID placeholder for named entries

#### Scenario: Legacy missing names
- **WHEN** legacy headless or version-1 setup has no display hints
- **THEN** the card offers explicit Requirements Check to fetch and save missing account/allowed-board names
- **AND** no name is invented, no authority is granted and ordinary opening contacts no provider

#### Scenario: Credential or grant change
- **WHEN** credentials are removed/rotated or a board grant is removed
- **THEN** corresponding stale display hints are invalidated and a different account cannot inherit names or authority
- **AND** incomplete board discovery preserves unseen existing grants and their valid hints

### Requirement: Crew-pattern Trello card
The card SHALL reuse existing Requirements, Settings, list rows, badges, disclosures, confirmations and picker controls. Requirements SHALL show either masked inputs with Save & verify or one account-name row with hover Remove. Boards SHALL use named removable rows and selected-machine scope. Actions unavailable for the current state SHALL NOT be rendered.

#### Scenario: Empty and saved account states
- **WHEN** the selected machine has no saved account and usable runtime/storage
- **THEN** masked key/token inputs and Save & verify are shown
- **AND** after saving, inputs and Save disappear and exactly one account name with hover Remove remains

#### Scenario: Explicit verification and removal
- **WHEN** Requirements Check is pressed with a saved account
- **THEN** it verifies that account without separate Verify saved or Replace buttons
- **AND** confirmed hover Remove clears only the named machine's account/grants, then restores the empty inputs

#### Scenario: Boards presentation
- **WHEN** the Boards disclosure is shown
- **THEN** its badge says N added, its scope row names the selected machine and each added board shows its name and hover Remove
- **AND** a saved account with zero boards is reported as needing boards, not credentials

#### Scenario: Unavailable actions and concise copy
- **WHEN** runtime, storage, connection or identity prevents an action
- **THEN** no action button is shown without its required fields or prerequisites
- **AND** the existing requirement row carries the short diagnostic/fix instead of dangling Save, hard-coded local wording or a new explanatory panel

### Requirement: Active and inactive board choices
The existing board picker SHALL offer Active and Inactive tabs for open and closed boards, defaulting to Active. Search SHALL filter only the selected tab; board rows SHALL NOT carry a redundant Closed board warning. Browsing, tab changes, searching and Cancel SHALL grant nothing.

#### Scenario: Picker categories and search
- **WHEN** discovery returns both open and closed boards and the owner changes tab or search
- **THEN** only matching names from that tab appear, without a yellow closed-board label
- **AND** only explicit Add commits the captured selected IDs on the captured host

### Requirement: Global access applied per execution host
The card SHALL expose one global Access value backed by explicit, nonportable owner consent and acknowledged host-local control. Every configured account host SHALL enforce its applied value in the CLI. Import/install/check/discovery SHALL NOT grant boards or writes. Host application failures SHALL remain visible without pretending an atomic all-host change or automatic write-grant replay.

#### Scenario: Global control across header selections
- **WHEN** the owner changes the header machine after explicitly choosing Access
- **THEN** Settings retains the same global value and identifies any host where application has failed or is pending
- **AND** successfully applied hosts use their protected activation/access record rather than an unrelated desktop-only preference

#### Scenario: Portable import is not consent
- **WHEN** preferences import Read-write or a runtime is installed or an existing account is merely checked
- **THEN** no private write authorization is created, migrated or replayed
- **AND** managed hosts with missing, invalid or conflicting control records refuse access rather than falling back to enabled desktop state

#### Scenario: Offline host application
- **WHEN** a global access operation cannot contact a configured account host
- **THEN** it reports that host as pending or failed and never claims that its effective rights changed
- **AND** the host retains its last acknowledged authority until a successful explicit application, so instantaneous offline revocation is not guaranteed
- **AND** a later Read-write application requires a fresh explicit action, not a durable authorization replay queue

#### Scenario: Legacy host authority and local disable
- **WHEN** an existing full installation has not explicitly adopted managed execution-host control
- **THEN** its legacy public/private gates remain enforced until an explicit owner action migrates them
- **AND** managed mode never lets a stale control record override an authoritative local disabled state
