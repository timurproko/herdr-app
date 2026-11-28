# Plugin integrations delta

## ADDED Requirements

### Requirement: Stable same-repository Git navigation
Agent navigation within an already shown qualified repository SHALL retain the last coherent list while destination association resolves. Retention SHALL NOT depend on click animation admission or grant action authority. Existing pin placement, motion, layout, controls, text and settings SHALL remain unchanged.

#### Scenario: Same-folder unknown footer
- **WHEN** a pointer or keyboard navigation changes the selected agent in the same machine and repository while its footer read is pending
- **THEN** the previously committed coherent list remains visible without cold Loading or an error-only replacement
- **AND** the resolved destination is published in one final pin/list layout without an intermediate unpinned destination

#### Scenario: Same-repository worktree and failed refresh
- **WHEN** navigation targets another canonically verified worktree of that qualified repository, or its replacement read fails or is refused
- **THEN** the last coherent repository list, paging and scroll remain until an authoritative replacement is available
- **AND** existing actionable feedback and diagnostics remain without granting stale reads or agent actions

#### Scenario: Incompatible or unknown destination
- **WHEN** the destination machine, repository, effective credential route or enable generation is different or cannot be safely established
- **THEN** incompatible rows cannot populate that destination
- **AND** existing cold loading and authority checks apply without guessing identity from names, branches or task labels

### Requirement: Bounded deduplicated Git transport admission
Git read transports across customization consumers SHALL admit at most four active requests in total and retain at most 256 distinct queued requests. Identical qualified reads SHALL coalesce without sharing consumer authority. Superseded or disabled work SHALL not dispatch. Native capacity refusal SHALL preserve shown data; it SHALL NOT be treated as GitHub rate refusal or authorize uncertain action replay.

#### Scenario: Many due agents and simultaneous refresh
- **WHEN** twenty or forty agents are due for repository discovery while root, page, footer or auxiliary reads are also due
- **THEN** no more than four read transports start concurrently, including across duplicate mounted Git consumers
- **AND** canonical discovery for the same machine, folder, route and generation is shared rather than started once per labelled agent

#### Scenario: Host execution saturation
- **WHEN** the host refuses a queued read before process start because its execution slots are occupied
- **THEN** bounded read retry retains the last coherent same-repository list and existing feedback
- **AND** a timeout, failed transport or unknown submitted action cannot become automatic write or focus replay

#### Scenario: Revoked queued and completed requests
- **WHEN** a queued consumer becomes obsolete or a held read completes after a selection, provider identity or enable generation changes
- **THEN** dispatch and publication require fresh current authority for each remaining consumer
- **AND** abandoned ownership is retired without allowing a still-running transport to be counted as a free slot

### Requirement: Preserved UI during architectural extraction
Internal UI extraction SHALL preserve existing geometry, colours, text, icons, controls, hover, focus, keyboard and pointer interaction, animations, settings and saved values. Visible differences between surfaces SHALL remain explicit variants unless separately approved. Native watchdog and genuine failure diagnostics SHALL remain intact.

#### Scenario: Shared component has different callers
- **WHEN** two panels share an extracted header, row, feedback, tooltip or scrolling primitive but previously use different presentation or interaction policies
- **THEN** each retains its original policy and appearance without silently adopting the other's default
- **AND** no new, removed or renamed control, message or option is introduced by the extraction

#### Scenario: Performance acceptance and failure transparency
- **WHEN** ordinary and coordinator Git are exercised at 100 and 130 percent with rich rows and growing agent populations
- **THEN** complete construction, mounted counts and interruptions are reported separately from paint latency and measured against the unchanged watchdog and explicit render budget
- **AND** passing existing geometry and interaction suites cannot substitute for full-controller native evidence or justify suppressing a genuine failure
