# Approved amendment: bound the coordinator render

The takeover request explicitly authorizes the priority render-budget repair in
the existing first outcome of PR 45. Continue the existing branch and preserve
its prior review repairs; no deployment, live app restart or merge is authorized.

## Design

Use replacement pages of ten presentation items, including headers and notices,
in both coordinator tabs. Count the complete linked inventory, apply folds before
paging, repeat continuation headers and keep Previous / Show more and enrollment
outside page-specific scrolling. Pages do not fetch or accumulate native rows.

Cache intrinsic metadata widths by distinct text/style and zoom with at most one
pending probe per snapshot and 512 retained entries. Continue measuring available
line width for natural semantic shortening. Cache immutable PR label presentation;
build at most three coordinator label pills with all names retained in tooltips.
Do not cache native interactive rows across snapshot builds: callback registration
belongs to the current native snapshot, not the pure PR facts.

## Evidence and limits

The actual packaged renderer runs in disposable native QuickJS/GPUI checks with
30 and 60 Closed rows, two repositories, history notice, robots, tasks/checks,
pills and reviews. Before/after PR 42 mean cold build times are 4.0→7.4 ms (30)
and 7.6→14.6 ms (60). The prior repair head is 7.6 / 15.4 ms. Bounded pages are
2.2 / 2.6 ms (five cold samples each); the 100-row deterministic fixture peaks at
2,750 builder operations under a fixed 10,000 ceiling.

Full breakdown, differential tooltip samples and reproduction command are in
`docs/GIT-RENDER-BUDGET.md`. These measure the complete native render callback's
build work, not subsequent GPUI paint or live click latency. The disposable check
does not reproduce the person's live watchdog interruption. PR 42's probe cost
increase is measured; no unsupported claim is made that it alone introduced the
live banner. The repair removes the evidenced unbounded inventory-size cost.

## Regression

Visit every page of a synthetic 100-row Closed inventory, including a 100-label
PR. Enforce fixed builder/element budgets, bounded PR elements, exact reachability,
unchanged reads/counts, per-tab pages, distinct-string deduplication, cache reuse,
zoom invalidation and stale callback refusal. Preserve existing row geometry,
labels, history, enrollment and action guards. Run the full isolated local CI once
no other worker suite is running and report final-head required hosted checks.
