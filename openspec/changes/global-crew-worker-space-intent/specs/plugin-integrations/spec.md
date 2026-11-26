# Spec Delta

## ADDED Requirements

### Requirement: Global Crew worker-space intent targets all known homes
One global Herdr worker-space intent SHALL cover every authoritative machine/home Herdr knows, not a selected machine or coordinator. New homes and previously offline machines SHALL be reconciled to the latest intent when reachable through the existing Crew transport and an explicitly authorized setter. Home observations SHALL remain separate from intent and unavailable targets SHALL never count as applied.

#### Scenario: Several local and remote homes
- **WHEN** an authorized global intent changes with multiple known homes, including two different homes on one machine
- **THEN** each exact machine/home target is queued for that same combined or per-project value
- **AND** no selected-machine preference, matching task name or terminal ID merges or retargets the homes

#### Scenario: Later coordinator and reconnected machine
- **WHEN** a new authoritative home appears or a known offline machine becomes reachable
- **THEN** the current intent is considered without requiring another switch change
- **AND** an authorized setter brings that home into line while an unavailable/refused setter leaves truthful pending or blocked state
- **AND** no new transport, coordinator launch or filesystem-wide home search is introduced

#### Scenario: Capacity and privacy
- **WHEN** target retention reaches its finite bound or state is exported
- **THEN** capacity cannot silently become a claim of complete global coverage
- **AND** only the global boolean intent is portable, not target paths, terminal identities, observations, failure details or transport facts

### Requirement: Crew mode changes require explicit desktop authority
Herdr SHALL use only a documented Crew interface expressly authorizing desktop worker-space changes. Owning-session-only setters SHALL remain unavailable to the app, even for unowned homes or successful reads. The app SHALL NOT spoof terminal identity, borrow owner authority, directly write the registry, start/end a coordinator, inject terminal input or alter ownership/locks to apply intent. Current incompatible Crew SHALL remain read-only with a reason.

#### Scenario: Another coordinator owns the home
- **WHEN** Crew refuses an app setter because only its owning coordinator may change worker-space mode
- **THEN** no registry write or ownership workaround occurs
- **AND** status preserves the refusal and identifies the affected machine without falsely claiming its mode changed

#### Scenario: Unknown or absent owner
- **WHEN** the owner's liveness is unknown or the app has not claimed an otherwise unowned home
- **THEN** neither condition grants desktop setter authority
- **AND** Herdr does not run crew start or supply an owner's terminal environment to make a setter pass

#### Scenario: Explicit upstream capability needed
- **WHEN** active desktop synchronization is unavailable under the installed Crew contract
- **THEN** the limitation identifies the need for an explicitly authorized non-terminal worker-space setter for an existing home, including owned and unowned homes
- **AND** the app invents no flag/version gate or direct-storage substitute for that missing interface

### Requirement: Bounded truthful Crew policy reconciliation
Enabled Crew policy work SHALL reuse its existing recurring lifecycle, machine routing and bounded transport, outside render and transient Settings tasks. Reads and authorized writes SHALL coalesce per home, reject obsolete publication and use bounded retry. Only a current confirmed mode can count as matching intent; failed or uncertain writes SHALL NOT become success. Disablement SHALL stop new work without resetting intent or moving workers.

#### Scenario: Changed intent during a write
- **WHEN** intent changes while an authorized fake home write is in flight
- **THEN** queued work uses the latest intent and writes for that home do not overlap
- **AND** an older completion cannot mark the newer intent applied; after settlement the latest intent is reconsidered

#### Scenario: Timeout, refusal and return to reachability
- **WHEN** transport times out, Crew refuses, or a machine goes offline
- **THEN** its observed mode is not changed optimistically and the latest intent stays pending or blocked
- **AND** an unknown write outcome requires a fresh authoritative read rather than blind replay
- **AND** reachability/capability change or bounded reinspection permits eligible retry without a render-triggered loop

#### Scenario: Closing Settings, plugin disablement and stale replies
- **WHEN** Settings closes, several mounted copies need policy state, or Crew is disabled during a request
- **THEN** normal policy ownership remains with the existing recurring lifecycle and compatible reads coalesce
- **AND** disabled or obsolete requests start no follow-up and cannot overwrite newer target/intent status

#### Scenario: Preserved Crew semantics and running agents
- **WHEN** an expressly authorized adapter changes a home's worker-space mode
- **THEN** the documented Crew transaction preserves registrations and unrelated registry metadata
- **AND** the mode affects only newly admitted independent tasks; current workers stay put and reviews/replacements inherit source placement
- **AND** no space, tab, pane, terminal, task label or coordinator session is moved, restarted or rewritten by Herdr

#### Scenario: Fake-only configuration verification
- **WHEN** tests verify mode defaults, both intent values, persistence, multi-home application, retries and refusals
- **THEN** all Crew homes, process responses and registry mutations are isolated fake fixtures
- **AND** tests never read/write the person's real Crew registry or control their running coordinator
