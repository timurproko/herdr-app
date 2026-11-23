# Design

## Context

See proposal.md for motivation. Baseline is merged PR 18, commit b884ed4, Custom/App 0.1.17. The supplied screenshot shows a healthy crew draft row 8, Open 1 / Closed 3 counts and three errors under Open.

Read-only investigation in this worktree:

- `AggregatePulls.pump` executes `gh pr view NUMBER --repo owner/repo --json PR_FIELDS` on the verified context's machine with a 30-second timeout and three-request concurrency. Repository identity comes from each recorded URL, not the coordinator directory. The CLI is given `mergedAt` and `closedAt` for every PR.
- An ignored diagnostic harness loaded the real aggregate/pull modules, routed its exec calls through `gh-axi pr view` with precisely those selected fields, decoded the wrapper's TOON response, and supplied one synthetic live source for crew 8 plus three historical sources for crew 5, 6 and 7. Result: Open 1, Closed 3, zero errors, peak concurrency 3. The three GitHub merge timestamps are today; they satisfy the existing 24-hour filter. This is a real GitHub read plus synthetic host/context, not a native-app reproduction.
- Representative historical/live sources in the other screenshot sections also succeed: herdr-app 17/25, MyConfigs 9 and MyWorkflows 25/33 produce Open 2 / Closed 3 and zero errors together. This is not an exhaustive read of every task or proof that the installed host's exec transport cannot fail.
- `gh-axi api rate_limit` reported core 4972 and GraphQL 4910 remaining. Nothing in these reads requires webhook enrollment. The enrollment prompt is a separate `GitNotices` path.
- After initial success, deliberately returning real provider failures for three nonexistent PR reads at the host seam retains the original 1/3 counts and creates three entry errors. This demonstrates why healthy rows/counts and failed subsequent refreshes can coexist; it does not reproduce the screenshot's original failure cause.
- `main.js` renders every entry error in a repository, independent of selected tab and PR state. This proves the duplication and cross-tab leak, including for cached merged rows. `pullError` maps any `Could not resolve`, `network` or `timeout` substring to unreachable. A GraphQL resource-resolution message such as `Could not resolve to a PullRequest...` therefore deterministically produces the wrong notice without any DNS failure.
- The original stderr and host result from the installed-app incident are unavailable. Fresh merged reads succeed. No evidence currently justifies blaming merged support, quotas, the 24-hour filter, enrollment or concurrency, or changing the working provider read itself.

The same real-provider fixture was repeated after approval and again returned Open 1 / Closed 3 with no read errors. The coordinator supplied a plausible Windows-load candidate: other processes failed to start with 3221225794 (0xC0000142). That is not recovered stderr from this incident. Previously an empty abnormal exit lost its exit code and became `Cannot load pull requests`, while a local timeout was misclassified as unreachable; neither proves a GitHub outage. The implementation retains exit/signal/timeout facts and covers unsigned and signed NTSTATUS, spawn rejection, empty stderr and process timeout explicitly. An account switch remains another plausible but unproven cause of resource-resolution responses.

Local execution failures say `Could not read pull requests; refresh to retry`. They use the existing single-flight manual/webhook refresh path, not a new retry loop or a false promise of an automatic retry. Repository/PR resolution refusals identify the current GitHub account; actual DNS/connection failure still says `GitHub is unreachable`.

Baseline validation: `CI=true npm run test:ci` passed all 151 supported Windows suite entries, with three documented exclusions. Diagnostic scripts, provider responses and logs remain ignored in `.artifacts/`.

## Goals / Non-Goals

**Goals:** Correct repository notice classification, cardinality and tab applicability; preserve last-good facts and authoritative timestamp eligibility; make the exact one-live/three-history state a deterministic regression.

**Non-Goals:** No Crew discovery/status-reader changes, section-header text or bottom enrollment redesign, label-pill styling, polling/retry service, account switching, live-agent actions or deployment.

## Decisions

### 1. Do not infer a provider defect from the screenshot

Before altering targeted read construction or parsing, capture a failing result through the same host exec boundary: command, canonical repository, machine, exit code, elapsed time and sanitized stderr. Re-run the four-PR fixture with three bounded concurrent requests. Distinguish command errors, JSON/identity parsing errors and post-read callback exceptions. If the incident cannot be reproduced, fix only the demonstrated notice defects and explicitly retain that limitation; do not claim to have repaired an unidentified transport problem. Enlarging timeouts, lowering concurrency or replacing gh with a new API transport without evidence is rejected.

### 2. Keep failure facts distinct from user-facing notices

Preserve read failure identity and classification once at the boundary rather than formatting a string and feeding it through the classifier again. Classify resource/HTTP/GraphQL responses, authentication, rate limiting, malformed data and genuine connection/DNS/transport timeouts separately. Use bounded actionable text for the failing operation. Actual resource-resolution responses must not become `GitHub is unreachable`; genuine transport failure must remain clear. Preserve the shared ordinary-Git callers of `pullError` and cover their compatibility.

### 3. Derive one notice per repository and selected tab

Aggregate applicable entry failures into one repository-level notice before rendering. Known Open/Draft failures belong to Open; known Closed/Merged failures belong to Closed and respect historical eligibility, including expiration. Historical-only failures with no known state are reported as a history-load problem under Closed, not as an error line attached to an Open PR. Unknown live-source failures can yield a general repository-load notice without inventing state. Prefer a useful combined summary over arbitrarily displaying the first failure when causes differ. Healthy rows in the same or other repositories remain visible; folding hides the one notice with the body. Recovery clears only the recovered failures.

Keep the existing targeted reads of all recorded candidates: reading a historical PR while Open is selected is necessary to establish its state and Closed counts, not itself a bug. Reject filtering requests by task completion alone, because finished tasks can still have open PRs.

### 4. Preserve successful history and shared ownership boundaries

Keep `mergedAt ?? closedAt`, the strict less-than-24-hour cutoff, exclusion of missing/invalid/future dates, live-task precedence, no historical robots, full PR identity and stale-generation guards. Keep three concurrent reads and independent webhook enrollment. Add focused fleet/history and classifier tests; touch only the error-render expression in the shared section method to minimize rebases against the other in-flight tasks.

## Risks / Trade-offs

- [Original transport error not reproducible] → Keep captured evidence separate from hypotheses and report the limitation; no speculative provider-read rewrite.
- [Failure has no state on cold start] → Report historical-only load failures under Closed without asserting that an unknown PR is merged; do not manufacture counts or rows.
- [Mixed failure causes in one repository] → One summary names the read operation and preserves truthful categories rather than claiming a total GitHub outage.
- [Shared classifier affects folder Git] → Retain existing callers and add response-versus-connectivity regressions there as well.
- [Parallel section edits] → Rebase on the default branch before final implementation handoff; avoid enrollment, header and row-style edits.

## Migration Plan

Implementation validation: all focused fleet/read/notice/pagination regressions passed, followed by `CI=true npm run test:ci` passing 153 supported Windows suite entries with three documented exclusions. The branch was checked against the current default branch before that run; no overlapping enrollment/header/discovery/label edits were present to reconcile. The original installed native exec failure remains unreproduced and is not claimed fixed as a proven root cause.

No persistent state migration is needed. This task does not deploy. Source-level rollback is the ordinary revert of the implementation commit; no installed files, credentials or Crew records are changed.
