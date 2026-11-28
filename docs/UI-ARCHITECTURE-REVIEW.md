# UI architecture review and refactor plan

**Plan only. No application implementation is included.** Review baseline: current `main` at `5219874e30c22999468181dbdabf693327304857` (includes #104 and #112). Line references below name that baseline. Timing is Windows release App 0.1.18, not a promise about every installation.

## Findings first

1. **The problem is structural, not nine expensive PR rows.** Git's `View` is simultaneously a repository controller, read scheduler, agent resolver, publication store, geometry owner and renderer. Ordinary rendering still repeatedly resolves live selection. A nine-row, twenty-agent completed frame makes **34 spaces / 33 panes / 33 terminals / 32 focus lookups**, despite creating a frame snapshot. The coordinator optimization did not remove this ordinary-path work.
2. **Two different failures look like a redraw.** An uncatchable native deadline abort produces Herdr's last-frame banner. Separately, unresolved selected-agent association replaces an intact list with cold Loading; a folder-key reset can actually discard the active list. Neither requires a changed repository's PRs.
3. **Read admission is not globally bounded.** `GitReads` deduplicates and orders some GitHub requests per repository, but direct Git commands and agent enumeration bypass any total concurrency limit. Twenty due role-labelled agents in one directory start twenty concurrent config reads and forty exec calls in total. Forty agents double those figures. Settings' four-command queue is Settings-only, not a host-wide budget.
4. **There already is a substantial component kit.** Replacing it with a new UI framework would add another abstraction. Extend the existing `src/ui/` kit, extract repeated compositions and geometry lifetimes, and preserve panel-specific variants rather than flattening their differences.
5. **Existing tests constrain trees better than complete work.** Geometry, probes and interaction coverage is valuable and must remain. But stubbed controller/provider boundaries miss repeated lookups and fan-out; five handwritten aggregate doubles broke in #104 when an internal method was added. Small renderer timings cannot certify a whole controller frame.

**Recommendation:** approve the staged internal refactor below, not a tactical exception or redesign. Stage one covers **both Git symptoms**. Keep all current layout, spacing, sizes, colours, fonts, wording, icons, hover/focus, pointer/keyboard behaviour, motion, settings and saved values. Retaining the list eliminates a failure/transient, not a control or UX change. Never suppress the banner, raise the watchdog, invent a placeholder list, or cache action authority.

## Proposed PR sequence

Each stage is a separate, reversible PR, with its own targeted tests and native proof. The current OpenSpec change scopes implementation to **stage one**; later stages need their own plan/approval. No implementation until approval, and implementation lands **last**, after #110, #111, #112, #113, #115, #117 and the activity-line change (#118). At review time #110/#112/#113 are merged; #111/#115/#117/#118 remain open. Recheck their exact merged heads before implementing; do not restore this review's older visuals. The newly open #119 is another overlapping Git change to reconcile, not permission to bundle it.

| Stage | Delivered change and deleted duplication | Risk and independent shipping boundary | Budget and parity proof |
| --- | --- | --- | --- |
| **1. Git data/publication/render boundary** | Separate repository facts, selection admission, immutable UI publication, geometry and guarded actions; one deduplicated bounded Git read service; cheap ordinary/coordinator snapshot rendering. Delete render-driven read orchestration, repeated `location()`/provider projection, agent-per-folder duplicate discovery and selection-driven destructive repository resets. Keep existing row builders initially. | Medium: association, click motion, stale replies and cross-machine routing. Ship Git-only consumers first; no other panel rewrite, preference migration or polling change. Shared admission is one owner across Git consumers, not four slots per mod copy. | Existing row/geometry/stage/pin/fade/scroll/recovery suites unchanged; add whole-controller selection/refusal tests and command counters. Three repetitions of the native matrix below at both zooms, with real production location/provider helpers; all margins reported. |
| **2. Extract existing component compositions** | Compose Files/Git header shell once; consolidate feedback, list shell and measurement-record lifecycle in `src/ui/`, keeping named variants. Delete duplicated header and measurement plumbing only after second consumer parity. Reuse `ui.js`, `panel-kit.js`, `settings-kit.js`, `sidebar-scroll.js`, `scroll-fade.js`, `reorder.js`, `status-reveal.js`; no replacement framework. | Low/medium: styles and event propagation. Extract one composition at a time; no data or behaviour change. Different visible variants stay different. | Frozen tree/probe/operation budgets cannot increase; existing header/right-edge/scroll/tooltip suites unchanged. Native before/after Files/Git captures, hover/focus/keyboard and scrollbar cases at 100/130%; same workload render p95/max no worse than stage-one baseline. |
| **3. Files and Usage controllers** | Extract file listing/marks/viewer receipts from tree rendering, and Usage collection/account presentation from dialog/summary rendering. Move repeated sorting/formatting/context walks to publication. Delete view-owned read/cache coordination and duplicate width-lifetime logic where the shared geometry registry exactly matches it. | Medium: recycle safety, exact viewer machine/path reuse, accounts and resets. Do not combine deletion/account workers with presentation code. Reuse the admission service for safe public reads; explicit actions remain separate and unreplayed. | Existing file-entry/reuse/delete, Usage pin/refresh/reset/summary suites unchanged. Synthetic native local/remote, hide/show, retained failures, viewer reload, long tree and quota growth; before/after both zooms. Same render-only zero-IO rule; p95/max no worse than baseline and max below 35ms for stated fixtures. |
| **4. Settings and plugin adapters** | Split the Settings navigation/editor controller, plugin check/list/form controller and pure page renderers. Keep declarative Crew/Trello Settings, private transport and capability validation. Route read admission through the common service without retaining secrets there. Delete duplicated request ownership/status transitions and feature-local generic row compositions, not plugin authority checks. | Medium/high: cancellation, transient secret inputs, projects, unknown write outcomes. Smaller PRs per controller are acceptable; each retains the existing external interface. No generic all-powerful plugin controller. | Unchanged plugin UI/queue/list/transient-form/kind/Trello safety suites; fake slow/offline/refusal/revocation matrix. Native Settings/Crew/Trello before/after at both zooms, no real account or SSH writes. At most four admitted custom read transports in total, not four for each card. |
| **5. Spaces, Agents and Tabs snapshots** | Publish one indexed native topology per lifecycle revision and derive stable grouping, labels, counts and reorder projections before render. Keep fresh action/reorder validation. Delete repeated per-row collection scans and superseded helpers; introduce shared typed test adapters rather than per-test controller replicas. | Medium/high: connected-space identity, ordering, focus and drag. Domain-specific projections remain separate; never treat a remembered binding as action permission. | Existing grouping, connected-space, rename, reorder, colour and terminal-launch suites unchanged. Native 20/40-agent, five-space/two-machine, expanded/compact/drag/fold matrix at both zooms; stable counts/focus and no change in read cadence. Zero per-row native lookup growth; complete frame and native error budgets reported. |

“Delete” means remove the old implementation after callers move, not leave two implementations behind a switch. Every stage updates its own ownership/testing docs. A failed parity or margin gate stops that stage; it is not permission to change geometry, lower fidelity or weaken a test.

## 1. Current structure and state ownership

### Inventory

Physical line/byte counts are from authored source, not generated packages. Dense one-line methods mean line count alone understates complexity.

| Module | Lines | Bytes | Responsibilities now |
| --- | ---: | ---: | --- |
| `src/plugins/git/mod/main.js` | 1,976 | 131,792 | Repository/root/page/association state, timers, actions, publication, ordinary/coordinator rendering, pin motion, measurements, failures |
| `src/features/settings/main.js` | 1,147 | 57,705 | Navigation, host selection, editors, update/permission/profile state and page composition |
| `src/features/settings/plugins-ui.js` | 1,115 | 80,304 | Declarative rendering plus checks, forms, list operations, focus, sessions and cancellation |
| `src/plugins/crew/plugin.js` | 1,118 | 74,795 | Declarations, capability/tool/project checks, transports, explicit operations and launch gates; not a private visual renderer |
| `src/plugins/git/mod/pulls.js` | 655 | — | Pure normalization mixed with request ordering, rate state, mutable facts and shared leases |
| `src/features/spaces/main.js` | 645 | — | Lifecycle/provider refresh, Git metadata, topology, reorder and rendering |
| `src/plugins/files/mod/main.js` | 602 | 36,707 | Filesystem shell scripts, tree cache, viewer/open/reload identity, menu/dialog and row rendering |
| `src/ui/ui.js` | 495 | 34,657 | Tokens and generic elements/interactions, feedback, dialogs and collapsibles |
| `src/plugins/crew/fleet.js` | 486 | — | Status transport, leases, verification, durable display and action-context projection |
| `src/features/agents/main.js` | 454 | — | Status/grouping/order/folds and expanded/compact rows |
| `src/plugins/usage/mod/main.js` | 440 | 37,102 | Dialog and summary, account/refresh interaction, quota formatting, measurements and reset UI |
| `src/plugins/git/mod/aggregate.js` | 328 | — | Task scope, inventory/facts, read pump, publication, safety and focus validation |
| `src/plugins/git/mod/agent-links.js` | 250 | — | Discovery IO, canonical-folder and association caches, topology matching and fresh focus confirmation |
| `src/ui/settings-kit.js` / `panel-kit.js` | 219 / 94 | 15,974 / 6,497 | Existing shared Settings/control and panel/dialog compositions |
| `src/plugins/trello/plugin.js` | 42 | 2,484 | Declarative Settings only; actions in `actions.js` (211 lines), protected worker implementation in `.cjs` modules |

### Data flow today

- Every sandbox receives local packaged helper copies through `customization.json` and plugin `panel.json`; those copies are intentional runtime isolation, **not independently authored duplication**. Only `src/integration/herdr/host.js` imports native Herdr. Preserve that facade and package-relative imports.
- Git state is largely mutable fields on `Changes`: `resetRepository()` (`main.js:148–174`) resets facts, association, pages, publication and motion together. `Publication` / `PresentationMemory` already provide bounded runtime return memory (`presentations.js`); `RowPresentations` already memoizes pure row facts. These are useful foundations, not reasons to add another cache.
- Git render (`main.js:1869–1976`) captures topology/settings, then calls controller methods, read admission, notices, safety and row builders. Ordinary render mutates retimed facts and calls `syncAgent`, `loadPulls`, `loadRelatedPull`, webhooks and `agentLinks.refresh`. Coordinator render uses the stricter per-frame provider context added in #104. Both ultimately use the same PR-row implementation.
- Native measurements arrive after layout. Git owns line widths, intrinsic text probes, zoom/request IDs, ordinary/task scroll owners, pin geometry and repository-title widths. Native handles cannot be serialized or cached as UI trees. Existing size-change-only semantics make invalidation/lifetime correctness essential.
- Files keeps Maps/Sets for entries, loaded times, open folders and pending paths on its view (`files/mod/main.js:185–210`). `render():579` calls `sync()` which can schedule a refresh. `directory()` / `directories()` (`:53–120`) contain service operations in the same file as rows.
- Usage separates its collector/cache/preferences in `store.js` but formats/selects windows and mutates summary presentation during rendering (`usage/mod/main.js:64–118`); repeated `settings()` reads occur per progress/value. The summary and dialog share the model but not all geometry plumbing.
- Settings has a single declarative plugin renderer, not separate Crew and Trello widgets (`plugins-ui.js:1–20`). State still lives in dozens of `view.plugin*` fields (`:61–117`), alongside native input/focus entities. `main.js:995–1147` composes navigation, host/page selection, scroll identity and editor footer. Crew/Trello declarations use registry operations; their private workers must stay outside generic UI.
- Spaces already refreshes via its existing 250ms lifecycle (`spaces/main.js:94`); its render still reconciles colours, rename, drag and full projection (`:618–645`). Agents builds grouping/ranks/order and repeated row lookups during render (`agents/main.js:300–454`). Do not add a second topology poller.
- Persistent choices are intentionally separate: typed plugin settings in `shared('custom.plugins')`, Git disclosure/view in localStorage, sidebar hold in sessionStorage, private portable preferences through allowlisted snapshots. PR data, queued jobs, credentials, geometry, worker identity proof and native handles are not preferences.

## 2. Structural problems, with evidence

### A. Render is a controller turn

`main.js:1900–1950` does far more than construct elements. Inline-spawn behaviour means merely calling a scheduling helper can begin work during render unless explicitly yielded. `AgentLinks.refresh` already yields before IO (`agent-links.js:142`); other paths have different guards. Centralizing a “no read dispatch / no mutation publication / no notify during render” contract is safer than remembering which method yields.

The ordinary feedback helpers (`main.js:1354–1395`) repeatedly call unframed `location()`, `associationError()`, `repositoryPresentation()` and `pullSelection()`. `location.js:24–53` walks spaces/panes/terminals and resolves focused cwd. `cachedRepository()` / `cachedAssociation()` (`agent-links.js:82–94`) also enumerate live targets rather than accept already prepared presentation identity. The row path's `stageDescriptor():924–925` correctly uses `location(this.agentPresentation)`, but surrounding controller/feedback work does not. Fixing only the row would miss the majority.

The measured nine-row completed frames have exactly 34/33/33 space/pane/terminal reads, 32 focused reads, 3 settings reads, 3 selection projections, 6 association-error evaluations and 18 line builds. Profiled 130% means: feedback ~4.24ms inclusive, row construction ~6.29ms inclusive, space-provider calls ~5.90ms inclusive. These categories overlap; **do not add them**. They locate work, not an exclusive flame graph.

### B. Selection and repository lifetime are entangled

`folderKey` (`main.js:40`) is `[cwd,on]`, while agent selection keys the whole location object. Same canonical repository is not the same folder key. On a different worktree/folder, `refresh():206–234` calls `resetRepository()` unless valid click motion retains it or an exact canonical cache restores it. The next root/identity/page reads can leave no last-good active publication if the mapping is absent or invalidated.

Even **identical cwd/machine** need not reset any PR facts to flash Loading. `syncAgent():289–329` clears `agentResolved` for a new selection and starts a footer read; `associationPending():1363–1372` becomes true; `renderPulls():1394` returns `git-association-pending` **before drawing the existing list**. A deterministic reproduction at both zooms retains the very same nine-row array, dispatches **zero execs and one `hc read`**, yet renders Loading until the held footer replies (`navigation-repro.json`). This distinguishes list masking from list reloading.

Pointer motion can temporarily hide the defect: `beginAgentMotion():893–914` and `PinSwap.start():22–36` require current bounds, recent press, matching selection and geometry. Keyboard activation clears the press (`main.js:971`), unmeasured/stale geometry refuses motion, and the three-second wait is bounded. **List retention must not depend on an animation being armed.** Preserve immediate navigation, the existing animation/cancellation policy, and atomically commit the final association; keep the previous coherent published layout during same-repository resolution, not an intermediate unpinned destination.

### C. Deduplication is not an execution budget

`AgentLinks.refresh():136–174` spawns one task for every due agent. Ordinary render passes no membership filter (`main.js:1944`). Each `crewPr` target separately calls `repository()` before the shared-folder branch (`agent-links.js:145–152`); it therefore misses the later `folders` Map's coalescing. `repository():63–77` starts a direct `git config` per call, then canonical `gh repo view` when the fingerprint cache misses. `GitReads.read():79–112` serializes only a known repository scope; these canonical lookups have no repository yet, so receive unique IDs and no per-repository tail. Config commands bypass `GitReads` completely.

Counts below execute the real AgentLinks/pulls code with synthetic transport. “Peak” is simultaneous admitted exec invocations, not actual spawned OS children; a real Core refuses excess invocations. No real GitHub/agent calls were made.

| One due discovery sweep | 20 agents: exec / hc / peak exec | 40 agents: exec / hc / peak exec |
| --- | --- | --- |
| Role-labelled, all same folder, cold fingerprint | **40 / 0 / 20** | **80 / 0 / 40** |
| Unlabelled Claude/A1, all same folder | **2 / 20 / 1** | **2 / 40 / 1** |
| Unlabelled Claude/A1, distinct worktrees | **40 / 20 / 20** | **80 / 40 / 40** |

A **single navigation** has no one universal exec count. Warm same-folder known-role selection can require zero; unknown Claude association adds one `hc read`, not automatically a page reload. If discovery TTLs are due, that navigation's render also admits the sweep above. A new unmapped worktree additionally requires two root/branch execs, one canonical repository exec and the selected page request, plus optional detail/older-PR/notice reads. These are shared conditions, not twenty operations caused by each PR row.

A **single manual Refresh** (`main.js:1959–1968`) invalidates all AgentLinks fingerprint/entry caches, runs two root/branch execs and one selected page exec in the simple successful Open case. It can add one selected footer `hc read`. A page needing check details adds a detail batch (up to 20 PRs); compatibility totals can add one count read; older linked PRs and setup/enrollment/account diagnosis add their existing conditional reads. Thus with twenty due role-labelled agents the controlled minimum is **43 exec calls** (40 discovery + 2 root + 1 page), with **at least 20 offered concurrently** in the config wave; forty agents make **83**. A normal no-candidate simple warm refresh is three execs, not 43. Counts are for command invocations; the `node` GitHub wrapper's child `gh` is not a second host exec slot. `hc read` is reported separately because the public facade exposes it separately, not asserted to consume a Core exec slot.

Core 0.1.22 hardcodes `MAX_RUNNING=16`, acquired before process spawn (documented with upstream source in `docs/PLUGIN-UI.md`, Settings execution capacity). One 20-agent wave is enough to exceed it; Files, Spaces, Usage, Settings and unrelated clients can already occupy slots. `settings-requests.js:1–62` has a good exact pre-start-refusal classifier and 2-group/4-command admission, but explicitly only for Settings. Aggregate's three-repository pump is likewise not a global budget. GitHub rate limits and native execution saturation are **different**; do not turn `16 execs` into a 15-minute GitHub cooldown.

### D. Geometry and native builders amplify unrelated work

`main.js:1107–1184` creates native available/natural-width probes, keyed text caches and changed-only callbacks; `:1320–1351` and `:1450–1465` manage native scrolling; repository headers have another measurement lifetime (`:1590–1620`); stage sizing has panel-level probes (`:985–1004`). Usage progress/summary widths (`usage/mod/main.js:64–95,139–145`) and Settings collapsible body measurement (`settings-kit.js:143–151`, `ui.js:420–445`) use related but not identical lifetime rules.

Measurements are necessary for the exact overflow/zoom/animation contract. Do not replace them with character estimates, extra per-row probes, observers or a frame loop. Extract a bounded, generation-checked geometry owner that lives as long as each native element ID. Keep measurements out of domain snapshots and notify only from accepted changed post-layout facts. Remove redundant controller work before considering fewer native elements; frozen row/probe budgets already protect rendering fidelity.

### E. Shared primitives exist; repeated compositions still drift

- Files header (`files/mod/main.js:582–596`) and ordinary Git (`git/mod/main.js:1951–1969`) repeat the same border/surface/section/hover/tools composition; coordinator Git has another header (`:1805–1818`). Their domain title slots and action admission differ. Extract the shell, not a universal header that silently drops a slot or changes padding.
- Generic `panelMessage()` exists (`panel-kit.js:28–34`); Settings also has `workingStatus()` and `loadingStatus()` (`settings-kit.js:51–60`), while Git owns special cold/warm feedback and header-aligned body messages (`main.js:1375–1390`). Share foundational parts, preserve semantic variants.
- Spaces/Agents already share `sidebarScroll`, passive fades, numeric/disclosure rails and reorder helpers. Git uses the same metrics/fades but duplicates native-handle/anchor/measurement composition for ordinary and task lists. Files uses its own plain scrollbar tree (`files/mod/main.js:597`); Usage/Settings use dialog scroll rails. These are not all interchangeable lists.
- Settings `actionButton()` / `actionTrigger()` repeat size/disabled/style rules (`settings-kit.js:73–84`), and Usage defines 80×24 reset-button geometry locally (`usage/mod/main.js:18`). Use existing tokens/compositions where exact, not copied constants. Special stage/robot/pin controls have deliberately different semantics.
- Tooltip policy is spread across Files unconditional filename hover (`:562`), Git full titles plus fit-driven lower lines (`:1142–1184,1258`), and Usage/Settings HoverCard/Popup (`usage/mod/main.js:82–83`, `settings-kit.js:22–39`). Sharing a tooltip helper without retaining fit/focus/delay policy is a behaviour change.

### F. Test fixtures mirror private structure

`tests/git-scroll-anchor.test.mjs:8`, `git-scroll-fades.test.mjs:15`, `git-native-scroll.test.mjs:15`, `git-measurement-lifecycle.test.mjs:67` construct aggregate objects by hand. #104's review-2 report records five suites failing on `aggregate.frameContext is not a function`; fixing doubles restored tests but did not improve ordinary-path coverage. `tests/support/git-row.mjs:1–64` is a useful shared actual-renderer harness, but defaults stub AgentLinks/aggregate/location. Component budgets there cannot see repeated real selection/provider work.

Keep existing geometry and interaction oracles unchanged. Add controller-level integration harnesses with real location/provider/admission and fake only the host/transport. Later migrate handwritten doubles to a versioned snapshot adapter with reusable contract tests; do not rewrite assertions to match a new architecture or relax frozen baselines.

## 3. Native reproduction and profile

### Method and limits

External proof root: `C:/Users/tprokopiev/.crew/tasks/ui-arch-review`. `make-ordinary.mjs` derives a disposable driver from shipping `tests/features/git-refresh-native.mjs`; `ordinary-native.mjs` mounts production Changes, AgentLinks, location, row, publication and provider code. Crew is disabled so this is **ordinary mode**, selected local Claude Code, one repository, five synthetic spaces over local/pc2, agent population growing from four to 20/40 while open. Native layout and elements are real; topology and command results are synthetic, no real terminals/accounts/network. A sibling repaints every 33ms. Forty controller ticks run at 100ms; root refresh occurs every five ticks. No infinite loop, watchdog override, banner suppression or production edit.

Final `contexts-v2` data includes task counts, **13/13 checks**, managed Build/Review and known agent targets. Fifteen rows are deliberately all returned/mounted to measure expanded-page render cost; this is not a claim that production first-page pagination requests fifteen rows. Selected known PR 1 is pinned, with other rows under the repository header. Frozen source hashes, executable/archive hashes, logs, timestamps, screenshots and shutdown receipts accompany every run. Construction is `Date.now()` at 1ms resolution around the complete JS/native-tree build, **not subsequent layout/paint or live-input latency**.

### Final rich ordinary matrix

| Rows / total agents | Zoom | Profile | Complete frames | p50 / p95 / max ms | Nominal margin to 50ms | Incomplete marker |
| --- | --- | --- | ---: | --- | ---: | ---: |
| 9 / 20 | 100% | counters/timing | 46 | 16 / 20 / 26 | 24ms | 0 |
| 9 / 20 | 130% | counters/timing | 46 | 16 / 32 / 45 | 5ms | **1** |
| 15 / 40 | 100% | no method instrumentation | 48 | 24 / 30 / 38 | 12ms | **1** |
| 15 / 40 | 130% | no method instrumentation | 46 | 22 / 29 / 32 | 18ms | 0 |

Receipts respectively: `gr-hKj81N`, `gr-GFXODU`, `gr-lEcseu`, `gr-1USfoV`. A completed frame's max excludes interrupted frames; positive nominal margin **does not disprove** an interruption. These are observed failures, not a threshold-only inference. At nine rows the interruption occurred with method instrumentation; no claim that this alone reproduces the person's exact uninstrumented live nine-row case. A screenshot requested after the marker can already show the once-only recovery; the final rich nine-row screenshot does show the expected tasks/checks/stages, but did not catch the transient banner.

Earlier controls on the same source (tasks/stages, no visible checks) repeated nine-row/20-agent 100% three times at maxima 38/26/49ms without interruption; 130% reached 46ms without interruption. Fifteen-row/40-agent profiled 100% runs recorded 8/3/2 incomplete markers at complete-frame maxima 57/55/53ms. **`gr-Gzyd2d/interruption-1.png` visibly captures the actual Herdr last-version/interrupted banner.** Uninstrumented 15-row controls reached max 43ms/50ms at 100/130%; the latter had one incomplete marker (`gr-AROQJA`). Earlier fixtures labelled `richChecks:true` mistakenly supplied a flat rollup overwritten by page normalization; their pictures lacked checks. They are retained as controls, not accepted as rich-check proof. `contexts-v2` corrects that envelope.

The complete record is `summary.json` plus all per-run receipts/logs, not just successful runs. One outer-command timeout interrupted `gr-q3WBhM` before receipt; it is excluded. `cleanup.json` confirms its socket is gone and isolated Core is not running. Other concurrent disposable testing on this desktop was observed during the early exploratory matrix; timings are workstation measurements, not isolated hardware benchmarks or exclusive attribution to one helper. Repeat controlled before/after on implementation day; do not claim a universal latency guarantee from these numbers.

### Why can render exceed the native deadline?

The host must synchronously accept a complete native tree from QuickJS. Nine rows do not bound total work: live topology/provider/association projections and controller scheduling happen first, then visible and intrinsic-probe builders cross the native bridge. Topology grows independently of PR count. Bounded row count plus bounded per-row nodes is therefore insufficient when the rest of the frame repeatedly enumerates every agent/space or rebinds a provider. Native interruption bypasses JS catch/finally (`main.js:1869–1899`); a row marker identifies where execution stopped, not the sole cost centre. The host keeps the last successful tree and displays the real failure banner. The existing 64ms once-only retry can recover but cannot supply missing headroom.

Review-2 of #104 independently found 2,300 completed coordinator samples, no interruptions, but eight runs over the 35ms margin and one **completed 54ms** sample. That is historical timing evidence, not a native abort. Elapsed construction measurement and native watchdog observations are distinct; never equate max ≥50ms with a caught abort or max <50ms with proof of safety.

## 4. Target architecture

```text
native events / current lifecycle / explicit commands
          ↓
transport admission + repository/agent/provider services
          ↓  fresh captured identity, cancellation, generation checks
normalized immutable facts → pure indexed selectors
          ↓
atomic committed UI snapshot + same-scope last-good snapshot
          ↓
small render(snapshot, theme, geometry) → existing shared kit → native tree
          ↑                                 ↓
post-layout geometry updates           typed action intent
                                            ↓
                                 fresh action-time verification
```

### Ownership and invariants

- **Data/service layer:** canonical machine/repository/credential route, pages/cursors, PR facts, agent topology/role index, footer association, verification and read diagnostics. Controllers receive results and publish once; render never reads providers, starts transport, sorts full inventories, writes storage, logs synchronously or notifies. Keep the existing lifecycle/cadence; do not add a daemon/poller.
- **Publication layer:** versioned immutable value containing selected-tab rows, counts/uncertainty, scoped errors, pin identity, headers/folds, current work state and existing notice presentation. Reuse current bounded memory (four contexts/4096 rows/256 mappings) rather than create an unbounded cache. Repository inventory lifetime is not selection lifetime. A same-qualified-repository association update retains the previous coherent list/pin layout until the destination is resolved; then publishes one final layout. Unknown repository/machine/routing cannot borrow content. An authoritative absence or incompatible identity can retire it.
- **Render layer:** pure cheap tree construction from snapshot and read-only geometry. Preserve IDs, row/probe counts, tree order and event hit targets on the first extraction. Build fresh callbacks/elements per frame; cache only immutable facts/style/layout decisions. No cached native element trees. Top-level one-time host theme/zoom/scroll-handle geometry adapters are allowed; **zero per-row provider/native identity calls**.
- **Geometry layer:** bounded per-native-ID/activation/zoom/style/text records, separate from domain facts, with post-layout changed-only acceptance. Preserve pin/scroll handle lifetime, old-callback rejection and the host's missing scrollbar-notification limitations. A render may sample the real handle without causing work; no viewport spacers, guessed widths, new intrinsic probes or JS animation loop.
- **Action layer:** callbacks carry stable intent IDs, not authority-bearing cached target objects. On activation re-resolve live machine/terminal/PR/role, membership, verdict, enable generation and current route. Recheck after every asynchronous yield before dispatch/publication. Stale/offline/ended targets stay inert with exactly existing accessible semantics. Remembered rows never authorize focus, reads, private writes or a replacement coordinator.

### One read budget, not independent local queues

Stage one establishes **at most four active customization Git read transports total**, also at most four on any one Core, with at most one ordered mutable GitHub read per qualified repository. Root/branch, config/canonical discovery, page/detail/target, footer and setup/enrollment reads all acquire admission. Deduplicate canonical discovery by machine + normalized cwd + effective routing fingerprint and generation; coalesce in-flight identical reads and share benign facts, never current-consumer authority. Batch topology resolution once per publication, not per row.

Use one mounted owner with ephemeral cross-mod request/lease coordination so duplicate Git mounts do not each admit four. No promises/callbacks/PR inventories in persisted `shared.json`; bounded runtime channels and ownership tokens retire with the session. Queue capacity: 256 distinct pending requests; superseded same-key demand coalesces or is retired, not accumulated forever. Selection/explicit refresh take priority over background discovery with starvation protection; hiding/disabling retires unsubmitted work and prevents follow-ups. A completed/cancelled native Task releases an abandoned ticket; do not release a running process slot solely because an arbitrary JS timer expired. Lease recovery must distinguish no-owner/no-process from uncertain in-flight work.

At later stages other customization readers migrate to that **same four-slot service**, not additional budgets. Stage one does not claim it can reserve the host's remaining twelve slots against unmigrated panels or external clients. A strict native pre-start capacity refusal waits/rejoins with bounded read-only backoff and retains shown data; a thrown failure/timeout/unknown submission never auto-replays an action. Preserve GitHub rate cooldowns separately. Existing failure text and diagnostics remain; failure alone never replaces a same-repository last-good list with an error-only screen. No new status message or queue UI.

### Explicit budgets

- Warm unchanged frame: target median ≤10ms; small ordinary/coordinator 9–15-row p95 **≤20ms**; all complete-controller matrix samples **≤35ms**, leaving a nominal 15ms below the unchanged 50ms watchdog. Cold/invalidation frames also must meet 35ms; no excluding the expensive frame because it is cold.
- Existing 60-PR/100-item coordinator cap and incremental reveal remain. Larger capped batches target p95 ≤25ms and max ≤35ms; the historical below-20ms-at-100-mounted target was not met and is not newly claimed here. Ordinary expanded pages cannot be silently capped or virtualized to satisfy a budget.
- No per-row native identity/provider lookup, IO dispatch, storage write or render-time notification. One prepared topology/selection/provider projection per controller publication; render-time row count does not multiply it. Existing frozen element/operation/probe limits must pass unchanged.
- Queue ≤4 active, ≤256 pending with dedup/retirement. Nominal call reduction target for a warm same-repository known association: **zero page/root reload solely due to agent selection**; a due footer may read once, a due background check retains its existing cadence. One config/canonical lookup per due qualified folder, not per role-labelled agent.
- Preserve existing watchdog, component markers, caught-row diagnostics, last-good native fallback and bounded retry. Failure/margin tests fail honestly, never widen thresholds or suppress warnings.

## 5. Visible differences requiring the person's decision

No convergence is chosen here. Default migration keeps **all existing variants**. If a single standardized appearance is desired, the person must decide each row below in a separate design change; shared code need not mean identical styling.

| Surface | Existing visible/behavioural difference | Decision if convergence is requested |
| --- | --- | --- |
| Refresh | Files spins only for manual refresh; Git stays static with its under-header activity; Usage rotates only the initiating icon and blocks all collector refreshes; Settings has section-scoped minimum feedback. | Which per-surface feedback to retain; current plan retains all. |
| Loading/error | Git cold blue dot and warm line, 28px header-position messages; Files compact text/bulb at tree origin; Settings Checking in a fixed 72px status rail; centered `emptyState` elsewhere. | Height/anchor/colour/wording cannot be chosen by a generic helper. Keep separate variants. |
| Headers | Files includes folder/full-path hover and optional back; Git intentionally has no repository in its main header; Usage is a dialog with host/account/settings tools, not the sidebar header. | No removal/relocation of slots/tools as a side effect of reuse. |
| Rows and trailing controls | PRs are 74px with three lines/3px trailing inset, managed stages and separate verdicts; Files is a depth-indented tree; Spaces uses badge/branch/tag rails; Agents has age/status rails. | Share geometry primitives only; no universal row height, right rail or icon reservation. |
| Scroll surfaces | Git/Spaces/Agents passive 40px fades; Files native tree scrollbar; Settings/Usage inset dialog rail. Git batches mounted coordinator rows but ordinary pages use cursors. | Do not add fades/batching to Files or virtualization to Git without a separate request. |
| Tooltips | Files always shows full filename; Git titles always hover but lower lines only when informative and stages never hover; Usage HoverCard uses 400/100ms timing; Settings description hint also opens on keyboard focus. | Content, delay, focus and parent-tooltip inheritance are separate policies, not one default. |
| Buttons/tabs | Sidebar targets 24px, general controls 28px, Settings action 80×24 and picker footer 26px; stage/verdict 18px high; light category tabs differ from bordered segmented settings choices. | Do not silently replace one with another or change keyboard/disabled treatment. |
| Disclosure | Repository global default/exceptions are restart-local, Spaces parent folds and Agents group folds have different identities and selection disclosure behaviour. | Reuse disclosure elements, not one persistence/action model. |

## 6. Proof required per implementation PR

Before each stage, take the merged-prerequisite head as the byte/geometry/pixel baseline and record source/executable hashes. Existing geometry and interaction suites pass **unchanged**, including `git-row-render-budget`, `git-stage-box-geometry`, `git-right-edge`, `git-stage-chips`, entry/motion, native-scroll/anchor/fades/measurement-lifetime and render-recovery. Tests relevant to later stages stay local to those stages; no full local suite.

Native Git regression matrix, both **100% and 130%**, at least **three serial repetitions per cell**, no method timing instrumentation in acceptance runs (separate profiling run):

- Ordinary single repository: 9/15 loaded rich rows; 20/40 agents across five spaces/two machines; selected Claude Code and A1, known label and held/failed/absent footer; mixed Build/Review/Approved/verdict/robot, checks/tasks and long labels.
- Same-folder and different-worktree navigation: stage pointer, stage Enter/Space, robot, tab/sidebar/keyboard; with/without an existing PR pin, cold geometry, repeated clicks, reverse/no-PR switch; header hold pressed/unpressed. The shown same-repository list must never become cold Loading/error-only. Coherent final association and existing 320ms motion remain exact.
- Coordinator: 4→14 worker growth while open, 20/40 and existing 120-unrelated stress, live/history/multiple repositories, cold partial/failure and warm return. Continue 30/60 mounted-budget and 100/200-inventory cap controls. Full production location/provider code, no stand-in returning a constant location.
- Refresh overlap: root/page/target/footer held independently; manual, periodic, webhook and checks; obsolete replies, alias races, read refusal with 16 occupied fake slots, disconnected/reconnected remote, hide/disable/generation rollover and duplicate mod mounts. Count started/queued/deduped/peak transports and prove fresh dispatch/publication/action revocation after yields. Never create sixteen real live jobs to test refusal.
- Native geometry: unchanged PR/header/tooltip edges at widths 280/320/360/390/480, warm/cold measurement, zoom change and unchanged-size re-entry, scroll thumb/track/wheel/keyboard, folds, reveal, anchors and ghost overlays. Native before/after captures show hover, keyboard focus and motion phases, not only rest frames. Controller-driven pictures do not prove pointer hit-testing; include native input against the disposable window where applicable.

Report all samples, p50/p95/max, abort counts, nominal `50-max` margin and failure cells; include cold/growth/loaded subsets and **actual mounted counts**. Separate builder, selector/controller, queue and later layout/paint measurements. Inspect screenshots **and** native logs; `status.errors` alone misses last-frame banners. Stop every owned App/Core/server before handoff. Baseline failures remain failures, not evidence that a relaxed target is acceptable. No before/after refactor result is claimed by this plan.

## 7. Work performed for this review

- Read the supplied ordinary-view and navigation screenshots and #104 implementation/review reports, the current architecture/development/plugin/testing contracts and relevant OpenSpec requirements.
- Eight targeted existing suites passed: `pr-agent-links`, `git-agent-entry-layout`, `git-entry-cache`, `git-refresh-frame`, `git-row-render-budget`, `git-stage-box-geometry`, `settings-request-queue`, `plugin-ui-contract`, each via `node --experimental-vm-modules tests/<name>.test.mjs`.
- External `navigation-repro.mjs` passed its same-folder list-masking assertions at both zooms. External `read-count-driver.mjs` measured the six discovery cells above against actual AgentLinks/pulls modules. No repository test was weakened or edited.
- Disposable native experiments and their intentionally failing 35ms/abort gates are described above. All completed receipts confirm App/Core shutdown; the timed-out exploratory driver has separate no-window/no-Core cleanup evidence. No live desktop, terminal, agent, account, credential, deployment, binary or Core document was changed.
- Scope limitations: no direct profile of the person's installed process or network saturation; no proof of one unique historical cause; no full cross-panel native performance census; no implementation parity claim. Static evidence outside Git identifies coupling/reuse candidates, not measured bottlenecks in every other panel.
