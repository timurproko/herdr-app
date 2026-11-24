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

### Requirement: Complete coordinator history rendering under read failure
The coordinator's Closed view SHALL render all eligible repository sections and their scoped notices without interrupting the view when merged and closed-unmerged PRs coexist, with or without live-agent actions. A read failure in one section SHALL NOT prevent other sections from rendering or cause render-time host side effects.

#### Scenario: Two repositories with mixed Closed rows and a notice
- **WHEN** Closed contains two repository sections with merged and closed-unmerged rows, historical rows without agents, live rows with agents, and a repository-scoped read notice
- **THEN** the complete coordinator view renders all eligible rows and the notice without falling back to the host's last rendered version
- **AND** rendering performs no synchronous host notification, focus-handle allocation, shared-state write or GitHub read
