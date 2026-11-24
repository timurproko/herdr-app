# Fleet status transport and recovery

## Reader contract for Crew

The preferred command is:

```text
crew status --json --view fleet --discover-prs
```

`crew --help` must explicitly advertise **--view fleet** before the reader uses
it. Older Crew silently ignores unknown status flags; blindly passing the flag
without `--all` would lose finished-task PRs. The probe runs in the existing
read-only PowerShell request, not a separate remote round trip or daemon.
The fleet view itself includes eligible history; the app does not add `--all`.

Expected output:

```json
{
  "home": "canonical Crew home",
  "owner": {"terminal": "t1", "live": true},
  "tasks": [{
    "id": "task-id",
    "state": "working",
    "terminal": "t2",
    "pr": null,
    "prDiscovery": {"status": "none", "url": null, "source": null, "reason": null}
  }],
  "prDiscovery": {"version": 1}
}
```

- `owner` can explicitly be `null`. Task state is preparing, working, reported,
  stopped, failed or closed. Only non-working/non-reported tasks may have a null
  terminal. The existing exact native owner/worker membership checks remain.
- Discovery version 1 is complete for every task: known means a canonical HTTPS
  GitHub PR URL, source recorded/github and null reason; none means null URL,
  source and reason; unavailable means null URL/source and a sanitized reason.
  Unknown/missing versions remain recorded-only, not confirmed absence.
- Include all live tasks and finished-task PR candidates. A finished task's
  Open/Draft PR remains eligible regardless of task age. Only Merged/Closed PRs
  expire, 24 hours after GitHub's actual closed/merged time. Unknown state or time
  must not be silently treated as old closed history. Crew owns any source-side
  recorded state/closedAt and bounded historical-candidate/cursor policy; this app
  still checks GitHub eligibility. A closed-task-age cutoff is incompatible.
- No launch, standby, fallback, Core report, recovery, elapsed, copy-return or
  report-path fields are consumed. No task reports or transcripts are needed.

The minimal view is a separate Crew capability, **not implemented in this
repository**. An exact standalone unsupported `--view`/fleet-view refusal allows
projected legacy `crew status --all --json --discover-prs`. An exact unsupported
`--discover-prs` refusal permits recorded-only status. Both use the same view
selection/projection rules. Errors containing auth failures, extra diagnostics,
timeouts or unrelated unsupported options never trigger capability retries.
The primary command allows 25 seconds; recorded-only allows 15 seconds. All
capability attempts together have a 40-second budget inside the existing
45-second transport lease; later attempts receive only the remaining allowance.

## Legacy projection

On older Crew, `--all` is necessary to retain finished Open/Draft PRs. The
PowerShell transport projects the fields above **before hc encodes stdout**.
It preserves malformed required shapes and missing fields for strict rejection,
not invented `owner:null`, `tasks:[]` or terminal/discovery nulls. Native exit
codes and raw unsupported-flag stderr survive PowerShell 5's ErrorRecord layer.
No extra filter process, remote companion, file write or source-checkout import
is introduced. The help probe adds one small Node invocation inside that request.
Stdout and stderr use amortized-constant-time list appends and a single join;
array `+=` recopies preceding lines and made a valid 830476-byte / 49161-line
legacy reply exceed the command allowance. Task projection is likewise a single
collecting pass, not repeated growing-array/string concatenation. The Windows
regression scales both input lines and projected task counts at 5k/400, 20k/1600
and 50k/4096, enforcing near-linear whole-wrapper wall-time ratios.

A read-only sample on this machine had 237 tasks: legacy output was 398866 bytes,
projected output 42647 bytes (about 89% less). One timing sample measured 3054 ms
for the old PowerShell status and 3188 ms projected; bare Node status itself took
3244 ms. These are noisy sequential observations, not a guaranteed latency or a
claim that the command currently completes under two seconds.

Projection bounds *fields*, not the number of legacy historical records. Legacy
Crew still enumerates every finished task; replacing that growth requires the
separate minimal fleet view and its source-side history policy. The app retains
its one-MiB/4096-task validation limits and does not silently truncate old Open PRs
or read Crew's private task files to invent its own index.

## Watchdog-safe response processing

A native App 0.1.17 reproduction started verified, selected the fleet and focused
one of seven worker tabs, then switched off/on with Settings open. A valid
approximately 925 KiB reply interrupted the old synchronous Base64 decoder under
the host's **500 ms task watchdog**. That interruption is uncatchable: catch and
finally did not release the read. After 45 seconds the existing diagnostics
recorded `expired-read`, with attempted and current generation both 2. The
preference was on, but display/links remained absent. This proves that mechanism;
the original person's exact payload and CPU scheduling were not recovered.

The decoder now processes at most 65536 encoded characters / 48 KiB of bytes per
piece, converts strings in at most 4096 UTF-16 units, and carries split UTF-8
characters. Fleet reads yield a real native task turn between pieces using
zero-delay one-shot callbacks. Microtasks alone share the watchdog budget and
are insufficient. These callbacks are bounded work for a response, not a second
recovery/polling scheduler. Obsolete generation/identity checks run between pieces.

Raw receipt is published **before** JSON parsing or decoding. The runtime reader
then has a two-second processing deadline. If its continuation disappears, the
existing 250 ms Spaces lifecycle replaces that reader on expiry, without waiting
for finally, the ten-second attempt TTL or the transport lease. The finished
command cannot overlap another command. If a late decoder resumes after that
deadline but before the lifecycle tick, its expired processing lease is retained
as a recovery marker rather than deleted by finally; otherwise a warm reader's
previous ten-second attempt TTL could suppress recovery. Successful completions
and ordinary failures still retire their leases. Capability fallback returns to
transport phase within the original finite transport deadline. Older unphased leases remain
finite at their original deadline; they cannot be assumed to have received data.
No generation, token, exact identity, freshness or action-authority guard is relaxed.

## Git verification presentation

While attachment is enabled, a uniquely routed coordinator candidate uses the
ordinary panelMessage **Loading** working bulb, including before any failure.
There is no special **Verifying** header and no plain waiting sentence; sanitized
reason/time/generation remain in the loading tooltip. A previously loaded list
retains its existing **Stale** treatment, folds and counts without reads or worker
actions. Off displays ordinary Git but keeps one private last inventory; on may
restore it only through the provider's session-only retained identity with the
same machine/owner/parent/tab/pane and extant nonconflicting fleet. No inventory
is persisted or converted into current authority. Changed identity, authoritative
absence or a cold module cannot inherit those rows. Enabled pending/recovery
never substitutes the coordinator's ordinary Not a git repository result.
Historical PR scope for a still-verified owner/home remains independent of whether
a live worker is present, as before.

## Whole-path Windows measurement

App 0.1.17, Custom theme, seven live inert workers, actual fleet selected and worker
focused, Settings kept mounted across off/on. The test runs the production status
reader through **real Core exec → Windows PowerShell → fake legacy Crew CLI →
projection → hc Base64 → native decoder/provider → display publication**. It does
not bypass the wrapper. Fixtures are pretty-printed JSON; 400 KiB models today's
237-task byte volume with unused data, not a copy of private task records.

| Input bytes | Lines / tasks | Command wall ms | Native stdout bytes | Longest decoder turn ms | On → attached ms |
|---:|---:|---:|---:|---:|---:|
| 10240 | 490 / 40 | 450 | 2524 | 1 | 454 |
| 409600 | 2854 / 237 | 473 | 14875 | 6 | 483 |
| 1048576 | 49162 / 4096 | 1046 | 261088 | 21 | 1206 |

Command wall time includes hc/Core, PowerShell startup, help/status Node calls,
stdout collection and field projection, ending at native raw receipt. Decoder
turns include initial cleanup/buffers and the final join but exclude actual task
waits (one-ms clock resolution). On-to-attached starts at the actual Settings
handler and ends at display publication, including processing and validation.
These are measured synthetic-data transport costs, not guarantees for real Crew
collection, GitHub or SSH. A separate three-second read was inspected natively:
Git shows the blue working bulb + Loading, with no extra header or non-repo text.
The opt-in runner records JSON, native status/errors and screenshot in its ignored
`.artifacts/fs-*/` directory and cleans up only its own app/Core session.

## Regression evidence

`tests/fleet-toggle-live.test.mjs` covers selected coordinator/fleet, one/seven
workers, local/ready-remote groups, repeated 0/1/15-second off intervals, delayed
old success/failure replies in both orders, one-MiB replies, and a deliberately
lost decoder turn. Both cold and warm abandoned processing recover at two seconds,
including within a previous successful attempt's ten-second TTL. Both continuation
orders are covered: resumption after replacement cannot overwrite recovered facts;
resumption at 2100 ms before any lifecycle callback still starts fresh local/remote
verification at the first tick at 2250 ms, without renewing old freshness.

`src/plugins/crew/base64.test.mjs` covers bulk-call bounds, UTF-8 across byte/string
piece boundaries, cancellation between pieces, one MiB and 4096-task validation.
`fleet-command.test.mjs` executes the actual projection under Windows PowerShell,
with a disposable CLI, large unused fields, UTF-8, old Open history, malformed
shapes and exact stderr/exit preservation. Transport fixtures cover explicit view
and discovery refusals and the joint command deadline.

The opt-in `tests/features/fleet-toggle-native.mjs` starts only its own disposable
app/Core session and eight inert Node terminals. It uses actual native topology,
fleet selection, focused worker, Settings/Spaces/provider instances and scheduler;
Crew output alone is synthetic. It never starts real A1, reads real credentials
or alters the person's installation. With App 0.1.17, nine repeated cycles using
one-MiB responses (including 4096 tasks) passed. Ordinary attachment took
1322–1486 ms with a 750 ms simulated command. Decoder pieces peaked at 24 ms;
JSON parsing plus task validation/mapping peaked at 16 ms. A deliberately
uncatchable interrupted continuation was replaced 2084 ms after raw receipt,
then recovered, rather than waiting 45 seconds. This is native scheduler and
rendered-UI evidence, not live Crew/network/SSH or real A1 behavior.
