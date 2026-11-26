# trello-agent-access Specification

## Purpose

Give shell-capable agents bounded JSON access to explicitly permitted Trello boards while keeping credentials and write authorization private to each execution host.

## Requirements

### Requirement: Optional headless integration
Trello SHALL be a declarative plugin that defaults to disabled and read-only. Its agent surface SHALL be a JSON command-line tool, without MCP, a board panel, background synchronization or automatic remote provisioning.

#### Scenario: Fresh installation
- **WHEN** a host installs the customization without configuring Trello
- **THEN** Trello data commands refuse before network access, and installation neither creates credentials nor enables the plugin

#### Scenario: Disabled during a command
- **WHEN** the plugin is disabled while an earlier request is in flight
- **THEN** it starts no follow-up request or mutation and returns no obsolete data as a current successful result
- **AND** a write already accepted by Trello is not claimed to have been cancelled

### Requirement: Explicit private credential setup
Setup SHALL accept an API key and user token through protected local headless input or transient owner Settings inputs, never persistent plugin settings or command arguments. Only the Node worker SHALL write the existing private machine-local credential file under the resolved Herdr home. It SHALL reject unsafe or malformed stores and never publish secrets in output, logs, shared state, exports or deployment payloads.

#### Scenario: Protected setup and rotation
- **WHEN** the owner explicitly imports fake or real credential input through the documented local setup mechanism
- **THEN** only the selected home's protected store receives it, and results reveal no key, token or authenticated URL
- **AND** replacement requires an explicit rotation action rather than silently overwriting malformed or unrelated files

#### Scenario: Unsafe store
- **WHEN** credential storage is linked, inside a source checkout, permissive to other ordinary users or otherwise unverifiable
- **THEN** setup and data commands refuse without weakening protections or seeking another credential store

#### Scenario: Authentication choice
- **WHEN** an authorized data command sends a request
- **THEN** it uses the configured API key and user token as Trello REST query authentication over HTTPS
- **AND** no OAuth 2.0 flow, application secret, subprocess argument or external credential discovery is used

#### Scenario: Save and verify from Settings
- **WHEN** the owner explicitly submits an API key and masked user token from this computer's Trello card
- **THEN** the worker verifies the token against Trello before saving and returns its non-secret account identity
- **AND** the form clears its values and shows saved status without fetching stored secrets back into the UI

#### Scenario: Saved verification and failed replacement
- **WHEN** the owner verifies saved credentials or attempts replacement with invalid credentials
- **THEN** verification returns only sanitized account/status facts and failed replacement leaves the prior credentials and policy unchanged

#### Scenario: Explicit replacement or removal
- **WHEN** the owner confirms replacing or removing saved credentials through Settings
- **THEN** only the captured protected local store is changed and local board and write authority are cleared for a successful replacement or removal
- **AND** removal explains that deleting this copy does not revoke the token at Trello

### Requirement: Explicit local board and write authority
Every agent data command SHALL require enabled plugin state and an explicit host-local allowlist of canonical board IDs. Empty or invalid policy SHALL deny all boards, with no wildcard or all-boards option. Writes SHALL additionally require explicit local read-write opt-in; portable preferences and command flags SHALL NOT grant that authority. Owner Settings discovery SHALL remain separate from agent listing.

#### Scenario: Disallowed board read or write
- **WHEN** a request names a board absent from the local allowlist
- **THEN** it fails before any Trello request, including existence checks or object lookup for that board

#### Scenario: Empty scope and allowed boards listing
- **WHEN** an agent lists allowed boards through the CLI
- **THEN** only explicitly permitted boards are queried and returned, never an account-wide board inventory
- **AND** an empty allowlist performs no Trello request

#### Scenario: Read-only and imported preferences
- **WHEN** local policy is read-only, even if imported public preferences request writes
- **THEN** every mutation is refused before a mutation request and no write flag bypasses that refusal

#### Scenario: Authority changes during preflight
- **WHEN** the allowlist, access policy or plugin enablement changes after a command begins
- **THEN** the command rechecks current authority before every follow-up and mutation, refusing superseded work

#### Scenario: Owner chooses boards by name
- **WHEN** saved credentials are available and the owner opens the Trello board picker
- **THEN** Settings can discover the boards visible to that token and offer named checkboxes without requiring typed IDs
- **AND** discovery alone grants no authority; explicit committed choices update only the protected local policy
- **AND** bounded or incomplete results are not presented as a complete inventory or used to erase unseen existing allowed boards

#### Scenario: Local access switch
- **WHEN** the owner explicitly chooses Read-only or Read-write in the Trello card
- **THEN** the action updates local write authorization and the existing public Access gate for that captured local configuration
- **AND** the control reflects effective local permission rather than assuming an imported Access value grants writes
- **AND** a write-capable Trello token is still required for successful writes

### Requirement: Scoped child identity
Commands for lists, cards, labels, checklists and check items SHALL require a permitted board context and verify parent membership from that scope before accessing child content or mutating it. A supplied child ID SHALL NOT authorize an unscoped lookup. Cross-board moves SHALL require both permitted boards and an explicit destination, with verified source and destination membership.

#### Scenario: Forged card or label ID
- **WHEN** an allowed board command supplies a card, list or label ID belonging elsewhere
- **THEN** it refuses using permitted-board membership checks without reading that unrelated object's content or sending a mutation

#### Scenario: Wrong checklist or check item
- **WHEN** a checklist or item does not belong to the verified card
- **THEN** no request changes that checklist or item

#### Scenario: Cross-board move
- **WHEN** a move names a destination list on another board
- **THEN** source and destination boards must both be locally allowed and their current identities verified before the single move mutation
- **AND** any unavailable, ambiguous or disallowed destination refuses without moving the card

#### Scenario: Concurrent external move
- **WHEN** an external editor moves a card between client-side verification and a later request
- **THEN** mismatching returned identity stops publication and follow-ups
- **AND** documentation discloses that separate Trello requests provide no atomic scope lock or compare-and-swap guarantee

### Requirement: Bounded read catalog
The CLI SHALL list allowed boards, board lists, board or list cards and existing board/card labels, and read a card with comments, checklists and check items. Results SHALL retain relevant IDs and safe Trello URLs, mark text as untrusted data, and report continuation or incompleteness rather than silently presenting truncated history as complete.

#### Scenario: Card detail
- **WHEN** a permitted card is read successfully
- **THEN** its name, description, list/board identity, dates, assigned labels, requested comments and checklist/item states are returned as structured data
- **AND** board text, comments and check-item names are never interpreted as instructions or executed

#### Scenario: Large result
- **WHEN** a read reaches a request, response, item or pagination bound
- **THEN** the result explicitly reports the incomplete component and a supported continuation when available
- **AND** it does not invent totals, undocumented cursors or a complete card history

### Requirement: Narrow single-object mutation catalog
With write authority, the CLI SHALL create, update, move and archive cards; add comments; add/remove existing labels on cards; create and rename/reorder checklists; and create, rename/reorder and complete/uncomplete check items. Inputs SHALL reject unsupported fields and operations. Each command SHALL perform at most one requested Trello mutation.

#### Scenario: Supported card changes
- **WHEN** a permitted write creates or updates a card with allowed name, description, dates or position fields
- **THEN** only validated fields reach the documented endpoint, and moving or archiving uses the corresponding explicit operation

#### Scenario: Labels and checklist edits
- **WHEN** a write assigns an existing board label or edits a verified card's checklist/item
- **THEN** the target and supplied fields are verified and only that single requested mutation is sent

#### Scenario: Excluded operation
- **WHEN** input requests permanent deletion, board administration, board-label creation/editing, attachments, bulk mutations, webhooks or arbitrary URLs/methods
- **THEN** validation refuses without a mutation request
- **AND** checklist/item deletion and source-card or source-checklist copying are not hidden escape hatches

### Requirement: Fixed-origin bounded transport
Requests SHALL use only the fixed Trello HTTPS API origin and documented typed endpoints, refusing redirects and caller-supplied authentication/routing overrides. Input, response size, request count and time SHALL be bounded. Authentication, permission, missing-resource, malformed-response and rate-limit failures SHALL produce sanitized structured errors.

#### Scenario: Redirect or hostile provider error
- **WHEN** transport returns a redirect or an error containing authenticated URLs, credentials or raw request material
- **THEN** no redirect is followed and the CLI exposes only a safe error category and relevant non-secret recovery information

#### Scenario: Rate refusal
- **WHEN** Trello responds with HTTP 429
- **THEN** the command stops and reports a bounded retry deadline respecting the longer Retry-After or applicable rate interval
- **AND** subsequent invocations respect the host-local cooldown without persisting board content or credentials in that cooldown

#### Scenario: Revoked token or denied board
- **WHEN** Trello rejects authentication or permission, or returns not found
- **THEN** the CLI distinguishes the response categories without claiming a successful operation or falling back to another account

### Requirement: No uncertain write replay
The client SHALL NOT automatically retry a dispatched mutation. A timeout, disconnect or unreadable response after possible acceptance SHALL report an unknown write outcome with safe read-based reconciliation guidance. It SHALL NOT maintain a replay queue or claim that a timed-out write failed to change Trello.

#### Scenario: Comment response lost
- **WHEN** a comment mutation might have been accepted but its response is lost
- **THEN** exactly one mutation was attempted and the result reports outcome unknown with instructions to inspect the card comments before another explicit attempt

#### Scenario: Mutation rejected before dispatch
- **WHEN** validation or local authority prevents dispatch
- **THEN** the result reports a definite local refusal, not an unknown remote outcome

### Requirement: Installed JSON shell interface
Ordinary build and full deployment SHALL package and install the self-contained CLI and owned shell launchers. Agents SHALL be able to resolve the installed command through a user-local bin directory on their shell PATH without this checkout. Deployment SHALL preserve launcher conflicts, credentials, local policy and unrelated state; shell-only deployment SHALL remain shell-only.

#### Scenario: Disposable installed command
- **WHEN** a full deployment installs into a disposable home with a disposable user bin on PATH and the source checkout is unavailable
- **THEN** Bash and supported Windows shells can invoke help/status and data commands through installed files only
- **AND** data output uses one versioned JSON result with stable success/failure exit codes, not mixed diagnostic prose

#### Scenario: Bin not on PATH or conflicting launcher
- **WHEN** the selected bin is not on the deployment shell PATH or an unknown/personal launcher occupies the command name
- **THEN** deployment reports actionable discovery or ownership failure instead of claiming agents can find the command or silently overwriting it
- **AND** it does not edit shell profiles, restart shells or inject terminal input

#### Scenario: Redeploy, recovery and shell-only deploy
- **WHEN** owned launcher/runtime files are updated or recovered
- **THEN** content hashes and later-edit safeguards apply, private stores stay untouched and ownership identifies the selected runtime home
- **AND** a shell-only deployment neither installs Trello nor copies credentials to peers

### Requirement: Owner guidance and isolated verification
Documentation SHALL cover Settings and headless setup, token generation, scope/write authorization, command examples, errors, revocation and remote-host provisioning. It SHALL explain that same-user shell agents can read credentials and bypass client policy. Automated tests SHALL use fake credentials, disposable stores and injected transport only.

#### Scenario: Documented security boundary
- **WHEN** the owner follows README's Trello documentation link
- **THEN** the instructions distinguish client read-only policy from a server-issued read-only token and explain token revocation and same-user limitations

#### Scenario: Offline regression execution
- **WHEN** Trello regression tests execute
- **THEN** no real Trello request, credential discovery, user-home read, real deployment or live agent action occurs

#### Scenario: Card help and readiness
- **WHEN** the owner views the Trello card
- **THEN** official token-generation help is available and the local setup requirement is satisfied only when credentials and at least one allowed board are saved
- **AND** saved local configuration alone does not claim a still-valid token without a successful explicit verification

#### Scenario: Disposable native proof
- **WHEN** the Settings card is demonstrated in a running app for this change
- **THEN** only a disposable instance, fake credentials and injected Trello responses are used
- **AND** evidence is stored outside the checkout and every app, Core or handoff server started for the demonstration is stopped before handoff

### Requirement: Trello setup machine isolation
Trello Settings setup SHALL bind all checks and actions to the captured machine selection. This version SHALL explicitly refuse setup, board discovery and policy changes for a non-local selected machine, without reading or changing this computer's private store. Headless setup SHALL remain available independently on each execution host.

#### Scenario: SSH-selected machine
- **WHEN** Settings selects an SSH machine and displays the Trello card
- **THEN** the card explains that private remote setup is unsupported here and directs the owner to headless setup on that host
- **AND** local saved status, board inventory and private-policy controls are not substituted for that machine's configuration

#### Scenario: Machine changes while action is pending
- **WHEN** the selected machine changes before dispatch or while verification or discovery is in flight
- **THEN** obsolete input and callbacks cannot dispatch a new operation or publish old machine facts into the new selection
- **AND** already-dispatched local effects remain identified as local rather than being retargeted or replayed
