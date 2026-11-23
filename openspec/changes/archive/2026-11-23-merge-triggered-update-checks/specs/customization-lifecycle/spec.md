# Spec Delta

## MODIFIED Requirements

### Requirement: Custom-owned update indicators and hourly checking
Confirmed Custom availability SHALL contribute to existing Custom Settings navigation and expanded/compact chrome update dots without changing native readiness. Custom SHALL check every 120–180 seconds while its non-footer chrome is mounted, with jitter, bounded failure backoff, startup and supported resume/focus catch-up, and when explicitly requested, coalescing concurrent checks. Checks SHALL NOT deploy, inspect peers or run in eager native checking contexts.

#### Scenario: Availability and failed recheck
- **WHEN** a check confirms an available Custom update and a later check fails
- **THEN** the existing Custom indicators retain that confirmed availability without fabricating a new one
- **AND** opening Updates alone does not clear it

#### Scenario: Automatic check while mounted
- **WHEN** the automatic check is due with Custom mounted outside an eager checking context
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

#### Scenario: Startup and return after idle
- **WHEN** Custom starts, its supported window activation signal returns after at least two minutes idle, or a delayed timer detects a sleep gap
- **THEN** it schedules one bounded catch-up check, reusing an active check and respecting persisted failure backoff
- **AND** rapid focus changes do not issue repeated checks or arm manual recent-check feedback

#### Scenario: Healthy independent desktops
- **WHEN** two running Desktop/Custom machines have different installed revisions and neither has a relay configured
- **THEN** each checks public main using its own installed evidence on the 120–180 second healthy cadence without opening Settings
- **AND** neither relies on the merging computer or the other's state

#### Scenario: Offline machine and manual retry
- **WHEN** automatic main checks repeatedly fail
- **THEN** retries back off with jitter to a bounded maximum of 30 minutes and survive view replacement or app restart
- **AND** automatic triggers cannot repeatedly bypass the failure delay, while explicit Check now retains its cache-bypass behavior and check lease
- **AND** a successful check restores the healthy cadence without clearing deployment failures, locks or unknown outcomes

## ADDED Requirements

### Requirement: Merge hints trigger authoritative availability checks
With an enabled, configured Git relay, mounted Custom updates SHALL subscribe independently of Git panel visibility or selected repository. Only pushes to refs/heads/main or closed merged PRs targeting main in timurproko/herdr-app SHALL invalidate its healthy cache. Hints SHALL trigger bounded coalesced authoritative main checks, never set availability directly or launch an update. Polling SHALL remain the fallback.

#### Scenario: Merge while Git panel is hidden or elsewhere
- **WHEN** an authenticated matching main push or merged-PR notice arrives while Git is hidden or showing another repository
- **THEN** an authoritative main check is scheduled promptly without waiting for the normal healthy cache expiry
- **AND** only the main comparison with verified installed evidence decides the shared badge
- **AND** no fetch into a checkout, deployment, native update or agent action is started by this update subscriber

#### Scenario: Irrelevant or incomplete event
- **WHEN** a notice names another repository, another branch, an unmerged PR closure, a CI event, or lacks valid branch/merge metadata
- **THEN** it does not invalidate Custom's main cache or change its badge

#### Scenario: Duplicate burst during a check
- **WHEN** duplicate or related push and PR notices arrive together or while a main check is running
- **THEN** delivery deduplication, a short debounce and a bounded rate limit coalesce them into one check with at most one pending catch-up
- **AND** late older results cannot overwrite newer update state or bypass failure backoff

#### Scenario: Missed event and reconnection
- **WHEN** relay authentication reconnects successfully after missed deliveries
- **THEN** updates request one coalesced authoritative catch-up, subject to failure backoff
- **AND** missing or old relay metadata still leaves polling, startup and idle-return checks working

#### Scenario: Availability only under every trigger
- **WHEN** an automatic or event-driven check finds main newer than the installed revision
- **THEN** existing dots and the Custom row reflect availability without requiring Check now
- **AND** installation still requires the person's explicit Update action with every existing source, ownership, lock and uncertain-outcome gate intact
