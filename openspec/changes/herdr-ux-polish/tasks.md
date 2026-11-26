# Tasks

Implementation is blocked pending approval of this draft plan, including the explicit retained-return exception in design.md. Groups match the five PR Implementation outcomes in order. Each outcome is ticked when its code and tests land; broader CI/native evidence is reported separately and does not delay its tick.

## 1. Coordinator Crew before far-right chevron

- [ ] 1.1 Reorder only connected-parent trailing composition in Spaces so Crew precedes far-right disclosure; verify expanded/collapsed layout assertions and existing unrelated-tag/worktree ordering in `spaces-worktree-layout.test.mjs`.
- [ ] 1.2 Preserve disclosure propagation and drag guards while correcting trailing margins; verify fold clicks do not select or drag and update the README's connected-row order description.
- [ ] 1.3 Add synthetic native-fixture expanded/collapsed captures at zoom 1.0 and 1.3 for item 1; verify the fixture has explicit output isolation, no live reads and guaranteed instance cleanup.

## 2. Connected disclosure without a child count

- [ ] 2.1 Let the existing fold control omit counts for Spaces without changing Agents defaults; verify both Spaces states have no count and Agents still shows its collapsed count in focused layout tests.
- [ ] 2.2 Retain local fold identity, hidden-child navigation and collapsed block semantics; verify the existing Spaces selection/reorder regressions and update README disclosure wording.
- [ ] 2.3 Extend synthetic native captures for item 2 at zoom 1.0 and 1.3 with explicit no-count checks; verify screenshot/receipt naming distinguishes expanded and collapsed states.

## 3. Connected child badge and connector alignment

- [ ] 3.1 Replace the deeper Spaces child indentation with parent-badge-centre and parent-name-left anchors using the shared Agents branch style; verify logical geometry assertions at zoom 1.0 and 1.3 without altering Agents.
- [ ] 3.2 Preserve native shortcut numbers, independent selection, compact badges, selected/inactive styling and paired drag/cancel/acknowledgement; verify `spaces-worktree-layout`, `fleet-toggle-live`, `fleet-reorder` and relevant right-edge assertions.
- [ ] 3.3 Add measured parent/child native proof views for item 3 at both zooms and document intended anchors in README/architecture guidance; verify screenshots and receipts can establish the two alignment relationships without real terminals.

## 4. Coordinator Git header without Stale

- [ ] 4.1 Remove the coordinator Stale header element without changing stale-context authority; verify header absence plus retained rows, refused stale worker actions and no stale aggregate reads in coordinator/fleet regressions.
- [ ] 4.2 Keep sanitized verification reason/time available on the existing Loading tooltip and update README/architecture references; verify the diagnostic tooltip contains no raw output and no replacement header status label.
- [ ] 4.3 Extend synthetic unverified-retained-row captures for item 4 at zoom 1.0 and 1.3; verify the native fixture records a clean header and retains explicit read/action refusal stubs.

## 5. Top-left coordinator Loading and coherent inventory admission

- [ ] 5.1 Stage not-yet-presented successful identities behind unresolved first reads, distinguishing published presentation from merely collected facts; verify cold partial success, warm return, never-published partial return, new membership, scope/enable invalidation and bounded memory tests.
- [ ] 5.2 Place exactly one existing Loading bulb/text directly below Open/Closed and above the scroller, never in a repository or footer; verify tree order, scroll/fold independence and no body Loading for warm-only refresh.
- [ ] 5.3 Bypass success staging for applicable actionable failure notices without leaking successful cold rows or inventing state; verify mixed and all-failed cases, missing/history exclusions, truthful loading totals and automatic quiet cooldown recovery without another event.
- [ ] 5.4 Feed the same admitted projection into existing section/window and safety selection paths; verify ten-item reveal, mounted caps, folds, anchors, authoritative removals/state transitions and unchanged ordinary Git presentation using focused regressions.
- [ ] 5.5 Extend synthetic native proof for all four approved cases, cold partial completion and cooldown recovery at zoom 1.0 and 1.3; verify the fixture uses only injected inventory/transport, keeps errors visible and records stopped app/Core/helpers on every exit path.
- [ ] 5.6 Update README, architecture and testing guidance to the approved cold-versus-retained contract and evidence limits; verify examples match failure settlement, incomplete totals and the absence of Stale header text without touching Trello or Settings plugin UI.

## Workflow follow-up

- Inspect each item's native screenshots at 100% and 130%, record paths and geometry/behavior findings under `C:/Users/tprokopiev/.crew/tasks/herdr-ux-polish`, and report any missing proof honestly.
- Before any native use, verify release 0.1.18 checksum evidence for the allowed executable or fetch and verify official assets into this task's output folder; install nothing and change no PATH.
- Stop and confirm every disposable instance, isolated Core and helper/server started by this task before its implementation report and `crew done`.
- After implementation, dispatch `CI` (`.github/workflows/tests.yml`) on the exact final branch head and record matching-SHA Windows and Ubuntu passes before reporting implementation; never substitute a skipped draft run.
- Follow automatic delivery readiness/finalization only; never manually mark ready, arm auto-merge or merge.
- This planning handoff includes no screenshots, runtime launches or CI dispatch, because implementation approval has not been given.
