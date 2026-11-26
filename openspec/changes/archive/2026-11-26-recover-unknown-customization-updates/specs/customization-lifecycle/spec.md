# Spec Delta

## ADDED Requirements

### Requirement: Sharing-tolerant updater persistence
Updater receipts, status, availability checks and lock helpers SHALL tolerate bounded transient file-sharing failures without losing complete final deployment content. Exhausted replacement retries SHALL use a safe fallback publication or retain complete content that the reader can accept. Exclusive ownership and unreadable-state refusal SHALL remain intact.

#### Scenario: Final receipt target temporarily locked
- **WHEN** a finished deployment encounters a transient sharing failure replacing its final receipt
- **THEN** bounded retries publish a complete same-run receipt after the target becomes available
- **AND** Settings reconciles completion rather than remaining permanently unknown

#### Scenario: Replacement persistently refused
- **WHEN** replacement remains refused throughout the retry budget but fallback storage is writable
- **THEN** complete final content remains readable through fallback publication or validated recovery content
- **AND** an intermediate incomplete receipt does not indefinitely mask that final content

#### Scenario: State read overlaps publication
- **WHEN** a read encounters a transient sharing failure or incomplete fallback publication
- **THEN** bounded read-and-close retries tolerate the transient failure without retaining an open file
- **AND** exhausted or malformed reads never authorize another update as though no lock or unknown job existed

#### Scenario: Lock and non-receipt writes encounter contention
- **WHEN** status, availability or lock IO encounters a sharing failure
- **THEN** the same bounded fault policy applies without overwriting another exclusive lock
- **AND** failed IO closes owned descriptors and retains conservative action guards

#### Scenario: All persistence is unavailable
- **WHEN** storage cannot accept either normal or fallback content
- **THEN** the updater reports the persistence limitation without fabricating deployment failure or success
- **AND** it retains any complete evidence already written instead of deleting it during error cleanup

### Requirement: Explicit stopped-state recovery
Settings and the updater command SHALL offer explicit stopped-state recovery for dead installer locks, orphaned launches and malformed legacy state. It SHALL require dead recorded owners, complete local process proof, settled bounds and confirmation that local/remote work stopped; archive stale files and log consent while preserving payload, ownership and journals. Recovery SHALL NOT deploy, retry or force active, unreadable or redirected state.

#### Scenario: Dead installer or orphaned launch
- **WHEN** an interrupted installer or launch leaves stale metadata and every recorded owner is dead with settled evidence and no local updater process
- **THEN** the row offers Recover update with one explanation of what is cleared and why stopped-work proof is required
- **AND** the person must confirm all local and remote work has stopped before clearing anything

#### Scenario: Malformed legacy check and claim files
- **WHEN** malformed legacy state or a lock created before status publication prevents ordinary checking or updating
- **THEN** expired lease/deadline bounds, recorded-owner death and a complete local process survey permit the separate confirmed recovery action
- **AND** malformed bytes are preserved as evidence, not treated as a successful deployment or permission to replay

#### Scenario: Evidence-preserving clear without deployment
- **WHEN** the person confirms stopped-state recovery against the unchanged captured identity
- **THEN** stale updater locks, status, result and cache files move to private recovery, the previous log is preserved and consent is logged
- **AND** installed payload, ownership, preferences and rollback journals remain unchanged
- **AND** the row returns to Check now without starting a deployment, retry or rollback

#### Scenario: Lost runtime intent without a receipt
- **WHEN** an expired launch intent has no saved job or receipt after the deployment bound
- **THEN** Settings can offer explicit recovery only after complete stopped-process proof and local/remote stopped-work confirmation
- **AND** successful recovery clears the old intent/resume despite a later stale read, without replacing a newer launch or a different run
- **AND** normal empty homes never offer recovery merely because no update has run

#### Scenario: Documented command and cancellation
- **WHEN** the updater command previews recovery, or the person cancels or supplies obsolete confirmation
- **THEN** no deployment or authoritative-state recovery is dispatched
- **AND** the documented explicit confirmation flag uses the same stopped-work and preservation gates as Settings

#### Scenario: Active or unavailable process evidence
- **WHEN** any recorded owner is alive, local process discovery is incomplete, a lease remains unsettled, or state cannot safely be read
- **THEN** recovery is refused without a force option or silent installer-lock deletion
- **AND** newly launched ordinary all-machine CLIs refuse an active recovery claim before writing receipts or dispatching

#### Scenario: Abandoned retry claim after completion
- **WHEN** a retry request dies leaving an expired claim after its detached update completes
- **THEN** ordinary inspection archives only that dead owner's claim and another explicit Update can proceed
- **AND** the same housekeeping never clears an unknown deployment outcome or automatically replays work

### Requirement: Evidence-based unknown outcome recovery
Unknown runs SHALL settle only from attributable completion evidence after recorded processes are dead and a settle interval or deadline has passed. Proven deployment with an unsaved result SHALL be distinguished from genuine uncertainty. Genuine unknowns SHALL permit only a separately confirmed retry after quiescence checks; inspection, deadlines and availability checks SHALL NOT replay work.

#### Scenario: Deployment finished but final receipt was not saved
- **WHEN** a dead settled run has matching terminal deployment evidence and a final receipt-publication failure
- **THEN** the row states that deployment completed but the result could not be saved and names its matching details
- **AND** only that run's stale update lock is eligible for release, with installed revision still requiring matching ownership evidence

#### Scenario: Genuine unknown becomes eligible for deliberate retry
- **WHEN** recorded processes and known descendants are dead, the required settle/deadline boundary has passed, and a fresh main check succeeds without conclusive completion evidence
- **THEN** the row offers Retry update with a one-line explanation that the previous update may have finished
- **AND** no new update starts until the person confirms local and dispatched remote work has stopped and explicitly confirms retry

#### Scenario: Remote or descendant work might still run
- **WHEN** recorded local processes died but descendants are active, process facts are unreadable, or dispatched work lacks completion evidence
- **THEN** local PID death alone never declares success or authorizes ordinary Update
- **AND** unresolved dispatch waits through the original deadline and still requires explicit stopped-work confirmation before a retry

#### Scenario: Canceled or obsolete confirmation
- **WHEN** a person cancels, closes or reloads a retry confirmation, or a newer run or late complete receipt changes its captured identity
- **THEN** the confirmation cannot start another update
- **AND** competing confirmations and duplicate clicks can dispatch at most one guarded new run

#### Scenario: Automatic triggers encounter an eligible unknown
- **WHEN** status reads, Check now, startup, timer checks, focus catch-up or relay hints observe retry eligibility
- **THEN** they do not clear uncertainty as authorization or dispatch another update
- **AND** unknown diagnostics and evidence remain until conclusive settlement or an explicitly claimed retry

#### Scenario: Newer CLI remains authoritative
- **WHEN** an old terminal Settings job coexists with a newer incomplete CLI receipt, including a timed-out peer while other peer work continues
- **THEN** recovery uses the current receipt's matching run owner and deadline, not the old Settings PID or log
- **AND** a live current CLI blocks ordinary Update, Retry update and stopped-state recovery

#### Scenario: Legacy or foreign evidence is insufficient
- **WHEN** an old or tokenless CLI unknown lacks attributable process/dispatch evidence, or a log or recovery receipt belongs to another run
- **THEN** it remains unknown with investigation guidance rather than automatically becoming success or retryable
- **AND** the documented manual recovery path remains available without bypassing deployment locks or ownership gates

## MODIFIED Requirements

### Requirement: Single Custom customization update row
Custom Settings Updates SHALL retain its native rows and add one herdr-app-custom row with a short verified installed revision when known, a short status and one action slot. Without a verified revision, its title SHALL be only herdr-app-custom. The slot SHALL show Check now, Update, Retry update, Recover update or busy/current feedback matching the native rows. It SHALL NOT add machine rows, news, settings or rollback controls. Checking and updating SHALL disable only that row's action.

#### Scenario: Current or newer published main
- **WHEN** a successful check compares the verified desktop installation with published main
- **THEN** equality shows Up to date with local HH:MM check time
- **AND** a different or unknown installed revision shows Update available and Update
- **AND** deferred offline peer work can independently offer Update without changing the current desktop description or raising availability badges

#### Scenario: Recently requested check confirms current
- **WHEN** a user-requested custom check succeeds and confirms the installed revision is current with no deferred peer work
- **THEN** its action slot shows disabled ✓ Up to date with the native rows' markup, styling and recent-check condition
- **AND** the confirmation uses the native three-second recent-request window, refreshed during checking on the existing 300 ms cadence, before returning to Check now
- **AND** the Up to date description and check time remain after the confirmation expires

#### Scenario: Idle or busy row
- **WHEN** the custom row has no recent successful current check or an operation is in progress
- **THEN** it retains Check now otherwise, Update for safely retryable deferred peer work after a successful check, Checking… during a check and Updating… during an update
- **AND** an old cached current result alone does not start a new confirmation

#### Scenario: Failed check or missing revision
- **WHEN** the published-main check fails or no trustworthy installed revision exists
- **THEN** failure shows a short retry message rather than claiming current status
- **AND** the revision is never inferred from a source checkout HEAD
- **AND** failures and unknown outcomes do not show the current confirmation and retain their action and safety guards, with eligible unknowns using only the separately confirmed Retry update path

#### Scenario: Title across all update states
- **WHEN** the row is checking, update available, updating, failed or up to date
- **THEN** a known revision retains its existing seven-character suffix and an unknown revision adds no suffix or trailing space to herdr-app-custom
- **AND** no tooltip, footer or menu repeats the revision unknown placeholder
- **AND** an unknown revision cannot produce an up-to-date claim, even if a cached check says no update is available
- **AND** unknown-update-outcome and failure diagnostics retain their meaning

#### Scenario: Concise running description
- **WHEN** Custom is launching an update, waiting for its launch receipt or running the local update with a known published target, including when no other machines exist
- **THEN** the row description says Updating this machine to followed by that target's first seven characters and a full stop, such as `Updating this machine to 4c4bff1.`
- **AND** the target comes from the update check or the active run's target receipt, never from an invented value or unverified installed revision
- **AND** its disabled Updating… button and row layout remain unchanged, and every other phase text, timing and update logic remain unchanged

#### Scenario: Target becomes known after launch
- **WHEN** Custom is launching, waiting for a launch receipt or running without a trustworthy target yet
- **THEN** its description is `Updating.` without an ellipsis
- **AND** it switches to the target-aware description as soon as the update flow supplies the target

#### Scenario: Only other machines need updating
- **WHEN** an explicit update is catching up other machines and this computer is already verified current for the update target
- **THEN** the running description says Updating other machines to followed by the seven-character target and a full stop, such as `Updating other machines to 4c4bff1.`
- **AND** if the peer-only scope is known but its target is not yet known, the description is `Updating other machines.` without an ellipsis
- **AND** unknown desktop currency never claims that only other machines need updating

### Requirement: Reload-independent bounded update result
An update SHALL run independently of the mod it replaces, with a finite deadline and one latest durable status/result/log under the selected Herdr home. Reload, closing Settings or duplicate clicks SHALL NOT cancel or repeat it. Missing results SHALL NOT imply success or automatic replay. No daemon, scheduler or job history SHALL be introduced. Replacement of an open Updates view SHALL preserve that section and reconcile truthful row feedback without exporting navigation state as preferences.

#### Scenario: Page replaced during deploy
- **WHEN** deployment replaces Settings or the user closes and reopens it
- **THEN** the same update continues independently and the row reattaches to its status
- **AND** its description retains the target-aware running wording, or `Updating.` until the target is known, with the unchanged disabled Updating… action until a result is known
- **AND** a verified peer-only update retains its Updating other machines wording and known target

#### Scenario: Open Updates view replaced
- **WHEN** an update started from Updates replaces the still-open Settings view, while the runner is active or has just finished
- **THEN** the dialog remains on Updates without requiring another navigation click
- **AND** a pending or running update never flashes a stale actionable Update or Up to date result
- **AND** completion reconciles the verified revision and published-main check, retaining failure and partial-outcome feedback and the evidence-based unknown-result recovery rules

#### Scenario: Navigation and dismissal remain deliberate
- **WHEN** the person changes section or explicitly dismisses Settings before replacement
- **THEN** restoration does not force Updates over their newer selection or reopen the dismissed dialog
- **AND** a new dialog honors its requested destination or the ordinary Look default
- **AND** remembered navigation is not included in portable preference snapshots

#### Scenario: Reused native overlay ID
- **WHEN** native or backdrop dismissal or a Desktop restart reuses a previous Settings overlay ID
- **THEN** a new opening honors its requested destination or the Look default rather than borrowing the old opening's selection
- **AND** only the initiating opening's distinct identity permits update-triggered restoration while its job is pending or running, or for two minutes after completion
- **AND** openings without that identity do not restore a section from the native overlay ID

#### Scenario: Deadline or lost completion
- **WHEN** the update exceeds its deadline, crashes or leaves no final result
- **THEN** the row reports outcome unknown with a log path unless matching settled terminal evidence proves a precise outcome
- **AND** it never automatically replays; another deployment remains blocked while prior work is active or unresolved, except through the explicit quiescence-checked unknown-retry confirmation
