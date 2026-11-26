## MODIFIED Requirements

### Requirement: Bounded finished-task pull request history
Completed tasks from the verified coordinator's Crew home SHALL contribute validated Open/Draft PRs without live workers, including closed tasks and reported tasks whose terminals ended or disappeared. Historical-only Merged/Closed PRs SHALL appear only within 24 hours of GitHub completion. Live sources SHALL win deduplication and retain worker navigation. Completed nonlive records SHALL grant no worker action; fresh owner/status and bounded reads remain required.

#### Scenario: Worker finishes before merge
- **WHEN** a same-home task becomes closed and loses its live worker while its validated task PR remains Open or Draft on GitHub
- **THEN** that PR remains in the coordinator's Open tab and repository/global counts
- **AND** it has no worker robot or navigation unless another eligible live task shares it
- **AND** finishing the final worker does not discard same-home PR history while its verified coordinator remains live

#### Scenario: Conservative Closed history
- **WHEN** a historical-only task PR is Merged or Closed on GitHub
- **THEN** it appears in the Closed tab and counts only within 24 hours of its authoritative merge/close timestamp
- **AND** older or undated historical closed PRs do not appear or leave empty repository headers
- **AND** PRs still linked by eligible live tasks retain normal Closed behavior regardless of age

#### Scenario: Live task shares a historical PR
- **WHEN** several completed tasks and an eligible live task link the same repository and PR number
- **THEN** the panel fetches, displays and counts one full PR identity and retains the live task's navigation control
- **AND** closing that live task removes its worker navigation but does not remove an otherwise eligible historical PR
- **AND** a stale captured callback cannot navigate to the former worker

#### Scenario: No recorded PR or wrong home
- **WHEN** a reviewer or scout has no PR, a task link is malformed, or status does not belong to the verified coordinator's crew home and owner
- **THEN** that record adds no historical row, count or worker target
- **AND** matching task names, repository names or local terminal IDs on another machine cannot bypass provenance checks

#### Scenario: Existing bounded reader and refresh
- **WHEN** historical candidates are read or updated by the shown enabled aggregate panel
- **THEN** recorded-only status includes completed tasks through the advertised fleet view when available or legacy --all JSON, with separate lower-priority discovery when supported, retaining response-size, task-count and finite transport bounds
- **AND** targeted GitHub reads retain their concurrency and batch bounds
- **AND** webhook/manual refresh and the eligible state-and-check fallback handle mutable PR transitions without repository-wide inventory, while unchanged final facts are reused and historical expiry needs no GitHub request

#### Scenario: Reported task outlives its terminal
- **WHEN** fresh same-home status reports a completed task as reported but its terminal has ended or been removed
- **THEN** that task's PR is admitted as read-only history rather than blocking the entire coordinator on Loading
- **AND** no terminal, adoption, colour or navigation authority comes from that completed record
- **AND** a still-working task with incomplete native membership remains unverified, and a still-live reported terminal must retain exact native membership
