# Design

## Context

See proposal.md for motivation. Inspection confirms:

- `src/features/spaces/main.js` renders parent disclosure before trailing plugin tags; `parentDisclosure()` passes the connected count to the shared `sidebarParentFold()`.
- Child content currently uses `pl(32)` plus the shared branch in normal flex flow. `src/ui/ui.js` owns the Agents rounded branch and disclosure styles; Agents legitimately retains collapsed counts.
- `src/plugins/git/mod/main.js::renderAggregate()` emits `git-task-stale` in the header and appends `git-task-waiting` after the scrolling body, above enrollment. Its selected-tab sections currently expose successful siblings as soon as facts arrive.
- `aggregate.js` already distinguishes missing facts, actionable failures, quiet deferrals, warm rows, incomplete totals and exact-scope return memory. It retains at most four runtime snapshots / 4096 admitted identities. Existing section/window projection owns folds, ten-item reveal, mounted caps, scroll identity and safety-read selection.
- PR #79 protects quiet cooldown retry and truthful totals; PR #84 restores previously visited sections, removes unknown-only headers and shares Agents disclosure/connector primitives.

## Goals / Non-Goals

**Goals:** change only presentation and admission, reusing existing controls, connector and panel Loading. Keep repository reads, retry authority, identity guards, task-history eligibility, native space targets, compact rail and paired reorder intact.

**Non-Goals:** Trello, shared Settings plugin UI, native binary/source changes, real agent interaction, terminal input, changing repository enrollment or auth, new background services/schedulers, inventory persistence, and changing Git PR/header gutter geometry merely because the Spaces Crew pill moves before its chevron.

## Decisions

### 1. The return conflict is an explicit approval decision

A literal interpretation of “only Loading until everything has loaded” on every entry conflicts with PR #84's requirement that compatible last-visit sections are visible immediately. It also recreates the clear-to-loading flash that retained presentation fixed.

**Recommendation for approval:** apply loading-only to cold/not-yet-presented inventory; retain previously shown compatible sections on return and during same-context refresh. Put any Loading above those sections, never underneath. Hold newly introduced successful rows/sections until their first-read cohort settles. A plan approval must explicitly accept this exception or request a revised loading-only-on-return contract before implementation; this is a proposal, not a silently chosen implementation.

### 2. Exact panel behavior for confirmation

The normal Git header and Open/Closed tabs always remain, with no Stale label. “Only Loading” below means the inventory area; existing global setup/enrollment footer rules are unchanged and cannot expose unknown membership.

| Case | What the panel shows |
| --- | --- |
| First visit with nothing known | Directly below Open/Closed, one standard blue working bulb and Loading at the top-left content inset. No successful repository headers, PR rows, empty states or per-repository loading lines while any admitted first read is queued, in flight or quietly deferred. Successes arriving early stay hidden. After all admitted first reads settle, show the eligible selected-tab sections together, or the normal No open/closed pull requests message if empty. |
| Return to a coordinator shown moments ago | Immediately show only the compatible previously shown sections/rows, saved folds/reveal/anchor and compatible last-good counts. During verification/reconciliation, show one Loading directly below the tabs and above those sections. Do not show Stale. Hold new partial additions; fresh authoritative removals, expiry and state transitions still apply. This is the explicit recommended exception to literal loading-only. |
| Background refresh with list already visible | Keep known sections mounted and folds/scroll stable. Warm-only PR/CI rereads use existing refresh-control feedback, not a new body Loading line. If verification is lost or new unread membership appears, add one Loading above the retained list and stage new successes until first reads settle; do not clear the known list. Apply authoritative existing-row facts without invented membership or delayed removal. |
| One repository fails while others load | Keep one Loading at the top left, then immediately show the failed repository's applicable header and scoped actionable notice, subject to its saved fold. On a cold visit, hide successful partial rows/sections; on a warm visit, retain previously shown compatible rows. Once remaining first reads succeed, confirm absence or fail actionably, remove Loading and show successful eligible sections alongside the failure notice. A first-read failure with unknown PR state keeps count-loading metadata, not a false exact total. |

“All loaded” is bounded to the currently admitted validated task-PR links, not all possible future discovery or the repository's complete GitHub inventory. Successful facts, confirmed absence and actionable failure settle a first-read attempt for body presentation. Quiet refusal/cooldown does not settle it. This intentionally allows an actionable failure notice without an endless Loading after other attempts finish, while totals remain unknown until every identity has authoritative state or absence.

A failure notice never invents a PR state or error row. Existing selected-tab/history scoping and saved folds still apply. While pending on a cold failure-only section, its header may show known count zero with incomplete hover/accessibility metadata; no partial exact total is asserted. Confirmed missing and expired history add no section. A first completed empty inventory is distinct from a still-unverified candidate.

### 3. Spaces: change composition and anchors, not domain operations

Move the connected parent's existing disclosure after Crew/trailing tags; keep metadata and unrelated tag order. Avoid leaving the Crew pill's ordinary negative trailing margin on the wrong child after moving the chevron. Preserve the existing disclosure hit target, hover and propagation/drag guards, and native selected-space targets.

Allow the shared fold primitive to omit a count explicitly for Spaces, without changing Agents' default collapsed count or producing an `undefined` label. Do not replace the glyph or create a new control style.

Keep `sidebarChildBranch()` as the visual primitive, but position the Spaces branch relative to its row's existing badge/name anchors rather than carrying Agents' deeper nesting offset into Spaces. With the ordinary 16px badge and existing gap, the stem is at parent badge left + 8 logical pixels, and child badge left is parent name left. Preserve branch stroke/curve/colour and child height. Native logical geometry scales to 130%; no screen-pixel correction, text measurement or guessed character budget is needed. Agents geometry is unchanged.

Existing native index numbering, shortcut-driven disclosure, compact rail projection, captured block membership, acknowledgement ordering and cancellation remain untouched.

### 4. Git: separate first-read admission from fact collection

Keep the aggregate queue, quiet-read classification and count accounting as the single source of read truth. Add a small pure/controlled presentation projection alongside the current section projection:

- Identify unresolved first reads using the existing missing-facts/error distinctions, not `busy` alone. A dirty warm entry with a PR is not a cold pending entry.
- Retain a bounded set/snapshot of already-published identities for the exact scope/enable generation. New successful rows, including additions inside an existing repository, wait behind the unresolved first-read barrier. Do not cache native elements or callbacks.
- On cold entry, publish no successful sections before settlement. Failure-only sections bypass success admission immediately; do not accidentally reveal a successful sibling PR merely because its repository has a notice.
- On warm return/refresh, filter the retained published identities through current membership, eligibility, authoritative absence and state. Update existing-row facts normally; admit new successful identities together once unresolved first reads settle.
- Do not let navigation away from a still-cold partial load turn hidden partial successes into a “previously shown” return list. Return memory must distinguish collected facts from published presentation.
- Keep one Loading row outside the section/reveal items, immediately after the tabs and before the scrolling list. Its position is independent of scroll offset, list length, folding and enrollment. Reuse `panelMessage()` and existing gutters/insets, bulb, text and verification tooltip.
- Remove the Stale header element entirely. Do not change internal `context.stale`, verification diagnostics, relay/read gating or captured robot authorization merely to remove its text.
- Use the same admitted projection for mounted rows and safety selection. Preserve current window/reveal caps and anchors without treating hidden staged successes as mounted safety targets.

Reuse the existing lifecycle for publication/retry and changed-only notifications after yielding; introduce no render-time shared writes, native allocations beyond the existing feedback, timer loop, polling or extra GitHub requests. Incomplete count logic remains independent: errors without facts can leave badges loading even when body Loading is no longer appropriate.

### 5. Regression and native proof after approval

Extend focused source regressions around `spaces-worktree-layout`, `fleet-toggle-live`, `fleet-reorder`, `git-coordinator-return`, `git-deferred-repositories` and existing read-notice/window tests. Cover first cold success arriving early, actionable mixed failure, all actionable failures, quiet cooldown expiry with no new event, warm refusal, new unread membership, return from a never-published partial load, exact-scope cache invalidation, folded failures, both tabs, and no unknown-only/empty header flash.

Use the opt-in synthetic fixture pattern in `tests/features/interface-native.mjs`, with a task-specific extension of its scenario controls as needed. Production reads must remain stubbed; no credentials, real terminals or live GitHub requests. Before launching, verify the release 0.1.18 executable in `C:/Users/tprokopiev/.crew/tasks/interface-improvements/native-bin` against official release checksum evidence, or fetch official release assets into this task's output folder and verify them. Check `--version` too; do not install the app or change PATH. Do not assume a prior receipt alone proves today's executable bytes.

All disposable app homes, screenshots, contact sheets, logs and scratch go under `C:/Users/tprokopiev/.crew/tasks/herdr-ux-polish`, never another checkout. The project source fixtures remain authored in this worktree. Run at zoom 1.0 and 1.3 and inspect actual screenshots, not merely successful fixture callbacks:

- Items 1/2: expanded and collapsed coordinator show Crew then chevron; collapsed screenshot has no connected-space count.
- Item 3: expanded parent/child screenshot establishes stem centre and badge/name left-edge alignment; compare geometry in logical and scaled pixels. Also exercise selection/hidden-child disclosure, compact rail and block drag/cancel/acknowledgement with synthetic targets.
- Item 4: retained unverified rows show a clean Git header and top-left Loading with diagnostics available by the existing tooltip.
- Item 5: capture cold empty Loading, partially completed cold Loading, complete list, warm return, warm refresh, mixed failure/pending and cooldown recovery. Every pending capture must establish Loading below tabs, not the bottom, and no cold partial success sections.

Record what is rendered, controller-driven or actual pointer/keyboard proof honestly. Stop every started disposable app, isolated Core and helper/server in a finally path, verify their stop receipts, and inspect no-native-error status before reporting. No processes are needed for this planning phase.

After implementation, update from the current default branch without overwriting PR #83, push the final branch head and dispatch the repository test workflow on that branch. Record its exact head SHA and verify Windows and Ubuntu pass on that SHA; do not substitute a skipped draft run or older green head. Leave readiness to the delivery bot and never merge.

## Risks / Trade-offs

- [Long quiet cooldown hides healthy cold successes] → This is intentional under loading-only cold admission; preserve automatic cooldown-expiry retry and explicit Refresh, and document the trade-off for approval.
- [Returning behavior differs from literal loading-only] → Require explicit approval of the retained-return recommendation before implementing; otherwise revise this plan first.
- [Staging masks actionable failures or corrupts totals] → Notices bypass admission, errors do not imply PR state, and existing truthful-total/cooldown fixtures remain regression gates.
- [Partial facts leak through return memory or stale callbacks] → Cache published pure presentation separately from collected facts; retain exact identity and enable-generation invalidation and bounded memory.
- [Moving Crew changes shared Agents or Git alignment] → Keep Agents defaults and Git geometry; local Spaces composition/anchors only, with native pictures at both zooms.
- [Evidence fixture is mistaken for live user testing] → Label synthetic/native/controller evidence precisely; no claims of live SSH or real terminal-input validation.

## Migration Plan

No preference or runtime-state migration, new dependency or deployment is needed for the plan. After approval, rebuild customization output and validate only disposable installations. Retain existing fold and pair identities. Normal guarded deployment remains a later explicit operation; rollback is the prior source revision through the same build/deploy path, not native-file edits.
