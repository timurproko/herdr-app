# trello-agent-access Specification

## Purpose

Give shell-capable agents bounded JSON access to explicitly permitted Trello boards while keeping credentials and write authorization private to each execution host.

## Requirements

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
- **THEN** ordinary JSON metadata requests use the configured API key/user token over HTTPS, while attachment downloads and previews use only the OAuth Authorization header
- **AND** no OAuth 2.0 flow, application secret, subprocess argument or external credential discovery is used
- **AND** download credentials never appear in query strings or requests to non-approved hosts

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
The CLI SHALL list allowed boards, board lists, board or list cards, existing board/card labels and card attachments, and read a card with comments, checklists and check items. Results SHALL retain relevant IDs and safe URLs, mark text as untrusted data, and report continuation or incompleteness rather than silently presenting truncated history as complete. Uploaded attachments SHALL be downloadable only through the protected read-only attachment command.

#### Scenario: Card detail
- **WHEN** a permitted card is read successfully
- **THEN** its name, description, list/board identity, dates, assigned labels, requested comments, checklist/item states and attachment count/IDs are returned as structured data
- **AND** board text, comments, filenames and check-item names are never interpreted as instructions or executed

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
- **WHEN** input requests permanent deletion, board administration, board-label creation/editing, attachment upload/deletion, bulk mutations, webhooks or arbitrary URLs/methods
- **THEN** validation refuses without a mutation request
- **AND** checklist/item deletion and source-card or source-checklist copying are not hidden escape hatches

### Requirement: Fixed-origin bounded transport
Requests SHALL use documented typed HTTPS endpoints on exact `api.trello.com`, with `trello.com` additionally permitted only for validated card attachment downloads/previews. Redirects, arbitrary subdomains and caller authentication/routing overrides SHALL be refused. Input, response size, request count and time SHALL remain bounded; failures SHALL produce sanitized structured errors. Link attachment URLs SHALL be metadata only and receive no requests or credentials.

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

#### Scenario: Hostile attachment URL
- **WHEN** provider metadata names an unapproved host, credential-bearing URL, non-HTTPS scheme, unexpected port or path for another card/attachment
- **THEN** no attachment request is dispatched to it and no key/token is disclosed
- **AND** approved download/preview requests use header authentication without forwarding credentials through redirects

### Requirement: No uncertain write replay
The client SHALL NOT automatically retry a dispatched mutation. A timeout, disconnect or unreadable response after possible acceptance SHALL report an unknown write outcome with safe read-based reconciliation guidance. It SHALL NOT maintain a replay queue or claim that a timed-out write failed to change Trello.

#### Scenario: Comment response lost
- **WHEN** a comment mutation might have been accepted but its response is lost
- **THEN** exactly one mutation was attempted and the result reports outcome unknown with instructions to inspect the card comments before another explicit attempt

#### Scenario: Mutation rejected before dispatch
- **WHEN** validation or local authority prevents dispatch
- **THEN** the result reports a definite local refusal, not an unknown remote outcome

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
- **THEN** its short description says that agents can read and update cards on chosen boards and retains the API key/token link
- **AND** Requirements distinguishes missing credentials, blocked checks and ready account setup without treating zero boards as an account requirement
- **AND** cached saved status does not claim a still-valid token without successful explicit verification

#### Scenario: Disposable native proof
- **WHEN** the changed card is demonstrated in a running app
- **THEN** fake inputs, injected provider and SSH responses, and disposable local/remote homes exercise the actual packaged card
- **AND** before/after evidence is outside the checkout and every started app, Core and handoff server is stopped before handoff

#### Scenario: Installed screenshot instructions
- **WHEN** an agent reads installed help without this checkout
- **THEN** it explains reading attachment IDs, listing metadata, downloading an original/preview to a private directory and inspecting the printed local path
- **AND** it documents size/type limits, external-link refusal, no uploads/deletes and no credentials in copied URLs

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
Successful owner verification and board addition SHALL persist bounded, validated account/added-board display names beside private setup, bound to current credentials and grants. Opening Boards and pressing Check SHALL refresh added-board names by canonical board ID, even when hints exist. Saved hints SHALL remain available on failed or incomplete reads. Names SHALL NOT become authority or portable preferences.

#### Scenario: Reopen with saved setup
- **WHEN** the owner closes and reopens a configured machine's card
- **THEN** saved account and board names remain available, including Unicode names, without requiring a click to recover cached names
- **AND** ordinary account status remains local without automatic account verification, while opening Boards refreshes added-board names
- **AND** the card uses no Saved prefix or Saved board ID placeholder for named entries

#### Scenario: Legacy missing names
- **WHEN** legacy headless or version-1 setup has no display hints
- **THEN** explicit Requirements Check fetches and saves missing account/allowed-board names, and opening Boards can hydrate allowed-board names
- **AND** no name is invented and no authority is granted

#### Scenario: Credential or grant change
- **WHEN** credentials are removed/rotated or a board grant is removed
- **THEN** corresponding stale display hints are invalidated and a different account cannot inherit names or authority
- **AND** incomplete board discovery preserves unseen existing grants and their valid hints

#### Scenario: Board renamed in Trello
- **WHEN** Trello renames an already-added board and the owner opens Boards or presses Boards Check or Requirements Check
- **THEN** successful refresh updates that board's displayed and saved name using its unchanged canonical ID, even when the old hint was present
- **AND** no remove/re-add is needed, and grant IDs, order and write permissions stay unchanged
- **AND** the existing list, disclosure and Check controls remain, with no new messages, buttons or options

#### Scenario: Trello unavailable or board absent from discovery
- **WHEN** a name refresh fails or discovery omits an already-added board
- **THEN** that board keeps its last-known name and grant without an empty-list flash or fabricated replacement name
- **AND** refresh does not retry in a background loop or change private access policy

#### Scenario: Refresh superseded by machine or account changes
- **WHEN** the owner changes machines, replaces/removes the account or disables Trello before a name refresh completes
- **THEN** the obsolete response cannot publish into the replacement selection or restore retired names or authority

### Requirement: Crew-pattern Trello card
The card SHALL reuse existing Requirements, Settings, list rows, badges, disclosures, confirmations and picker controls. Requirements SHALL show masked inputs with Save or one account-name row with Ready and hover Remove. Boards SHALL use named removable rows and selected-machine scope. Actions unavailable for the current state SHALL NOT be rendered.

#### Scenario: Empty and saved account states
- **WHEN** the selected machine has no saved account and usable runtime/storage
- **THEN** its Account status reads Add, the masked fields have a Save button, and that button reads Saving while the submission runs
- **AND** after saving, inputs and Save disappear and one account-name row replaces the redundant Account heading, with Ready at the right and Remove on hover

#### Scenario: Explicit verification and removal
- **WHEN** Requirements Check is pressed with a saved account
- **THEN** it verifies that account without separate Verify saved or Replace buttons
- **AND** confirmed hover Remove clears only the named machine's account/grants, then restores the empty inputs

#### Scenario: Boards presentation
- **WHEN** the Boards disclosure is shown
- **THEN** its badge says N added, its scope row names the selected machine and each added board shows its name and hover Remove
- **AND** a saved valid account with zero boards remains Ready and Requirements is All ready when its runtime/activation are ready; board grants still deny agent reads until explicitly added
- **AND** the divider below the machine scope is absent for an empty list and present when separating added board rows

#### Scenario: Unavailable actions and concise copy
- **WHEN** runtime, storage, connection or identity prevents an action
- **THEN** no action button is shown without its required fields or prerequisites
- **AND** an unsupported machine has one actionable explanation rather than duplicated row diagnostics, while other failures keep their applicable diagnostic

### Requirement: Active and inactive board choices
The existing board picker SHALL offer Active and Inactive tabs for open and closed boards, defaulting to Active. Tabs SHALL use the app's existing lightweight tab visual treatment instead of the field-choice segmented border. Search SHALL filter only the selected tab; board rows SHALL NOT carry a redundant Closed board warning. Browsing, tab changes, searching and Cancel SHALL grant nothing.

#### Scenario: Picker categories and search
- **WHEN** discovery returns both open and closed boards and the owner changes tab or search
- **THEN** only matching names from that tab appear, without a yellow closed-board label
- **AND** only explicit Add commits the captured selected IDs on the captured host
- **AND** selections survive tab changes, and unrelated Settings choices keep their existing appearance

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

### Requirement: Scoped attachment metadata
The CLI SHALL offer read-only `attachments list --board B --card C` and include attachment counts and IDs in card detail. Access SHALL require an allowed board and verified card membership before attachment lookup. Metadata SHALL retain validated identity, names, filename, MIME, size, date, upload/link kind, URL and image previews when present, with explicit incompleteness and no invented values.

#### Scenario: Card has uploaded screenshots
- **WHEN** an agent reads a permitted card or lists its attachments
- **THEN** attachment IDs, count and validated metadata expose that screenshots exist without downloading them
- **AND** previews retain available width, height, scaled flag and URL, and all names remain untrusted data

#### Scenario: Forged parent or attachment
- **WHEN** a card is outside the allowed board or a requested attachment is not on the verified card
- **THEN** attachment content is not downloaded and an unrelated object's content is not queried through an unscoped route

#### Scenario: Metadata exceeds a bound
- **WHEN** an attachment collection exceeds 100 returned entries or the metadata response limit
- **THEN** the result reports incompleteness or a bounded refusal rather than an invented complete inventory or cursor
- **AND** a reported total is exact only when authoritative evidence supports it

### Requirement: Protected read-only attachment downloads
The CLI SHALL offer `attachments get --board B --card C --attachment A --out DIR` with optional `--preview-width N`. Downloads SHALL cap at 20 MiB, default to validated PNG, JPEG, GIF or WebP images and require `--allow-other-types` for other uploads. Successful output SHALL contain a protected local path, not binary data; downloads SHALL NOT upload, delete, execute or automatically open files.

#### Scenario: Download a screenshot
- **WHEN** a permitted uploaded image passes parent, MIME, signature, size and output-folder checks
- **THEN** the CLI writes it in an owner-only folder and reports the absolute path and non-secret file facts
- **AND** the command works with read-only Trello/client access and adds no write permission

#### Scenario: Choose an image preview
- **WHEN** an agent requests a positive preview width
- **THEN** the CLI selects the smallest valid scaled preview at least that wide, or the largest valid scaled preview when all are smaller
- **AND** unavailable or unsafe previews cause an explicit refusal without silent original-file fallback

#### Scenario: Non-image upload or external link
- **WHEN** the attachment is a non-image upload without explicit other-type opt-in, or is a stored external link
- **THEN** no download occurs and metadata explains the unsupported kind
- **AND** even other-type opt-in never fetches a link attachment

#### Scenario: Oversized or misleading content
- **WHEN** metadata, Content-Length or streamed bytes exceed 20 MiB, or a default-image body disagrees with its allowed MIME/signature
- **THEN** the command aborts, removes its own partial output and publishes no successful path
- **AND** missing size headers cannot bypass streamed-byte enforcement

#### Scenario: Unsafe output or changed authority
- **WHEN** output paths are linked, permissions cannot be verified, a target already exists, or captured authority changes before publication
- **THEN** the command refuses without overwriting another file or leaving its own downloadable partial file
- **AND** created folders/files use owner-only permissions or verified current-user Windows ACLs

### Requirement: Single actionable unsupported-host explanation
An unsupported Trello setup connection SHALL show one plain-language explanation and safe next steps instead of repeated runtime/account/board failures or a numeric fix count. Elevated or unverified SSH identities SHALL remain refused before credential dispatch. Existing safe direct-SSH setup SHALL remain available; no credential import, privilege change or automatic provisioning SHALL be introduced.

#### Scenario: Elevated SSH connection
- **WHEN** the selected connection is refused for elevated execution
- **THEN** the card explains once that this SSH connection runs as administrator and cannot safely configure the regular user's Trello setup
- **AND** it directs the owner to use a non-administrator connection for the Core user or set up locally on that machine as the regular user
- **AND** Requirements does not show All ready or a misleading count of repairable requirements, and unusable Save, Install and board controls are absent

#### Scenario: Safe remote setup and uncertain failures
- **WHEN** a safely identified direct-SSH connection is selected
- **THEN** its existing explicit runtime Install/Update and account/board actions remain usable and target-bound
- **AND** a transient disconnection or failed permission check remains an honest failure, not a fabricated unsupported-host or ready result

#### Scenario: Stale unsupported response
- **WHEN** the owner changes machines or disables the plugin before an unsupported-host reply arrives
- **THEN** the obsolete reply cannot replace the new selection's guidance, names or controls

### Requirement: Actionable remote-read rejection details
A remote-read HTTP rejection SHALL expose its numeric HTTP status and a short safe reason through versioned JSON errors, retaining existing error codes. Reasons SHALL use fixed HTTP phrases and recognized Trello rejection categories, never arbitrary provider text, credentials or authenticated URLs. Unknown reasons SHALL fall back to the HTTP phrase rather than invent a token-scope diagnosis.

#### Scenario: Bad request versus denied access
- **WHEN** Trello rejects a card or attachment read with HTTP 400, 401, 403 or 404
- **THEN** the error includes the actual status and a short safe reason while preserving REMOTE, AUTH, FORBIDDEN or NOT_FOUND respectively
- **AND** a recognized invalid-parameter reason distinguishes a bad request from authentication or permission refusal without claiming a definitive scope cause from status alone

#### Scenario: Hostile or unknown rejection text
- **WHEN** a rejection body or status text contains secrets, authenticated URLs, control characters, private paths or an unrecognized explanation
- **THEN** the error exposes only the numeric status, a fixed HTTP phrase and any independently recognized safe rejection category
- **AND** neither raw provider text nor secret-bearing fragments appear in output or diagnostics

#### Scenario: Rate refusal details
- **WHEN** a remote read returns HTTP 429
- **THEN** the error retains RATE_LIMIT and the persisted retryAt behavior while including safe HTTP status and reason
- **AND** parsing the refusal never dispatches a retry

### Requirement: Bounded card and attachment read failure
Card and attachment remote reads SHALL honor the existing 20-second request and 60-second command budgets through dispatch, response/error consumption and cancellation. Private-store verification SHALL remain fail-closed and SHALL NOT permit a remote data command to exceed its command budget through repeated blocking checks. Timed-out reads SHALL stop follow-ups, publish no successful path and perform no retry.

#### Scenario: Stalled remote response
- **WHEN** dispatch, headers, a JSON/error body, an image stream or cancellation stalls
- **THEN** the command returns a structured failure within the remaining request and command budgets, aborts pending remote work and starts no follow-up request
- **AND** a failed image read leaves no owned partial output or successful local path

#### Scenario: Slow local permission checks
- **WHEN** repeated private-store or permission checks consume the remaining data-command budget
- **THEN** the command refuses before another network request or output publication rather than waiting beyond the budget
- **AND** it neither skips ACL verification nor reuses obsolete authority to meet the deadline

#### Scenario: Read-only card and image access
- **WHEN** an allowed card and uploaded image are readable with the configured read-only token
- **THEN** card detail, attachment listing and image retrieval use accepted Trello queries and return structured card facts and a protected local image path
- **AND** no wider token scope, board grant, credential copy or write permission is requested as an assumed repair
