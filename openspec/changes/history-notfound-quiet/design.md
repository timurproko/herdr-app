# Design

## Context

See proposal.md for motivation. `AggregatePulls` currently retains all failures on entries, groups `notfound` results into a red repository notice and marks every entry dirty on refresh. Its entries disappear on scope change or stop. `Main` derives selected-tab sections from rows or those notices, then folds and pages them. Existing fixtures intentionally require the old missing-resource notice, so this cannot be implemented without a spec delta.

The existing `pullFailure` classifier combines exact PR absence, repository resolution failures and generic not-found wording. Its shared ordinary-Git callers must not silently change behavior. Real auth/access failures already use repository-scoped account diagnosis. The renderer already uses `console.error` for customization-log diagnostics.

## Goals / Non-Goals

**Goals:** distinguish terminal absence from retryable errors; retain existing account/routing guards; keep the session cache outside per-coordinator entry resets; integrate neutral hints with section folding and ten-item presentation paging.

**Non-Goals:** edit Crew records, infer replacement URLs after the split, change discovery/fleet readers, retry automatically, alter ordinary folder Git, modify row/header alignment, provision services, deploy or touch other branches.

## Decisions

1. **Narrow absence classification.** In the targeted aggregate read boundary, recognize authoritative PR resource-resolution and definitive targeted missing-resource responses, after ruling out explicit authentication, permission, rate-limit, abnormal-exit, timeout and connectivity failures. Do not equate arbitrary `not found` text, missing CLI executables or uncertain repository resolution with confirmed PR absence. Preserve shared ordinary-Git classification and per-call repository transport. An empty or malformed response is still a real read error. This avoids globally silencing `notfound` or depending on another account probe.

2. **Session-only exact-identity tombstones.** Keep a module-session map keyed by canonical repository plus PR number, surviving aggregate stop, refresh, scope switching and panel recreation within the current module session, but not app restart. Do not persist it in preferences, localStorage, Core or Crew state. Only a current, identity-validated read may publish a tombstone. Reads consult it before queuing, including after in-flight invalidation. Once absent, old PR facts no longer produce a row or count. Do not evict tombstones merely because a task disappears and reappears. A corrected URL naturally uses a new key. Live hints are derived from current live targets, never retained worker authority.

3. **Quiet history, actionable live hints.** Missing historical-only entries never reach `readNotice`. For each currently affected unfinished task, render muted text in the Open task-section presentation: `Task <task>: <repository> #<number> not found; check the recorded PR URL`. Do not create a synthetic PR row or robot. A shared historical/live link uses only the live task hint; if that task finishes, it becomes silent. Hints fold with their repository and count as bounded presentation items, not PR counts. Real error notices remain red and coexist with found rows or neutral hints.

4. **One diagnostic per confirmed key.** On first tombstone insertion, emit a best-effort single sanitized `[custom-changes] task PR not found` line through the existing customization console/log channel with canonical repository and number only. Repeated invalidations do not log again. Logging cannot fail the read or restore an error notice. No raw response, credential, task inventory or private path enters the line.

5. **Focused synthetic evidence, then one integration run.** Update fixtures that expect not-found history notices; add request-count and log-count assertions across refresh, invalidation, stop/recreation and context switches, mixed found/missing sections, duplicate numbers across repositories, live-to-history transition and corrected URL, real access/account notices, timeout/network/rate limits and obsolete replies. After approval, run quick targeted suites first and one `CI=true npm run test:ci` only when no other suite is running. Read required checks for the final head; any unavailable or skipped draft checks must be reported, not called green.

## Risks / Trade-offs

- GitHub can mask private resources as 404 → suppress only authoritative targeted absence; keep explicit access/auth refusals visible and document that no account switching or verification of another credential is attempted.
- A previously missing PR could later exist at that number → session caching deliberately waits until a new app session to retry that same identity; corrected links are not blocked.
- Module hot replacement creates a new session cache → no durable negative inventory is stored; ordinary refresh and panel recreation within a module session retain the cache.
- Neutral hints could bypass the render budget → include them in existing fold/page projection and regress the ten-item limit.
- Shared failure classification changes could affect ordinary Git → prefer aggregate-specific recognition and regression coverage rather than broad changes to the shared string classifier.

## Migration Plan

No data migration or installation is part of this task. After approval, ship source and fixtures on this branch, align README/architecture text, and retain existing deployment controls. Reverting the source restores the old presentation without modifying any task data. The draft plan is the only delivery in this phase; code and integration/required-check evidence are deferred until implementation approval.
