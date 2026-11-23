# Spec Delta

## MODIFIED Requirements

### Requirement: Single Custom customization update row
Custom Settings Updates SHALL retain its native rows and add one herdr-app-custom row with a short verified installed revision when known, a short status and one action slot. Without a verified revision, its title SHALL be only herdr-app-custom. The slot SHALL show Check now, Update or transient busy/current feedback matching the native rows. It SHALL NOT add machine rows, news, settings or rollback controls. Checking and updating SHALL disable only that row's action.

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
- **AND** failures and unknown outcomes do not show the current confirmation and retain their existing action and safety guards

#### Scenario: Title across all update states
- **WHEN** the row is checking, update available, updating, failed or up to date
- **THEN** a known revision retains its existing seven-character suffix and an unknown revision adds no suffix or trailing space to herdr-app-custom
- **AND** no tooltip, footer or menu repeats the revision unknown placeholder
- **AND** an unknown revision cannot produce an up-to-date claim, even if a cached check says no update is available
- **AND** unknown-update-outcome and failure diagnostics retain their meaning

#### Scenario: Concise running description
- **WHEN** Custom is launching an update, waiting for its launch receipt or running the update
- **THEN** the row description is exactly Updating…
- **AND** its disabled Updating… button and every other state's wording remain unchanged

### Requirement: Durable desktop revision and partial outcomes
Real deploy:all runs SHALL record latest per-machine outcomes and successful desktop commit with installed ownership evidence, without changing the ownership manifest schema. Dry-run SHALL NOT write these records. Desktop success SHALL remain distinct from peer skips/failures; uncertain installation SHALL NOT claim a verified revision. Definite failures SHALL retain an actionable stage and cause through the result, runner and Settings row, including the App version for a host-check refusal.

#### Scenario: Desktop success with incomplete peers
- **WHEN** the desktop deploy succeeds but a peer fails, has an unclassified or non-benign skip, or machine inventory fails
- **THEN** the row shows the new desktop revision and one short partial-outcome line naming the matching captured log or durable result path
- **AND** the log/result contains machine reasons and available backup IDs without adding machine rows
- **AND** ordinary successful version checks do not erase the partial-outcome warning
- **AND** reachable deployment errors, locks and post-dispatch unknown outcomes never become benign offline skips

#### Scenario: Offline peers do not imply partial failure
- **WHEN** the desktop deploy succeeds and every other outcome is deployed, already current, a positively identified pre-dispatch offline/unreachable skip, or the deliberate needs-its-own-full-deploy exclusion
- **THEN** completion is successful rather than partial and the reconciled current desktop row shows Up to date without a warning or log pointer
- **AND** Custom update-available badges clear when the verified desktop matches published main
- **AND** the log and durable result still plainly record each skipped machine and reason

#### Scenario: Desktop-equipped peer remains independently updated
- **WHEN** a reachable peer is deliberately excluded because its installed non-shell output needs its own full deploy
- **THEN** the exclusion is benign for this desktop's result and creates no deferred shell deployment work
- **AND** that other desktop still needs its own full Update, with no remote full deployment or process restart

#### Scenario: Other deployment changes installed evidence
- **WHEN** a later ordinary deployment or rollback changes the ownership record from the saved successful desktop evidence
- **THEN** the row omits the installed revision from its title rather than reusing a stale installed SHA or showing a revision unknown placeholder
- **AND** unknown installed evidence still offers Update after a successful published-main check, subject to existing safety guards

#### Scenario: Desktop deployment failure
- **WHEN** desktop deployment is refused or fails
- **THEN** the row states the failed stage and a short cause, including the App version for a host-check refusal, with documented rollback and matching log path
- **AND** no automatic rollback occurs or journal, stock-layout or later-edit safety gate is bypassed

#### Scenario: Advisory optional patches do not undo success
- **WHEN** customization deployment succeeds while an unsupported optional frame target is skipped
- **THEN** all-machine results and Settings retain the successful desktop revision rather than reporting deployment failure
- **AND** the detailed deployment result exposes which patch was skipped and why

## ADDED Requirements

### Requirement: Quiet deferred peer catch-up through explicit Update
An offline skip SHALL retain a host-local deferred peer fact outside portable preferences. Deferred work SHALL NOT imply published-main availability, a warning or a badge. After a successful main check it SHALL permit the existing explicit Update action even when the desktop is current, subject to all existing failure, lock and unknown-outcome guards. Checks and reconnects SHALL NOT deploy or probe peers.

#### Scenario: pc2 returns after the desktop is current
- **WHEN** pc2 was skipped offline and a later explicit Update runs while pc2 is reachable and eligible, even with unchanged published main
- **THEN** the all-machine run revisits pc2 and runs its guarded shell deployment without any special retry command or source change
- **AND** successful deployed or already-current evidence clears its deferred fact
- **AND** merely powering pc2 on does not install anything before that later explicit Update

#### Scenario: Reload and repeated offline runs
- **WHEN** Settings or the app reloads after an offline skip, or another explicit update still finds that peer offline
- **THEN** its deferred fact survives and the current desktop remains warning-free and badge-free
- **AND** Update remains available after a successful main check without describing the desktop as outdated

#### Scenario: Selection and later failures do not lose catch-up needs
- **WHEN** a later run omits a deferred peer, encounters an inventory failure, or fails to deploy that peer
- **THEN** the unresolved deferred fact is not erased by replacement of the latest result
- **AND** genuine failures and unknown outcomes retain their existing diagnostics and refusal behavior instead of authorizing automatic replay

#### Scenario: Confirmed exclusion or removal
- **WHEN** a later run positively identifies a deferred peer as desktop-equipped or a complete successful inventory confirms it is no longer configured
- **THEN** obsolete shell catch-up work is removed without treating a missing or failed inventory as proof of removal

#### Scenario: Dry-run and preference export
- **WHEN** an update is previewed or portable preferences are exported
- **THEN** dry-run leaves deferred-peer bookkeeping unchanged and preference exports include no deferred peers, update receipts or locks
