# Spec Delta

## MODIFIED Requirements

### Requirement: Verified fleet integration identity
Fresh fleet action bindings SHALL require a live Crew owner and exact machine-qualified task-terminal membership with matching home identity and labels. Closed-task PR reads SHALL require validated same-home verified status, not a former worker. Remembered last-verified identity SHALL permit presentation and space-only block ordering, not new Git inventory reads, coordinator colour writes, messaging, worker navigation or terminal movement. Unknown action identity SHALL fail closed.

#### Scenario: Existing Crew identity
- **WHEN** read-only Crew status identifies its home, a live owner terminal and task terminals matching live worker labels and the current space model
- **THEN** only the owner's actual coordinator space and that home's unique fleet space are related
- **AND** the same local terminal or task ID on another machine cannot join that pair

#### Scenario: Ambiguous or moved terminals
- **WHEN** a worker label disagrees with the task record, workers span several candidate fleet spaces, or the owner is missing or replaced
- **THEN** the app refuses new ambiguous attachment and aggregate actions
- **AND** completed authoritative evidence removes an invalid prior attachment, while an incomplete refresh alone does not erase remembered last-verified presentation
- **AND** a later response from the previous binding cannot restore it

#### Scenario: Presentation is not authorization
- **WHEN** a remembered attachment is visible before fresh live action identity is verified
- **THEN** the display permits adjacency, matching badge colour, chain icons and same-machine space-only block ordering, but not new aggregate reads, coordinator colour writes, worker focus, messaging or tab/terminal movement
- **AND** same-home closed-task reads still require independently verified owner/status provenance
- **AND** existing stale-binding and generation checks continue to refuse obsolete requests

#### Scenario: Remembered coordinator without current inventory
- **WHEN** attachment is enabled or restored from host-local memory before current status and inventory are verified
- **THEN** the selected remembered coordinator shows the standard Loading working bulb rather than ordinary folder Git or a restored prior-toggle PR inventory
- **AND** presentation memory contains no PR/task inventory, grants no action freshness and does not alter Crew ownership, task records or running agents

### Requirement: Bounded unverified fleet recovery
An enabled fleet SHALL recover on its existing lifecycle without user action or another scheduler. Failures SHALL back off for 2 seconds, 5 seconds, then repeated 10 seconds from completion. Abandoned work SHALL become retryable within the current recovery interval regardless of initiating mod, never wait for a 45-second crash lease. Healthy bounded reads SHALL coalesce. Recovery SHALL stop on success, disablement or authoritative absence and SHALL NOT grant unverified operational authority.

#### Scenario: Failed or timed-out first read
- **WHEN** first verification fails or times out while attachment and Crew remain enabled and candidates remain applicable
- **THEN** a recovery attempt runs on the existing periodic lifecycle after the delay without a click, dialog close, topology change or unrelated lifecycle interaction
- **AND** a later successful read establishes first pairing and eligible coordinator Git context; a valid remembered presentation remains independent of read completion

#### Scenario: Repeated failures under load
- **WHEN** successive eligible attempts fail and native lifecycle events continue firing
- **THEN** delays progress through 2 seconds, 5 seconds and then repeated 10-second intervals without parallel healthy readers or lifecycle-driven early retries
- **AND** shared liveness and completion facts coalesce mounted mod copies, with the next delay beginning only after the current bounded attempt ends or is detected abandoned

#### Scenario: No slower recovery for retryable failures
- **WHEN** a local or ready remote machine has retryable verification failures, including transport errors or timeouts
- **THEN** no recovery delay exceeds the previous ten-second attempt cadence and no reason-specific slower interval is used
- **AND** an unready remote layout is gated until ready rather than assigned a longer retry interval
- **AND** a replacement module rejects persisted deadlines from the older slower policy

#### Scenario: Disable, success and no fleet
- **WHEN** verification succeeds, attachment or Crew is disabled, candidates disappear or a completed coherent result establishes no applicable fleet
- **THEN** the recovery chain stops and later lifecycle callbacks cannot start recovery for that obsolete scope
- **AND** later ordinary native membership changes or explicit enablement can initiate a new eligible verification
- **AND** disablement hides but preserves remembered pair identity, while authoritative absence clears invalid memory

#### Scenario: Startup and update replacement
- **WHEN** the app starts or replaces its mod graph after an update with attachment already enabled
- **THEN** mounted lifecycle startup starts or joins verification and resumes any eligible backoff independently of retired view callbacks
- **AND** a persisted abandoned read cannot suppress new verification for a full transport lease or count as witnessed success
- **AND** remembered pair presentation restores before the background read completes

#### Scenario: Changed generation while reading
- **WHEN** disable-enable, identity replacement or a newer generation supersedes a pending attempt
- **THEN** its completion records only a bounded discard diagnostic and cannot resurrect the old pair or retry chain
- **AND** the new eligible generation can run its own coalesced verification and recovery

#### Scenario: Initiating mod does not service recovery
- **WHEN** Settings or Git starts a read and its continuation or view disappears while another mounted Spaces copy continues lifecycle ticks
- **THEN** that lifecycle detects abandoned ownership or expired processing and makes a new attempt eligible within the current recovery interval plus one normal lifecycle tick
- **AND** recovery does not depend on the initiating copy's finally block, private maps or timers and does not overlap a healthy command still within its allowance
- **AND** a late reply cannot retire its successor, publish inventory or alter remembered presentation

#### Scenario: Real command takes several seconds
- **WHEN** the actual read-only Crew command takes four to five seconds and returns a supported real-home payload on App 0.1.18 and Core 0.1.22
- **THEN** a remembered pair stays visible immediately while first pairing and Git use Loading until verification completes
- **AND** a successful response publishes first pairing and verified inventory eligibility promptly after receipt without a 45-second lease wait
- **AND** a slow but live command is not mistaken for an abandoned reader merely because it exceeds the retry interval

### Requirement: Bounded discovery compatibility
Verification SHALL use recorded-only status, preferring an explicitly advertised fleet view. PR discovery SHALL be separate lower-priority work after verified recorded inventory is available, never blocking attachment or first inventory. Capability probes SHALL be cached by CLI path and modification time across repeated reads and mod copies. Unknown discovery versions SHALL remain recorded-only; only exact unsupported-flag refusals SHALL permit bounded capability fallback.

#### Scenario: Older Crew ignores the flag or uses an unknown version
- **WHEN** discovery succeeds without metadata or with an unsupported version
- **THEN** the app uses recorded links from that payload without another read and does not assert confirmed none
- **AND** no generic incomplete-list text is restored

#### Scenario: Older Crew explicitly refuses the flag
- **WHEN** the installed Crew status command explicitly rejects the discovery flag as unsupported
- **THEN** at most one bounded plain recorded-only fallback supplies data
- **AND** failure of that fallback remains unavailable without another immediate attempt

#### Scenario: Timeout or authentication failure
- **WHEN** machine transport times out or status fails for authentication or another non-capability reason
- **THEN** no capability fallback or immediate discovery retry is started
- **AND** failure cannot publish none or renew verification freshness; eligible verification recovery retains its bounded delay

#### Scenario: Slow and superseded discovery
- **WHEN** separate PR discovery consumes its extra budget or completes after plugin, preference, owner or read-generation replacement
- **THEN** already-verified attachment and recorded inventory remain available independently of discovery
- **AND** finite command bounds and shared liveness still coalesce healthy reads, while obsolete results cannot publish links, change bindings or authorize workers

#### Scenario: Repeated reads of the same installation
- **WHEN** verification, discovery, toggles or module copies read the same CLI path with unchanged modification time
- **THEN** they reuse previously observed capability evidence instead of running help per read
- **AND** a changed CLI path or modification time causes a fresh bounded probe before selecting the advertised view

#### Scenario: Recorded verification precedes discovery
- **WHEN** recorded-only status succeeds while Git inventory is needed and separate discovery remains pending or fails
- **THEN** the pair is verified and recorded task links can populate first inventory without waiting for GitHub discovery
- **AND** later enrichment cannot renew verification age, change pair identity or discard unchanged discovered links during the next recorded refresh
