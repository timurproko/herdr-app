# Design

## Context

See proposal.md for motivation. Agents' group header currently paints hover on the full row and embeds an inert 16px chevron slot. Spaces already uses the shared sidebarDisclosure/iconButton presentation with a 24px target. Agents' numeric rail compensates surrounding gap and chevron width, so replacing its slot must preserve the glyph centre and count spacing.

Git's stageChip and verdictChip in src/plugins/git/mod/main.js currently use intrinsic captions plus 6px side padding, with a single-element verdict projection protected by render-budget tests. PR 103 deliberately removed the old common-width probe/cache; its archived design notes that the earlier implementation measured Build 2–99 and fixed verdict captions. The new requirement supersedes own-caption sizing, not the stage actions or the current Git renderer architecture. PRs 104 and 110 are outside this change.

Spaces currently has two fixed SPACE_OPTIONS entries and derives popup height from that array. The plugin registry already provides enabled-only pluginMenuItems contributions and rechecks enablement at activation. Crew already owns spaceTags and typed hidden settings; its Spaces tag is also used elsewhere, so globally hiding that contribution would incorrectly remove terminal-pane Crew badges.

## Goals / Non-Goals

**Goals:** Reuse existing disclosure/menu patterns; preserve fixed sidebar geometry; establish the smallest common Git button width with real caption measurements; keep Crew's toggle and state plugin-owned.

**Non-Goals:** No Git header/loading/read/cache/reveal/pin-motion changes, no native patches, no new informational UI, no new polling or external operations, no deployment or live-session changes.

## Decisions

1. **Reuse Spaces' disclosure primitive in Agents.** Replace the inert group-chevron slot with the shared 24px disclosure treatment. Preserve the existing header click fold action; stop propagation on the chevron so one press folds once. Compensate slot/inset/gap changes using the existing numeric-rail parameters rather than moving the glyph/count rail. Keep full-row hover behavior away from the chevron as it is; the chevron gains the distinct square overlay. Do not change child-agent folding.

2. **Use a caption-derived common Git box, not a broad fixed pixel width.** Measure actual text with the existing font/zoom-aware native measurement facilities and reuse bounded measurements rather than add per-row timers or character estimates. Approval clarified that the width must cover every caption a button can ever show, not the current screen. Include all fixed stage/verdict captions and the full accepted safe-integer round length (16 digits), even when absent. Measure their intrinsic text and add exactly 12 logical pixels, with no extra allowance or obsolete title-slot width; a valid widest-digit 16-digit round supplies the stable round maximum. Keep 18px height and centre shorter captions inside the same interaction box. Visible, probe and ghost variants must agree. Preserve the single-element verdict structure, existing metadata overflow priority and current builder budget. This is a sizing-only edit: no header, disclosure, agent, request or animation redesign.

3. **Contribute the menu row from Crew.** Add one hidden default-true Crew setting for Spaces label visibility, using existing typed settings persistence instead of a second bespoke store. Extend the existing generic menu contribution shape only enough to carry a checked state for this toggle and expose a Spaces Show icons contribution point. Compose built-in and plugin rows through the existing menuRow renderer and include enabled contributions in popup height. Keep the menu open on toggle and recheck current enablement for callbacks. No second Settings switch is needed.

4. **Scope filtering to Spaces, not shared role metadata.** Add a presentation context for Spaces' plugin tag query, letting Crew suppress only its own tag when the preference is false. Preserve default tag queries for terminal headers and other consumers. Hidden Crew text must not remove attachment, counts, disclosure or unrelated tags; avoid coupling the parent metadata/disclosure grid to tag presence. The additional approved alignment request removes blank count/disclosure slots for a row without children: its Crew text ends on the machine-chevron column. Rows with children retain the existing inner label/count/disclosure grid. Update PR 103's fixed-childless-column tests and requirements accordingly.

5. **Targeted regression coverage only.** Extend the existing Agents grouping/dot-rail tests for hover, fold-once and count geometry. Revise Git stage-box geometry expectations and run the directly related stage interaction and row-budget fixtures at 100%/130%; native sizing fixtures should reflect the new common boxes. Add Spaces menu/registry/Crew fixtures for default-on, persistence, plugin off/on, stale callbacks, popup height, local/remote rows, connected/independent presentation and unchanged terminal badges. Update README and architecture/testing descriptions that currently promise own-caption boxes. No full local test suite.

## Approved Space-mode order correction

The coordinator clarified that Group agents by: Space follows the displayed Spaces list, machine by machine, with no coordinator-first rule; Priority is unchanged. Reuse Spaces' pure connected-block projection with presentation-only plugin links, then its local-first and sorted-remote machine ordering. No new lifecycle, reads or native order writes are introduced. Existing same-name/folder grouping remains within each machine; equal names on different machines must be separate to keep machine blocks contiguous. A group spanning several same-machine spaces takes the earliest represented Spaces row; groups with unavailable native spaces retain stable trailing order in their machine. Pinned agents remain their existing separate leading section. Local fold IDs remain stable; remote group IDs are machine-qualified. Group folds never suppress navigation membership. Remove the obsolete coordinator-first contribution and cover local/remote ordering, live reorders, attached children, missing spaces, same names, folds and pinned rows. Assert Priority's exact existing order independently of Spaces changes.

## Risks / Trade-offs

- A wider chevron target can move Agents' numeric rail → assert count and glyph centres against existing geometry at both zoom levels.
- A native measurement can include an allocated container width instead of text width and recreate oversized Git boxes → assert the longest caption's natural width plus exactly 12px, centred shorter captions, and unchanged title/right rail/74px row geometry.
- Widths must never track current statuses or round values → measure the longest accepted round length and fixed captions once per zoom without changing round parsing or inventing extra digits.
- Hiding a shared Crew tag could affect terminal badges or parent controls → scope the query to Spaces and separately assert unchanged terminal Crew, attachment/count/disclosure and unrelated tags.
- Git work is concurrent → keep the implementation diff within stage/verdict sizing and direct fixtures; do not merge or rework PRs 104/110 as part of this task.

## Migration Plan

The person approved implementation and the additional childless-label alignment request; no further approval is required for those updates. No runtime migration or deployment is part of this task. Missing Crew visibility preference means true; disabling preserves the setting. Existing built-in Spaces option keys remain unchanged. Implement after plan approval, one outcome at a time, with only directly relevant tests. Reverting the implementation restores prior visuals without changing Crew data, terminals, native space order or other plugin settings.
