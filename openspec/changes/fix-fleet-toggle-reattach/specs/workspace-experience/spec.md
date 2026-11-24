# Spec Delta

## MODIFIED Requirements

### Requirement: Live fleet attachment preference propagation
Changes to the fleet attachment switch SHALL propagate to mounted Spaces while Settings remains open, without a close event, restart or further user interaction. Every enable, including repeated off/on cycles, SHALL immediately initiate required current verification and publish attachment as soon as it succeeds. Disablement SHALL immediately restore independent presentation. Applicable local and remote groups SHALL obey the same rule without unverified action authority.

#### Scenario: Enable while Settings remains open
- **WHEN** the user enables attachment with Settings open and a valid same-machine coordinator/fleet relationship can be verified
- **THEN** required verification starts without waiting for dialog close or another lifecycle interaction
- **AND** as soon as verification resolves, the fleet moves below its coordinator, native shortcut numbers remain truthful, matching chains appear immediately before both Crew pills and both badges use the coordinator's colour
- **AND** Settings remains open and native space order, focus, tabs and terminals are unchanged

#### Scenario: Disable while Settings remains open
- **WHEN** the user disables attachment while Settings is open and an attached pair is visible
- **THEN** the sidebar immediately returns to independent row order, retains each row's native shortcut number, removes both chains and restores the fleet's saved badge colour
- **AND** no close event or further interaction is needed

#### Scenario: Verification still pending or unavailable
- **WHEN** enabling requires verification and no valid previously verified display identity is available
- **THEN** no relationship, inherited badge colour or attachment chain is fabricated before the read succeeds
- **AND** a failed or ambiguous read leaves the spaces independent rather than attaching an unverified pair

#### Scenario: Disable before verification completes
- **WHEN** the user enables and then disables attachment while Settings stays open and the enable-time read is pending
- **THEN** the sidebar remains independent after disabling and the superseded reply cannot restore attachment
- **AND** a later explicit enable can start a current verification without closing Settings

#### Scenario: Repeated verified off/on cycles
- **WHEN** a verified attached pair is switched off and on repeatedly with Settings open, with immediate, one-second or fifteen-second off intervals
- **THEN** each off transition immediately restores independent presentation and each on transition initiates current verification
- **AND** the pair attaches again after the first successful current verification, without an additional freshness, attempt or abandoned-reader wait inherited from a prior toggle
- **AND** for a successful local verification completing in less than two seconds, reattachment also completes in less than two seconds without dialog closure or unrelated events
- **AND** ready remote machines attach after their own successful verification rather than waiting for another machine

#### Scenario: Older reply after a newer toggle
- **WHEN** a reply initiated before the last off/on sequence arrives before or after the current sequence's successful reply
- **THEN** the older reply cannot replace current binding, presentation, verification age or retry state
- **AND** rejecting it cannot discard or delay the current sequence's valid reply

#### Scenario: Other Spaces switches
- **WHEN** the user changes either last-tab switch with Settings still open
- **THEN** the new preference is available to subsequent close actions and normal empty-space reconciliation without requiring Settings to close
- **AND** their existing confirmation, process-exit and automatic-space exceptions remain unchanged
