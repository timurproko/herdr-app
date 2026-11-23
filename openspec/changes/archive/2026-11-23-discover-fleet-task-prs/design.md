# Design

## Context

See proposal.md for motivation. The archived connect-fleet-space design decision 6 explicitly isolates future discovery in Crew's source adapter. PR 18 subsequently added `--all`, strict identity-schema validation, same-home closed history and the uncluttered header contract now present in plugin-integrations.

Observed implementation:

- `plugin.js` resolves the installed Crew tool on the requested machine and reads `status --all --json` through PowerShell/hc with a 15-second timeout.
- `fleet.js` bounds status at 1 MiB and 4096 tasks, rejects malformed home/owner/task identity, and shares reads using a 20-second lease, ten-second attempt TTL and 30-second action freshness.
- `bindFleet` joins exact owner/task terminals and adoption labels. PR facts are not binding/pull-scope identity. Closed-task history has no worker authority.
- `fleetPullContext` currently carries links and sanitized tasks; the legacy `incomplete` boolean is based on working workers. Git does not render the removed blanket notice.
- Git's aggregate index already parses canonical task URLs, deduplicates full repository/number identities and targets only linked PRs. Local status changes do not periodically refresh unchanged GitHub facts.

Crew's merged v1 adoption contract was read from `timurproko/crew` main via the read-only GitHub contents API: the brief's local `D:/Git/crew` checkout lacks `docs/status-pr-discovery.md`. No changes are needed or permitted in that checkout. The contract adds up to ten seconds of serial discovery, returning per-task unavailable results when its budget expires.

## Goals / Non-Goals

**Goals:** Show an eligible worker's first draft before its report, preserve known/none/unavailable semantics, bound capability compatibility and retain exact identity/action guards.

**Non-Goals:** Enrollment banner or picker changes, label rendering, Crew mutations, new GitHub inventory queries in the app, footer/transcript inference, custom-home routing, new polling, deployment or native interaction tests.

## Decisions

### 1. Keep discovery at the installed-tool transport seam

Request `status --all --json --discover-prs` using the existing quoting, machine routing and read-only command builder. A successful plain/unknown-version payload is handled by the adapter without another call. Only a narrow explicit unsupported-option response naming `--discover-prs` permits one `status --all --json` fallback; timeout, transport, authentication and arbitrary nonzero exits never match. The fallback cannot recurse. Recheck the captured enable/generation before starting it so an obsolete request cannot launch follow-up work.

Do not add tool-version probes, setup, installs or per-task app lookups. An unsupported-flag response is capability evidence, not a general retry policy.

### 2. Extend the strict adapter, not fleet identity

Retain home, owner, task ID/state/terminal checks and allowlisted copying exactly as today. Branch on the top-level version: absent/unknown means recorded-only; supported version 1 requires every returned task's complete result shape. Malformed metadata that purports to be v1 fails the read, just like malformed identity; it is never coerced into none or a shortened authoritative task list.

Validate the four task fields together:

| Status | URL | Source | Reason |
| --- | --- | --- | --- |
| known | canonical HTTPS github.com PR URL | recorded or github | null |
| none | null | null | null |
| unavailable | null | null | bounded nonempty reason code |

Canonical known URLs use safe owner/repository segments and a positive safe-integer PR number, without query, fragment, trailing slash, credentials, alternative host/protocol or dot traversal segments. Keep validation Crew-owned rather than importing a peer plugin. Legacy recorded-only inputs retain their current recorded-link behavior and Git's existing final URL gate.

For v1, known URL becomes sanitized task `pr`; none/unavailable produce no link. Copy only normalized discovery facts, never raw reports, paths, stderr or arbitrary extra metadata. Keep unsupported capability distinct from supported none; do not assign fictitious v1 results to legacy tasks.

### 3. Preserve discovery without changing bindings or presentation

Carry per-task normalized results through live tasks and same-home closed-task projection, including closed no-link results for diagnostic completeness. Expose bounded generic discovery facts in `fleetPullContext` beside the existing links; consumers never parse Crew JSON. No-link diagnostic records contribute no row, count, fleet-child identity or worker target. Supported unavailable eligible tasks determine internal uncertainty; known/none do not imply future completeness. Legacy internal uncertainty remains recorded-only.

Do not include discovery status or PR URL in owner/home/pair binding, pull scope, membership signatures or durable display identity. Discovery-only changes can add/remove PR links, not detach a fleet or authorize a different worker. Existing task eligibility, exact live labels, historical 24-hour policy, deduplication, stale-context behavior and generation guards remain authoritative.

Default presentation decision: **no additional text**. Keep the normal Git header, existing Stale/Verifying states and repository-scoped failures. Neither v1 uncertainty nor older Crew restores the removed possibly-incomplete notice. This intentionally follows the current app contract and brief rather than obsolete wording in the original archived decision or Crew's adoption note.

### 4. Increase the transport allowance, not polling frequency

Propose a 25-second discovery transport timeout (existing 15 seconds plus Crew's added ten seconds), and a 15-second recorded-only fallback timeout. Use a 45-second coalescing lease to cover the bounded worst-case sequential capability fallback (40 seconds plus margin); the old 20-second lease would expire while an allowed read still runs. Both calls remain independently bounded, with no retries.

Keep the existing ten-second completion/attempt refresh TTL and 30-second successful action freshness unchanged. Slow refresh can therefore show existing Stale/Verifying presentation instead of extending action authority. Lease duration never becomes freshness. Normal local refresh remains single-flight; no new timer or immediate loop fills budget-exhausted results. This is a deliberate transport/lease adjustment to Crew's suggested old 15-second bound, not a change in refresh cadence. Test the boundary with a fake clock, not real sleeps or accounts.

### 5. Deliver and document three outcomes

1. Strict v1 adapter and discovery facts through unchanged binding/pull context, with schema and identity fixtures.
2. Discovery-enabled bounded transport, capability fallback and revised timeout/lease, with failure/coalescing/generation fixtures.
3. First-report-independent coordinator behavior and recorded-only compatibility protected by integration fixtures and updated README/architecture guidance, without touching enrollment or label UI.

## Risks / Trade-offs

- A malformed v1 result rejects the entire read → consistent with strict uncertainty policy; prior presentation survives without renewed action freshness.
- Discovery on large homes may repeatedly exhaust its budget → preserve partial known results and explicit unavailable diagnostics; do not invent completeness or retry to fill holes.
- A slow read can outlast action freshness → retain existing stale presentation and block new actions until fresh verification; do not weaken freshness to hide latency.
- Broad error matching could retry authentication failures → exact flag/capability fixtures and a single nonrecursive fallback.
- Older tools can ignore the flag → inspect the payload version and reuse recorded links without a second call.
- Generic discovery data could accidentally alter pair identity → compare binding/pullScope/membership before and after known/none/unavailable transitions, including remote-qualified fixtures.

## Migration Plan

Planning only until approval. Implement in the existing branch and draft PR, one outcome at a time. Run focused fixture checks before each outcome push, then the brief's required `CI=true npm run test:ci` before implementation reporting. No deployment; native pixel behavior is not claimed. During planning, run that requested CI command as a baseline and report it separately from unimplemented coverage. Runtime discovery facts remain unexported; attachment-off and older Crew preserve existing compatibility without a persistent-data migration.
