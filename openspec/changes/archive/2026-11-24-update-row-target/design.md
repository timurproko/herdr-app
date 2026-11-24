# Design

## Context

See proposal.md for motivation. `customizationRowState` currently uses one unconditional Updating… description. Its existing snapshot includes the verified installed `revision`, `check.target`, a provisional `launch`, and the worker `job`. The worker's current job receipt does not contain a target field. `updateProjection` and the shared controller already retain check and job facts across module replacement; launch tickets protect against obsolete status replies. The renderer delegates to the existing row and action-slot helpers.

## Goals / Non-Goals

**Goals:** Choose truthful description text from existing update facts throughout launch and replacement, without changing button geometry or action permissions.

**Non-Goals:** No changes to deployment selection, fetch cadence, source gates, lock/deadline handling, native rows, or archived historical records. No extra Git/network request just to obtain display text.

## Decisions

1. Resolve a trustworthy published target from the active run's receipt when supplied, otherwise its existing update-check target; shorten a valid full commit to seven characters. Reject absent or malformed values instead of borrowing the installed title revision. The current worker has no job target, so the existing check is the normal source. Prefer an authoritative same-run target over a retained check if the flow supplies one later. Do not use checkout HEAD or event hints.
2. Keep target and launch-scope context associated with the active launch/job if existing projection would otherwise lose it during pending-receipt or replacement reconciliation. Reuse shared state and ticket/token guards, not new persistence or polling. Do not let an unrelated completed job provide another run's target.
3. Use Updating other machines to followed by the short target only for an update whose desktop was verified current for that target and whose purpose is deferred peer catch-up. Preserve that launch scope rather than switching an ordinary full update to peer-only wording merely because its desktop phase just completed. If a newer authoritative target differs from that verified baseline, use Updating to instead. Unknown currency uses ordinary Updating, never a peer-only claim.
4. Keep the renderer and button label unchanged. Only the running description branch changes; targetless feedback is Updating (or Updating other machines for a known peer-only scope), without an ellipsis. Keep existing line height, padding, controls and truncation behavior rather than adding a second line or element.
5. Extend the existing model/VM fixtures instead of launching real updates. Cover valid/missing/malformed target, differing installed/target revisions, launch/pending/running phases, target arrival, peer-only catch-up, ordinary desktop completion, stale receipts and module replacement. Preserve existing checks of non-running states and button guards. Update current docs and delta-spec wording quoting the old description; archives remain historical evidence.

## Risks / Trade-offs

- Published main can advance after an availability check → Prefer an active-run target if the update flow provides one; never infer a newer commit from installed revision, tracking refs or UI events.
- Replacement can momentarily omit check facts → Retain known active-run target under existing identity guards where necessary; fall back honestly rather than fabricate a revision.
- A long peer-only description could wrap → Keep existing row geometry and verify renderer structure and narrow-width behavior; no new controls or explanatory line.
- Changing shared metadata could affect safety logic → Display context is informational only and cannot authorize launch, claim success or relax unknown-outcome guards.

## Validation and rollout

After implementation approval, run targeted update model/row/controller fixtures, then run `CI=true npm run test:ci` once no other suite is running. Inspect final-head required-check results and report their actual status; do not mark ready or merge. No live deployment or native interaction is needed for the plan, and fixtures cannot establish visual correctness in the real app. Reverting the description-only change restores prior presentation without runtime migration.
