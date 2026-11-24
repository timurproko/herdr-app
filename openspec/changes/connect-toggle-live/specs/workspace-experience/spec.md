# Spec Delta

## ADDED Requirements

### Requirement: Live fleet attachment preference propagation
Changes to the fleet attachment switch SHALL propagate to mounted Spaces while Settings remains open, without a close event, restart or further user interaction. Enabling SHALL immediately initiate any required verification and publish the verified presentation as soon as it resolves. Disabling SHALL immediately restore independent presentation. This SHALL apply to every applicable local or remote machine group without granting unverified action authority.

#### Scenario: Enable while Settings remains open
- **WHEN** the user enables attachment with Settings open and a valid same-machine coordinator/fleet relationship can be verified
- **THEN** required verification starts without waiting for dialog close or another lifecycle interaction
- **AND** as soon as verification resolves, the fleet moves below its coordinator, numbering follows the projected order, the chain appears immediately before the coordinator's Crew pill and both badges use the coordinator's colour
- **AND** Settings remains open and native space order, focus, tabs and terminals are unchanged

#### Scenario: Disable while Settings remains open
- **WHEN** the user disables attachment while Settings is open and an attached pair is visible
- **THEN** the sidebar immediately returns to independent row order and numbering, removes the coordinator chain and restores the fleet's saved badge colour
- **AND** no close event or further interaction is needed

#### Scenario: Verification still pending or unavailable
- **WHEN** enabling requires verification and no valid previously verified display identity is available
- **THEN** no relationship, inherited badge colour or coordinator chain is fabricated before the read succeeds
- **AND** a failed or ambiguous read leaves the spaces independent rather than attaching an unverified pair

#### Scenario: Disable before verification completes
- **WHEN** the user enables and then disables attachment while Settings stays open and the enable-time read is pending
- **THEN** the sidebar remains independent after disabling and the superseded reply cannot restore attachment
- **AND** a later explicit enable can start a current verification without closing Settings

#### Scenario: Other Spaces switches
- **WHEN** the user changes either last-tab switch with Settings still open
- **THEN** the new preference is available to subsequent close actions and normal empty-space reconciliation without requiring Settings to close
- **AND** their existing confirmation, process-exit and automatic-space exceptions remain unchanged
