# Spec Delta

## ADDED Requirements

### Requirement: Durable scoped agent monitor repositories
The agent monitor SHALL derive its repository allowlist from the durable confirmed added repositories for the current relay and GitHub account, independently of disposable webhook-notice membership. Empty, missing or mismatched selections SHALL remain empty without legacy fallback. Existing configuration lifecycle paths SHALL propagate the current selection to reachable managed companions without requiring a preference re-save.

#### Scenario: Add or remove invalidates notice membership
- **WHEN** an approved Add or Remove updates confirmed added repositories and clears the webhook-notice cache
- **THEN** the monitor configuration contains the remaining confirmed repositories for the current relay and account
- **AND** the existing lifecycle synchronizes that selection into each reachable managed worker's configuration

#### Scenario: Final repository removed
- **WHEN** the last confirmed repository is removed from the current scope
- **THEN** reachable managed workers receive an empty allowlist and authorize no further messages for the removed repository
- **AND** legacy repository preferences or old notice membership cannot repopulate that allowlist

#### Scenario: Configure or credential refresh invalidates notices
- **WHEN** Configure or credential refresh clears notice membership without changing the relay and GitHub account selection
- **THEN** the monitor retains the durable confirmed selection rather than emptying its allowlist
- **AND** a changed relay or GitHub account admits only a durable selection matching the new scope

#### Scenario: Startup and restart
- **WHEN** the desktop starts or its customization code reloads with auto-fix already enabled and durable confirmed repositories present
- **THEN** the existing lifecycle synchronizes the matching selection without a preference re-save
- **AND** a restarted companion retains its written allowlist and existing duplicate receipts

#### Scenario: Explicit management configuration
- **WHEN** an explicit management operation builds a worker configuration from public desktop settings
- **THEN** it uses the same current relay and GitHub account selection as the desktop lifecycle
- **AND** missing or mismatched durable selection never falls back to notice membership or legacy repository preferences

#### Scenario: Idle agent after scope repair
- **WHEN** a verified idle agent in a confirmed repository has a completed failed latest workflow and idle is selected for delivery
- **THEN** the existing non-forced delivery policy sends exactly one CI message for unchanged failure evidence across cycles and companion restart
- **AND** an enabled persistent conflict independently produces exactly one conflict message for unchanged conflict evidence
- **AND** templates, receipts, ownership and routing to the verified PR agent remain unchanged without coordinator notification

### Requirement: Truthful bounded agent monitor diagnostics
Enabled monitoring SHALL NOT report healthy-ready when its scope is empty or every candidate is skipped. Local diagnostics SHALL retain at most 128 sanitized sent/suppressed entries identifying reason, time, repository, PR and target terminal where known. Diagnostics SHALL distinguish delivery acknowledgement from unknown submission, grant no message authority and add no toast or panel UI.

#### Scenario: No monitored repositories
- **WHEN** auto-fix is enabled with an empty allowlist
- **THEN** status identifies no monitored repositories instead of healthy-ready
- **AND** a bounded suppression entry records that reason with unknown repository, PR and terminal left explicitly empty rather than invented

#### Scenario: Agent state not selected
- **WHEN** every verified candidate agent is in a state excluded by the saved selection
- **THEN** status identifies suppressed monitoring and diagnostics record agent state not selected with each known repository, PR and terminal
- **AND** no message is sent, Working remains opt-in and Blocked remains excluded

#### Scenario: Workflow still running
- **WHEN** a candidate's latest workflow is still running, even with an individual failed job
- **THEN** diagnostics identify workflow still running and no early job alert is sent
- **AND** a cycle in which every candidate is skipped does not report healthy-ready

#### Scenario: Already sent evidence
- **WHEN** an existing receipt suppresses unchanged CI or conflict evidence
- **THEN** diagnostics identify already sent for that repository, PR and terminal without another message
- **AND** attempted or unknown receipts are not falsely described as confirmed successful delivery

#### Scenario: Sent and uncertain outcomes
- **WHEN** the existing transport acknowledges delivery or returns an uncertain submission outcome
- **THEN** diagnostics retain that outcome with its repository, PR and target terminal without changing receipt claims or retry rules
- **AND** a send acknowledgement does not assert that the agent started or completed a fix

#### Scenario: Bounded non-authoritative history
- **WHEN** suppression repeats, the worker restarts, or diagnostic persistence fails
- **THEN** journal retention stays bounded and repeated unchanged episodes are coalesced
- **AND** diagnostics remain separate from delivery receipts, contain no raw output, message text, transcript or credentials, and never relax a delivery gate
- **AND** diagnostic-write failure does not prevent ordinary verification or delivery, and read-only probes do not persist diagnostic history
