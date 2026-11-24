# Spec Delta

## ADDED Requirements

### Requirement: Unambiguous repository account routing
Per-repository GitHub reads SHALL explicitly identify the canonical repository in a form understood by repository-aware CLI wrappers, independently of the working directory. App-supplied GH_REPO SHALL NOT be empty. Reads SHALL NOT switch global GitHub accounts, override explicit user credentials, or infer routing from repository names embedded only in API paths or request bodies.

#### Scenario: Coordinator home with multiple repositories
- **WHEN** a coordinator outside a Git repository reads task PRs for two repositories
- **THEN** each read explicitly identifies its own canonical repository to the CLI wrapper
- **AND** neither read depends on the coordinator folder, an unrelated worktree origin, or empty GH_REPO

#### Scenario: Repository GraphQL and API reads
- **WHEN** a per-repository read uses GraphQL or an API path rather than a PR command
- **THEN** the invocation also supplies repository context recognized by the wrapper and supported by that command
- **AND** a repository named only inside the query or API path does not count as explicit routing

#### Scenario: Explicit user credential
- **WHEN** the execution environment supplies an explicit GitHub token
- **THEN** the app does not replace it or change the active CLI account to make a read succeed
- **AND** any resulting access refusal remains an honest scoped failure

### Requirement: Identifiable GitHub access refusal
A GitHub access refusal SHALL identify the refused canonical repository and the known account or credential context. If the effective login is unavailable, the notice SHALL state that uncertainty rather than claiming the active CLI login was used. Credential values SHALL never appear in notices, logs, shared state or public evidence.

#### Scenario: Inaccessible historical item
- **WHEN** a recorded historical task PR is genuinely inaccessible under the execution credential
- **THEN** its repository retains one applicable scoped notice with repository and account or credential context
- **AND** healthy rows and repositories remain displayed without automatic account switching or suppression of the refusal

#### Scenario: Account identity unknown
- **WHEN** the failed read does not establish the effective GitHub login
- **THEN** the notice names the repository and identifies the account as unknown or the credential context as unverified
- **AND** it does not assume a wrapper's owner mapping proves the server-authenticated login

### Requirement: Diagnosable coordinator render failures
Caught Git render failures SHALL log the actual error text and innermost failing row, section or notice component before preserving native last-frame fallback. A surviving component marker after an uncatchable native abort SHALL be reported on the next render attempt, explicitly distinguishing incomplete-render evidence from a known exception or timeout cause.

#### Scenario: Caught failure while rendering mixed history
- **WHEN** Closed contains two repositories with merged and closed-unmerged rows, historical and live-agent targets, and a section read notice, and a row or notice renderer throws
- **THEN** the log identifies its actual error and innermost component without replacing them with a generic outer-panel error
- **AND** the error still reaches the host's last-good-frame fallback

#### Scenario: Native interruption leaves a surviving marker
- **WHEN** a native abort bypasses JavaScript catch/finally and a later render observes the prior component marker
- **THEN** it logs the last entered component and an explicitly incomplete-render diagnostic
- **AND** it refers to the native banner or host log for the exact unavailable native error rather than inventing a cause

#### Scenario: Synchronous notice transport refusal
- **WHEN** the host begins a notice request inline during render and its transport fails synchronously
- **THEN** request fallback and notification happen only after yielding out of render
- **AND** healthy repository rows and section notices retain their ordinary presentation
