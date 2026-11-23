# Spec Delta

## ADDED Requirements

### Requirement: Byte-faithful reviewed frame originals
Reviewed palette and feedback originals MUST retain actual stock bytes, including native imports and recorded newline formats, with release tag, immutable commit, upstream source path and SHA-256 provenance. A transformed or previously patched file MUST NOT authorize native compatibility. Review status SHALL remain based on exact bytes, not version membership alone.

#### Scenario: Feedback shared by two reviewed releases
- **WHEN** the unchanged feedback source from pinned 0.1.16 and 0.1.17 is recorded as a reviewed original
- **THEN** its stored bytes and recorded digest match the corresponding native stock format rather than a facade-rewritten copy
- **AND** supported release-source and installed embedded byte formats are recorded distinctly when they differ

#### Scenario: Old owned feedback on reviewed 0.1.17
- **WHEN** an existing feedback opt-in is refreshed and the installed executable supplies the exact reviewed 0.1.17 native original
- **THEN** the existing Custom feedback replacement refreshes without an unreviewed-original advisory
- **AND** original backup bytes, ownership checks and safe restoration remain available

### Requirement: Reviewed per-original Custom palette behavior
For reviewed 0.1.16 and 0.1.17 stock, the opted-in Custom palette SHALL retain its styling, fixed headings, scroll fades, keyboard navigation, enabled Usage entry, Custom Settings/picker routing, inline rename and last-tab-aware close actions. The 0.1.17 replacement SHALL also retain native dynamic theme discovery and light/dark/layout filtering. Other layouts SHALL keep native presentation and command routing.

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
