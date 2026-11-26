# Design

## Context

See `proposal.md` for motivation and safety limits. Inspection was read-only except for these planning artifacts:

- Fetched main and this branch both started at `d6ec6d4e03b44479da1145d2ccd8722e9efa66ed`; `delivery start feature/interface-improvements` confirmed this exact task folder. Open PR #83 is the Trello/Settings work to avoid; #82 edits Crew project naming, not Git. Recheck their landing state before implementation.
- #36 omitted empty selected-tab sections; #56 replaced spacer windowing with mounted ten-item reveal, atomic section boundaries and the measured 60-PR/100-item cap. Preserve those limits, fades, anchors and safety-selection epochs.
- #79 (`keep-deferred-repositories-visible`) fixed cold unresolved repositories silently disappearing behind successful siblings. Its design explicitly rejected a global Loading-only remedy because it could hide a missing repository; it also corrected incomplete global counts, preserved absolute-deadline retries and added bounded diagnostics. This change intentionally revises its presentation, not those read/count guarantees.
- `aggregate.js` clears entries and complete-count memory on scope changes; returning to a coordinator can therefore lose its known section membership. It already distinguishes missing, unresolved, quiet deferred and actionable failed reads and uses existing guarded cooldown callbacks.
- `main.js` independently derives section lists in `renderAggregate` and `fallbackSnapshot`; `TaskReveal.project` repeats the eligibility filter. All must agree. Repository counts must be based on full selected-tab eligible rows, not the revealed mounted subset.
- #45's tests cover synchronous notice failures and component diagnostics, but explicitly do not reproduce the original native `interrupted` banner. Herdr's 50 ms native deadline is not a catchable ordinary JavaScript error, and Node operation counts cannot prove native layout safety.
- Agents has two distinct patterns: group counts use a 32px right-aligned muted meta-text slot immediately before the chevron; agent parents use a small chevron followed by child count only when folded. Child branches use a 1.5px theme-input stroke and rounded elbow. These are the references, not newly designed controls.
- `workspace-links.js` and Crew verification reject cross-machine parent/child relationships. Only one verified fleet child per machine is currently admitted. Spaces already projects that pair together and uses public acknowledged `space.move` commands for block reorder; projected badge numbers remain the native global indices.
- Existing specs explicitly require count-free Git headers, both chain icons and both Crew pills. The delta replaces those statements rather than pretending this is a cosmetic no-spec fix.

## Goals / Non-Goals

**Goals**

- Separate presentation retention from read/action authority, and unresolved work from proof that a selected-tab section exists.
- Share the existing Agents visual primitives, with direct parity tests against actual callers rather than approximate screenshots or duplicated magic styles.
- Establish a cause-specific collapse regression before implementation changes that could mask the symptom.
- Keep all runtime changes inside owned mods and public host APIs.

**Non-Goals**

- No new cross-machine relationship, arbitrary multi-fleet discovery, terminal relocation, native navigation override or shortcut remapping.
- No production deployment, live agent/terminal interaction, relay/account/Trello/Settings setup changes, persistent PR inventory, new scheduler, deadline increase or native patch.
- No clearing valid rows to make a stuck render appear repaired; no disabling the host banner, instrumentation or error propagation.

## Decisions

### 1. Reproduce Closed collapse before the other UI implementation

The first implementation outcome is the bug fix, not counts or new projection. Extend the disposable fixture approach in `tests/features/git-deferred-native.mjs` to mount the unmodified packaged Git controller with 41 realistic Closed items across at least two repositories. Use fixed synthetic task/status/GitHub facts, recent historical merged and closed-unmerged rows, live rows, normal metadata and scoped notices. Exercise actual header clicks: partial/full reveal, top/middle/bottom, all collapsed and reopened, repeated toggles, pending measurements and a held refresh. Expand to 60/100/200-known inventories as controls without bypassing production caps.

Record the failing native status/banner, log/component marker, current projection/reveal geometry and reproduction sequence before changing production code. Compare the actual fold callback, projection, anchor correction, measurement lifetime and subsequent native layout. Distinguish a JS exception, synchronous render-side effect, repeated invalidation and true native render/layout interruption with evidence, not a presumed row-count cause. Minimize the sequence into a failing-before/passing-after deterministic regression of the demonstrated mechanism, retaining the native sequence as independent proof.

Fix the smallest demonstrated owned-code cause. Preserve caught-error propagation, uncaught-interruption diagnostics, current watchdog, PR-row geometry and reveal caps. Node success alone, a build-only native `check`, or suppressing the banner is not success. If the safe fixture cannot reproduce the reported collapse failure, stop the bug outcome and report that blocker rather than claiming an unrelated optimization fixed it.

**Rejected:** Guessing that 41 is too many PRs, reducing the visible rows until the symptom disappears, or recycling #45's unrelated synchronous-notice repair as a reproduction.

### 2. Reuse both Agents count and parent/child patterns

Promote the narrow reusable numeric-rail and parent-disclosure/branch decorations from Agents into shared UI helpers where needed, retaining Agents' current output. Package them through `customization.json` if a new helper is introduced. No general hierarchy framework or new component dependency is needed.

Git header counts use full `aggregate.rows(selectedTab)` grouped once by canonical repository. Include folded and unrevealed eligible PRs, deduplicate shared task PRs, and respect the 24-hour historical Closed rule. The count never uses repository-wide GitHub totals or triggers a request. Reuse Agents' muted `U.meta` text, right alignment and three-digit slot. Keep the existing Git trailing 24px chevron reservation and 3px row-relative inset: compare actual number-to-glyph spacing against Agents and compensate only the surrounding rail spacing so the larger slot does not change the perceived gap. Retain the name's existing actual-overflow tooltip measurement.

For incomplete visible sections, display only the known eligible row count with existing loading hover/accessibility semantics; a notice-only section may therefore show 0/loading. Never present unread identities as confirmed membership or borrow the global last-good total for a different repository. Fully known counts have no count-only tooltip. Counts change with authoritative facts and selected tab even while folded.

Spaces uses Agents' parent-row chevron/count ordering (chevron then count only when collapsed), not Git's group-count ordering. Reuse the actual Agents child indentation, branch dimensions/stroke/rounded corner and child-row rhythm; put the space's own numbered badge where the child program icon belongs. Keep native space badge size, selected/inactive name treatment, trailing metadata and shared hover/drag guards.

**Rejected:** Colored badges or tab-count pill styling for repository headers, independently styled branch SVGs, or blindly copying a count slot without testing its visible gap next to Git's larger chevron reservation.

### 3. Reconcile #79 with non-flashing section admission

Derive one selected-tab projection for both rendering and safety selection, separate from the full cross-tab inventory used for enrollment and read routing. A new section is admitted only when it has a known eligible row or an applicable actionable read notice. Unknown-only repositories no longer get headers or per-repository Loading bodies. Genuine failures remain the explicit exception to the nonempty-row rule, so access/auth/process/network failures cannot silently vanish merely because no PR state has arrived yet; preserve existing historical-versus-live tab scoping and folded notice behavior.

Use exactly one existing `panelMessage` working-bulb/Loading treatment for current verification or unresolved first-read work. Keep it in a non-shrinking panel feedback area in the existing content column above enrollment, separate from repository rows and their reveal limits, so it remains visible even with healthy sibling sections and never masquerades as a PR. No per-repository loading list, new explanatory banner, rate text, invented row or custom spinner is added. Warm-only refreshes keep their normal steady rows; a return/verification wait or a new unknown identity gets the single panel indication.

This preserves #79's underlying fix in three ways: (a) already known sections cannot disappear during uncertain return/refresh; (b) unknown cold work stays visibly pending for the panel until it resolves, even if healthy siblings load; (c) an actionable failure exposes its repository notice and a quiet refusal still recovers through the original absolute cooldown callback. Both global tab totals retain #79's unknown/last-complete loading semantics until all admitted identities resolve. Existing bounded read diagnostics continue identifying which repository is deferred without adding UI.

At successful retry, admit the repository only into tabs with actual eligible rows; remove global Loading only when no pending verification/first-read work remains. Missing PRs, other-tab-only facts and expired history leave no empty sections. Reuse canonical keys and surviving anchors, ensure header plus first row/notice is atomic at reveal/cap boundaries, and count safety targets only from the same revealed unfolded rows as before. Folding never starts or cancels inventory reads; safety selection still invalidates by its existing epoch.

**Rejected:** Undoing #79 wholesale (loses retry/count/failure guarantees); keeping every header with an empty body; settling at partial exact totals; hiding failures until a row appears; or making global Loading disappear as soon as any repository succeeds.

### 4. Keep the last compatible coordinator presentation in bounded runtime memory

Retain pure presentation facts per exact machine/coordinator-space/owner/home and Git/Crew/attachment enable generation, with separate Open/Closed presentation/reveal facts. Use the existing sanitized context scope plus explicit generation invalidation, never names or mere directory similarity. Retain at most four coordinator snapshots and at most the existing 4096 admitted PR-identity bound across them; evict least recently used inactive snapshots. An evicted or never-visited context has one panel Loading state, not guessed sections. This bound is a stated limit on last-visit restoration, not a promise of indefinite history.

Snapshot only the data needed for last-known sections/rows/counts/folds/anchors, never native elements, request tokens, scroll handles, credentials or worker authority. Entering a different space retires old requests and consumers before retaining the inactive snapshot; hidden cached contexts do no new work. On return, restore compatible presentation immediately, expire historical facts against current time, mark unverified data using existing Stale semantics and the one Loading indication for pending work, then reconcile fresh membership. Once fresh links are available, remove absent links and update facts through the normal guarded reader. Revalidate any row/menu/robot action against current live context; cached targets grant nothing.

Disablement of Git/Crew/attachment, authoritative owner/home replacement or native coordinator removal invalidates affected snapshots, including changes observed without a panel render. Do not restore snapshots across an off/on generation. App restart/mod recreation without in-memory facts remains cold Loading: no shared persisted PR snapshot or portable preference. Existing durable pair identity still restores Spaces independently.

**Rejected:** Persisting task inventory into the durable pair record, reusing native callback-bearing trees, or restoring unrelated cached rows and pretending their old verification authorizes current reads/actions.

### 5. Fold nested spaces without changing native topology

Apply nesting only to existing accepted same-machine display blocks. Remove both chain decorations. Suppress the Crew tag only on the attached child; preserve its unrelated tags and restore ordinary independent tags on unlink/off. Prefer presentation filtering in the Spaces caller; alter Crew's contribution only if its generic semantics require it, keeping all project-name/Settings work untouched.

Keep `ordered()`'s full block membership and native indices as the basis for block capture and public reorder; derive a separate visible expanded-row projection for parent folds and auto-scroll/drop geometry. A collapsed coordinator still drags its hidden child as a block. An expanded child remains individually clickable and draggable as the same block; the preview stays one chip with the grabbed member's native number/name and coordinator colour. Drop edges cannot split a pair. Controls stop propagation and use shared reorder guards so a disclosure press cannot select or arm a drag; row selection, context menus, rename and colour retain captured native targets.

Store parent folds locally under a separate Spaces key, scoped by machine and exact displayed pair identity, default expanded and excluded from preference exports. Do not reuse machine-fold keys or Git repository folds. On a new native selection transition into a hidden child, disclose the parent; explicit folding itself does not select the parent or get undone by a render-time reopen loop. Numeric shortcuts and native next/previous selection continue targeting native spaces. Compact rail ignores expanded parent folds and shows every numbered space as before. Machine-header folding remains independent.

A ready remote group may contain its own local-to-that-machine nested pair. Cross-machine candidates are already rejected by `linkedBlocks` and Crew identity joins: leave each independent row under its original machine header with ordinary badge/selection/tag rules. Do not relocate a remote row under a local parent or invent a cross-header connector.

**Rejected:** Renumbering based on visible rows; native space reorder merely to indent a row; hiding children from native commands; cross-machine links; moving only the visible parent when folded; or changing the reusable drag engine's thresholds for this feature.

### 6. Verification and evidence remain outcome-specific

Each outcome lands its tests and relevant README/architecture/testing updates. Focused checks use packaged actual controllers and UI with fake external facts, immediate-spawn/render-side-effect guards and strict no-live-transport fallbacks. Existing regressions that assert count-free headers, duplicate Crew pills, chains or per-repository Loading must be revised to the new explicit contract while preserving their other assertions.

- Collapse: reproduce 41 Closed items first, exercise repeated toggles at reveal/cap/scroll boundaries, notices, pending layout and held refresh; retain native error logs/status and the failing-before regression. Preserve `git-panel-errors`, render-budget, safety-paging and mounted-reveal coverage.
- Header counts: compare actual Agents and Git callers for 1/10/100 counts, both tabs/fold states, narrow/long names and 75–200% zoom including 100%/130%; prove task-scoped deduplication and no fold-triggered IO. Counts cover full eligible inventory, not mounted rows.
- No flash: sample every projection during cold/return/home-away-home, delayed siblings, first-read queued/deferred cooldown, actionable failure, missing/expired/other-tab facts, enable-generation changes and late responses. Preserve global count completeness, bounded diagnostics, original no-event retry, enrollment inventory and scroll anchors.
- Spaces: compare actual Agents branch/disclosure styles; cover active/inactive, parent folds and counts, child selection through native shortcuts, compact rail, rename/metadata/colour, machine folds, local/remote/cross-machine refusal, expanded and folded block drags/cancellation and acknowledged order. Existing Agents render output must stay unchanged when helpers move.

After implementation run disposable native instances only, with synthetic providers, no terminals, isolated home/Core identity, loopback/no-network fallbacks and no inherited production tokens. Capture initial/intermediate/settled Git states, 41-item collapse/reopen, counts beside chevrons, and Spaces expanded/collapsed/selected/drag states at 100% and 130%. Use actual pointer/keyboard interactions for folding/navigation/reorder, not only a test export or native build check. Inspect pictures, native status/errors and bounded build/layout diagnostics; label synthetic facts and build-only versus interactive proof honestly. No browser tool is needed unless a web UI is examined; if used, read `chrome-devtools-axi --help` first.

The brief explicitly keeps all scratch, pictures, receipts, temporary app homes and report under `C:/Users/tprokopiev/.crew/tasks/interface-improvements`, outside this checkout; use an absolute external root in proof drivers rather than copying existing scripts' `.artifacts/` default. Only generated `dist/` may be built inside the checkout. Keep any temporary socket path within the platform's limit. Every launched app/Core/server belongs to a unique disposable session and must be stopped in `finally` cleanup before reporting or `crew done`; record positive shutdown evidence and never stop production processes.

Hosted Windows/Ubuntu green is required before an Implementation report, but draft PR test jobs skip. Use existing `.github/workflows/tests.yml` `workflow_dispatch` with `--ref feature/interface-improvements`, which runs the same Node 24 matrix without changing PR readiness. Record the run's exact `head_sha`, both OS checks and required result; any later code push invalidates the evidence. Inspect status rather than foreground-watching. Do not change CI guards or mark the PR ready to get tests.

## Risks / Trade-offs

- [Original interruption not yet reproduced] → Bug outcome is first and cannot be claimed complete without actual cause and native before/after proof. A required host patch or unsafe reproduction is a blocker, not implicit authorization.
- [New header count reduces name width] → Reuse overflow-only name tooltips and compare real count/glyph gaps while keeping the existing trailing alignment and hit target.
- [Global Loading obscures which cold repository is waiting] → Intentional requested trade-off; known sections remain, actionable failures identify repositories, diagnostics retain deferred identity, unknown global totals remain loading and original retry still runs.
- [Warm return accidentally authorizes stale inventory] → Pure bounded runtime snapshots, exact identity/generation matching and fresh action gates; no persisted inventory or cached callback trees.
- [Collapsed rows corrupt drag indices or hide active selection] → Keep full native block order separate from visible geometry; native-navigation transition reveals the selected child without remapping shortcuts.
- [Shared helpers drift Agents or Git row budgets] → Compare actual caller trees/geometry and retain existing baselines for unrelated PR rows; permit only the intended repository-header helper elements, never baseline changes that hide row regressions.
- [Concurrent main changes] → Recheck PR #82/#83 before implementation and synchronize current main without copying or reverting their unrelated work. Trello/plugin Settings files are out of scope; report any unavoidable overlap before editing.

## Migration Plan

No native, credential or portable preference migration is needed. New parent disclosure is optional client-local state with an absent-key expanded default; existing pair memory, repository folds and native ordering remain usable. New coordinator snapshots exist only in memory and are discarded on incompatible generation changes. Source/tests/docs are built in this worktree after approval; disposable deployment is the only planned running-app installation. Normal guarded deployment and package rollback remain unchanged and are not executed on the user's installation by this task.
