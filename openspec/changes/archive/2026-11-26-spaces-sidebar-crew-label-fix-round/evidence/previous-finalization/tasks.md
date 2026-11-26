# Tasks

## 1. Coordinator Git loading and render recovery

- [x] 1.1 Compare current main and PR #90 head d965828 using sanitized fixtures matching both captured real Crew payload shapes; trace parsing, native binding, aggregate publication and stage/agent paths, record the exact fault and whether #90 fixes, preserves or changes it, then base Git edits on main after #90 merges.
- [x] 1.2 Fix only the demonstrated failure and add a baseline-failing regression covering healthy local/pc2 coordinator publication, missing/ended/disconnected agents, legacy/emoji labels and applicable history; run only the regression and directly affected fleet/Git tests and preserve identity/freshness gates.
- [x] 1.3 Establish whether the earlier interrupted-render banner is the same failure; use a disposable native reproduction if required, preserve actual diagnostic evidence and state any unproven link explicitly. Record the cause and relevant test results in testing guidance without committing private status payloads.
- [x] 1.4 Push the recovery fix as its own first implementation commit, tick this outcome and report immediately with the exact commit and PR for review before starting the visual outcomes; stop any app/Core/server started for proof before that report.

## 2. One clickable lower-right Git stage label

- [x] 2.1 Use existing emoji label-pill styling for one canonical Build, Review or Approved control, deduplicating managed aliases without mutating remote labels; remove the title-stage chip and 80px reservation and retain only the live unlabelled-agent robot fallback, checked by the stage/pill geometry matrix.
- [x] 2.2 Move guarded role-aware focus and existing pin-motion wiring to the visible pill while keeping unavailable targets dimmed/inert with truthful hover, Approved opening the PR, and probes/ghosts inert; update stage-action, missing-target and navigation-motion tests and run only those touched regressions.
- [x] 2.3 Update README/testing guidance for canonical stage labels and hover-only review history; capture disposable before/after ordinary/coordinator rows at default/narrow widths, inspect label/title/74px row geometry and cleanup receipts, and document exact PR #90 overlap.

## 3. Selected PR inside its repository section

- [x] 3.1 Place the selected worker PR, including Draft, directly below its repository header with count and chevron preserved; verify ordinary and coordinator return trees without a permanent coordinator pin.
- [x] 3.2 Update the existing click-motion destination geometry for the section header and cover default/narrow widths and 100%/130% zoom; run entry and agent-action regressions proving one focus and no settlement jump.
- [x] 3.3 Document section-contained selected pins and capture disposable worker/coordinator before-and-after states, checking header ordering, row height and cleanup receipts.

## 4. Bounded render and entry recovery

- [x] 4.1 Isolate malformed per-task PR discovery facts without relaxing owner/native identity, and recover definitively abandoned root/page task latches once; verify healthy siblings and independent worker reads for absent, empty and unverified seeds.
- [x] 4.2 Preserve actual diagnostics while isolating caught row errors in a fixed-height fallback and scheduling one deferred retry for an incomplete native frame; cover row removal during build and waiting/moving pin motion without render-time notify or repeated focus.
- [x] 4.3 Reproduce a real native watchdog interruption after published-row removal in a disposable instance and capture stale/recovered frames, documenting the 50ms host source boundary, bounded retry, actual error receipts and whether the historical trigger was established.

## 5. Stable Spaces metadata and action columns

- [x] 5.1 Keep coordinator Crew fixed and child counts visible across disclosure, using shared Spaces inner/outer geometry for count, machine plus, rename approve, chevrons and cancel; verify centre equality and unchanged fold/selection/reorder in the actual-renderer geometry fixture.
- [x] 5.2 Extend `tests/spaces-worktree-layout.test.mjs` for local/pc2, expanded/collapsed, one/several and multi-digit child counts, no Crew/no children, all rename kinds, long names, default/narrow widths and 100%/130% zoom; run this targeted test and keep Agents/Git numeric defaults unchanged.
- [x] 5.3 Update applicable README/testing guidance for persistent counts and shared columns; extend disposable sidebar proof for baseline/changed normal and rename states at default/narrow widths, inspect before/after captures and cleanup receipts outside the checkout.

## 6. Shared tab and sidebar inline rename presentation

- [x] 6.1 Extract shared field/action styling and spacing from the sidebar into reusable UI helpers/tokens and use them in Tabs and Spaces without changing controllers; verify packaged render trees use identical button/icon sizes, gaps, vertical centring, hover and focus treatment.
- [x] 6.2 Add focused shared-presentation regressions for default/narrow layout, unchanged row height and bounded tab expansion; run them with `tests/rename-selection.test.mjs` and the touched Spaces geometry test to preserve captured targets, selection, submit, cancel and blur behavior.
- [x] 6.3 Update rename/testing documentation and narrowly extend disposable native proof for tab and sidebar editors, normal-to-edit sizing and hover/focus at both widths; inspect baseline/changed captures and zero native errors, with every started app/Core/server stopped before the report.

## Workflow follow-up

- The original plan and the added section-pin/recovery scope are approved in the task conversation; the person confirmed all work remains in PR 94, with no split.
- The urgent recovery checkpoint was pushed first. The person's latest instruction supersedes further local validation: push all remaining implementation now, run no further local tests or harness work, and let CI/review identify fixes. Report immediately without waiting for CI, marking ready or merging.
- Store proof pictures, receipts, PR-body scratch and the complete report under `C:/Users/tprokopiev/.crew/tasks/spaces-sidebar-crew-label` as expressly allowed by the task.
