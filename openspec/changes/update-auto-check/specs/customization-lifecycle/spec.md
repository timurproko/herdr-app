# Spec Delta

## MODIFIED Requirements

### Requirement: Custom-owned update indicators and hourly checking
Confirmed Custom availability SHALL contribute to existing Custom Settings navigation and expanded/compact chrome update dots without changing native readiness. Custom SHALL check on mount, hourly while its non-footer chrome is mounted and when explicitly requested, coalescing concurrent checks. Checks SHALL NOT deploy, inspect peers or run in eager native checking contexts.

#### Scenario: Availability and failed recheck
- **WHEN** a check confirms an available Custom update and a later check fails
- **THEN** the existing Custom indicators retain that confirmed availability without fabricating a new one
- **AND** opening Updates alone does not clear it

#### Scenario: Automatic check while mounted
- **WHEN** the hourly check is due with Custom mounted outside an eager checking context
- **THEN** one coalesced published-main check runs without cloning, deploying or contacting machines
- **AND** native Herdr and herdr-core update actions and readiness remain unchanged

#### Scenario: Manual availability reaches existing visible markers
- **WHEN** a manual Settings check confirms a Custom update is available with native App readiness off
- **THEN** the already-mounted expanded footer Settings icon, compact More trigger and Settings Updates navigation item show the same markers used for native readiness without reopening or remounting
- **AND** the compact More popup Settings entry carries the same six-pixel accent-circle indicator
- **AND** there is no new update-specific tooltip, badge or count

#### Scenario: Native and Custom availability combinations
- **WHEN** native App readiness and Custom availability independently change between available and current
- **THEN** each footer marker is visible when either is available and absent when both are current
- **AND** Settings Updates navigation additionally retains its native unmanaged-Core-ready condition and managed-Core exclusion
- **AND** native-only and Custom-only availability produce identical marker markup and styling on each surface

#### Scenario: Desktop opens after a missed merge
- **WHEN** Custom mounts after desktop closure or relay downtime and the normal persisted check interval is due
- **THEN** the mount check compares the installed revision with published main without waiting for another notice or the next hourly timer
- **AND** repeated mounts retain the existing persisted cache and check-lease safeguards

## ADDED Requirements

### Requirement: Relay hints accelerate fixed-repository update discovery
Custom SHALL debounce push hints for timurproko/herdr-app from Git's authenticated shared relay stream into its normal published-main check, even while the Git panel is hidden. Notices SHALL NOT supply trusted revisions, executable actions or check URLs. Manual Check now and explicit Update behavior SHALL remain unchanged.

#### Scenario: Published main changed
- **WHEN** a push hint for timurproko/herdr-app arrives and the normal check finds a different published-main revision
- **THEN** availability is published through the existing Custom update state and the existing markers become visible without user interaction
- **AND** no clone, deployment, peer inspection or update launch occurs

#### Scenario: Other branches and repositories
- **WHEN** a push hint names timurproko/herdr-app without branch information
- **THEN** Custom checks only the fixed public repository's main branch and unchanged main does not invent availability
- **AND** notices for other repositories or non-push events do not request a Custom update check

### Requirement: Bounded automatic hint checks and silent degradation
Automatic hints SHALL coalesce bursts, deduplicate deliveries and honor the existing check lease with a short persisted rate bound distinct from the hourly cache. Reconnection SHALL request at most one coalesced catch-up check per rate window, not replay notices. Disabled, unconfigured or unreachable Git relay integration SHALL silently preserve mount/hourly and manual checks.

#### Scenario: Burst and active check
- **WHEN** duplicate or several push notices arrive during a burst or while a check is active
- **THEN** only one pending invalidation is retained and checks do not overlap
- **AND** a newer hint arriving during an older check can cause at most one bounded follow-up rather than a check per delivery

#### Scenario: Reconnection catch-up
- **WHEN** the relay reconnects repeatedly after missed pushes
- **THEN** a coalesced authoritative main check can refresh availability without waiting for the hourly cache
- **AND** repeated ready messages and old delivery identifiers do not create a check storm

#### Scenario: Plugin unavailable
- **WHEN** Git is disabled or relay configuration, credentials or transport are unavailable
- **THEN** Custom issues no relay-driven checks or relay error notifications and keeps mount/hourly and manual checks available
- **AND** stale shared hints from a previous connection or disabled generation are not replayed
