## Context

The person explicitly approved this combined CI/review fix and the subsequent style/pin decisions. Main adds independent worker-space policy; the two conflicts append unrelated requirements at the same spec EOF, so retain both blocks. Preserve the finalized PR-94 archive and record the approved amendment separately.

## Decisions

- Keep root retry use across internal repository reset and awaited symbolic-ref. Clear it only after complete success releases loading. Dispatch consumes a separate rootRetryAuthorized flag set by the UI, not manualRead rate credit; context reset revokes it.
- Record actionable page failures by Open/Closed state. Restore only the selected tab's error and leave an unread sibling due. Keep request/context/epoch guards and shared lease serialization.
- Derive one stage descriptor per row. Render a plain 18px chip with stage-palette text, existing raised fill, 2px side padding and no border/emoji. Build captions include supplied next round. Intrinsic probes render the identical caption/style without handlers; the pure cache signature includes that caption. Titles have no managed-stage reservation.
- Resolve pins from selected-agent PR evidence, not clickPin. Tab/sidebar/keyboard changes do not animate; existing stage/robot clicks keep their controller. Pin at the 4px top inset above the scrolling section, independent of folding. Omit a header when no unpinned rows remain; otherwise count only those rows. Full tab totals remain unchanged.
- Fix CI adapters rather than weakening assertions: expose stageLabels in the menu mock, supply shared rename tokens to source-evaluated Spaces, and await actual root/page tasks instead of unrelated render guards in refresh tests. Supply a valid GraphQL success page.
- Rename the copied native-check facade to selection-base-host.js, preserving any existing wrapper and native-host.js chain.

## Validation and Limits

Add regressions for branch-stage abandonment, repeated post-manual abandonment, expired/fresh rate credit, symmetric tab errors, all selection paths, counts/collapse/lone headers, plain styles and full-width titles at normal/narrow widths. Existing review findings and earlier native watchdog recovery evidence remain valid checkpoints, not a run of this final head. Per the latest instruction, no local test files or new native probes run; CI and delta review validate this push. Build is customization-only; no live runtime or terminal is touched. Historical natural watchdog workload remains unproven.
