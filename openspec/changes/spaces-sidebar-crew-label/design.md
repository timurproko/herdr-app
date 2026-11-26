# Design

## Context

See proposal.md for motivation. All supplied screenshots were inspected, including tab rename, sidebar rename/check alignment, Git's interrupted-render banner and the current coordinator Loading/zero totals.

Collision inspection found open PRs #89 (Trello), #90 (Git cached entry) and #91 (global worker-space settings plan). Recent branch `fix/sidebar-alignment` became merged PR #93; its Spaces/UI bytes match our base `19ebb1f`. Build on that code, not the old topic branch. PR #91 currently contains only planning artifacts; avoid its Crew/settings scope. PR #90 has no Spaces renderer changes, but its Git changes now overlap the added urgent Git scope. At inspected head `d965828`, its main.js hunks touch base lines 657–770 (agent-motion/stage context guards), beside this task's `stageChip` at 751–795; it also changes aggregate lifecycle and agent-link resolution. Base row-label markup at 872–1025 is outside its direct hunks. Recheck remote changes before implementation and report actual overlap, not just this planning-time map.

`Spaces.row()` currently gates the count on `!open` and adds a Crew margin while open. `sidebarNumericSlot()` is shared with Agents/Git and is right-aligned, while rename uses two 24px `iconButton()` controls with a 2px gap. Machine actions have their own gap/margin. Tabs and Spaces already call the same icon-button primitive, but separately construct fields/action groups and tab width arithmetic. Agents has no inline rename implementation; do not reintroduce one.

The current workspace spec deliberately requires collapsed-only counts and moving Crew. This is a spec change, not merely repairing an implementation that violates its contract. Approval must precede implementation.

## Goals / Non-Goals

**Goals:** Preserve the collapsed reference's name/Crew ordering while stabilizing it across disclosure; centre all three inner-column occupants and all outer-column occupants; make rename presentation shared without merging its independent controllers.

**Non-Goals:** No worker-space settings, native shortcuts, space reordering, terminal ownership, agent naming, compact membership, live deployment or native binaries. Do not change Agents/Git's numeric geometry just to align Spaces. Git changes stay limited to the reproduced loading/render fault and managed-stage row presentation, not PR #90's cached-entry redesign.

## Decisions

### Urgent coordinator Loading/render correction first

Read-only `crew status --json --view fleet` and `crew status --json --discover-prs` both succeeded on this machine. Private raw captures stay outside the checkout. The fleet shape has home, owner, view, tasks and prDiscovery; owner has live/terminal; tasks have id/state/terminal/pr/prDiscovery and no project. Discovery version is 1, with known/recorded, none and unavailable/not-requested task results. The full shape additionally has task project and workflow fields and owner mine. Those shape differences were inputs to investigation, not the cause. Implementation reproduced the failure on both pre-#90 main and #90: `incompleteMembership` rejects the entire home while even one reported task's terminal is finished or gone. Live diagnostics showed that exact reason for both homes; sanitized fleet/full regressions and before/after native captures confirm it. Completed nonlive reports now enter the same owner/status-attested read-only history path as closed records. Working-task mismatch and live-reported native-membership guards remain. The earlier native banner did not reproduce and no common cause for it is claimed.

Before visual edits, compare base `19ebb1f` and PR #90 head `d965828` with sanitized real-shape status fixtures and synthetic native membership, labels, machines and PR reads. State whether #90 fixes the failure, leaves it unchanged or changes its cause. The maintainer intends to merge #90 first; base Git implementation on main after that verified merge, without editing the other task's worktree or borrowing its authority. If #90 already fixes Loading, report that evidence rather than duplicating the fix; separately address any reproducible render fault. Trace Crew `recordedSource` through verified context, aggregate admission/pump, publication and stage target resolution. Exercise managed and previous/emoji labels, missing/ended/disconnected agents and coordinator/history rows. Keep native incomplete-render evidence distinct from caught JS errors; do not catch-and-hide the failure, invent empty success or weaken identity gates. Use the existing native component markers and disposable app if a native interruption is needed to establish cause.

Fix only the demonstrated failure path, add the regression that fails on the baseline and passes on the fix, document exact cause and whether the earlier banner is related or still unproven, then push that outcome as its own commit and report immediately before layout work. No full suite, waiting for CI or live app mutation. The delivery plan approval is a prerequisite to that first implementation push.

### One lower-right stage label control

Retain managed-role aliases from `pulls.js` and existing role matching/availability checks. Use the existing `labelPill` and palette-dependent label-colour renderer for one canonical emoji pill: Build, Review or Approved, even for assigned Rework/Under review aliases. Preserve raw assigned names for informative hover, do not rename remote labels, and keep unrelated label names/order. Collapse multiple managed aliases to the one existing deterministic stage precedence. Ensure the stage survives the bounded coordinator strip rather than being dropped when it is beyond the first three labels.

Move existing guarded focus and `beginAgentMotion` wiring onto that visible bottom-right pill; never attach action handlers to invisible measurement probes or motion ghosts. Approved follows the PR action. Unavailable Build/Review swallows row navigation and remains dimmed with its known explanation. Retain round/finding facts in informative hover, with only the three canonical stage names visible. Remove the top stage chip and its 80px reservation; reserve the existing 24px robot target only for the no-managed-label live-agent fallback. Keep three lines, 74px rows, metadata anchor and no extra reads.

Update stage parsing/presentation/action tests, native label geometry and pin-motion source-coordinate guards for the lower control. Reuse the existing navigation controller rather than implementing another animator. Limit main.js hunks to stage/label/row presentation and any proven fault path; avoid unrelated publication changes from PR #90.

### One Spaces action-column geometry, not individual offsets

Use the existing sidebar rename pair as the geometric baseline: 24px targets separated by 2px, with Cancel on the existing chevron centre. The inner centre is therefore 26 logical pixels left of the outer centre. Derive shared Spaces column dimensions from tokens, not three independent margin corrections. Count occupies a bounded centred numeric slot in that inner column; plus and approve use the same centred target. Keep status/reconnect content before the fixed pair and preserve disconnected/compact behavior.

Crew stays before the persistent numeric column at the reference collapsed label anchor; toggling changes only chevron orientation and children, not metadata widths. Preserve nonparent/untagged rows rather than reserving invented labels or counts. Multi-digit counts must fit their bounded rail without overlap. Use a Spaces-specific option/helper if necessary rather than changing the default `sidebarNumericSlot()` used by Agents/Git.

Alternative rejected: aligning only painted right edges leaves differently sized plus, count and check glyphs with different centres, contrary to the latest request. Separate hard-coded offsets would allow future drift.

### Share presentation, keep rename ownership local

Extract field shell, action-group spacing and action styling into shared UI helpers/tokens used by Tabs and Spaces. Prefer `src/ui/ui.js`, already packaged into both mods, over a new module/dependency. Use the sidebar's current 24px field/buttons, 14px icons, 4px field/action gap, 2px action gap, existing colours, corners, hover and focus handling as the source of truth. Keep handlers, captured targets, input creation/release, focus ownership and keyboard contexts in their current controllers.

Replace Tabs' duplicated field/action markup and width constants with the shared presentation. Retain its width transition and horizontal scroller; allow only required field/action expansion, with unchanged row height. Sidebar Cancel stays on the outer column, and approve on the shared inner column for parent, child and ordinary edits.

Alternative rejected: merely copying the sidebar's numbers into Tabs still permits drift. A new universal rename controller would unnecessarily risk target/focus behavior.

### Focused regression and native proof

Update `tests/spaces-worktree-layout.test.mjs` to compare Crew position before/after fold, persistent counts and centre equality across local/pc2 headers and all rename kinds. Cover no Crew, no children, long names, multiple children, default/narrow widths and 100%/130% zoom, retaining existing selection/reorder checks. Add a packaged Tabs/Spaces shared-presentation regression for button/icon dimensions, gaps, centring, hover/focus attributes and bounded tab expansion. Keep `tests/rename-selection.test.mjs` as the captured-input/controller guard.

Extend the existing disposable native fixtures (`sidebar-alignment-native.mjs` and `rename-selection-native.mjs`) narrowly, or add one scoped fixture using their isolation/cleanup pattern. Capture baseline `19ebb1f` and implementation for collapsed/expanded local+pc2 groups, sidebar rename and tab rename at default and narrow widths. Include normal-to-edit tab states and hover/focus. Store all proof, receipts and scratch under the crew task folder outside the checkout. Inspect pixels and receipt errors, stop every started app/Core/server in finally, then report immediately after the final push without waiting for CI. Native controller proof must be labelled as such, not live SSH or OS hit-testing.

## Risks / Trade-offs

- Shared UI defaults could move Agents/Git → keep existing defaults intact and add Spaces-scoped geometry; inspect the relevant shared fixture.
- Narrow widths could squeeze names or clip actions → fixed action pair, shrinkable fields/names and geometry/pixel cases at supported expanded widths.
- Counts with multiple digits could overflow a 24px action column → exercise realistic multi-digit counts; keep a bounded slot centred on the same axis.
- Tab expansion could jump or orphan focus → retain existing transition and controller lifecycle and compare normal/edit dimensions plus input-selection tests.
- Concurrent settings/Git work could evolve → recheck files before implementing; keep this PR limited to Spaces/Tabs visual presentation.

## Migration Plan

No persisted state or data migration. Build customizations only for disposable proof; no live deployment. Roll back by reverting the visual helpers/call sites, not by modifying host state. Documentation/spec finalization follows the approved change; existing folded identities and rename controller state stay unchanged.
