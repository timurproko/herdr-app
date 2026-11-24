# Design

## Context

See proposal.md for motivation. `Changes.pullRow` in `src/plugins/git/mod/main.js` is shared by ordinary lists, the active pin, coordinator sections and pin-swap ghosts. Its metadata line already has `h(18)`, even when empty. The title omits its trailing robot entirely when no agent is related, and metadata groups use intrinsic widths and are packed only when present. Ordinary robots use a 20px wrapper around a 24px absolute target, but coordinator robots directly contribute 24px to the title line. Byline text also combines optional author and age in one string.

`loadPulls` retains old rows until its page succeeds. `flushWebhook` stages all loaded-page updates before publication. `AggregatePulls` retains same-home facts during pending reads and stale verification, but publishes each PR's completed facts independently. These are existing protections, not defects to rewrite wholesale. The ordinary `refresh` root-probe error path does call `resetRepository`, so an unsuccessful same-folder probe can discard a good list; nonzero root-probe results currently also collapse to non-repository without classifying the cause.

`tests/git-row-labels.test.mjs` asserts bounded metadata height and label colors, but mocks away related agents and does not solve actual slot positions. Changing a zoom variable while comparing the same markup is not enough to prove geometry. Fleet/pagination/pin tests already provide deferred reads and measured motion scaffolding.

## Goals / Non-Goals

**Goals:**
- Data-independent cell boundaries, fixed logical line heights and stable identities from the first PR-row paint, without a warm-up measurement pass.
- Same geometry for live rows and ghosts; no loss of captured robot/menu targets or pin-swap measurements.
- A bounded last-good display for refresh uncertainty, not permission to reuse facts across unrelated contexts.

**Non-Goals:**
- Spaces implementation, PR #38, agent discovery/authority policy, CI polling, task eligibility/history changes, label colors or hover styling changes.
- Freezing legitimate PR membership/state changes, user folding/tab navigation, explicit pin motion, panel resizing or app zoom changes.
- Deployment, native rebuilds/patches, real-agent clicks, terminal input or service setup.

## Decisions

### 1. Keep three lines, not a conditional or extra metadata line

Use a 20px title line, an 18px byline and the existing 18px metadata line, separated by the existing 3px gaps and 6px top/bottom padding: a 74 logical-pixel block. Fix min/max heights and shrink behavior so children cannot enlarge or collapse a line. The 16px state glyph remains inside its existing 20px leading slot for every PR state, including conflicts. Normalize both robot variants to the same 24px-wide, 20px-high slot, with the existing 24px target centered as an absolute child. An absent robot leaves an empty inert wrapper, not an opacity-zero button. Keep the title-to-robot gap even when absent.

**Space choice:** reserve the metadata line even for PRs that never acquire checks or labels. The renderer already reserves its 18px height today, so this does not introduce another blank line or a new label-only line. Reserving horizontal cells costs usable text width; full-value tooltips and truncation make that explicit trade-off preferable to jumping content. Reject adding fourth/fifth lines, variable-height expansion and arrival animations.

### 2. Independent metadata cells, never content-sized siblings

Give tasks, checks, assigned labels and review-decision text separate deterministic widths derived only from the available content width. After reserving separator gutters, start with 28/14/38/20 percent shares respectively. Keep every cell mounted with zero minimum width, bounded overflow and a fixed 18px height; tune these shares only if narrow-width fixture results require it, never according to row facts. Task and check icons each keep their own fixed leading icon slot (pending's 8px dot is centered inside the same 12px slot as success/failure glyphs). Counts, untouched/partial/done text, labels and review text truncate inside their cells with full-value tooltips. Label pills keep existing 18px shape, palette logic and exact names.

Each metadata boundary has the existing 3px dot plus balanced 6px insets in a reserved gutter. Only one separator before each present group after the first present group is painted; all other gutters stay blank. Painting or removing a separator never changes a cell boundary. Do not render fake task/check values or blank pills. Existing assertions that absent groups consume no geometry must be revised to distinguish blank layout containers from visible placeholders; color/action guarantees stay intact.

Split optional byline author and age into independent bounded cells, preserving number/author/time order and the existing number/author separator appearance. Reserve the number cell and separator even before author/time facts resolve, so a missing or late author cannot move the age anchor. Keep complete byline hover text and the existing authorless wording. Preserve field compatibility for other consumers if `pulls.js` adds structured byline facts.

### 3. Extend existing retention only at demonstrated gaps

Keep the ordinary page/webhook staging behavior and aggregate entry identity. Add deferred render samples before reads, while each read is pending, after successful completion and after errors. For a same-context root-probe transport/process failure, retain the prior root/repository/rows/counts and report the failure instead of resetting the repository. Distinguish a proven non-repository result from an inconclusive local command failure. Context switches must still invalidate old requests before busy guards. Manual refresh resets to page one only when that page is ready; webhook catch-up retains depth/cursors as already designed.

For coordinator refresh, old same-home rows stay mounted while each replacement PR is pending; current per-entry publication need not become a global transaction. Change aggregate logic only if the deferred regression exposes an actual clearing path. Stale/Verifying feedback stays in the existing fixed-height header and must not replace loaded rows. Cold no-data waiting text remains panel-level, not a fabricated row. Preserve existing three-read concurrency, task-history eligibility, stale action denial and exact scope guards. Optional Open/Closed count badges get reserved geometry if the panel geometry regression shows their arrival moving the neighboring tab; absent values stay blank, not zero.

### 4. Geometry evidence must compare resolved boxes

Add a focused real-renderer fixture with a deterministic layout solver for the supported flex/absolute/overflow subset, following the approach of `tests/choice-menu.test.mjs`. Resolve boxes at narrow and normal panel widths (at least 280, 360 and 480 logical pixels) and at 0.75, 1, 1.25, 1.5 and 2 zoom. Compare measured/scaled title right edges, every line's y/height, icon/metadata anchors, row height and following-row y, not just identical style chains. Failing assertions must identify the varying optional feature, row mode, width and zoom.

Cover agent absent/present/disappearing; tasks absent/untouched/partial/done with digit-width changes; checks absent/pending/success/failure and different counts; labels absent/one/many/long; review decisions absent/approved/changes; author absent/late; state/conflict icons. Compare ordinary, pinned, coordinator, Open/Closed/merged and ghost paths, including unrelated rows beside the changing row. Use real `U` metrics, not incomplete mocked constants. Protect full-name tooltips, no visible placeholders/orphan dots and inert empty-agent slots.

Extend pagination/fleet fixtures for manual, webhook, reconnect/show and failed root/PR refresh, plus stale verification and true context changes. Assert retained IDs/order/counts and scroll/pin measurements while pending, without suppressing genuine authoritative membership updates. Render guards must throw on `cx.focus_handle()` or synchronous `cx.notify()` and exercise immediate-spawn scheduling; callbacks notify only after render has yielded.

## Risks / Trade-offs

- [Blank horizontal space and earlier truncation] → Keep three lines, give labels the largest metadata share, preserve full-value tooltips and exercise narrow widths with long emoji names and multi-digit counts.
- [State changes mistaken for a layout bug] → Optional data may change paint/content, not geometry; authoritative additions/removals, state-tab moves and intentional pin navigation remain allowed.
- [Retaining obsolete repository facts] → Retain only under the exact existing context and distinguish uncertain failures from affirmative non-repository evidence; never relax late-response or coordinator action guards.
- [Fixture model diverges from GPUI] → Resolve real render-tree geometry and state precisely that this is synthetic evidence, not a native screenshot or interaction claim. Any native pixel check needs separately authorized disposable UI validation.
- [Scope conflict with old metadata packing requirements] → The delta explicitly replaces packing with reserved cells; preserve palette, separator paint and captured action contracts rather than retaining contradictory expectations.

## Migration Plan

No persisted schema or host setting changes. After approval implement the two PR outcomes in order with their targeted regressions. Run the requested `CI=true npm run test:ci` once on the implementation, record the exact result and inspect final-head required checks without a foreground watch loop. Never manually mark ready or merge. Drafts normally skip app suites; if required final-head checks do not run while the task is required to remain draft, report that limitation rather than treating skipped checks as passing. At this plan handoff no implementation or integration-suite run is claimed.
