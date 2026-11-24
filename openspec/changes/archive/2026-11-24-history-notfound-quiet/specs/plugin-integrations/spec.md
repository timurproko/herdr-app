# Spec Delta

## MODIFIED Requirements

### Requirement: Truthful repository-scoped pull request read notices
The coordinator Git overview SHALL render at most one genuine PR-read failure notice per repository section in the selected tab. Notices SHALL distinguish GitHub responses from transport unreachability. All confirmed missing recorded task PRs SHALL be absent from the interface, including live tasks, with no row, notice, hint or tooltip. Other failures SHALL preserve healthy last-good rows and existing history eligibility.

#### Scenario: One live open PR and three finished merged PRs
- **WHEN** a verified coordinator records one live Open or Draft PR and three finished-task Merged PRs in the same repository, each merged within 24 hours
- **THEN** Open shows only the live PR and Closed shows the three merged PRs without historical worker robots
- **AND** successful reads produce no failure notices in either tab, with repository and global counts of Open 1 and Closed 3

#### Scenario: Failed refresh of known closed history
- **WHEN** refresh reads fail for several previously loaded historical Merged or Closed PRs in one repository without confirming their absence
- **THEN** their failures produce no notice in Open and at most one scoped read-failure notice in Closed
- **AND** last-good eligible rows and counts remain, while expired historical rows and their row-specific failures do not reappear

#### Scenario: Historical failure before state is known
- **WHEN** an initial read fails for a recorded historical-only PR whose GitHub state has not been established, without confirming its absence
- **THEN** at most one history-load notice appears in that repository's Closed section, with no per-PR error line under Open
- **AND** no state, completion date or count is invented for the unread PR

#### Scenario: GitHub answered with a refusal
- **WHEN** GitHub answers a PR read with a genuine access, authentication, rate-limit or other non-absence response failure
- **THEN** the notice describes the failed read or relevant refusal instead of declaring GitHub unreachable
- **AND** several failures in that repository still produce at most one notice in the applicable tab

#### Scenario: Local process failure or timeout
- **WHEN** the GitHub CLI cannot start, exits abnormally with empty stderr or exceeds its local command timeout
- **THEN** the applicable repository section shows one transient read-failure notice offering Refresh to retry rather than asserting that GitHub is unreachable
- **AND** last-good eligible PR facts survive and the existing bounded refresh path remains without a new polling or automatic retry loop

#### Scenario: Current account cannot resolve the repository
- **WHEN** GitHub explicitly refuses access to the repository or PR with the current login rather than establishing that the recorded PR is missing
- **THEN** the notice identifies access with the current GitHub account rather than a GitHub connectivity outage
- **AND** the panel does not switch the login or discard healthy rows

#### Scenario: Genuine connectivity failure
- **WHEN** applicable PR reads fail because the GitHub connection cannot be established or times out at the transport boundary
- **THEN** the repository section shows one clear connectivity notice rather than one line per PR
- **AND** other repositories' valid rows remain visible and no account switch or automatic enrollment occurs

#### Scenario: Partial recovery and folded sections
- **WHEN** some failed reads recover or a repository section is folded
- **THEN** recovered failures are removed from the summary without hiding remaining applicable failures
- **AND** folding hides the single notice with that section's body, without new reads or changes to its counts

#### Scenario: Confirmed missing finished-task PR
- **WHEN** GitHub authoritatively reports that an exact recorded historical-only task PR does not exist
- **THEN** the PR contributes no row, count, notice, neutral hint, tooltip or empty repository header in either tab, even if it previously had cached facts
- **AND** its canonical repository and number are remembered for the app session so manual refresh, webhook invalidation, hide/show and coordinator or panel recreation do not repeatedly request it
- **AND** first confirmation emits one sanitized customization-log line identifying that repository and number, with no raw command output, credentials or task inventory

#### Scenario: Mixed historical results
- **WHEN** a repository's recorded historical links contain both found PRs and confirmed missing PRs
- **THEN** only the found eligible rows contribute to presentation and counts, with no missing-history notice
- **AND** a different repository with the same PR number is independent of the remembered absence

#### Scenario: Missing live-task PR
- **WHEN** an unfinished task records a PR that GitHub confirms missing, including a PR also linked by finished tasks
- **THEN** the PR contributes no row, count, notice, neutral hint, tooltip, worker control or empty repository header in either tab
- **AND** repeated refreshes within five minutes do not re-request it; the next eligible existing shown-panel refresh after five minutes may recheck it once, without a new timer or concurrent duplicate read
- **AND** a corrected recorded URL can be read immediately without clearing unrelated remembered absences, and a successful later read can display the now-existing PR normally
- **AND** repeated missing confirmations still emit only the first sanitized customization-log line for that exact repository and number in the session; finishing the task restores session-long historical suppression

### Requirement: Identifiable GitHub access refusal
A GitHub access refusal SHALL identify the refused canonical repository and the known account or credential context. Unknown effective identity SHALL remain explicit. Credentials SHALL NOT appear in notices, logs or shared state. Authoritative missing task PRs SHALL produce no interface output, whether live or historical, and SHALL NOT imply a login problem; other missing resources SHALL retain truthful not-found diagnostics.

#### Scenario: Missing recorded pull requests
- **WHEN** GitHub reports an exact recorded task PR missing through PR resource resolution or a definitive missing-resource response to its targeted read
- **THEN** both finished-task-only and unfinished-task links produce no row, notice, hint or tooltip
- **AND** the absence starts no account diagnosis and does not describe an authentication or permission problem

#### Scenario: Obsolete refusal arrives
- **WHEN** a failed read completes after Git is disabled, the panel is hidden, or the captured repository, machine or request context changes
- **THEN** it starts no account-diagnosis follow-up for the obsolete request
- **AND** it cannot publish an error or remembered absence into the new context

#### Scenario: Several permission refusals in one refresh
- **WHEN** several PR reads in the same repository refresh receive real permission refusals
- **THEN** they reuse at most one effective-account diagnosis for that repository in that refresh
- **AND** a later refresh re-verifies the account rather than retaining an old login identity

#### Scenario: Inaccessible historical item
- **WHEN** a recorded historical task PR is genuinely inaccessible under the execution credential
- **THEN** its repository retains one applicable scoped notice with repository and account or credential context
- **AND** healthy rows and repositories remain displayed without automatic account switching or suppression of the refusal
- **AND** explicit permission or authentication failures, network errors, rate limits and timeouts are never remembered as missing PRs

#### Scenario: Account identity unknown
- **WHEN** the failed read does not establish the effective GitHub login
- **THEN** the notice names the repository and identifies the account as unknown or the credential context as unverified
- **AND** it does not assume a wrapper's owner mapping proves the server-authenticated login
