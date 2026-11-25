# Spec Delta

## MODIFIED Requirements

### Requirement: Reviewed per-original Custom palette behavior
Until owned-palette migration, reviewed opted-in stock SHALL retain Custom styling, fixed headings/fades, keyboard navigation, enabled Usage, Custom Settings/pickers, inline rename and last-tab-aware close. The 0.1.17/0.1.18 replacements SHALL retain native dynamic theme filtering, plus 0.1.18 manifest entries/dispatch. Other layouts SHALL retain native presentation/routing. Owned-palette migration SHALL retire only this palette exception, not feedback.

#### Scenario: Dynamic 0.1.17 theme choices
- **WHEN** the reviewed 0.1.17 palette is used with available themes, a light/dark setting and an active layout
- **THEN** the palette offers native dynamically discovered themes matching that mode, including non-hardcoded choices
- **AND** themes owned by another listed layout are excluded while the active layout's matching theme remains available
- **AND** selecting a theme retains its native command ID and arguments

#### Scenario: Supported 0.1.16 palette
- **WHEN** a previous palette opt-in refreshes on reviewed 0.1.16 stock before owned-palette migration
- **THEN** its Custom behavior and the release's native theme choices remain available
- **AND** removal restores the backed-up reviewed stock bytes for that release rather than another release's original

#### Scenario: Owned patch masks a release update
- **WHEN** an owned palette remains after a native update and exact reviewed embedded stock identifies the current release's palette original before owned-palette migration
- **THEN** refresh chooses the corresponding reviewed replacement without relying solely on the old patch's ownership hash
- **AND** safe removal does not downgrade the native original to the older release

#### Scenario: Unknown stock remains optional
- **WHEN** deploy, startup repair or a customization update encounters an unrecognized palette or feedback stock file
- **THEN** that patch is skipped with a clear advisory without blocking otherwise successful deployment, startup or update
- **AND** its target, helpers, opt-in and original backup remain unchanged
- **AND** missing opt-ins never enable a patch automatically, while personal conflicts, corrupt records and concurrent writes remain failures

#### Scenario: Temporary reviewed 0.1.18 restoration
- **WHEN** an existing palette opt-in refreshes against exact reviewed 0.1.18 stock before owned-palette migration
- **THEN** Custom presentation and safe routing return while native manifest contributions, argument validation, deduplication, shortcut matching and explicit clone arguments remain available
- **AND** 0.1.17 continues selecting its own reviewed replacement

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

## ADDED Requirements

### Requirement: Custom-owned command palette
Custom SHALL provide its command palette as owned customization output using public host/UI capabilities, without requiring a native palette patch. The Custom shortcut and status-bar opener SHALL open the same focused overlay, with repeat-shortcut toggle and dismissal returning focus normally. Other layouts, the native command and reserved escape hatch SHALL retain native behavior.

#### Scenario: Open and dismiss the owned palette
- **WHEN** the user presses Ctrl+Shift+P or clicks Custom's commands status-bar opener on a capable host
- **THEN** one owned palette opens with focused text input, preserving its top-centered popup presentation
- **AND** repeated shortcut, Escape or backdrop dismissal closes it without changing sessions or injecting input

#### Scenario: Native opener outside Custom
- **WHEN** a non-Custom layout or an explicit native app.palette command opens the native palette
- **THEN** the native palette remains available without the owned implementation globally overriding that command

### Requirement: Preserved Custom palette interaction
The owned palette SHALL preserve Custom's live theme/selection tint, shared search/clear and empty states, fixed search header, virtual rows/native scrollbar, pinned group/result-count heading, scroll fade, highlighted fuzzy search, shortcut chips and bounded keyboard/mouse navigation. Recent history SHALL persist independently of transient overlay IDs across ordinary restarts and customization updates.

#### Scenario: Search navigation and scroll
- **WHEN** the user types, clears, pages, uses arrows, clicks a result or scrolls through grouped results
- **THEN** only command rows are selectable, search/clear resets selection and scroll coherently, and keyboard selection remains reachable
- **AND** pinned headings and fades reflect native scrolling without obstructing scrollbar hits, including at 100% and 130% zoom and empty results

#### Scenario: History after reload
- **WHEN** an entry was invoked and the palette, customization or desktop reloads
- **THEN** its stable command/argument identity remains eligible for Recent without copying unrelated native runtime state
- **AND** malformed or unsupported legacy history is preserved and reported rather than executed or guessed

### Requirement: Native catalog parity with safe Custom routing
The owned palette SHALL retain dynamic host commands, layouts, mode/layout-filtered themes and valid manifest palette contributions, including native validation, canonical deduplication and shortcut matching. Activation SHALL retain native IDs/arguments while routing Custom settings/pickers, inline rename and untargeted close through existing Custom handlers. Usage SHALL appear only while enabled.

#### Scenario: Manifest contribution on a capable host
- **WHEN** a valid manifest contributes a native command or a declaring mod command
- **THEN** its title, group, keywords, arguments and matching shortcut appear without duplicate command/argument pairs
- **AND** malformed entries are omitted, explicit clone arguments are preserved and mod commands still require a shown listener

#### Scenario: Target-bound routing
- **WHEN** an untargeted built-in rename or close is activated in Custom
- **THEN** existing inline rename and last-tab-aware close policies apply
- **AND** an explicit argument-bearing command retains its captured arguments and is not broadened to the current selection

### Requirement: Persistent owned palette binding
Full customization installation SHALL establish the Custom-scoped owned palette binding in the selected desktop home's user keys. After successful installation, restarts, stock rewrites, key-default resets, Core updates and customization reloads SHALL not require re-enabling. Installation and mounted Custom self-checks SHALL repair stock or missing mappings automatically, check configured bindings and reload errors, and log outcomes without overwriting unrelated or unknown personal mappings.

#### Scenario: Simulated stock update resets keys
- **WHEN** an installed desktop's keys are replaced by stock defaults and its native frame is rewritten
- **THEN** the next mounted Custom startup or lifecycle self-check restores the owned shortcut and reconciles host reload diagnostics without re-enabling, a native patch or process restart
- **AND** unrelated stock additions remain, one bounded repair is logged and the next shortcut opens the owned overlay

#### Scenario: Hot reload and duplicate windows
- **WHEN** customization output reloads or multiple mounted copies observe the same reset
- **THEN** repair is coalesced and generation-bound without losing durable intent/history or creating repeated writes
- **AND** checking contexts perform no repair side effects

#### Scenario: More than one desktop
- **WHEN** this computer and pc2 each receive an ordinary full desktop customization installation
- **THEN** each owns and repairs its local app-home binding independently of selected remote terminals
- **AND** Core-only shell deployment neither installs a palette nor silently becomes full remote desktop deployment

### Requirement: Visible palette compatibility and persistence failures
The owned palette SHALL depend on minimum supported host and required capabilities rather than reviewed-version membership. Missing capabilities, unreadable configuration, unsafe writes or conflicting bindings SHALL be reported visibly and in bounded local diagnostics, never described as successful persistence or silently substituted with vanilla. A keyboard repair failure SHALL retain the Custom status-bar opener when its overlay capabilities remain available.

#### Scenario: Capable newer host
- **WHEN** 0.1.17, 0.1.18 or a newer unreviewed host supplies the required capabilities
- **THEN** the owned palette remains available even if private native palette bytes change
- **AND** any newer-than-reviewed advisory does not become a version allowlist

#### Scenario: Repair refused
- **WHEN** keys are malformed, a personal higher-priority shortcut conflicts, permissions deny a write, or host reload reports an error
- **THEN** mounted Custom shows a persistent actionable warning and a deduplicated notification with sanitized local diagnostic facts
- **AND** personal bytes remain protected, retry is bounded and no native patch is applied as fallback

### Requirement: Safe retirement of palette patch ownership
Owned-palette migration SHALL stage the new entrypoint and binding before retiring automatic palette patch refresh. Removal SHALL preserve current stock, unrelated feedback and personal edits, use only exact owned/reviewed recovery evidence, and never downgrade a newer native frame from an older backup. Unknown stock SHALL not affect owned-palette eligibility.

#### Scenario: Migration from the temporary patch
- **WHEN** the owned entrypoint and binding configuration pass guarded checks after installation over a reviewed patch
- **THEN** palette native refresh is disabled and only safely recognized palette patch files/opt-in are retired, retaining recovery evidence
- **AND** current native restore bytes match the current host rather than an older release and feedback behavior is unchanged

#### Scenario: Unknown stock or later personal edit
- **WHEN** migration sees newer unknown native stock or an unrecognized personal patch dependency edit
- **THEN** unknown stock is left unchanged and personal conflicts are reported without destructive cleanup
- **AND** the owned palette does not require native-source review, while incomplete retirement is never reported as complete

#### Scenario: Rollback of migration from the reviewed stop-gap
- **WHEN** the user rolls back the reported owned-palette deployment backup after migrating an installed reviewed native palette patch
- **THEN** recovery restores the previous payload, binding and native opt-in and refreshes that opt-in through the reviewed-byte and ownership gates
- **AND** a successful rollback restores the previous Custom palette, including startup repair after a native frame reset, rather than silently returning to vanilla
- **AND** later personal/native edits refuse before recovery writes, while a skipped or failed guarded refresh is reported as a rollback failure with the opt-in retained
- **AND** reinstalling through normal Update safely returns to the owned palette without changing feedback or running terminals
