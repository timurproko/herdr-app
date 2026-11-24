# Design

## Context

See proposal.md. The live preference lifecycle is already implemented in PR #40. The original change was finalized as `openspec/changes/archive/2026-11-24-connect-toggle-live/`. A separate active amendment initially failed the delivery bot's canonical-spec baseline check, since this branch already includes the original finalization. The approved amendment is therefore folded into that original linked change for supported bot re-finalization. The bot regenerates its acceptance record; the original version remains in commit `32942d1`. Product scope and the approved third outcome are unchanged.

`Spaces.row` currently defines a coordinator-only predicate from `block.length > 1` and `block[0] === w.id`. That predicate controls both moving Crew last among unrelated tags and drawing the chain. The fleet already receives the same verified projected block, so expanding this predicate to either member is sufficient; no new reader or persisted state is needed.

## Goals / Non-Goals

**Goals:** Two matching expanded-row chains, before Crew at a shared right edge, with immediate appearance/removal through the existing preference lifecycle. Truthful native selection numbers in every presentation.

**Non-Goals:** Native space reordering, shortcut interception/remapping, additional preference fields, discovery changes, compact-rail chains, drag-chip chains, or render-time focus/notification work.

## Decisions

### Shared attached-row metadata treatment

Recognize a rendered row as attached when its validated projected block contains both pair members, including the row itself. Apply the existing trailing Crew-group arrangement and chain insertion to both rows. Keep the canonical `link.svg`, existing muted colour, `U.smallIcon`, slot dimensions and Crew pill treatment. Counts/worktree remain before the trailing metadata; unrelated tags retain relative order before the chain/Crew group. Renaming suppresses markers/tags exactly as before.

Using the same metadata tree on both members aligns the chain column independently of names, counts or worktree markers. Do not introduce a separate fleet-only icon style or horizontal offset. Compact and drag renderers continue to use badges only.

### Native numbering investigation and explicit decision

Read-only evidence from installed Herdr 0.1.17 and its published matching source:

- Installed `~/.config/herdr-app/keys.json`, global bindings, maps `alt-1` through `alt-9` to `space.select:1` through `space.select:9`.
- Published [defaults/keys.json](https://github.com/herdrdev/herdr-app/blob/v0.1.17/defaults/keys.json) contains those same bindings.
- Published [src/window.rs lines 3194–3202](https://github.com/herdrdev/herdr-app/blob/v0.1.17/src/window.rs#L3194-L3202) resolves numeric `space.select` through `self.model.spaces.get(i.checked_sub(1)?)`, not the Custom projection. Next/previous likewise traverse native order.
- Current `Spaces.ordered()` records the native index before `projectLinkedRows` changes presentation order. `spaceBadge` uses that index for expanded rows, rail and chip.

Therefore a projected fleet labelled 2 while its native index is 3 would falsely advertise Alt+2, which selects the unrelated space. Follow the coordinator's conditional instruction: leave numbering unchanged in this PR, document the meaning and strengthen expanded/compact/chip regression assertions for all rows. Correct the accidental projected-numbering phrase in the previous live-toggle specification through this delta.

**Honest alternative, proposed only:** actually move the fleet next to its coordinator in native order through the supported `space.move` command after fresh pair verification. This makes both digits and shortcuts consecutive, but changes durable user order and the numeric shortcuts of affected intervening spaces. A design must decide whether disabling leaves that real order intact or attempts a carefully guarded restoration, how to handle concurrent user reorder/removal and remote acknowledgements, and how to report an uncertain move without replay. This is not authorized as part of the presentational toggle fix; do not implement it here. Faking digits or silently remapping global shortcuts is rejected.

### Regressions and documentation

Extend `spaces-worktree-layout.test.mjs` across both members, local/remote machines, worktree/count combinations, unrelated tags, renaming and hidden-worktree state. Assert shared chain slot/style and trailing edge, no chain when detached, and none in rail/chips. Extend the mounted Settings test to assert both chains appear/disappear without closing the dialog, including pending/obsolete replies. Keep focus/notify render guards.

Update current README/testing guidance and the affected current specification through the combined original change. This amendment plan is retained alongside it, and previous commits retain the original finalized version. No new layout dependency, asset or package mapping is required.

## Risks / Trade-offs

- [Fleet-only treatment displaces unrelated tags] → Use one attached-row metadata path and assert tag relative order for both members.
- [Different counts/worktrees break column alignment] → Compare the two fixed trailing chain/pill slots, independent of preceding metadata.
- [Consecutive-looking digits lie about navigation] → Retain native numbers and cite the actual bindings and command resolution.
- [Old coordinator-only wording remains contradictory] → Modify every affected current requirement block, including live propagation and refresh persistence; do not rewrite archived history.

## Migration Plan

No preference or runtime-state migration. After plan approval, land the third PR outcome, run targeted regressions, then the requested isolated `CI=true npm run test:ci` with a sufficiently long timeout and inspect required checks on the final head. Reverting the render change restores coordinator-only chains without touching native order or user preferences.
