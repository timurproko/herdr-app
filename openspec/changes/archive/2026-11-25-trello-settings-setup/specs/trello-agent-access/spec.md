# Trello setup delta

## MODIFIED Requirements

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

## ADDED Requirements

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
