# Spec Delta

## ADDED Requirements

### Requirement: Connected-machine plugin updates section
Settings Updates SHALL add a Plugins section below the existing Herdr section, listing confirmed pending plugin updates on this computer and connected machines. It SHALL identify each pending plugin and its machine using existing Settings row patterns, with one section-level Update action. Existing Herdr rows and their explanation SHALL remain unchanged. No extra informational messages, buttons or options SHALL be added.

#### Scenario: Crew update on another machine
- **WHEN** a connected peer's installed Crew tool has a confirmed available update
- **THEN** Plugins lists that update and names the peer without requiring machine switching or leaving Updates
- **AND** the section offers one Update action for all pending plugin updates

#### Scenario: No pending updates or unconfirmed evidence
- **WHEN** no connected machine has a confirmed pending plugin update
- **THEN** Plugins has no actionable pending-update rows or enabled Update action
- **AND** missing tools, optional recommendations and failed checks are not presented as pending updates
- **AND** merely opening Updates, checking or reconnecting does not install anything

### Requirement: Plugin availability contributes to existing update dots
Confirmed pending plugin updates on connected machines SHALL contribute to the existing Settings icon and Updates navigation notification dots using the same visual markers as Herdr readiness. Native and customization readiness SHALL retain their existing meaning. Opening Updates SHALL NOT acknowledge away a pending plugin update, and unknown checks SHALL NOT invent availability or success.

#### Scenario: Plugin-only availability
- **WHEN** a plugin update is pending on a connected machine with native and customization availability off
- **THEN** the mounted expanded Settings icon, compact Settings presentation and Updates entry show their existing update dots without a remount
- **AND** no plugin-specific count, tooltip or badge is added

#### Scenario: Successful update and independent native readiness
- **WHEN** authoritative checks confirm all connected-machine plugin updates were applied
- **THEN** the plugin contribution to the dots clears
- **AND** dots required by native or customization readiness remain visible

#### Scenario: Failed recheck or disconnected peer
- **WHEN** a check fails for a still-connected machine with a confirmed pending update
- **THEN** its confirmed pending contribution remains until an authoritative result replaces it
- **AND** disconnecting a peer excludes it from connected-machine availability without claiming it was updated

### Requirement: One explicit local-first plugin batch update
The Plugins Update action SHALL apply all pending plugin updates using their existing per-plugin update actions and safety rules. It SHALL process this computer first, then connected peers sequentially in the same inventory order as the customization all-machine update. It SHALL display progress and per-machine failure inline, retain successful results, continue to remaining machines after a failure and never automatically replay an uncertain write.

#### Scenario: Multiple pending updates
- **WHEN** Update is activated with pending updates on this computer and two connected peers
- **THEN** existing plugin update actions run for this computer first and then each peer in inventory order, without overlapping machine updates
- **AND** each action uses its captured machine rather than the currently selected Settings machine
- **AND** progress remains visible in Plugins and duplicate clicks cannot start another batch

#### Scenario: Failed or disconnected machine during update
- **WHEN** one machine refuses, disconnects or returns an uncertain update outcome
- **THEN** Plugins plainly names that machine and its failure or uncertainty without navigating away
- **AND** remaining machines are still attempted and confirmed successes remain visible
- **AND** a timeout or missing result is not reported as success or automatically retried

#### Scenario: Recheck replaces stale availability
- **WHEN** a captured pending update is no longer pending before its turn, or an update action finishes
- **THEN** authoritative plugin checks determine the resulting pending state
- **AND** already-current targets are not updated unnecessarily and successful invocation alone does not invent currency
- **AND** existing per-plugin enablement, confirmation and execution-safety restrictions remain effective
