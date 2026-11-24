# Design

## Context

See proposal.md for motivation. `src/plugins/git/mod/main.js` currently projects folded aggregate sections through `taskSections`, then rebuilds a replacement page of ten items with page-specific scroll IDs. `fallbackSnapshot` derives safety eligibility from that page. Ordinary Git already uses paired content/frame native events to load the next ten GitHub cursor rows within 120px of the bottom, and owns independent pin-motion geometry.

`src/ui/sidebar-scroll.js` supplies `SidebarScrollState`: content/viewport measurements and paired native content/frame events rebase the offset from actual bounds rather than cumulative wheel guesses. Its shared `topFade` and `bottomFade` decorations in `src/ui/scroll-fade.js` are passive 40px gradients. `sidebarScroll` composes these for Spaces and Agents but also assumes their row gaps, gutters, chrome background and optional drag behavior; Git must not inherit those layout assumptions.

The 100-row coordinator regression in `tests/git-panel-errors.test.mjs` enforces fewer than 10,000 builder operations and 1,200 total elements, plus fewer than 125 elements per PR. Existing distinct-string width and immutable-label caches avoid redundant work; interactive native elements deliberately cannot be cached across snapshots.

## Goals / Non-Goals

**Goals:** Continuous coordinator scrolling with bounded native trees; identical shared fade behavior in both Git views; viewport-scoped safety reads without extra fetches on scroll; stable same-context presentation.

**Non-Goals:** Ordinary-list virtualization or pagination redesign, a new scroll engine, replacement row/header styling, changing read notices or Crew status transport, new IO or timers, native patches or deployment.

## Decisions

### 1. Separate known inventory, revealed depth and rendered window

Keep the complete eligible aggregate inventory for counts, enrollment, events and existing targeted reads. Flatten selected-tab sections after folding into stable-key presentation items (repository header, PR, scoped notice). Interpret the initial ten as #45's presentation-item count, including headers and notices, then reveal ten more when the retained scroll metrics reach the ordinary panel's 120px near-bottom threshold. Revealing only exposes already-known facts; it never calls aggregate refresh, PR discovery or GitHub pagination.

Use stable scroll IDs per coordinator home and Open/Closed tab, not per batch. Keep revealed depth and viewport state per home/tab; same-context refresh does not reset them. A fold recomputes the projection without losing saved fold keys or full totals. No repeated continuation headers are necessary because the stream no longer replaces pages.

Alternative rejected: appending native trees for every revealed item would reintroduce #45's inventory-sized render cost. Keeping replacement pages would retain the unwanted footer.

### 2. Exact-height virtual projection with bounded overscan

Build a prefix-height index for the revealed flat items, keyed to presentation changes, not by constructing row elements. PR blocks use the existing 74 logical pixels; headers use the shared `U.control` height. Account explicitly for section/list gaps and padding. Notices retain their existing presentation: use their known height where fixed and a context/width/zoom-keyed native measured height when wrapping changes it, rather than truncating notice text or assuming every notice is a PR. Convert native window-pixel metrics consistently with zoom.

Find the viewport interval from that index and add at most one neighboring PR-sized block of overscan on each side. Build only intersecting/overscan items, plus non-shrinking top and bottom spacers whose heights equal omitted items and gaps. Preserve shared section-header callbacks and row rendering rather than caching native interactive elements. Keep #45's bounded distinct-string/probe and label-fact caches unchanged.

A cold unmeasured viewport uses a small bounded initial window; layout then establishes its actual size. Recompute a window only on changed interval, projection or layout metrics, not every pointer movement. Preserve the surviving first-visible item and intra-item offset across same-context insertion/reordering, using a yielded supported native scroll-handle anchor correction when geometry above it changes; append-only growth below must require no correction. Clamp only when the anchor disappears or content genuinely shrinks. Measurements reject obsolete home/tab/width/zoom callbacks.

Alternative rejected: rendering every hidden row for measurements defeats windowing; guessed text-height/character budgets would destabilize notices and scrolling.

### 3. Reuse shared metrics and passive gradients, not the sidebar row layout

Package `sidebar-scroll.js` and `scroll-fade.js` via `src/plugins/git/panel.json`. Compose `SidebarScrollState`, `topFade` and `bottomFade` around the existing Git scroll frames. Preserve Git's content gutters and ordinary pin/content event handlers; chain the shared measurement/motion handling rather than overwriting pin cancellation or pagination. Fades use the Git background with the shared 40px height, default edge insets/scrollbar lane and greater-than-1px edge thresholds. Only viewport/content measurement and input callbacks may notify when relevant state changes; render merely consumes the snapshot.

For coordinator windowing, measure the full spacer-preserved content, not just mounted rows. Native content/frame bounds remain the authority for wheel and scrollbar movement. A changed viewport interval schedules presentation work after the event, without scanning inventories, starting reads or allocating focus in the handler. No drag auto-scroll or polling is enabled.

Alternative rejected: duplicating Git-specific fade math or gradients would diverge from Spaces/Agents and violate the shared-component requirement.

### 4. Safety eligibility follows actual viewport rows, not revealed depth

Replace the aggregate page selection in `fallbackSnapshot` with PR identities intersecting the measured viewport interval. Overscan-only rows are not visible and do not enlarge probe scope. Before initial layout there are no confirmed visible rows; the existing lifecycle resumes selection after measurement. Ordinary loaded rows and active-pin safety eligibility remain unchanged.

Include a monotonically increasing window-selection generation in the fallback scope alongside coordinator/home, machine and tab. Increment it when viewport row identities or projection change so moving away and back cannot accept an old reply. A raw pixel change within the same row set need not invalidate work. Preserve `ChecksFallback`'s existing 45/120-second scheduling, backoff, repository-aware probes, complete-selection publication and stale-context guards. Changing the selection does not itself execute a probe; normal scheduled work consumes the new snapshot.

Alternative rejected: selecting all appended or overscan rows quietly widens #49's read budget; identifying only a reusable numeric window would accept move-away-and-back replies.

## Risks / Trade-offs

- [Wrapped notices and zoom make spacer arithmetic nonuniform] → Include explicit gap/padding geometry and keyed native notice measurements; cover multiple widths/zooms and notice-only/folded sections without changing notice policy.
- [Window movement unmounts measurement targets] → Retain pure width caches and stable semantic row identities, register fresh callbacks, reject stale measurements, and keep row geometry fixed.
- [Refresh inserts content above the viewport] → Retain row identity plus intra-row offset, test anchor correction and append-only stability; real context changes invalidate old state.
- [Ordinary event chaining disturbs pin motion] → Keep existing pin and pagination ownership and extend ordinary pagination/pin regressions; fades decorate only the scrolling list, never its pinned row.
- [Nearby concurrent changes] → Leave #53's trailing slot styles, history-notfound-quiet's notice decisions and #51's fleet reader untouched; integrate their merged results without copying old implementations over them.
- [Native timings are noisy] → Keep deterministic operation/element ceilings as the regression gate; report repeated native JS/native-builder render samples separately from layout/paint or live input latency, without claiming the original interruption was reproduced.

## Migration Plan

No persistent data or preference migration is needed; replacement-page state is transient and becomes per-home/tab reveal/window state. Local fold persistence stays unchanged. Update README, architecture, webhook scope and render-budget guidance with the implementation.

After approval, extend `tools/measure-git-render.mjs` to exercise actual scrolling/reveal and measure settled viewport renders after 30/60/100 loaded rows, including late-window renders and row-build counts. Run focused fixtures per outcome, then `CI=true npm run test:ci` once no other suite is running. Capture checks against the exact final pushed head; the task remains a draft for maintainer control and is never marked ready or merged by the agent. This planning handoff runs no implementation suites or native measurements. Rollback is reverting the customization change, without touching host binaries or Crew state.
