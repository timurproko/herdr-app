# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
