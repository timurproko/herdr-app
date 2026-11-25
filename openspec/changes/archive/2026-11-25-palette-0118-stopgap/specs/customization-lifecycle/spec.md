# Spec Delta

## MODIFIED Requirements

### Requirement: Reviewed per-original Custom palette behavior
For reviewed 0.1.16, 0.1.17 and 0.1.18 stock, the opted-in Custom palette SHALL retain its styling, fixed headings, scroll fades, keyboard navigation, enabled Usage entry, Custom Settings/picker routing, inline rename and last-tab-aware close actions. The 0.1.17 and 0.1.18 replacements SHALL retain native dynamic theme discovery and light/dark/layout filtering. Other layouts SHALL keep native presentation and command routing.

#### Scenario: Dynamic 0.1.17 theme choices
- **WHEN** the reviewed 0.1.17 palette is used with available themes, a light/dark setting and an active layout
- **THEN** the palette offers native dynamically discovered themes matching that mode, including non-hardcoded choices
- **AND** themes owned by another listed layout are excluded while the active layout's matching theme remains available
- **AND** selecting a theme retains its native command ID and arguments

#### Scenario: Supported 0.1.16 palette
- **WHEN** a previous palette opt-in refreshes on reviewed 0.1.16 stock
- **THEN** its Custom behavior and the release's native theme choices remain available
- **AND** removal restores the backed-up reviewed stock bytes for that release rather than another release's original

#### Scenario: Owned patch masks a release update
- **WHEN** an owned palette remains after a native update and exact reviewed embedded stock identifies the current release's palette original
- **THEN** refresh chooses the corresponding reviewed replacement without relying solely on the old patch's ownership hash
- **AND** safe removal does not downgrade the native original to the older release

#### Scenario: Unknown stock remains optional
- **WHEN** deploy, startup repair or a customization update encounters an unrecognized palette or feedback stock file
- **THEN** that patch is skipped with a clear advisory without blocking otherwise successful deployment, startup or update
- **AND** its target, helpers, opt-in and original backup remain unchanged
- **AND** missing opt-ins never enable a patch automatically, while personal conflicts, corrupt records and concurrent writes remain failures

#### Scenario: Native 0.1.18 manifest contributions
- **WHEN** reviewed 0.1.18 stock is replaced and installed mods provide palette metadata
- **THEN** the palette retains native asynchronous manifest discovery, the Mod group, required-argument and target validation, canonical deduplication and object or index-shorthand hotkey matching
- **AND** malformed or unreadable contributions, missing mod entrypoints and invalid foreign mod commands are skipped with native semantics
- **AND** dynamic themes, entry IDs, history and explicit clone arguments retain their native behavior

#### Scenario: Custom 0.1.18 presentation and Usage policy
- **WHEN** the 0.1.18 palette opens in Custom
- **THEN** it retains the live theme and selection tint, shared search/clear/empty presentation, fixed 408px skin and 57px search header, pinned group or result count, overflow fade and keyboard/scroll navigation
- **AND** searching and clearing reset selection, scroll and heading/fade state
- **AND** the Usage entry is available only while its plugin is enabled, without deleting stored preferences when disabled

#### Scenario: Explicit 0.1.18 command arguments
- **WHEN** a manifest palette entry supplies explicit tab or space rename, pane/tab/space close, or clone arguments
- **THEN** activation preserves those arguments instead of replacing them with untargeted Custom handlers or default clone sources
- **AND** untargeted built-in entries retain Custom inline rename and last-tab-aware close routing, and Settings, picker, machine and worktree destinations retain Custom routing

#### Scenario: Existing 0.1.17 support after the rebase
- **WHEN** the installed native palette matches either reviewed 0.1.17 newline format
- **THEN** it still selects the unchanged 0.1.17 replacement rather than the new 0.1.18 variant
- **AND** capable newer hosts are not refused solely for lacking review-list membership, while unknown native palette bytes still fail closed
