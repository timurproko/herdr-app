# Proposal

## Why

The coordinator Git panel's replacement-page footer interrupts ordinary scrolling, while neither Git list has the continuation fades already shared by Spaces and Agents. Replace the page controls without losing the render-work bound introduced by #45 or broadening #49's safety reads.

## What Changes

- Reveal the first ten coordinator presentation items, then append ten more near the bottom, without page numbers, Previous or Show more controls; inventory remains the already-known Crew-linked PR set.
- Window the revealed coordinator items with exact-height spacers, building only viewport-near rows, headers and notices; preserve intrinsic-width and immutable-label caches and fresh native callbacks.
- Reuse `SidebarScrollState` from `src/ui/sidebar-scroll.js` and `topFade` / `bottomFade` from `src/ui/scroll-fade.js` for both Git lists, with the existing native geometry-derived metrics, 40px gradients and edge thresholds.
- Scope coordinator safety probes to viewport-window rows, rejecting replies after that window moves; retain existing cadence, repository routing and ordinary GitHub cursor pagination.
- Preserve whole-inventory totals, folds, ordinary pins and older active rows, stable 74px PR geometry, same-context scroll anchors and the enrollment footer outside the scroller.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Replace bounded replacement pages with incremental windowed scrolling, add shared Git edge fades and explicitly narrow coordinator safety selection to the viewport window.

## Impact

The implementation will touch Git panel rendering and packaging, a small pure window projection helper if warranted, relevant panel/safety/scroll fixtures, the disposable native measurement tool, and Git documentation. It must retain the 10,000-operation / 1,200-element 100-row regression ceilings and report native render-build samples after revealing 30/60/100 rows.

No GitHub inventory discovery, new polling, deployment, host patch, focus allocation or render-time notification is introduced. Ordinary pagination and pin-motion behavior remain intact. Do not change #53's right-edge row/header styling, the separate history-notfound-quiet notice policy, or #51's Crew fleet reader; reconcile overlapping integration points only after those changes merge.
