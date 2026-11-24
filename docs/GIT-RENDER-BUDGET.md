# Coordinator Git render budget

The host has a 50 ms render/layout watchdog. Building every recorded Closed row
was unbounded in inventory size. PR #42 added natural-width measurement probes;
it materially increased that cost, but the reported live `interrupted` banner
has **not** been reproduced by the disposable native checker. PR #39's fixed
row geometry alone is not established as the introducing cause of that banner.

## Windowed scrolling measurements

Five cold disposable native checks per size, Windows / Herdr 0.1.18, after the
production paired scroll handlers reveal the full inventory and move to its end:

| Loaded PR rows | Native render-build samples (ms) | Mean (ms) | PR rows built per render |
|---|---|---:|---:|
| 30 | 2, 2, 2, 1, 2 | 1.8 | 7 |
| 60 | 1, 2, 2, 3, 2 | 2.0 | 7 |
| 100 | 3, 2, 2, 3, 3 | 2.6 | 7 |

The viewport is 390×400 logical pixels. The raw results also record confirmed
loaded-row counts and retained offsets (1970.5 / 4250.5 / 7290.5px). Scroll setup
is outside the timed render; the complete render includes fresh native row builds,
spacers, shared fades and chrome. These synthetic native builder times, at 1ms
clock resolution, are not live desktop layout/paint or input-latency measurements.
No watchdog is changed. The 100-row regression's observed peak is now **2,521**
builder operations with the shared fades, below the unchanged 10,000 / 1,200
operation/element ceilings. Every row remains reachable after incremental reveal.

## Historical replacement-page measurements

`node tools/measure-git-render.mjs` now measures 30/60/100 loaded rows after
production scroll handlers reveal them, including deep-window renders; its five
samples per size record total render time and built-row count in the raw results.
The historical table below describes #45, not the new windowed measurements.

`node tools/measure-git-render.mjs` builds the real packaged coordinator renderer
inside the installed native QuickJS/GPUI checker with a disposable app home under
`.artifacts/`. No live app, Core, GitHub, account, deployment or restart is involved.
Fixtures contain two repositories, a historical read notice, merged/unmerged
Closed rows, robots on every third row, tasks, checks, two pills and reviews.
Each cell below is five separate cold native checks on Windows / Herdr 0.1.18.
Times use native `Date.now()` (1 ms resolution); do not interpret sub-ms averages
as that much stopwatch precision. Raw per-row durations are saved in
`.artifacts/git-render-native/results.json` and the individual check logs.

| Source | 30 inventory rows: ms samples | Mean | 60 inventory rows: ms samples | Mean |
|---|---|---:|---|---:|
| Before #42 (`70fd212^`) | 4, 4, 4, 4, 4 | 4.0 | 7, 9, 8, 7, 7 | 7.6 |
| After #42 (`70fd212`) | 6, 7, 7, 9, 8 | 7.4 | 14, 15, 15, 14, 15 | 14.6 |
| Prior repair head, unbounded (`025e191`) | 8, 7, 9, 7, 7 | 7.6 | 15, 15, 16, 16, 15 | 15.4 |
| Bounded page + distinct-string probes | 2, 3, 2, 2, 2 | 2.2 | 3, 2, 2, 3, 3 | 2.6 |

The new fixture builds seven PR rows, two headers and one notice on its first
page, regardless of whether inventory has 30, 60 or 100 rows. Across these checks
its entire render callback is 2–3 ms, well below the requested 20 ms build target.
**Scope:** this times the complete JS render callback including native element
builder calls, not subsequent snapshot conversion, GPUI layout/paint, real data
arrival, live tab-click latency or a loaded desktop's scheduling. All native
checks passed; they do not establish the live application's exact frame time or
reproduce its interruption. No native watchdog was changed or bypassed.

### Breakdown (mean ms, inclusive where indicated)

| Component | #42: 30 / 60 rows | Bounded: 30 / 60 inventory |
|---|---:|---:|
| All row trees, inclusive | 6.8 / 14.2 | 1.4 / 2.0 |
| Mean per actually built row | 0.227 / 0.237 | 0.200 / 0.286 |
| Visible natural-width runs | 2.4 / 5.4 | 0.6 / 0.4 |
| Invisible probes | 3.4 / 6.0 | 0.2 / 0.4 |
| Remaining row shell/title/state/robot | 1.0 / 2.8 | 0.6 / 1.2 |
| Pills (included in runs/probes, not additive) | 1.2 / 1.0 | below timer resolution |
| Headers/history notice/chrome, outside rows | 0.6 / 0.4 | 0.8 / 0.6 |

A differential native check with all tooltip registrations removed measured
#42's total at 6.8 / 14.4 ms (versus 7.4 / 14.6), and the bounded version at
2.0 / 2.4 ms (versus 2.2 / 2.6). Tooltip deltas are at the timer/noise floor;
measurement probes, not tooltips or the history notice, dominate the observed
increase. The tool accepts `post42-no-tooltips current-no-tooltips` to repeat it.

## Bounds and cache ownership

- Coordinator Open and Closed reveal **10 presentation items** initially:
  headers, notices and PRs all count. Near-bottom scrolling appends ten already-known
  items without GitHub reads, page counters or Previous / Show more controls.
  Only the viewport plus 74px overscan on each side builds native elements;
  exact-height top/bottom spacers preserve the full revealed scroll extent.
  PR blocks remain 74px, headers use the shared control height, and scoped notices
  retain keyed native height measurements. Existing gaps/padding are included.
- Stable native scroll IDs and retained per-home/tab depth keep refreshes and
  appends from resetting scroll. Surviving first-visible row identities anchor
  insertions above the viewport. Enrollment remains outside scrolling content.
- Counts, inventory, notices, webhook updates, folds and worker authority keep
  their existing meaning. Folds apply before reveal/windowing; collapsed
  repositories cost one header each.
- Native probe widths are cached by zoom, group style/kind and exact string.
  Intrinsic text widths are independent of available line width; each visible
  line still measures its current available width to select full/compact values.
  Duplicate strings get one probe per snapshot; acknowledged strings need none.
  Pending probes retry next snapshot, stale-context/zoom callbacks are refused,
  and the text cache evicts beyond 512 entries. Fresh measurement IDs also force
  callbacks for changed strings with coincidentally unchanged widths, and after
  eviction; reused native IDs cannot silently suppress a needed measurement.
  No guessed text-width budgets.
- Immutable PR-fact identity caches the label presentation and full tooltip;
  replaced label facts invalidate it. Coordinator rows build at most three
  visible pills (and three in their one measurement strip); full names, including
  omitted labels, remain in strip/metadata tooltips. Ordinary rows are unchanged.
- Native interactive row objects are deliberately **not** cached across renders:
  their callbacks are registered against the current native snapshot. Reusing
  those objects would retain obsolete callback registrations. Cache pure facts
  and measurements, and bound fresh row builds instead. No IO, JSON serialization
  of PR inventories, focus allocation or notification is added to render.

`tests/git-panel-errors.test.mjs` exercises 100 Closed PRs, including a 100-label
PR, with a fixed **10,000 builder-operation / 1,200 element** ceiling, only viewport-near
PRs per render and fewer than 125 elements per PR. Observed peak was **2,750**
operations in the prior replacement-page implementation.
It now scrolls to reveal all 100 rows, proves every PR remains reachable while
late-window renders stay bounded, and checks independent tabs,
unchanged IO/counts, cached/distinct-string probes, zoom invalidation and stale
callbacks. Existing 47,250 geometry comparisons and label-colour tests remain.
This deterministic regression is the CI budget gate, not a flaky wall-clock test.
