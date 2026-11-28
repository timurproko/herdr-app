# Spec Delta

## MODIFIED Requirements

### Requirement: Trello setup machine isolation
Trello Settings SHALL bind status, runtime installation and every account/board/access operation to the captured machine identity, Core session and execution user/home. Direct SSH SHALL support the full lifecycle, including elevated Windows SSH only for the verified same user/profile/home as the selected normal-user Core. Secrets SHALL use SSH stdin after readiness, never local-store fallback. Headless setup SHALL remain available on each host.

#### Scenario: SSH-selected machine
- **WHEN** Settings selects a safely configured SSH machine
- **THEN** account save, explicit verification, removal, board discovery, addition and removal operate only on that machine's private store
- **AND** no local account, board inventory or private policy is substituted for the selected host

#### Scenario: Machine changes while action is pending
- **WHEN** the selected machine, identity/session, execution user/home or mounted view generation changes before dispatch or during an operation
- **THEN** obsolete inputs and callbacks cannot dispatch new work or publish into the replacement selection
- **AND** already-dispatched effects remain attributed to their captured target without retargeting or replay

#### Scenario: Private remote transport
- **WHEN** credentials are submitted to a remote host
- **THEN** they are sent only through the authenticated SSH channel's stdin after destination identity/readiness validation
- **AND** they never occur in argv, environment, logs, shared state, installation payloads or temporary credential input files
- **AND** the protected final store's existing atomic replacement files remain permitted

#### Scenario: Unsupported or unavailable host
- **WHEN** a target is temporary, custom-via, identity-ambiguous, untrusted, disconnected, uses Unix root, has elevated or unverifiable Core execution, or lacks supported prerequisites
- **THEN** Requirements names the refused arrangement or missing prerequisite with a sanitized code
- **AND** no local fallback, new host-key acceptance, password prompt or blind credential dispatch occurs

#### Scenario: Missing remote runtime
- **WHEN** the selected host lacks the compatible Trello runtime
- **THEN** Requirements offers an explicit Trello-only Install or Update action in the existing prerequisite pattern
- **AND** installation changes only owned runtime/help/launchers, never credentials, board grants, activation, write authority, PATH or shell-only deployment behavior

#### Scenario: Indeterminate private change
- **WHEN** SSH disconnects or times out after a private operation may have committed
- **THEN** Settings reports an unknown configuration outcome and requires a fresh destination status before an explicit retry
- **AND** it neither claims rollback nor replays the operation

#### Scenario: Same-user elevated Windows SSH
- **WHEN** the SSH process SID equals the verified owner SID of the selected session's safe core.json and the selected Core is proven to run non-elevated as that same user with the same profile and resolved Herdr home
- **THEN** elevated SSH can perform runtime Install/Update, account save/status/verification/removal, board discovery/addition/removal and acknowledged activation/access application
- **AND** the card uses the existing Requirements, masked account inputs, Boards and Access controls without an elevation confirmation, extra option, button or informational message
- **AND** no Core startup, process permission, SSH or UAC configuration is changed

#### Scenario: Identity proof fails before readiness
- **WHEN** the SSH SID differs from the selected session owner, the Core user/profile/home differs, or the selected Core/session is unavailable, unverifiable or changes during proof
- **THEN** no READY frame authorizes sending secrets and no installation or private write is started
- **AND** public identity probing does not carry credentials or auto-start a replacement Core

### Requirement: Single actionable unsupported-host explanation
An unsupported setup connection SHALL show one accurate explanation and safe next action instead of repeated runtime/account/board failures or a numeric fix count. A proven same-user elevated Windows SSH login SHALL NOT be refused merely for elevation. Unsafe identities, paths, ACLs and elevated Core SHALL remain refused without blaming Trello. No credential import, privilege change or automatic provisioning SHALL be introduced.

#### Scenario: Elevated SSH connection
- **WHEN** the selected Windows SSH login is elevated but satisfies the same-user/profile/home and normal-Core proof
- **THEN** Requirements presents the ordinary setup controls rather than an administrator-login refusal
- **AND** elevation alone adds no dialog, action, setting or informational message

#### Scenario: Unsafe execution or storage
- **WHEN** setup refuses a different user, Unix root, elevated Core, unknown identity/home, changed or unavailable Core/session, or unsafe paths/ACLs
- **THEN** the card reports the actual reason once and the matching next action, without saying that Trello refuses the connection
- **AND** the next action identifies the need to connect as the Core user, use a normal-user Core, reconnect/recheck the selected session, or correct the identified path/permission problem as applicable
- **AND** Requirements does not show All ready or a misleading repair count, and unusable dependent controls are absent

#### Scenario: Safe remote setup and uncertain failures
- **WHEN** a safely identified direct-SSH connection is selected
- **THEN** its existing explicit runtime Install/Update and account/board/access actions remain usable and target-bound
- **AND** a transient disconnection or failed permission check remains an honest failure, not a fabricated unsupported-host or ready result

#### Scenario: Stale unsupported response
- **WHEN** the owner changes machines or disables the plugin before an unsupported-host reply arrives
- **THEN** the obsolete reply cannot replace the new selection's guidance, names or controls

## ADDED Requirements

### Requirement: User-owned elevated setup output
Trello files and directories created or replaced by elevated Windows setup SHALL be owned by the verified user SID, not Administrators, with ACL inheritance disabled and access restricted under existing store rules. Private setup and owned runtime/launchers SHALL remain usable by that same non-elevated user while excluding other ordinary users. Unrelated files SHALL NOT be repaired or adopted.

#### Scenario: Elevated creation and non-elevated use
- **WHEN** same-user elevated setup installs or updates the runtime and saves or changes private setup on real disposable Windows storage
- **THEN** resulting Trello-owned files and created directories have the verified user SID as owner and the required protected ACLs
- **AND** a non-elevated process with that same SID can run the installed CLI and read its configured status, board grants and applied access
- **AND** fake credentials suffice for this proof and neither process prints credential contents

#### Scenario: Protected transaction paths
- **WHEN** elevated setup creates private directories, lock files or atomic replacement files
- **THEN** owner and restrictive ACLs are applied and verified before secret contents are written, and remain valid after publication
- **AND** unsafe existing files, reparse paths, hard-linked private files, wrong owners, overbroad or unverifiable ACLs are refused rather than adopted or silently repaired

#### Scenario: Runtime update preserves isolation
- **WHEN** an explicit elevated runtime update replaces owned runtime or launcher files
- **THEN** user ownership and supported access survive replacement and existing ownership-conflict, lock and rollback safeguards remain effective
- **AND** credentials, board/write authority, unknown files and unrelated shared-directory permissions are not rewritten
