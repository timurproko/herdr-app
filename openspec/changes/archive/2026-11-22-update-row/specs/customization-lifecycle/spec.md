## ADDED Requirements

### Requirement: Single Custom customization update row
Custom Settings Updates SHALL retain its native rows and add one Customizations row with a short verified installed revision or revision unknown, a short status and one Check now or Update button. It SHALL NOT add machine rows, news, settings or rollback controls. Checking and updating SHALL disable only that row's action.

#### Scenario: Current or newer published main
- **WHEN** a successful check compares the verified desktop installation with published main
- **THEN** equality shows Up to date with local HH:MM check time and Check now
- **AND** a different or unknown installed revision shows Update available and Update

#### Scenario: Failed check or missing revision
- **WHEN** the published-main check fails or no trustworthy installed revision exists
- **THEN** failure shows a short retry message rather than claiming current status
- **AND** the revision is never inferred from a source checkout HEAD

### Requirement: Managed desktop all-machine update
The row's explicit Update SHALL use only a managed desktop clone at ~/.local/share/herdr-app, created on first Update if absent. It SHALL invoke the existing deploy:all policy for full desktop and eligible existing peer shell updates, retaining clean-main and ownership gates. It SHALL NOT touch development checkouts, repair unsafe source or provision missing peer clones.

#### Scenario: Managed clone absent
- **WHEN** Update is clicked without a managed desktop clone
- **THEN** the action creates that clone from the fixed public main and deploy:all fetches and fast-forwards safe source there
- **AND** Check now never creates a clone or deploys

#### Scenario: Unsafe managed source
- **WHEN** the managed path redirects into another checkout, is a linked worktree, or fails the existing source gate
- **THEN** Update refuses without stashing, resetting, switching or repairing source
- **AND** the maintainer's development checkout and crew worktrees remain untouched

### Requirement: Reload-independent bounded update result
An update SHALL run independently of the mod it replaces, with a finite deadline and one latest durable status/result/log under the selected Herdr home. Reload, closing Settings or duplicate clicks SHALL NOT cancel or repeat it. A missing final result SHALL NOT imply success. No daemon, scheduler or job history SHALL be introduced.

#### Scenario: Page replaced during deploy
- **WHEN** deployment replaces Settings or the user closes and reopens it
- **THEN** the same update continues independently and the row reattaches to its status
- **AND** it shows Updating all machines with a disabled action until a result is known

#### Scenario: Deadline or lost completion
- **WHEN** the update exceeds its deadline, crashes or leaves no final result
- **THEN** the row reports outcome unknown with a log path and does not replay the update
- **AND** another deployment remains blocked while the prior process or lock is unresolved

### Requirement: Durable desktop revision and partial outcomes
Real deploy:all runs SHALL record latest per-machine outcomes and successful desktop commit with evidence tied to the installed ownership record, without changing the ownership manifest schema. Dry-run SHALL NOT write these records. Desktop success SHALL remain distinguishable from peer skips/failures; uncertain desktop installation SHALL NOT claim a verified new revision.

#### Scenario: Desktop success with incomplete peers
- **WHEN** the desktop deploy succeeds but a peer is skipped, fails or machine inventory fails
- **THEN** the row shows the new desktop revision and one short partial-outcome line naming the matching captured log or durable result path
- **AND** the log/result contains machine reasons and available backup IDs without adding machine rows
- **AND** ordinary successful version checks do not erase the partial-outcome warning

#### Scenario: Other deployment changes installed evidence
- **WHEN** a later ordinary deployment or rollback changes the ownership record from the saved successful desktop evidence
- **THEN** the row reports revision unknown rather than reusing a stale installed SHA

#### Scenario: Desktop deployment failure
- **WHEN** desktop deployment is refused or fails
- **THEN** the row states a short cause and that recovery uses documented rollback, with the log path
- **AND** no automatic rollback occurs or journal, stock-layout or later-edit safety gate is bypassed

### Requirement: Custom-owned update indicators and hourly checking
Confirmed Custom availability SHALL contribute to existing Custom Settings navigation and expanded/compact chrome update dots without changing native readiness. Custom SHALL check hourly while its non-footer chrome is mounted and when explicitly requested, coalescing concurrent checks. Checks SHALL NOT deploy, inspect peers or run in eager native checking contexts.

#### Scenario: Availability and failed recheck
- **WHEN** a check confirms an available Custom update and a later check fails
- **THEN** the existing Custom indicators retain that confirmed availability without fabricating a new one
- **AND** opening Updates alone does not clear it

#### Scenario: Automatic check while mounted
- **WHEN** the hourly check is due with Custom mounted outside an eager checking context
- **THEN** one coalesced published-main check runs without cloning, deploying or contacting machines
- **AND** native Herdr and herdr-core update actions and readiness remain unchanged
