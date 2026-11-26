# Spec Delta

## ADDED Requirements

### Requirement: Combined fleet placement evidence
A combined fleet SHALL accept legacy and supported placement-v1 workers in the same verified home and native space when minimal status omits task projects. Explicit project contradictions, unsupported versions and task/home or machine mismatches SHALL still refuse binding. Per-project placement SHALL still require matching authoritative project identity. Space titles SHALL NOT establish or invalidate identity.

#### Scenario: Minimal status and mixed combined workers
- **WHEN** read-only status identifies a live owner, exact same-home worker task identities and eligible finished-task PRs, but omits task projects, and one native combined child holds both legacy and valid placement-v1 workers
- **THEN** the coordinator and child are bound after exact live native membership verification on their own machine
- **AND** the coordinator task context includes eligible live and finished-task links without requiring relabeling, restarting or moving existing workers

#### Scenario: Explicit contradiction remains a refusal
- **WHEN** supported placement labels disagree with a supplied task project, task ID, adoption home or exact native space, or use an unsupported version
- **THEN** no fresh fleet binding or task-PR action authority is granted
- **AND** omitting project evidence in another task cannot excuse that explicit contradiction

#### Scenario: Per-project evidence is missing
- **WHEN** a worker claims per-project placement without authoritative matching task project evidence
- **THEN** the app does not infer the project from its labels, its title or another worker
- **AND** combined-mode compatibility cannot authorize that per-project child

#### Scenario: Combined title changes
- **WHEN** an unnamed combined child displays a different current worker directory name while its exact home, task and native membership evidence remains valid
- **THEN** the fleet relationship and coordinator task-PR scope remain unchanged
- **AND** renaming does not substitute for any missing identity proof
