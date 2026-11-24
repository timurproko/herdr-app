# Design

## Context

The maintainer-approved A–E decision in the third review supersedes the spacer/window design. Herdr's native scrollbar consumes thumb/track events and repaints without a reliable JS offset callback. Scroll handles expose actual logical offset, viewport and content sizes, but cannot force an observation event for every native movement.

## Goals / Non-Goals

**Goals:** Real mounted content at every native scroll position; incremental local reveal; measured, bounded per-row work; truthful fade and safety behavior.

**Non-Goals:** Another scroll observer, host modification, polling, persisted inventory, GitHub discovery on scroll or cached native callbacks.

## Decisions

1. Keep a per-home/tab revealed presentation prefix after folding. Replace `TaskWindow`'s viewport range with the whole revealed prefix; remove all top/bottom spacers. Prefix heights remain only for preserving a surviving row anchor across insertions and estimating initial geometry, never for hiding rows.
2. Use the native handle's `offset`, `viewport_size` and `content_size` for render-time fade snapshots and event-time bottom detection. Wheel uses a bounded directional prediction only to bridge the current event before native layout; the next native sample is authoritative. Pointer movement over the list/frame and size callbacks also check for another batch. A short, one-shot, scope-guarded post-layout check runs after mounting a batch and reveals another ten only if it still fits the viewport. It is not a polling loop.
3. Keep accepted anchor requests but always notify after queuing `scroll_to_item`, even if both fade flags remain unchanged; commit geometry through the shared pure snapshot API. Keep the marker outside normal layout, not spacers. Stale scopes cannot apply requests.
4. Cache only immutable/pure row facts, formatted IDs/strings, metadata layout decisions and palette-dependent styles. Existing distinct-string native widths and label caches stay intact. Every render registers fresh callbacks/elements. Cold and warm native checks determine whether a safe mounted cap is necessary; if needed, only the end-of-list Show more row replaces an older batch at that cap, with no page counter or Previous footer.
5. Safety snapshots select every revealed PR in unfolded sections, not the viewport. Selection generation changes on reveal, fold, tab/context and relevant projection replacement, rejecting stale replies while retaining 45/120-second scheduling and repository routing. Scrolling within an unchanged revealed set does not invalidate its requests or start extra probes.

## Risks / Trade-offs

- [Scrollbar/keyboard events can be consumed] → Already revealed rows remain real content. Fades can lag until another render/event; dragging to the bottom reveals on the next received wheel/pointer/size event. State this limit without claiming an observer exists.
- [Mounted tree cost grows] → Native 30/60/100/200-row cold/warm measurements, pure caches and a measured safe cap if 200 rows exceed about 35ms; deterministic tests use per-row/mounted-budget ceilings rather than the obsolete window ceilings.
- [Content fits a tall viewport] → A finite one-shot post-batch layout check fills it in ten-item batches, with scope guards and no GitHub reads.
- [Anchor request alone schedules no layout] → Unconditional yielded notification after an accepted request; middle and end equal-height regressions.

## Migration Plan

No durable migration. Update the existing PR's approved outcomes and OpenSpec linkage, retain its historical archive, implement in outcome order, run targeted tests and one isolated full CI suite, then verify final-head required checks without marking ready or merging. Record mounted-row native samples and any measured cap/host limitations in the report.
