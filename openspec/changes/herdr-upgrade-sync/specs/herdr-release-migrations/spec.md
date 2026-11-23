# Herdr release migrations delta

## Purpose

Give maintainers actionable, attributable compatibility reports when public Herdr App or Core releases advance, without changing native updates or runtime compatibility policy.

## ADDED Requirements

### Requirement: Independent public release discovery
Scheduled and manual discovery SHALL compare public App and Core release identities independently with merged review evidence. Reviewed profiles, pinned source contracts, stock baselines and native originals SHALL retain distinct meanings. A missing source or failed discovery SHALL NOT mean current or compatible.

#### Scenario: App advances independently
- **WHEN** the App feed names a newer stable release and Core remains at a reviewed release
- **THEN** discovery selects the new App and records the unchanged Core as context
- **AND** it records separate host, document, baseline and native-patch review coverage

#### Scenario: Core advances independently
- **WHEN** Core advances while App does not
- **THEN** discovery selects a Core migration without requiring a new App tag
- **AND** records generation, required RPC contracts and available source provenance

#### Scenario: Partial or invalid upstream evidence
- **WHEN** a feed fails, a tag is missing or moved, a source tree is truncated, or version/checksum evidence is invalid
- **THEN** the report identifies that failure and blocks only dependent checks
- **AND** independently discovered new releases remain reportable without claiming the missing component is current

### Requirement: Scoped attributable candidate evidence
A migration report SHALL identify reviewed and candidate versions, immutable source commits, retrieved evidence hashes and the customization consumers. It SHALL include unified upstream hunks for consumed public API/commands, tab-move document dependencies and every registered native patch surface. Candidate evidence SHALL NOT silently replace reviewed evidence.

#### Scenario: Palette and feedback source changed
- **WHEN** a new App changes both registered native frame surfaces
- **THEN** the report compares each candidate with every registered reviewed original and lists exact changed hunks and local patch files requiring review
- **AND** it distinguishes source equality from installed-binary patch applicability

#### Scenario: Baseline coverage is missing
- **WHEN** a candidate has no reviewed stock baseline
- **THEN** the report names the missing coverage and offers separately marked candidate hashes with provenance
- **AND** it neither substitutes an older baseline nor certifies the candidate as reviewed

### Requirement: Complete honest check results
Every migration step SHALL report passed, failed, blocked or skipped, with command or operation, reason and detailed evidence. Checks SHALL cover required host APIs/commands/import boundaries, tab-move source and synthetic regressions, native-original matching, baseline coverage and supported tests. Static or synthetic success SHALL NOT claim native execution or continuity.

#### Scenario: One compatibility check fails
- **WHEN** a candidate removes a consumed API or changes a reviewed native original
- **THEN** the affected check fails with the symbol or surface and consumer paths
- **AND** independent checks continue, with prerequisite failures explicitly blocking dependent checks

#### Scenario: Native evidence cannot be checked remotely
- **WHEN** only public source evidence is available and there is no authorized disposable native host
- **THEN** the report marks binary applicability and native interaction validation blocked or skipped with the reason
- **AND** a passing fixture suite does not erase these limits or a needs-review source result

### Requirement: One controlled draft proposal per release identity
Automation SHALL open at most one draft proposal per candidate release identity and target the repository default branch. Its report SHALL contain file-specific migration actions and evidence suitable for agent handoff. Reruns SHALL preserve existing body checkboxes and agent commits; a newer proposal SHALL add an idempotent supersession comment to older open proposals, not close or merge them.

#### Scenario: Repeated scheduled discovery
- **WHEN** the same candidate is discovered after its proposal exists
- **THEN** automation reuses that proposal and never creates a duplicate or rewrites its branch or delivery checklist
- **AND** refreshed reports identify the exact reviewed base and evaluated head

#### Scenario: Newer release supersedes an agent-owned proposal
- **WHEN** a newer candidate is proposed while an older proposal has migration commits
- **THEN** the older proposal receives one supersession notice linking the new proposal
- **AND** its commits, checklist, draft status and open state remain untouched

### Requirement: Skip and freeze controls
An unmerged proposal closed with `🤖 Herdr upgrade skipped` SHALL suppress its exact release identity on scheduled runs. Closure without that label SHALL NOT authorize another proposal for the same identity; explicit manual reconsideration SHALL reuse the closed proposal. `HERDR_UPGRADE_FREEZE_UNTIL` SHALL suppress scheduled writes until its UTC deadline; manual dispatch SHALL remain available.

#### Scenario: Skipped candidate and newer release
- **WHEN** a skipped proposal exists and a different newer release appears
- **THEN** the skipped identity stays suppressed and the newer identity remains eligible
- **AND** a manual exact-version override can request reconsideration without creating a duplicate

#### Scenario: Active or malformed freeze
- **WHEN** a scheduled run sees an unexpired or malformed nonempty freeze variable
- **THEN** it proposes nothing and explains the freeze or configuration error
- **AND** a manual read-only run remains possible without changing the variable

### Requirement: Non-invasive safe automation
Discovery and proposals SHALL NOT deploy, change update channels, restart native processes, alter runtime eligibility or automatically approve new originals. Proposal writes SHALL use existing delivery credentials with narrowly scoped repository permissions. Candidate source SHALL be treated as data, never executed with write credentials. A read-only mode SHALL perform no GitHub or branch writes.

#### Scenario: Migration remains pending
- **WHEN** a newly detected version has an unresolved proposal
- **THEN** existing capability, generation and document-shape checks continue unchanged
- **AND** unknown native bytes retain advisory skips and native updates are not blocked

#### Scenario: Evaluation of downloaded source
- **WHEN** automation compares public candidate source and runs customization regressions
- **THEN** it does not execute downloaded upstream scripts or native binaries
- **AND** writer credentials are unavailable to the evaluation process

### Requirement: Reviewable migration handoff
A proposal SHALL provide the ordinary shared-delivery checklist, linked OpenSpec planning artifacts and an explicit continuation instruction naming its PR, branch, candidate identity and report. A maintainer SHALL authorize implementation; automation SHALL never merge, arm auto-merge or mark the proposal ready. Crew handoff SHALL require no new Crew capability or automatic agent spawning.

#### Scenario: Person asks an agent to migrate
- **WHEN** the person approves a generated proposal and starts an agent on its PR
- **THEN** the instruction tells the agent to continue that existing branch and OpenSpec change, resolve file-specific review items and tick outcomes through shared delivery
- **AND** a Crew worker in a separate task branch is told not to create a second migration PR or overwrite the proposal branch
