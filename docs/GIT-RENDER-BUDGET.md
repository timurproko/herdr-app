# Git mounted-row render budget

The host has a 50 ms render/layout watchdog. Ordinary lists already mount every
loaded row, so a coordinator page limit is not a shared-row safety argument.
An earlier #61 implementation was reproduced as native `interrupted` checks
at 100 cold rows; the lower-line-only repair is measured below. Earlier #42 measurements
remain historical evidence, not proof of that older live banner's exact cause.

## Historical inventory/page measurements

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

## Current shared-row repair: fully mounted cold rows

`tools/measure-git-row-budget.mjs --run --scrolled` compares fc0dfde with the
current source using three fresh native checks per cell on Windows / App 0.1.18.
It calls **real ordinary renderPulls** with every loaded row, or explicitly builds
all coordinator rows without paging. Each row has a distinct long title, tasks,
checks, two repeated label strings and review text. Times include JS/native
builder construction only, not GPU paint, layout settlement or live input latency.

The earlier #61 implementation cost 20–23 / 40–43 ms at 30/60 rows and interrupted
in all 100-row samples. The lower-line-only repair retains main's native title
and header rendering, inherited interface font and full-title hover. It caches
settings per render entry and schedules four shared lower-line probes total.

| Mounted rows | fc0dfde coordinator, ms | Repaired coordinator, ms | fc0dfde ordinary, ms | Repaired ordinary, ms | Repaired ordinary scrolled-bottom, ms |
|---|---|---|---|---|---|
| 30 | 7, 8, 8 | 5, 4, 5 | 10, 11, 11 | 6, 6, 6 | 7, 7, 7 |
| 60 | 15, 15, 15 | 10, 12, 11 | 20, 19, 19 | 10, 13, 13 | 14, 14, 14 |
| 100 | 23, 24, 28 | 16, 16, 17 | 42, 37, 36 | 20, 20, 20 | 21, 20, 21 |
| 200 | 51, interrupted ×2 | 35, 38, 48 | interrupted ×3 | 40, 37, 37 | 42, 41, 45 |

These samples were rerun after merging main through #69, with unchanged native
titles/headers and main's visual alignment. Scrolled baseline samples were
12/10/10, 20/20/24 and 41/40/36 ms at 30/60/100, and interrupted at 200.
Every repaired sample completed with all requested rows and **four probes**.
The native tool enforces the requested baseline +2ms and 10/17/26ms ceilings at
30/60/100 and requires every current 200-row sample to complete. It records failed
samples rather than fabricating completed timings. Results/logs are under ignored
`.artifacts/git-row-render-budget/`; the benchmark needs the fc0dfde Git object.
These samples do not guarantee wall-clock behavior under all loads or certify
100/200 real-data frames with arbitrary labels/agents/GPU work.

`tests/git-row-render-budget.test.mjs` adds the hosted deterministic guard:
actual mounted 30/60/100/200 ordinary/coordinator Open/Closed trees, zoom/font cold
starts, visible-slice priority, at most four probes, and constant settings reads.
Operations and elements must each stay at or below frozen fc0dfde counts in
`tests/fixtures/git-row-budget-baseline.json`. At 100 rows the repair uses
29,299 operations / 3,212 elements ordinary (baseline 51,942 / 6,104) and
28,960 / 3,209 coordinator (baseline 31,606 / 3,428). Mutation controls reject
per-row hidden subtrees, excess probes and repeated bridge reads. This is separate
from the historical bounded-page test below, not a substituted ten-row sample.

## Bounds and cache ownership

- Coordinator Open and Closed use replacement pages of **10 presentation items**:
  headers, notices and PRs all count. A continued repository repeats its header.
  Previous / Show more change only the visible slice, never fetch or append.
  Page-specific native scroll IDs start each replacement at the top. The page
  controls and enrollment footer remain outside scrolling content.
- Counts, inventory, notices, webhook updates, folds and worker authority keep
  their existing meaning. Open/Closed pages are independent and home-scoped.
  Folds apply before paging; collapsed repositories cost one header each.
- Native probe widths are cached by zoom, group style/kind and exact string.
  Intrinsic text widths are independent of available line width; each visible
  line still measures its current available width to select full/compact values.
  Duplicate strings get one pending probe per key and at most four intrinsic
  lower-line probes across a complete render; acknowledged strings need none. Known visible
  ordinary rows/pins take priority, then background keys advance through native
  callbacks without delaying rows or installing a frame timer. Settings cross the
  bridge once per render entry, not once per row/string. Pending probes retry next
  snapshot; stale-context/font/zoom callbacks are refused,
  and the text cache evicts beyond 512 entries. Fresh measurement IDs also force
  callbacks for changed strings with coincidentally unchanged widths, and after
  eviction; reused native IDs cannot silently suppress a needed measurement.
  No guessed text-width budgets.
- Immutable PR-fact identity caches the label presentation and full tooltip;
  replaced label facts invalidate it. Coordinator rows build at most three
  visible pills (and three in their one measurement strip); full names, including
  omitted labels, remain in informative strip/metadata tooltips. Ordinary rows
  share the same bounded cache; no individual pill measurement subtree is built.
  Titles retain native truncation, inherited interface font and complete hover,
  with no title-width measurement. Repository-header rendering and its existing
  overflow measurement remain unchanged, outside the new lower-line queue.
  Allocated lower-line physical widths remain keyed by element ID across text/style
  changes, including when native size callbacks do not fire again.
- Native interactive row objects are deliberately **not** cached across renders:
  their callbacks are registered against the current native snapshot. Reusing
  those objects would retain obsolete callback registrations. Cache pure facts
  and measurements, and bound fresh row builds instead. No IO, JSON serialization
  of PR inventories, focus allocation or notification is added to render.

`tests/git-panel-errors.test.mjs` exercises 100 Closed PRs, including a 100-label
PR, with a fixed **10,000 builder-operation / 1,200 element** ceiling, at most ten
PRs per page and fewer than 125 elements per PR. Observed peak was **2,750**
operations including the page-specific scroll-frame wrapper.
It visits every page, proves every PR remains reachable, checks independent tabs,
unchanged IO/counts, cached/distinct-string probes, zoom invalidation and stale
callbacks. Existing 47,250 geometry comparisons and label-colour tests remain.
This deterministic regression is the CI budget gate, not a flaky wall-clock test.
