# Spec Delta

## ADDED Requirements

### Requirement: Global project-space switch in Spaces settings
Enabled Crew SHALL contribute one standard Spaces row immediately below Connect fleet space to coordinator, titled Separate space per project. Its switch SHALL show global Herdr intent: absent/off means combined; on means per-project. Title and description SHALL have no per-machine wording. Existing row, toggle and badge presentation SHALL be reused.

#### Scenario: Standard row and wording
- **WHEN** Spaces settings renders with Crew enabled
- **THEN** the row appears directly below Connect fleet space to coordinator
- **AND** its description is Give each project its own space under the coordinator for new work; running agents stay where they are.
- **AND** the row uses neighboring settings geometry with no new visual pattern or machine selector

#### Scenario: Intent remains global
- **WHEN** homes disagree about mode or the selected machine or coordinator changes
- **THEN** the switch retains the same saved intent rather than displaying the first returned home mode
- **AND** turning fleet attachment off does not change or pause this independent Crew policy

#### Scenario: Restart and preference round trip
- **WHEN** Herdr restarts or its existing preferences are exported and restored
- **THEN** the one boolean intent survives and missing intent defaults off
- **AND** target homes, observations, pending work and errors are excluded from portable preferences
- **AND** runtime application status is rechecked rather than restored as confirmed success

#### Scenario: Crew disabled
- **WHEN** Crew is disabled and later re-enabled
- **THEN** its row hides and new policy work stops while disabled
- **AND** re-enablement restores the same intent and resumes eligible reconciliation

### Requirement: Capability-aware global switch availability
Crew without the required desktop-setting capability SHALL leave the row disabled with a short reason, not a guessed version requirement. Offline, refused or failed homes SHALL retain saved intent and concise machine-named status using existing badge styling. A successful subset SHALL NOT imply that intent is applied everywhere.

#### Scenario: Installed Crew lacks the capability
- **WHEN** an inspected target machine's installed Crew cannot advertise worker-space-local-set version 1
- **THEN** the switch is disabled with a short Crew-support reason naming that machine
- **AND** existing intent remains visible and unchanged, with unsupported targets not counted as applied
- **AND** no install, update, ownership workaround or unsupported setter is attempted

#### Scenario: One refused home or offline machine
- **WHEN** a capable home matches intent but another home refuses or its machine is offline
- **THEN** the row preserves intent and shows the unresolved machine with concise Refused, Pending or Failed status as appropriate
- **AND** no optimistic global success, rollback of intent or raw command dump is shown
- **AND** multiple unresolved homes remain represented without hiding a failure behind a successful machine

#### Scenario: Off, on and unresolved presentation at both zooms
- **WHEN** synthetic native fixtures render off, on and pending or refused states at 100% and 130%
- **THEN** title, description, standard switch and existing-style machine status remain legible without overlap or overflow
- **AND** the fixtures do not alter real Crew configuration or running coordinators
