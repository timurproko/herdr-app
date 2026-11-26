# Design

## Context

See proposal.md. Current Spaces renders parent disclosure before tags and uses a 32px child indent plus an in-flow Agents branch. The shared fold control always shows a collapsed count. `workspace-links.js` accepts only one child per parent. Crew currently verifies one `fm-crew-<adoption>` child; its contribution must accept the evolving verified project-space contract without inferring ownership from names. Git currently renders Stale in the header and Loading after the scroller, and restores collected rather than explicitly published facts on return.

## Goals / Non-Goals

Reuse existing visual controls, native animation, read queues, action guards, section/window geometry and lifecycle. Extend connected block membership without moving terminals. No Trello, shared Settings plugin UI, new daemon/polling, native binary modification, real terminal interaction, inventory persistence or new dependencies.

## Decisions

### Approved Git behavior

| Case | Panel presentation |
| --- | --- |
| First visit with nothing known | One standard blue bulb/Loading at the top left directly below Open/Closed. No partial successful headers or rows. Publish eligible sections together once all currently admitted first reads settle; otherwise the ordinary settled empty message. |
| Return to a previously shown coordinator | Previous compatible list immediately, with saved folds, reveal/anchor and last-good counts. NO body Loading. A header activity bulb pulses while verification/reconciliation runs, stops on completion, then the list updates in place. |
| Any background refresh of an on-screen list | Keep the previous list, no body Loading, animate the header activity bulb for the current update. Stage replacements/additions until completion; preserve authoritative removals, history expiry and changed identity guards. Warm-only read failures finish activity and retain last-good rows with scoped actionable notices. |
| One repository fails while others load | Immediately show its applicable repository header/notice, subject to saved folding. Cold mode keeps one top Loading and withholds partial successes; warm mode retains the previous list with header activity only. Once remaining reads settle, publish eligible successes and retain the notice. Unknown failure states keep totals marked loading even after activity ends. |

The return conflict is resolved by the person's explicit approval: retained warm inventory never gets body Loading. “All loaded” means currently admitted task PR links, not unknown future discovery. Facts, confirmed absence and actionable failure settle an initial attempt; quiet refusal/cooldown remains unresolved and retries via the existing deadline. A quiet warm refusal ends the active attempt, retains rows/counts and starts no new error alarm. A later eligible retry animates again. Lost verification grants no reads or worker actions; its pending reconciliation may retain activity until verified/authoritatively disproved, never Stale text.

### Existing header progress indicator

Reuse `activity(t.working)` from `src/ui/ui.js`: the 7px softly pulsing working bulb, using native `.loop('opacity')`, already mounted in `src/features/tabs/main.js` status/header slots. Mount it beside Git's title, outside the hover-only tools, with an accessible Updating pull requests label and existing sanitized verification tooltip where relevant. It is indeterminate activity, not a percentage or new bar. Stop/remove it when the update settles. Keep refresh-button busy treatment and the separate existing CI sweep semantics intact.

### Spaces composition, geometry and multi-child blocks

Move disclosure after all tags on attached parent rows; remove inappropriate final-tag negative margin there, not on ordinary rows. Let Spaces omit fold counts explicitly while Agents keeps its default. Preserve existing hit targets and drag/propagation guards.

All child badges start at the coordinator name's left edge. The shared Agents-style branch stem is parent badge left + 8 logical pixels; draw a continuous line down the child stack, intermediate T branches and one final rounded L, using existing colour/stroke. No text-width guesses or physical-pixel adjustments. One/two/three-child fixtures at 100%/130% must establish continuity and last-child replacement when siblings disappear.

Group validated registry links by exact same-machine parent, deduplicate children and reject ambiguous ownership/cycles/cross-machine links. Preserve native child ordering rather than sorting by display names; numbers remain original native indices. Collapse hides all children, selecting any hidden child discloses its parent, compact rail retains all numbered badges. Keep the coordinator's Crew pill only on the parent and unrelated tags intact.

Reordering generalizes the existing paired operation to parent plus every captured child. Grabbing any member moves the whole block coordinator-first, preserving child order and the grabbed row's chip/name/number. Prevent drops inside another block. Capture complete binding/membership and revalidate before each native acknowledged move; cancellation, membership replacement or concurrent order stops without stale replay. No tab/terminal movement or action freshness is granted.

Crew PR #22 supplies the placement-v1 contract: combined remains `fm-crew-<crew.home>`; per-project uses `fm-crew-<crew.home>-project-<registered-name>`; internal repair uses `fm-crew-<crew.home>-self`. Accept only version `1`, mode `combined|per-project`, matching `crew.space.project`, and per-project `crew.space.name` equal to the project (or `crew` for self repair). Keep `crew.home`, exact `crew.task`, `herdr.space` and native machine/terminal/pane/tab joins. Legacy workers without placement labels remain combined-only. Status task project survives the existing transport projection; no new status version is invented. Registered `crew` repair bindings accept task project `crew:self` only for the documented `crew` name/ID. Display supplied project names on automatic unnamed children, preserving explicit native rename precedence. Keep coordinator/home Git scope independent of child count; durable display stores only identity/placement metadata and unrelated topology remains irrelevant.

### Git publication

Separate collected facts from a bounded pure published snapshot for the exact machine/owner/home/enable generation. Cold partial successes cannot become a return list merely because the user navigated away. Actionable notices bypass admission without leaking sibling successes or inventing PR state. Warm updates retain published rows until replacement is ready; no native elements/callbacks are cached. Filter authoritative removals/expiry and invalidate unrelated contexts immediately. Existing count logic stays independent and cannot present a subset as exact totals.

Use one admitted projection for section/window rendering and safety selection. Preserve ten-item reveal, 60-row/100-item cap, folds and anchors; no viewport virtualization or extra reads. Cold Loading sits outside reveal items above the scroller, never at the bottom. Warm header activity covers active aggregate/fallback/manual/webhook/return reconciliation, not count-loading alone. Quiet deferred recovery uses existing lifecycle/deadlines with no new scheduler or render-time persistence/notifications.

## Validation and screenshots

Focused regressions: Spaces layout, fleet reorder/toggle/identity, coordinator return/deferred repository, read notices, counts, section/window and safety tests. Include one/two/three children, native nonconsecutive numbering, every hidden-child selection, compact membership, drag from every member, membership changes during acknowledged reorder, last-child removal and cross-machine refusal. Git cases include cold partial completion, never-published partial return, warm return/update, staged replacements, mixed/all failures, cooldown expiry without another event and generation invalidation.

Extend the opt-in native fixture pattern in `tests/features/interface-native.mjs`; all inventory/transport is synthetic and unexpected live IO throws. Verify the allowed 0.1.18 archive checksum against release metadata before launching, compare extracted executable bytes and check version. No installation or PATH change. Put all homes, screenshots, logs and scratch under `C:/Users/tprokopiev/.crew/tasks/herdr-ux-polish`.

At both 100% and 130%, inspect:

- Items 1/2: expanded/collapsed one-, two- and three-child blocks, Crew before chevron and no count.
- Item 3: the same three cardinalities with continuous shared stem, intermediate branches, correct last corner and every badge aligned with parent name; selected state of every child, compact membership and drag/cancel/acknowledgement receipts.
- Item 4: retained unverified list, clean header with no Stale anywhere, sanitized diagnostics and no body Loading.
- Item 5: cold empty/partial Loading then full list; warm return and background refresh with header activity but no body Loading; completion, mixed failure and cooldown recovery. Capture two activity phases to inspect animation rather than claiming it from a static frame alone.

State whether evidence is native pixels, controller-driven or real pointer/keyboard. Never claim live SSH/agents from synthetic fixtures. Stop and verify every started disposable app, isolated Core and helper/server in finally cleanup, including failure paths, before reporting. Dispatch CI on exact final head and confirm Windows/Ubuntu pass; skipped draft suites are not proof. Never manually mark ready or merge.

## Risks / Trade-offs

- Quiet cold cooldown hides healthy successes until retry: intentional; retain explicit Refresh and automatic recovery.
- Companion release mismatch: accept only documented placement v1 and legacy combined, test malformed/mixed populations and fail closed without guessed identity.
- Publication staging can mask errors or poison counts: notices bypass staging, totals remain independent, scope generations reject obsolete callbacks.
- More children increase reorder steps: preserve native acknowledgement and concurrent-change refusal, never claim atomicity or replay uncertain operations.
- Shared primitives affect Agents: keep defaults, test actual caller geometry and collapsed counts.

## Migration Plan

Use existing fold/identity stores where compatible; new membership must not silently inherit action authority. No inventory persistence. Guarded build/deployment only into disposable homes for this task; real installation remains separately authorized. Rollback uses the previous source revision, never native-file edits.
