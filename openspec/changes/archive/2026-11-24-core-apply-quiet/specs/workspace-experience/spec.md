# Spec Delta

## ADDED Requirements

### Requirement: Quiet Core apply footer
Custom Settings → Core SHALL keep its pre-Apply hint unchanged while applying and restarting, without duplicating runtime progress in the footer. The Status row SHALL retain runtime progress and failures SHALL remain visible in the existing page error area. The footer SHALL retain its geometry through completion, with an empty hint and disabled Discard/Apply when no changes remain.

#### Scenario: Idle and pending edits
- **WHEN** Core Settings is idle with no pending changes
- **THEN** its reserved footer hint is empty and Discard/Apply are disabled
- **AND** a pending permission change shows “Apply restarts core with all agents.”, while a sign-in-only edit shows “Unapplied changes”

#### Scenario: Applying settings before restart
- **WHEN** the user clicks Apply and the settings save is still pending
- **THEN** controls and Discard/Apply are disabled and the pre-Apply hint stays unchanged
- **AND** the footer does not show Applying, Starting, Stopping or Restarting

#### Scenario: Core restart in progress
- **WHEN** the permission apply operation is restarting Core
- **THEN** the Status row shows Restarting and the footer keeps the pre-Apply hint
- **AND** the reserved hint area and action buttons do not change position or dimensions

#### Scenario: Successful apply
- **WHEN** fresh runtime facts confirm the operation has completed with no remaining edits
- **THEN** the footer hint becomes empty and Discard/Apply stay disabled in the same positions
- **AND** the Status row shows the actual runtime state

#### Scenario: Failed or indeterminate apply
- **WHEN** applying fails or its outcome is unknown
- **THEN** the existing page error area still reports the failure or unknown outcome
- **AND** the footer does not substitute progress or error text for the pending-change hint
- **AND** unknown outcomes remain protected against duplicate submission

### Requirement: Verified Core control recovery
After apply, Core Settings SHALL restore eligible runtime controls as soon as fresh runtime facts confirm Running and no operation or inspection remains active. Cached Running facts SHALL NOT authorize controls during reconciliation. Completion SHALL NOT leave a permanent disabled state, and offline, unsupported and unknown-permission guards SHALL remain intact.

#### Scenario: Delayed post-restart inspection
- **WHEN** a restart has completed but the required fresh runtime inspection has not finished
- **THEN** the page retains truthful transition or checking feedback and keeps unsafe controls disabled
- **AND** cached Running facts do not imply that the post-restart state is already verified

#### Scenario: Fresh Running result
- **WHEN** post-restart inspection returns supported, reachable, signed-in Running facts with known permissions and no pending operation
- **THEN** Permissions, the sign-in toggle, Stop and Reboot are enabled immediately without another timer or manual refresh
- **AND** Discard/Apply remain disabled if there are no pending edits

#### Scenario: Different machine or failed verification
- **WHEN** the user changes machines during completion or verification fails
- **THEN** completion cannot enable another machine's controls or grant permission from cached facts
- **AND** existing error and offline behavior is preserved
