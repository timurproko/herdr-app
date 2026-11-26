# Spec Delta

## ADDED Requirements

### Requirement: One worker-space intent reconciles all known homes
One Herdr intent SHALL cover every authoritative known local and connected-machine Crew home, including several homes on one machine. Capable reachable homes SHALL receive the current mode through existing Crew machine execution. New homes and returning offline machines SHALL receive the latest intent without another switch change. Home observations SHALL NOT overwrite intent.

#### Scenario: On and off apply globally
- **WHEN** the switch changes on or off with several known homes on local and remote machines
- **THEN** each capable reachable home is reconciled to per-project or combined respectively, independent of current selection
- **AND** equal local home paths on different machines remain distinct targets
- **AND** combined is the default when the preference is absent

#### Scenario: Machine returns after missing several changes
- **WHEN** a known machine is offline while intent changes and then becomes reachable
- **THEN** its homes remain pending during the outage and receive only the latest intent when eligible
- **AND** already-applied homes do not conceal the pending machine

#### Scenario: Later home and restart
- **WHEN** an authoritative new home appears or Herdr restarts with saved intent
- **THEN** reachable homes are checked and reconciled without requiring another toggle
- **AND** a later home on an already-known machine is not mistaken for that machine's earlier home
- **AND** remembered observations never count as current confirmation after restart

#### Scenario: Bounded private target catalog
- **WHEN** a home temporarily becomes unreachable or target capacity is exhausted
- **THEN** known unresolved homes are not silently forgotten and capacity is reported as incomplete coverage
- **AND** the app neither scans arbitrary directories nor exports home identities, errors or pending state as preferences

### Requirement: Worker-space writes require Crew local-set capability
Before writing, Herdr SHALL require exit-zero capability JSON advertising worker-space-local-set version 1, both modes and explicitHome true. Writes SHALL use only crew config worker-space --set-local combined|per-project --home with an absolute target and --json. Success SHALL require a valid matching target/mode result. Missing support, refusals and uncertain results SHALL NOT authorize success or ownership workarounds.

#### Scenario: Strict installed capability probe
- **WHEN** installed Crew receives crew config worker-space --capabilities --json
- **THEN** only the exact supported capability schema enables the desktop setter
- **AND** missing capability, an unsupported version, text output, ignored flags or malformed JSON leaves writes unavailable
- **AND** timeout or transport failure remains unavailable rather than proof of unsupported Crew

#### Scenario: Read and write confinement
- **WHEN** a known home's observed mode differs from intent
- **THEN** the read uses crew config worker-space in that explicitly scoped home and the setter receives that home's absolute path
- **AND** the app validates capability, version, ok, canonical home, effective mode and changed in the JSON response against the captured request
- **AND** it does not use the legacy positional owner-only setter, direct crew.json edits, terminal-identity impersonation, crew start/end or lock manipulation

#### Scenario: Refused result
- **WHEN** a setter returns a documented refusal with exit 2, 3, 4 or 70, or an invalid success response
- **THEN** its home remains unresolved with a stable sanitized reason and no fabricated mode change
- **AND** other successful homes and global intent are preserved
- **AND** no refusal is bypassed by initialization, repair, elevation or coordinator control

#### Scenario: Existing work is untouched
- **WHEN** Crew accepts either worker-space mode
- **THEN** only future independent task admissions use the current choice
- **AND** running agents stay in place while reviews and replacements retain source placement
- **AND** Herdr does not move, restart, relabel, create or delete terminals, spaces, tabs or panes to apply the choice

### Requirement: Worker-space reconciliation is bounded and truthful
Enabled policy work SHALL run outside rendering on the existing recurring lifecycle with bounded transport, shared single-flight ownership and per-home write serialization. Changed intent SHALL supersede queued work and stale replies SHALL NOT confirm newer intent. Failures SHALL retain truthful machine status and retry when eligible. Closing Settings SHALL NOT abandon the policy; disabling Crew SHALL stop new work.

#### Scenario: Intent changes during application
- **WHEN** a setter is in flight while intent changes again
- **THEN** the old result cannot mark the new intent applied and no overlapping setter targets that home
- **AND** after settlement the current intent is reconsidered, not an earlier queued value

#### Scenario: Timeout then recovery
- **WHEN** a write outcome is unknown, a home refuses, or a machine disconnects
- **THEN** no optimistic confirmation is published and current intent remains pending, refused or failed for that machine
- **AND** an uncertain outcome requires a fresh read before another write
- **AND** existing lifecycle reachability checks and bounded retry reconsider the current intent without a new transport or busy loop

#### Scenario: Multiple mounted copies and disablement
- **WHEN** several views need the same home or Crew is disabled during a request
- **THEN** healthy requests coalesce and disabled or superseded continuations start no follow-up work
- **AND** an expired owner cannot publish over its successor or turn an abandoned request into confirmed success

#### Scenario: Fake-only setting verification
- **WHEN** on, off, missing capability, one refused home, offline return, later home and restart persistence are exercised
- **THEN** Crew commands, homes and responses are fake and isolated from the person's configuration and coordinators
- **AND** both intent and machine-scoped application status are asserted rather than inferring success from a switch change
