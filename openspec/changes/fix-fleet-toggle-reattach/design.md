# Design

## Context

See proposal.md for motivation. The baseline is origin/main at a2f3442, including PR 44. Settings writes the preference through `updateSpacePreferences`, bumps the shared fleet generation, clears links/read leases and emits `workspace.context.refresh`. Crew yields before `refreshFleets`, shares a 45-second reader lease, applies a ten-second attempt TTL and thirty-second action freshness, and rejects generation/token/identity-obsolete completions. Spaces already emits its lifecycle every 250 ms.

The existing `tests/fleet-toggle-live.test.mjs` passes unchanged. It mounts separate page/sidebar module graphs and real Crew code but uses synthetic native elements and transport; its immediate repeated cycles do not reproduce the reported failure. That passing result is not proof that the installed interaction is correct.

Read-only live inspection found attachment currently restored and one sanitized `expired-read` diagnostic at 1795532190453, attempted/current generation 43, subsequently resolved. The existing local log contains that same reason. This demonstrates an expired lease episode, not that generation invalidation or lease expiry caused the earlier screenshot. No failing toggle sequence has yet been captured. The screenshot's native rows and ordinary colours confirm detachment, not its reason.

## Goals / Non-Goals

**Goals:**
- Capture a failing repeated-toggle sequence with production preference, generation, lease and identity decisions and PR 44 diagnostics before selecting the repair.
- Keep the correction in the existing preference/provider lifecycle; ensure one successful current read suffices to publish the pair.
- Preserve strict stale-reply and action-authority boundaries.

**Non-Goals:**
- No new refresh loop, faster healthy polling, global state reset, optimistic attachment, removal of generation guards or lease-wide timeout reduction.
- No changes to the person's settings, deployed mods, native app, processes, Crew task records or other open PRs.
- No claim that synthetic fixtures prove native pixels or real process latency.

## Decisions

1. **Extend the existing mounted regression, not a fresh-link mock.** Keep a verified initial state and the same shared storage across actual Settings callbacks, sidebar timer callbacks and separate Crew module instances. Exercise off/on after 0, 1000 and 15000 ms; include realistic status-read latency below two seconds and timer interleavings while reads are pending. Check actual row order, both chains, independent/shared colours and native numbering. This avoids a provider-only test that skips the reported interaction or accidentally resets away its cause.

2. **Make the failing reason the prerequisite to a runtime fix.** Record attempted/current generation, reader token/deadline, diagnostic reason and successful verification timestamps in isolated test artifacts. Determine whether a valid new read is rejected, blocked before dispatch, or published without presentation. If necessary, exercise the real Settings controller rather than only its Spaces page and include additional mounted provider consumers. Do not infer the screenshot's cause from the recovered live `expired-read` episode.

3. **Repair only the demonstrated obsolete-scope boundary.** New enablement must not inherit pre-toggle retry, lease, attempt or authoritative-absence blockers; old callbacks must never clear or overwrite the current generation's reader/publication. If the failing sequence instead demonstrates identity invalidation or publication loss, fix that exact boundary without broadening identity matching or trusting stored display as fresh authority. Keep current-generation read coalescing and the existing failure backoff. The exact statement to edit is intentionally contingent on the failing diagnostic, not a guessed relaxation of safety checks.

4. **Retain adversarial completion ordering.** Complete older success and failure replies both before and after the latest success across repeated cycles. Include genuine membership/owner changes, failures and ready remote machines so prompt reattachment cannot be bought by accepting obsolete identity or inventing a pair. If workerless retention is implicated, preserve the existing prohibition on deriving a new child from closed task history or space names; report any necessary scope decision rather than silently changing that policy.

5. **Validate without touching the running installation.** Use disposable packaged-code fixtures. After targeted checks, run `CI=true npm run test:ci` once no other suite is running. Record final-head check statuses; draft-only workflows may skip suites, and skipped checks must never be reported as passed. Do not mark ready or merge. User-visible native verification remains unperformed unless a separately isolated authorized environment is available.

## Risks / Trade-offs

- [The original interaction still cannot be reproduced] → Do not ship a speculative fix. Report the passing matrix and missing failing facts, preserving the current protections.
- [A test scheduler masks native callback ordering] → Exercise inline spawn, yielded tasks, the existing 250 ms timer, delayed status completions and multiple independently loaded providers; explicitly distinguish fixture evidence from native evidence.
- [TTL or lease bypass introduces duplicate reads] → Assert one current reader per machine and generation, with old-generation completions unable to retire its successor.
- [Retained display accidentally grants actions] → Assert unverified contexts and colour/worker actions remain refused until a witnessed successful current read.

## Migration Plan

No new persisted schema or dependency is planned. Implementation changes only checkout source/tests and relevant documentation; deployment is outside this task. Ordinary source rollback restores the prior behavior without editing private runtime state. If diagnosis requires a new persistence policy or broader product behavior, stop and revise the plan rather than implementing it implicitly.
