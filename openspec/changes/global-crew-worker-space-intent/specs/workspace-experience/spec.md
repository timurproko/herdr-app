# Spec Delta

## ADDED Requirements

### Requirement: Crew-contributed global worker-space row
Settings → Spaces SHALL show one Crew-contributed standard worker-space row directly below Connect fleet space to coordinator while Crew is enabled. Its switch SHALL display one global Herdr intent, default off for combined and on for per-project, never a selected machine's observed mode. It SHALL use existing row, toggle and badge styling without per-machine wording in its title or description.

#### Scenario: Global row placement and wording
- **WHEN** Settings → Spaces is shown with Crew enabled
- **THEN** Separate space per project appears immediately below Connect fleet space to coordinator
- **AND** its description is Give each project its own space under the coordinator for new work; running agents stay where they are.
- **AND** no per-machine switch, machine selector, new visual pattern or Plugins-card/Trello UI change is introduced

#### Scenario: Homes disagree or the selected machine changes
- **WHEN** known homes have different observed modes or another machine/coordinator is selected
- **THEN** the row continues displaying the same global intent rather than mirroring one home
- **AND** absent intent defaults off without interpreting unsupported or unread homes as combined

#### Scenario: Intent round trip and Crew disablement
- **WHEN** global intent is saved/restored through the existing preference mechanism, or Crew is disabled and re-enabled
- **THEN** the same boolean intent is retained without exporting machine/home/owner identities or pending observations
- **AND** disabled Crew hides the contributed row and starts no policy work
- **AND** Connect fleet space to coordinator remains a separate display preference, not the scope or enablement of worker-space intent

### Requirement: Truthful worker-space availability and partial status
The worker-space row SHALL distinguish intent from confirmed home state. Pending, unreachable, unsupported, refused and failed targets SHALL use concise existing-style status naming the machine, not imply global application. Without a documented authorized desktop setter, the row SHALL be read-only with a short reason. Missing Crew, older unsupported commands and no home SHALL remain honest unavailable states without setup side effects.

#### Scenario: Current Crew refuses non-owner writes
- **WHEN** Crew permits reading worker-space mode but its setter requires an owning terminal session
- **THEN** the global row is read-only with a short Crew-support/ownership reason
- **AND** the app does not present matching observations as successful app-managed synchronization
- **AND** it does not change home configuration, take ownership or imply the active global setter is available

#### Scenario: Missing tool, older command or no home
- **WHEN** a machine has no Crew tool, lacks the configuration command or has no existing home
- **THEN** a concise status identifies that machine and cause without a long warning paragraph or raw CLI output
- **AND** the app does not initialize/migrate a home, install/update Crew or display a home mode as known

#### Scenario: Partial success with an authorized adapter
- **WHEN** a documented authorized adapter confirms one home matches intent while another machine remains offline, refused or failed
- **THEN** global intent stays displayed and saved while the unresolved machine remains visibly pending or blocked
- **AND** the app does not roll intent back, claim the refused home changed or claim success everywhere

#### Scenario: Native proof with fake configuration
- **WHEN** the row is verified at 100% and 130% zoom for off and on global intent
- **THEN** standard row geometry, toggle, badge styling and concise wording remain legible without overflow
- **AND** evidence identifies read-only/refused versus genuinely authorized fake success without changing the person's setting or controlling a real coordinator
