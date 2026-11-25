# Design

## Context

See `proposal.md` for motivation. Read-only inspection confirms:

- `pulls.js` converts real primary/secondary refusals and shared cooldown skips into quiet errors with absolute `retryAt`; `retryRead` already arms an identity-guarded one-shot wakeup.
- `aggregate.js` retains last-good facts, marks quietly refused entries dirty, and calls `retryRead(...pump)`. Its `counts()` currently returns loaded eligible rows, even when first reads remain unknown.
- Both `main.js` aggregate section projections (rendering and safety selection) keep only rows/notices. `TaskReveal.project` independently repeats that filter and admits only headers, rows and errors. Merely changing the render filter cannot fix the bug.
- `main.js:segment` already shows unknown counts as visible 0 with `Count loading; showing 0` and an accessible loading label. Warm ordinary counts are retained.
- Native section reveal is atomic and capped at 60 PRs / 100 presentation items. Existing anchors preserve surviving keyed items. `panelMessage` supplies the standard Loading bulb.
- The investigation proves the failure mechanism, not the original refusal. Its report describes the captured-fleet reproduction, but the task directory contains no raw capture to check in.

## Goals / Non-Goals

**Goals:**
- Represent uncertainty separately from row eligibility and from actionable errors; share the same repository projection between render and safety selection.
- Keep reads, count bookkeeping and diagnostics outside render-side effects, without increasing GitHub demand.
- Make the exact mixed-fleet failure reproducible using actual provider/controller modules and sanitized fixture inputs.

**Non-Goals:**
- No changes to task admission, verification authority, 24-hour history, missing-PR suppression, rate classification, machine-shared cooldown or manual bypass.
- No monitor, plugin settings/declaration, enrollment, live app deployment, terminal, Core document, relay or account changes.
- No placeholders, guessed PR states, repository-wide coordinator counts, new UI styling, new scheduler or watchdog relaxation.

## Decisions

### 1. Add explicit unresolved repository presentation, not fake PR facts

Derive an unresolved fact from current admitted nonmissing entries lacking authoritative PR data. Queued, in-flight and quiet-deferred cold reads stay unresolved; an applicable actionable failure retains its existing notice rather than being hidden by Loading. Confirmed absence and known ineligible history are resolved exclusions, not loading candidates. Refreshing entries that already have facts is not cold uncertainty.

Use this fact consistently in both aggregate section projections. Retain a section with rows, an applicable notice, or unresolved first-read work. When state is unknown, Loading can appear under either selected tab; it asserts no Open/Closed membership. A new unknown link alongside loaded rows can add Loading without replacing those rows. A warm-only refusal adds no Loading line.

Extend `TaskReveal` with one keyed Loading content item per unresolved repository and render it using the existing `panelMessage` bulb/text. Include it in item limits, fold hiding, atomic header/body boundaries and anchor accounting, never as a PR row or safety-read target. Keep canonical header IDs, list scope, reveal depth and saved folds. When rows arrive, replace Loading in that same section and preserve surviving scroll anchors; normal content expansion is not a scroll reset. Once all facts resolve, current selected-tab omission rules apply.

**Rejected:** Keeping every admitted header permanently would resurrect empty missing/expired/other-tab sections. Putting a global Loading message below the list would not identify the missing repository. Fabricated PR rows would invent state and consume PR slots.

### 2. Separate count completeness from numeric value

Compute completeness across the admitted inventory, not the selected/revealed/folded subset. Until every admitted identity has authoritative facts or confirmed absence, a loaded subset is not a final total; actionable cold errors also leave totals unknown. Cache a compatible last complete same-scope snapshot in the controller's update lifecycle, not by publishing during render. Before any complete snapshot exists, pass unknown counts to the existing segment presentation so both badges remain 0/loading.

If new unread membership arrives after a complete same-scope snapshot, retain compatible last-known numbers but explicitly mark them loading through the segment's existing tooltip/accessibility conventions, extended to retained numeric values if necessary. Complete snapshots continue using deduplicated eligible task rows and current history expiry. Warm refresh refusals keep existing authoritative facts/counts without adding cold-loading semantics. Reset incompatible snapshots on scope changes and reconcile authoritative removals rather than retaining deleted members forever.

Ordinary mode keeps its repository-wide semantics. Exercise cold list/count refusal, warm retention and cooldown retry; adjust the shared count path only if those tests expose the same partial-total problem. Do not use a first-page row count as a known full total.

**Rejected:** Displaying partial counts as exact or borrowing GitHub repository totals for task scope. Returning zero without the existing loading tooltip/accessibility would still misrepresent completion.

### 3. Preserve the existing absolute-deadline retry

Inspection confirms aggregate quiet failure already leaves `dirty=true`, schedules `retryRead` at `retryAt`, then pumps on wakeup. The #71 recovery work additionally covers safety cooldown expiry. Add a fake-clock regression on the actual cold aggregate path: no read before the deadline, retry at expiry without another event, then both rows. Also cover hide/disable/home replacement and manual bypass so Loading grants no authority. Change scheduling only if this regression finds a defect; do not create another timer policy or restart the 15-minute floor on a skip.

### 4. Keep a small, inspectable runtime read snapshot

Instrument the shared Git read boundary so both ordinary and aggregate reads report sanitized phases (for example target/list/count/state/detail), attempt time, outcome (running/success/quiet-refusal/cooldown-skip/failure), last genuine refusal time and absolute retry deadline. Publish a bounded latest snapshot under a Git-owned namespaced runtime shared key, keyed by machine and canonical repository; cap it at 128 repository records, evicting oldest updates. Keep last refusal evidence after success while recording recovery separately. Reject late attempt completions as newer-phase writers.

No raw command/query/output, credentials, credential-scope values, task lists or working-directory paths enter diagnostics. Unknown repository-resolution reads cannot invent a canonical repository key. Diagnostic publication is best-effort and yielded out of render; the pure reader can accept an injectable sink for tests. Existing once-per-refusal-episode console logging stays intact. There is no tooltip, banner, persistent task history or portable export for this evidence.

**Rejected:** Reusing aggregate's `diagnostics` Map: it holds short-lived access-identity promises and is deliberately cleared. Logging raw errors would be unsafe and still fail to distinguish cold reads from cooldown skips.

### 5. Regression and native proof

Build a sanitized fixture matching the report's topology: admitted herdr-app links #74/#76, other repositories successfully supplying two Open and five recent Closed rows, and a refused herdr-app first read. Use real Crew contribution, aggregate, read boundary and panel rendering through `tools/plugin-harness.mjs`; mock only external transport/time/native elements. Assertions cover header plus standard Loading, no error/rate wording, healthy siblings, 0/loading count badges before completeness, exact task counts after retry, both rows, folds, boundary reveal, missing/history exclusions, warm refusal and ordinary parity.

Run quick focused suites for the changed paths, count badges, quiet refusals, section reveal/anchors and mounted render limits. Keep existing budget references meaningful; do not update row-budget baselines to conceal added PR-row work.

After approval and implementation, use a disposable native instance with synthetic provider/GitHub refusal at 130% zoom. Capture Loading and recovered states outside the working copy at `C:/Users/tprokopiev/.crew/tasks/panel-deferred-repo/`. Inspect both images, record build-only/native validation limitations honestly, and stop the disposable instance in a finally-style cleanup before reporting. Do not deploy into or change the person's running app. Scratch bodies/logs remain in the checkout's ignored `.artifacts/`; requested final evidence/report are the explicit external delivery outputs.

## Risks / Trade-offs

- [Unknown PR state applies to either tab] → Loading remains neutral and disappears according to actual state after resolution; no inferred historical/Open membership.
- [Loading items could orphan a boundary header or exceed mounted work] → Treat them as first-class capped content items and extend section invariants, not the PR-row count.
- [New rows expand a section] → Preserve stable section/list IDs, surviving keyed anchors and reveal depth; do not promise identical content height.
- [Same-scope inventory changes invalidate an old exact total] → Keep its compatible last-good display explicitly loading and reconcile removals/expiry through current scope eligibility.
- [Shared diagnostic writes add UI cost or overwrite newer evidence] → Bound records/fields, emit only from yielded read continuations, and use attempt identity guards with a best-effort sink.
- [Original real refusal is unavailable] → State the limit; prove the report-equivalent simulated failure and future observability, not the unrecorded original response.

## Migration Plan

No stored preference or native migration is needed. Deliver source/tests/docs in this branch only after plan approval. Later installation uses the project's guarded deployment path; rollback is the prior customization package. This task does not install into production, mark its PR ready or merge it.
