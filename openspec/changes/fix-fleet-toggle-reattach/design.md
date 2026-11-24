# Design

## Context

See proposal.md for motivation. The baseline is origin/main at a2f3442, including PR 44. Settings writes the preference through `updateSpacePreferences`, bumps the shared fleet generation, clears links/read leases and emits `workspace.context.refresh`. Crew yields before `refreshFleets`, shares a 45-second reader lease, applies a ten-second attempt TTL and thirty-second action freshness, and rejects generation/token/identity-obsolete completions. Spaces already emits its lifecycle every 250 ms.

The packaged harness and small native replies passed even with the fleet selected, seven live worker tabs and pre-off readers completing after on. A disposable App 0.1.17 with real isolated Core topology reproduced the failure using a valid ~925 KiB reply: the task watchdog interrupted `decodeBase64`, bypassing catch/finally, leaving on plus independent rows. After 45 seconds diagnostics recorded `expired-read` with attempted/current generation 2. The current read had started immediately: generation invalidation was not the cause of this reproduction. Current real raw status measured ~394 KiB; load may explain the original episode, but its exact original payload/scheduling was not recovered.

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

3. **Bound synchronous response work and independently retire abandoned processing.** Replace per-quartet arrays and per-character string calls in the pure Base64/UTF-8 decoder with fixed-size typed buffers and bulk string chunks. Keep the same public helper, UTF-8 semantics and parser limits. Mark raw reply receipt before JSON parsing/decoding, shortening only that reader's response-processing deadline to two seconds. The existing Spaces lifecycle replaces an expired processing lease even when the previous continuation's finally never ran, bypassing old attempt TTL/backoff only for that abandoned processing. Keep the original 45-second transport bound, generation/token/identity checks, and normal failure backoff. A capability fallback explicitly returns to transport phase within the same original deadline. Measure JSON.parse and task validation/mapping at the one-MiB/4096-task boundary in native execution; chunk or yield further work if those stages approach the watchdog.

4. **Reduce transport payload without changing history policy.** Run the exact read-only `crew status --json --view fleet --discover-prs` when `crew --help` explicitly advertises the new view; otherwise use `crew status --all --json --discover-prs`. Older Crew silently ignores unknown status flags, so an advertisement probe is necessary, not optimistic invocation alone. Retain narrowly matched unsupported-flag fallback, plus the existing discover capability fallback, within a shared bounded transport budget. Project home, owner.terminal/live, tasks.id/state/terminal/pr/prDiscovery and root prDiscovery.version in the existing PowerShell transport before native Base64 decoding; preserve malformed required shapes for normal rejection rather than coercing them into absence. No new child-based filter or companion is required. The expected fleet-view v1 contract includes live tasks and historical PR candidates not known merged/closed beyond 24 hours, preserving indefinitely Open/Draft finished-task PRs. Crew owns recorded GitHub state/closedAt and source-side bounded history; this repository neither implements that separate option nor drops old Open PRs. Legacy source enumeration remains unbounded until Crew supplies the capability, even though unused transport fields are removed.

5. **Retain adversarial completion ordering.** Complete older success and failure replies both before and after the latest success across repeated cycles. Include genuine membership/owner changes, failures and ready remote machines so prompt reattachment cannot be bought by accepting obsolete identity or inventing a pair. If workerless retention is implicated, preserve the existing prohibition on deriving a new child from closed task history or space names; report any necessary scope decision rather than silently changing that policy.

6. **Validate without touching the running installation.** Use disposable packaged-code fixtures. After targeted checks, run `CI=true npm run test:ci` once no other suite is running. Record final-head check statuses; draft-only workflows may skip suites, and skipped checks must never be reported as passed. Do not mark ready or merge. User-visible native verification remains unperformed unless a separately isolated authorized environment is available.

## Risks / Trade-offs

- [The original interaction still cannot be reproduced] → Do not ship a speculative fix. Report the passing matrix and missing failing facts, preserving the current protections.
- [A test scheduler masks native callback ordering] → Exercise inline spawn, yielded tasks, the existing 250 ms timer, delayed status completions and multiple independently loaded providers; explicitly distinguish fixture evidence from native evidence.
- [TTL or lease bypass introduces duplicate reads] → Assert one current reader per machine and generation, with old-generation completions unable to retire its successor.
- [Retained display accidentally grants actions] → Assert unverified contexts and colour/worker actions remain refused until a witnessed successful current read.

## Migration Plan

The runtime-only read lease gains a reply-processing phase/deadline; older readers without it retain the original finite transport lease. No new durable schema or dependency is planned. Implementation changes only checkout source/tests and relevant documentation; deployment is outside this task. Ordinary source rollback restores the prior behavior without editing private runtime state. If diagnosis requires a new persistence policy or broader product behavior, stop and revise the plan rather than implementing it implicitly.
