# Spec Delta

## ADDED Requirements

### Requirement: Usage resets reconcile pinned quotas
After a successful explicit quota reset and its authoritative usage read, the Usage dialog and pinned sidebar summary SHALL display the updated quotas for the captured machine and account without Refresh all. Pins and inspected accounts SHALL remain unchanged. Success SHALL add no messages, controls or options. Failed or obsolete responses SHALL NOT fabricate refilled values or overwrite another target.

#### Scenario: Successful local or remote reset
- **WHEN** a Claude or Codex quota reset succeeds on the selected local or remote machine and the subsequent usage read returns updated values
- **THEN** an already-mounted summary for that machine displays the updated pinned quotas without a manual refresh, reopening the dialog or waiting for the periodic refresh
- **AND** the dialog displays the same authoritative values with its existing silent success treatment

#### Scenario: Other accounts and machines
- **WHEN** several accounts have pinned quotas or the person changes the dialog machine or account while a reset is pending
- **THEN** the reset and subsequent result remain bound to the originally captured machine and account
- **AND** another machine's cache, unrelated account quotas, pins and inspected account selection are not rewritten by the reset reconciliation

#### Scenario: Failed read or obsolete completion
- **WHEN** a reset is refused, its follow-up usage read fails, or its enable or request generation becomes obsolete
- **THEN** the app preserves its existing failure and last-known-value handling without inventing a successful refill
- **AND** obsolete completions cannot replace a newer target's quota values or start disabled follow-up collection
