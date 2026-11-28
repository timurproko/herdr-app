# Design

## Context

See proposal.md for motivation and the two spec deltas for the visible contract. Three separate renderers are involved, so this design records the narrow shared-component approach.

- Git's `stageBoxProbe()` measures Build 2–99 plus fixed captions including Changes requested, and `stageBoxWidth()` imposes that maximum on both stage and verdict boxes. Existing stage/verdict tests deliberately require that width.
- Spaces constructs `space-meta-*` with a numeric slot only for attached parents; its fallback reserves a disclosure slot but not the same count rail and spacing.
- `descriptionHint()` in `src/ui/settings-kit.js` already owns Crew's passive hover/focus body. Each entry currently sizes its own bold name plus dash, so description start positions differ. Crew declares the required sentences as data.

## Goals / Non-Goals

**Goals:** Preserve the existing native component treatment and change only sizing, reserved layout and tooltip text layout. Keep tests aligned with the revised requirements rather than retaining assertions for the superseded design.

**Non-Goals:** No Git loading or rendering recovery work, agent navigation changes, new UI, new reads, preference changes, native patches, installation or live-session manipulation.

## Decisions

1. **Use intrinsic caption width, not a smaller global minimum.** Remove the common-width probe/cache and its minimum-width use in stages/verdicts, including measurement keys and harness assumptions that depend on it. Keep 6px padding, 18px height, existing right anchors, rounding and interaction decoration. A smaller shared width would still leave short captions artificially wide. Do not introduce a replacement width scheduler.
2. **Reserve existing rails when crew is present.** Use the parent count/disclosure geometry for crew-bearing rows even when those controls are absent; render inert blank slots rather than fake counts or buttons. Keep parent counts, fold actions and unrelated metadata unchanged. Do not reposition all sidebar labels or change Agents.
3. **Reuse the passive hint surface with a shared name column.** Render the existing three entries as aligned two-column rows with a common non-shrinking name width sufficient for Delivery, regular foreground names and muted wrapping descriptions. Remove only the separators inside the tooltip; retain the trigger's dashed underline. Reuse the existing hint/table geometry where appropriate without adding headings or changing legacy table callers. Keep all wording, hover delays, focus behavior and no-op click semantics.
4. **Focused regression coverage only.** Revise `tests/git-stage-box-geometry.test.mjs`, `tests/spaces-worktree-layout.test.mjs` and `tests/plugin-description-hint.test.mjs`; run the directly related stage/interaction/row geometry tests as needed. Check 100% and 130% geometry, narrow/long names, no-child and combined-off cases. Update README and the common-width architecture sentence alongside implementation. No full local test suite.

## Risks / Trade-offs

- Caption widths now differ intentionally → assert natural text plus padding, stable right rail and unchanged 74px rows across ordinary/coordinator, pinned and ghost paths.
- Reserving rails reduces name space on childless crew rows → keep truncation and existing row dimensions; cover narrow sidebar cases and ensure no inert slot becomes focusable.
- Tooltip styling is shared → retain legacy table behavior and verify hover and keyboard focus render identical content without reads.
- Fixture geometry is not native visual proof → after approval, use only safe disposable renderer fixtures if available, keep proof outside the checkout in the crew task folder and stop any started instance before reporting; otherwise state native visual validation as a remaining gap.

## Migration Plan

No state migration or dependency change. Implement the three outcomes in order after approval through existing source packaging. Revert the source changes to roll back; do not edit installed output. No deployment is part of this task.
