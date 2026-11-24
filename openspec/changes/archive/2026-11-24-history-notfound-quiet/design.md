# Design

## Context

See proposal.md for motivation. `AggregatePulls` currently retains all failures on entries, groups `notfound` results into a red repository notice and marks every entry dirty on refresh. Its entries disappear on scope change or stop. `Main` derives selected-tab sections from rows or those notices, then folds and pages them. Existing fixtures intentionally require the old missing-resource notice, so this cannot be implemented without a spec delta.

The existing `pullFailure` classifier combines exact PR absence, repository resolution failures and generic not-found wording. Its shared ordinary-Git callers must not silently change behavior. Real auth/access failures already use repository-scoped account diagnosis. The renderer already uses `console.error` for customization-log diagnostics.

## Goals / Non-Goals

**Goals:** distinguish terminal absence from retryable errors; retain existing account/routing guards; keep the session cache outside per-coordinator entry resets; remove all UI output for missing live and historical task PRs while bounding live-task rechecks.

**Non-Goals:** edit Crew records, infer replacement URLs after the split, change discovery/fleet readers, add a retry scheduler, alter ordinary folder Git, modify row/header alignment, provision services, deploy or touch other branches.

## Decisions

1. **Narrow absence classification.** In the targeted aggregate read boundary, recognize authoritative PR resource-resolution and definitive targeted missing-resource responses, after ruling out explicit authentication, permission, rate-limit, abnormal-exit, timeout and connectivity failures. Do not equate arbitrary `not found` text, missing CLI executables or uncertain repository resolution with confirmed PR absence. Preserve shared ordinary-Git classification and per-call repository transport. An empty or malformed response is still a real read error. This avoids globally silencing `notfound` or depending on another account probe.

2. **Session-only exact-identity negative cache.** Keep a module-session map keyed by canonical repository plus PR number, surviving aggregate stop, refresh, scope switching and panel recreation within the current module session, but not app restart. Do not persist it in preferences, localStorage, Core or Crew state. Only a current, identity-validated read may publish absence. Reads consult the cache before queuing, including after in-flight invalidation. Historical-only misses remain suppressed for the session. For an unfinished source, permit a recheck after five minutes since the last confirmed miss when the existing shown-panel refresh lifecycle runs; manual refresh and webhook invalidation do not bypass this cooldown. A changed recorded URL uses a new key and reads immediately. Do not issue a head-discovery request: current generic task links expose URLs, not reliable head identity. Use the existing three-read queue and pending lease, without a new timer. A success clears absence and publishes ordinary facts; another missing result renews the cooldown. A real error clears absence suppression and follows the existing explicit error path, without treating it as another miss. Finishing the live task makes any confirmed miss historical-only and session-long again.

3. **Silence for every missing recorded PR.** Missing entries never reach `readNotice`, rows, counts, hints or tooltips, regardless of live/history status. Remove previously loaded facts after authoritative absence. A repository with no found rows or genuine failures leaves no empty header. A shared historical/live link is also silent. Do not add hint rendering or synthetic PR/robot controls. Keep existing section folds and paging untouched except any necessary filtering. Real error notices remain red and coexist with found rows.

4. **One diagnostic per confirmed key per session.** Keep log deduplication independent of cache expiry or successful later rechecks. On first confirmed absence, emit a best-effort single sanitized `[custom-changes] task PR not found` line through the existing customization console/log channel with canonical repository and number only. Repeated invalidations do not log again. Logging cannot fail the read or restore an error notice. No raw response, credential, task inventory or private path enters the line.

5. **Focused synthetic evidence, then one integration run.** Update fixtures that expect not-found history notices; add request-count and log-count assertions across refresh, invalidation, stop/recreation and context switches, mixed found/missing sections, duplicate numbers across repositories, silent live-to-history transitions, corrected URL, five-minute recheck boundaries and later creation at the same number, real access/account notices, timeout/network/rate limits and obsolete replies. After approval, run quick targeted suites first and one `CI=true npm run test:ci` only when no other suite is running. Read required checks for the final head; any unavailable or skipped draft checks must be reported, not called green.

## Risks / Trade-offs

- GitHub can mask private resources as 404 → suppress only authoritative targeted absence; keep explicit access/auth refusals visible and document that no account switching or verification of another credential is attempted.
- A previously missing PR could later exist at that number → live-task misses are retried no more often than five minutes through existing shown-panel refreshes; corrected links read immediately. Historical-only misses still wait until the next session.
- Module hot replacement creates a new session cache → no durable negative inventory is stored; ordinary refresh and panel recreation within a module session retain the cache.
- Rechecks could become a hidden polling loop → eligibility is evaluated only through the existing shown/enabled verified-context refresh lifecycle, with the same pending leases and no added timer. Hidden or paused panels cannot promise a five-minute wall-clock retry.
- Shared failure classification changes could affect ordinary Git → prefer aggregate-specific recognition and regression coverage rather than broad changes to the shared string classifier.

## Migration Plan

No data migration or installation is part of this task. After approval, ship source and fixtures on this branch, align README/architecture text, and retain existing deployment controls. Reverting the source restores the old presentation without modifying any task data. The draft plan is the only delivery in this phase; code and integration/required-check evidence are deferred until implementation approval.
