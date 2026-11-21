# plugin-integrations Specification

## Purpose
Define how optional panels and external integrations compose with the workspace, stop work when disabled, and keep account and operational effects separate from public configuration.

## Requirements

### Requirement: Independent plugin lifecycle
The app SHALL expose independent plugin controls for Files, Git, Usage and optional external integrations. Disabling a plugin SHALL hide its entrypoints and stop new plugin work while preserving user preferences. Already-started work SHALL NOT initiate follow-up work or overwrite newer state after disablement.

#### Scenario: Both sidebar panels disabled
- **WHEN** the user disables both Files and Git
- **THEN** the sidebar and its toggle are hidden without deleting panel preferences or existing file-viewer tabs

#### Scenario: Usage disabled during collection
- **WHEN** Usage is disabled while a collector is in flight
- **THEN** its entrypoints disappear and no new collection is started
- **AND** a stale result cannot overwrite state from a later enable generation

### Requirement: Explicit file operations
Files SHALL resolve paths on the selected machine, reuse an unambiguous existing viewer in the current space, and require confirmation before recycling captured entries. Recycling SHALL use that machine's supported trash/recycle facility and SHALL have no permanent-delete fallback.

#### Scenario: Unsupported trash facility
- **WHEN** a confirmed file deletion cannot use a supported recycle facility
- **THEN** the app reports failure without retrying permanent deletion or another machine

#### Scenario: Existing file viewer
- **WHEN** the user opens a file with an unambiguous existing viewer for the same full path in the current space and machine
- **THEN** the app activates that viewer rather than creating a duplicate

### Requirement: Git and automation authority boundaries
Git SHALL present repository/PR/CI information for the captured repository. Webhook notices SHALL act as authenticated invalidation hints, not authority to execute a fix. Automatic fix behavior SHALL default to off and require explicit user configuration plus independent evidence and policy gates before messaging an agent.

#### Scenario: Unconfigured automatic fix
- **WHEN** a CI failure notice arrives with automatic fix unconfigured
- **THEN** the app does not provision automation or send an agent a fix request

#### Scenario: Webhook authentication rejected
- **WHEN** a webhook request has an invalid signature
- **THEN** it is rejected without delivering an invalidation to authenticated subscribers
- **AND** source publication does not supply a bypass token or webhook secret

### Requirement: Usage and account privacy
Usage and account integrations SHALL keep credential stores, live account selection, usage caches and session data machine-local. Credential access or refresh SHALL be disclosed as operational behavior, not described as a visual-only theme. Public examples SHALL NOT contain real account-linked pins or privileged automation choices.

#### Scenario: Fixture-only usage regression
- **WHEN** usage and account behavior is tested without configured providers
- **THEN** tests use isolated made-up account stores and mocked provider transport
- **AND** do not read or refresh the user's installed provider credentials

### Requirement: Optional companion compatibility
External companion actions SHALL require explicit feature configuration and verified prerequisites. Unsupported A1 protocols or stale exact-session identity SHALL refuse control without restarting agents, injecting input or mutating unrelated sessions. External private shell wiring SHALL NOT be required for base installation or represented as installed by deployment.

#### Scenario: Incompatible running A1 session
- **WHEN** a configured color/control integration encounters an unsupported protocol or stale session identity
- **THEN** it reports unavailability without modifying another session or restarting the existing agent

#### Scenario: Standalone install without private shell profiles
- **WHEN** the app is built and installed without external dotfiles-managed shell hooks
- **THEN** base layout and plugin configuration remain available
- **AND** optional shell-reporting limitations are documented rather than silently installing private profile integration
