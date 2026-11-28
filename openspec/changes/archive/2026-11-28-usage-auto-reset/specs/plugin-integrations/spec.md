# Spec Delta

## ADDED Requirements

### Requirement: Machine-scoped automatic reset selection
Settings Usage SHALL offer an Automatic reset toggle, off by default. Turning it on SHALL reveal an expandable Resets-style area with simple unchecked checkboxes grouped by provider and account, one per reported reset type. Selection SHALL be machine-local and bound to exact account and reset scope. Newly discovered types SHALL remain unchecked. The UI SHALL reuse existing components without extra explanatory messages, buttons or options.

#### Scenario: Initial and per-machine settings
- **WHEN** the person opens Usage settings on a machine without saved automatic-reset choices
- **THEN** Automatic reset is off and no reset type is selected
- **AND** switching machines shows only the destination machine's settings

#### Scenario: Provider and account inventory
- **WHEN** Automatic reset is on and Claude or Codex reports several accounts or several credits of one type
- **THEN** the area groups rows by provider and account and shows one checkbox per reported reset type, not one per credit
- **AND** a newly reported model reset is unchecked even if Full reset is selected
- **AND** unknown or unavailable inventory creates no guessed reset types or authority

#### Scenario: Disabled setting and portable preferences
- **WHEN** the toggle is off, Usage is disabled, or Check usage is off for the machine
- **THEN** no automatic reset is submitted and saved selections are preserved
- **AND** account-scoped automatic authorization and spend receipts are not exported as portable preferences

### Requirement: Current applicable automatic reset authority
An automatic reset SHALL require an explicitly selected type, an available usable reset and a successful current reading from the exact machine and account. At least one quota explicitly covered by that reset SHALL have a finite unrounded remaining percentage of 1 or less. Cached, reused, stale, failed, obsolete or ambiguously scoped readings SHALL NOT authorize a spend. Permissions and target identity SHALL be rechecked before dispatch.

#### Scenario: Exact threshold and scope
- **WHEN** a selected model reset is available and its corresponding quota reads 1% or 0% remaining
- **THEN** one automatic reset is eligible for that model and account
- **AND** 1.01% remaining, an unrelated depleted quota or an unticked reset type is not eligible regardless of percentage display mode or rounding

#### Scenario: Retained or borrowed reading
- **WHEN** a quota is displayed from a last-success snapshot, another machine's reused account report, a failed collection or a previous app generation
- **THEN** it authorizes no automatic reset even if it displays 1% or less

#### Scenario: Changed target or incomplete applicability
- **WHEN** the machine disconnects, the account identity changes, authorization is removed, or reset-to-quota applicability cannot be established before submission
- **THEN** no automatic reset is submitted for that target and no alternative account or reset type is substituted

### Requirement: At-most-once automatic spending per depletion
Herdr SHALL serialize account reset claims and reserve each automatic depletion before submission. Duplicate triggers, overlapping types, reloads and uncertain responses SHALL NOT spend twice for one depletion. Failed or unknown spends SHALL NOT be automatically retried. New automatic spending SHALL require fresh authoritative recovery above 1% followed by later depletion, or a proven new natural quota period.

#### Scenario: Duplicate triggers and overlapping types
- **WHEN** duplicate views or windows observe the same depleted account with multiple selected reset types or several eligible credits
- **THEN** at most one appropriate reset is submitted for the depletion, with no full-reset and model-reset cascade
- **AND** a manual claim in flight or awaiting authoritative reconciliation prevents a racing automatic claim

#### Scenario: Uncertain submission and restart
- **WHEN** a reset request times out, fails, returns an uncertain response, or the app restarts after reserving the depletion
- **THEN** no second automatic submission is made for the same unresolved depletion, including a different credit or type
- **AND** failure, cached recovery, toggle cycling or receipt expiry alone cannot rearm spending

#### Scenario: Confirmed later depletion
- **WHEN** fresh successful readings establish recovery above 1% followed by a later depletion, or establish a genuinely new applicable quota period
- **THEN** a selected usable reset can be considered again with new current evidence
- **AND** a still-low post-reset read cannot consume the next reset

### Requirement: App-bound automatic reset execution
The trigger SHALL run in the open active Herdr desktop for its selected machine, independent of sidebar summary visibility or an open Usage dialog. Claims SHALL execute on the captured local or connected remote machine through the existing reset action. Closing Herdr SHALL stop automatic checks and claims without installing a daemon. Hidden machines SHALL NOT be scanned for automatic spending.

#### Scenario: Summary hidden and dialog closed
- **WHEN** the app is open and active with Automatic reset and Check usage enabled for its selected machine but no pinned summary or Usage dialog
- **THEN** existing quota-refresh cadence still supplies fresh readings to the trigger for that machine
- **AND** the trigger does not add high-frequency provider polling

#### Scenario: Closed app or suspended checks
- **WHEN** Herdr is closed, inactive or asleep, or the selected remote machine is disconnected
- **THEN** no new automatic spend starts
- **AND** returning to active use requires fresh target-machine evidence rather than replaying remembered low values
- **AND** a request already submitted before closure can still finish but is not automatically replayed

### Requirement: Visible authoritative automatic reset completion
A confirmed automatic reset SHALL use the existing success-notification pattern to identify the machine, provider, account and reset type once. Its authoritative follow-up read SHALL update the Usage dialog and pinned sidebar through their existing shared quota state without Refresh all or invented refilled values. Manual reset success SHALL remain silent. Obsolete completions SHALL NOT publish another target's values or start disabled follow-ups.

#### Scenario: Successful automatic reset
- **WHEN** an automatic Claude or Codex reset is confirmed for a captured machine and account
- **THEN** one success toast identifies that automatic spend without adding a Settings or dialog message, button or option
- **AND** a successful follow-up read updates that account's dialog quotas, reset inventory and existing pinned sidebar immediately, preserving pins, inspected account and unrelated reports

#### Scenario: Follow-up failure
- **WHEN** a confirmed reset's follow-up read fails or becomes obsolete
- **THEN** the app does not invent refilled quotas or retry spending
- **AND** existing failure and last-known-value treatment remains, and any notification asserts only the confirmed spend rather than successful quota refresh
