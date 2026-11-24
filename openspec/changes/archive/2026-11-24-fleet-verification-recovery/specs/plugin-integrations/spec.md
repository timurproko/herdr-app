# Spec Delta

## MODIFIED Requirements

### Requirement: Non-destructive fleet status refresh
Refreshing fleet status SHALL distinguish pending or failed transport from a completed relationship result. Starting a read or receiving a read error SHALL NOT overwrite a previously verified binding with an authoritative absence. Successful status/binding replacement SHALL publish atomically, and obsolete read completions SHALL NOT replace newer facts. Retained display SHALL be bounded to persisted exact pair identities, not renewed action freshness.

#### Scenario: Error after a verified result
- **WHEN** a refresh fails after the same machine published a verified pair
- **THEN** the persisted verified pair remains available for identity-scoped presentation without being replaced by a fresh empty binding or expiring merely due to elapsed time
- **AND** the failure does not reset verification age or bypass live identity checks

#### Scenario: Fresh negative result
- **WHEN** a current successful read and coherent live model establish that no eligible pair exists
- **THEN** consumers observe the completed negative result, not the older cached pair
- **AND** a retry or result from a superseded generation cannot restore old ownership

#### Scenario: Shared refresh entrypoints
- **WHEN** Git manual refresh, existing relay invalidation, Spaces lifecycle or periodic Crew refresh runs
- **THEN** all consumers observe the same non-destructive refresh policy
- **AND** no extra healthy polling loop, companion or cross-machine inference is introduced; bounded unverified-fleet recovery uses the existing periodic lifecycle without a second scheduler

### Requirement: Bounded discovery compatibility
Discovery SHALL use the existing read-only installed-tool machine transport and coalesced local refresh lifecycle. Missing or unknown versions SHALL retain recorded-only behavior without an extra status call. Only an explicit unsupported discovery-flag refusal SHALL permit one bounded recorded-only fallback. Transport, timeout and authentication failures SHALL NOT mean none or trigger that fallback. Discovery SHALL retain healthy ten-second refreshes except bounded unverified recovery.

#### Scenario: Older Crew ignores the flag or uses an unknown version
- **WHEN** status succeeds without discovery metadata or with an unsupported discovery version
- **THEN** the app uses recorded links from that payload without another read and does not assert confirmed none
- **AND** no generic incomplete-list text is restored

#### Scenario: Older Crew explicitly refuses the flag
- **WHEN** the installed Crew status command explicitly rejects the discovery flag as unsupported
- **THEN** at most one bounded plain `status --all --json` fallback supplies recorded-only data
- **AND** failure of that fallback remains unavailable without another immediate attempt

#### Scenario: Timeout or authentication failure
- **WHEN** the machine transport times out or status fails for authentication or another non-capability reason
- **THEN** no capability fallback or immediate discovery retry is started
- **AND** the failure cannot publish none or renew successful action freshness; an eligible unverified fleet can retry only after its bounded recovery delay

#### Scenario: Slow and superseded discovery
- **WHEN** discovery consumes its additional ten-second budget or completes after plugin, preference, owner or read-generation replacement
- **THEN** finite transport and in-flight lease bounds account for that extra latency while duplicate readers still coalesce
- **AND** obsolete results cannot publish links, change bindings or authorize worker actions

## ADDED Requirements

### Requirement: Sanitized fleet verification diagnostics
Failed, unmatched and discarded fleet verification attempts SHALL retain a bounded machine-scoped reason, timestamp and attempted generation in runtime-only diagnostics. The customization log SHALL receive a bounded deduplicated line without raw command output, credentials, reports or task inventory. Late diagnostics SHALL NOT replace newer verification facts or grant action authority. Diagnostic persistence failure SHALL NOT prevent verification or recovery.

#### Scenario: Transport and status failures
- **WHEN** verification encounters a transport rejection, command timeout, nonzero Crew status exit, malformed response or unready native membership
- **THEN** its runtime diagnostic identifies the sanitized failure category, time and attempted generation
- **AND** timeout remains distinguishable from generic status failure without logging raw stderr or stdout

#### Scenario: No matching identity and obsolete reply
- **WHEN** a completed read has no owner, mismatching membership or no eligible fleet, or a reply is rejected as obsolete
- **THEN** diagnostics distinguish authoritative absence from uncertain membership and generation, lease or identity supersession
- **AND** an older reply cannot overwrite a newer success, current failure or retry deadline

#### Scenario: Repeated failures and recovery
- **WHEN** several mod copies or repeated retries encounter the same reason for the same machine and generation
- **THEN** runtime facts retain the latest occurrence but the log emits only the first line of that unchanged reason episode
- **AND** changed reasons or a new failure episode after recovery can produce a new line within the log's fixed size bound

#### Scenario: Existing verification feedback
- **WHEN** the selected coordinator has a relevant last verification failure
- **THEN** its existing Verifying, Waiting for fleet verification or Stale presentation exposes the sanitized reason and time through existing verification feedback rather than adding UI controls or notifications
- **AND** a cold unverified coordinator candidate gains no attachment, PR inventory, GitHub-read permission or worker-navigation authority from that feedback

#### Scenario: Runtime privacy and retention
- **WHEN** diagnostics are retained across mod replacement or inspected by an agent
- **THEN** their bounded runtime facts and customization log remain readable locally and excluded from portable preferences
- **AND** recovery history does not become a durable authorization record or contain raw task, transcript or authentication data

### Requirement: Bounded unverified fleet recovery
An enabled fleet with applicable native identity candidates but no current verification SHALL recover through its existing periodic lifecycle without user action or a second scheduler. Failed attempts SHALL wait 2 seconds, 5 seconds, 15 seconds and then 60 seconds between attempts, measured from completion. Healthy refresh/transport bounds SHALL remain unchanged. Recovery SHALL stop on success, disablement or authoritative absence, and SHALL never authorize unverified actions.

#### Scenario: Failed or timed-out first read
- **WHEN** first verification fails or times out while attachment and Crew remain enabled and candidates remain applicable
- **THEN** a recovery attempt runs on the existing periodic lifecycle after the delay without a click, dialog close, topology change or unrelated lifecycle interaction
- **AND** a later successful read attaches the pair and restores eligible coordinator Git context without fabricated intermediate attachment

#### Scenario: Repeated failures under load
- **WHEN** successive eligible attempts fail and native lifecycle events continue firing
- **THEN** delays progress through 2 seconds, 5 seconds, 15 seconds and then repeated 60-second intervals without parallel readers or lifecycle-driven early retries
- **AND** the existing shared read lease coalesces mounted mod copies and the next delay begins only after the current bounded attempt ends

#### Scenario: Disable, success and no fleet
- **WHEN** verification succeeds, attachment or Crew is disabled, candidates disappear or a completed coherent result establishes no applicable fleet
- **THEN** the recovery chain stops and later lifecycle callbacks cannot start recovery for that obsolete scope
- **AND** later ordinary native membership changes or explicit enablement can initiate a new eligible verification

#### Scenario: Startup and update replacement
- **WHEN** the app starts or replaces its mod graph after an update with attachment already enabled
- **THEN** mounted lifecycle startup starts or joins verification and resumes any eligible backoff independently of retired view callbacks
- **AND** a persisted abandoned read lease has a finite bound and cannot suppress verification indefinitely or count as witnessed success

#### Scenario: Changed generation while reading
- **WHEN** disable-enable, identity replacement or a newer generation supersedes a pending attempt
- **THEN** its completion records only a bounded discard diagnostic and cannot resurrect the old pair or retry chain
- **AND** the new eligible generation can run its own coalesced verification and recovery
