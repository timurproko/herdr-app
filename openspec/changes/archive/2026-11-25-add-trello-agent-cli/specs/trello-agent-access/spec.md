# Trello agent access

## Purpose

Give shell-capable agents bounded JSON access to explicitly permitted Trello boards while keeping credentials and write authorization private to each execution host.

## ADDED Requirements

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
Setup SHALL accept an API key and user token only through protected local input, not command arguments or plugin settings. It SHALL store them in a private machine-local file under the resolved Herdr home, reject unsafe targets and malformed existing stores, and never publish secrets in output, logs, shared state, exports or deployment payloads.

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

### Requirement: Explicit local board and write authority
Every data command SHALL require enabled plugin state and an explicit host-local allowlist of canonical board IDs. Empty or invalid policy SHALL deny all boards, with no wildcard or all-boards option. Writes SHALL additionally require an explicit local read-write opt-in; portable preferences and command flags SHALL NOT grant that authority.

#### Scenario: Disallowed board read or write
- **WHEN** a request names a board absent from the local allowlist
- **THEN** it fails before any Trello request, including existence checks or object lookup for that board

#### Scenario: Empty scope and allowed boards listing
- **WHEN** the owner lists allowed boards
- **THEN** only explicitly permitted boards are queried and returned, never an account-wide board inventory
- **AND** an empty allowlist performs no Trello request

#### Scenario: Read-only and imported preferences
- **WHEN** local policy is read-only, even if imported public preferences request writes
- **THEN** every mutation is refused before a mutation request and no write flag bypasses that refusal

#### Scenario: Authority changes during preflight
- **WHEN** the allowlist, access policy or plugin enablement changes after a command begins
- **THEN** the command rechecks current authority before every follow-up and mutation, refusing superseded work

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
Documentation SHALL cover token generation for the owner's API key, local setup/scope/write authorization, command examples, errors, revocation and remote-host provisioning. It SHALL state that a shell-capable agent running as the same OS user can read the credential file and bypass client policy. Automated tests SHALL use fake credentials, disposable stores and injected transport only.

#### Scenario: Documented security boundary
- **WHEN** the owner follows README's Trello documentation link
- **THEN** the instructions distinguish client read-only policy from a server-issued read-only token and explain token revocation and same-user limitations

#### Scenario: Offline regression execution
- **WHEN** Trello regression tests execute
- **THEN** no real Trello request, credential discovery, user-home read, real deployment or live agent action occurs
