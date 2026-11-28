# Fleet status transport, remembered presentation and recovery

## Global worker-space choice

Enabled Crew contributes **Separate space per project** to Settings → Spaces. One
hidden boolean in the existing plugin preferences is intent for all known homes,
not a selected-machine observation. It is independent of fleet attachment. The
existing recurring Spaces lifecycle emits `workspace.settings.refresh` for this
policy; there is no second scheduler or Settings-owned subprocess job.

The implementation follows Crew PR 23's documented v1 contract, reviewed at
`ad063414a63acd3cdb515a176d94144d2ef54faa` during review repair (v1 unchanged), and its
[contract handoff](https://github.com/timurproko/herdr-app/pull/88#issuecomment-7192748318).
The installed tool on each machine must answer
`crew config worker-space --capabilities --json` with exit 0 and
`worker-space-local-set`, version 1, both modes and `explicitHome: true`. File
path/mtime/size identity controls reuse of that exact probe, rechecked before
application. Help/version age cannot authorize it. Unsupported Crew disables the
row with a short machine-named reason; no install/update is performed.
The row stays a plain switch during normal checking, application and success;
only finished failures/refusals or confirmed unreachable machines add one short
line per machine, without a Pending/progress badge. Internal pending/lease facts
remain independent of this quiet projection. Held capability, discovery, read and
set fixtures resume on the existing lifecycle; abandoned reads recover after the
18-second command allowance. These fixtures reproduce transitional Pending, not
a permanent application stall or the duration/cause of the original screenshot.
A completed home-discovery refusal or malformed home reply is a failure, not
in-flight Pending: it shows one machine-named line even before any root is known.
Known custom roots may still reconcile after a default-home discovery failure;
the machine's discovery failure remains visible independently until discovery
succeeds. The existing ten-second retry cadence applies without an extra click.

The getter is `crew config worker-space` scoped through `CREW_HOME` to an already
known root; it must return `worker-space: combined` or `worker-space: per-project`.
Only the new setter is used for writes:
`crew config worker-space --set-local combined|per-project --home <absolute-home> --json`.
Its v1 envelope, exact canonical target/mode, ok/changed and exit status are checked,
then a getter confirms current intent. Exit 2 is a stable configuration refusal,
3 (`registry-busy`) stays pending, and 4/70 remain failed. Malformed/mismatched
replies cannot become success; uncertain publication requires a read before retry.
No owner identity, positional owner setter, direct registry edit, start/end,
initialization, lock manipulation or native space operation is involved. Only
future independent admissions change; existing workers and inherited work stay put.

A host-local catalog retains up to 256 exact machine/canonical-home targets,
including multiple homes per machine. Existing default-home status on every known
reachable machine, stored validated fleet identities/status observations and
successful existing-home inspections supply roots, not folder guesses or filesystem
scans. Crew's `knownFleetHomes()` seam admits existing remembered roots independently
of attachment, including before native display pruning; these are pending discovery
hints, never current-mode or action proof. Every root still needs installed capability
and fresh scoped mode reads before confirmation. Successful coordinator preparation
also reads Crew status from its returned launch folder to obtain the actual home,
without inferring a registry root from a cwd suffix. Failed optional observation
cannot authorize work or change the launch decision. Newly observed custom roots
are admitted separately. Outages and missing terminals do not erase them. Capacity
is explicit incomplete coverage.
The catalog, probe cache, observations, locks, failures and retries are excluded
from portable preferences. Restart rechecks confirmation and installed support.

One shared finite command lease serializes policy work across mounts; each command
uses the existing Crew execution transport with a 15-second allowance. A retired
or uncertain setter retains its 18-second deadline before replacement and readback,
including when intent changes or Crew is disabled/re-enabled before timeout receipt.
Timeout evidence is recorded before obsolete-continuation rejection; no fresh getter,
setter or confirmation may outrun that still-unsettled command allowance.
Healthy reinspection uses the existing ten-second cadence; transient target failures
retry after 2/5/10 seconds from completion, configuration refusals and unsupported
Crew after bounded 60-second reinspection. Reconnection reconsiders targets immediately;
changed executable identity also makes known homes eligible again. Saved intent wins
over external per-home changes on the next eligible check. This is eventual
application while the mounted desktop and transport are available, not an offline
machine service or a guarantee against another writer after confirmation.

## Presentation is not operational authority

`custom.fleet.display` version 1 is bounded host-local last-verified identity: machine,
coordinator/child space IDs, owner/home, owner tab/pane and adoption/placement identity. It holds
no task/PR inventory, reports, credentials or transcripts and is excluded from portable
preferences. Preference/plugin off immediately hides attachment and invalidates live
status, generations and retries, but does **not** erase that memory.

On enable, restart, mod replacement or update, exact remembered native spaces
restore coordinator/children nesting, numbered badges, coordinator-only Crew and
shared coordinator colour before any read completes. Native shortcut numbers remain truthful; the fleet's
saved colour remains untouched. Names and role hints never invent a first pair. Failed,
slow, interrupted or expired verification retains the picture. Successful contradictory
evidence atomically clears/replaces memory. Missing-space memory is ignored immediately
and pruned outside render only once that machine's layout is authoritative; a loading
remote snapshot cannot erase it.

Dragging the displayed coordinator reorders its whole same-machine block before
fresh verification; dragging a child reorders only that sibling within its parent.
Child targets clamp to their own sibling edges, never another coordinator/machine.
Native saved order is the only order store, so shortcuts, compact badges and final
connector placement follow acknowledgements. Parent fold keys normalize membership
rather than sibling order, including older saved keys. Capture, target edges and
every native acknowledgement revalidate the displayed relationship. This exception is **space ordering only**, not moving tabs
or terminals. Coordinator colour writes, new consolidated Git inventory reads, worker
navigation and operational actions still require current witnessed verification. Off/on
never restores old inventory; remembered-only coordinator Git uses the standard Loading
bulb until verified. An already-shown same-context list remains visible without body Loading or Stale
text; the existing native working bulb pulses in the Git header during updates.
Cold first reads use top-left Loading below Open/Closed and withhold partial successes.
Actionable repository notices remain visible, and retained display grants no reads/actions.

## Coordinator repository section order

The generic verified task-PR contribution includes the live task's exact native
child-space ID. Git associates canonical task PR repositories with those IDs in
the current machine/home scope; it never guesses from project labels, titles or
shell paths. A child whose live task links name exactly one distinct repository
can rank that repository. Multi-repository combined children cannot. The earliest
matching native child wins when several children share a repository. Unmatched
sections, including finished-only repositories with no remaining child, follow in
the existing baseline relative order (currently alphabetical). Both tabs and the
enrollment inventory use this same projection; PR-row order is unchanged.

Acknowledged sibling changes reproject the section order from native model facts
without a GitHub read, scope reset or new timer. Compatible warm/stale in-memory
facts retain associations solely for presentation; absent native children cannot
rank a section. Another machine/home/provider generation cannot borrow them, and
ordering grants no reads, navigation or persisted inventory.

## Project-space placement v1

Crew PR #22 keeps `crew.home` as the home tag and publishes versioned placement
labels on new workers. This adapter accepts legacy/combined `fm-crew-<home>`,
per-project `fm-crew-<home>-project-<registered-name>` and internal repair
`fm-crew-<home>-self`, including mixed populations. New placement labels require
`crew.space.version=1` and `crew.space.mode=combined|per-project`. A supplied task
project must match the placement project, with the documented `crew:self` to
registered `crew` repair exception. Older minimal fleet views omit
`tasks[].project`: combined identity is project-independent, so an omitted task
project permits a valid combined worker alongside legacy workers in the same space.
A present malformed or contradictory project still refuses; per-project placement
always requires authoritative matching task project evidence. No full-status retry,
label repair or worker restart is needed for combined fleets.
Per-project `crew.space.name` is saved repository display metadata, independent of
the authoritative project and automatic space ID. Registered aliases and directory
case/dots are retained; internal `crew:self` repairs may request `core` for a source
checkout named `core`. Legacy registered-name captions and internal `crew` remain
valid. A name must be a nonblank basename of at most 4096 characters, not `.` or
`..`, with no control characters, slash or backslash. Workers in one child must
agree on the saved name; explicit user renames still win in Spaces. The same
validation applies when restoring durable display. Combined omits a requested
name. Unknown versions, mismatching identity labels, unsafe/conflicting names and
nonmatching adoption IDs fail closed; names never establish membership.

Every worker still requires exact `crew.task`, home tag, `herdr.space` and actual
machine-qualified terminal/pane/tab/space membership. Project names are never
ownership evidence and cannot override explicit user-renamed space titles.
Multiple children share one coordinator/home Git scope, continuous sidebar stem
and whole-block reorder, without tab/terminal movement. Changed home adoption
replaces the old children; uncertain or structurally invalid display evidence
retains prior identity rather than publishing absence. Discovery cannot change
a verified task project or placement identity.

Combined spaces have no requested project name. Unless explicitly renamed, their
shown title follows the current/active/remembered worker directory, so `crew` and
`xrbuild` can alternate without any identity change. Titles never decide binding.

## Recorded-first reader contract

Verification uses:

```text
crew status --json --view fleet
```

Only an explicit `crew --help` advertisement permits `--view fleet`: old Crew silently
ignores unknown flags. Capability evidence is cached by the resolved CLI path and file
modification time in bounded host-local `custom.fleet.capabilities`, shared across mod
copies/reloads. Each PowerShell request rechecks that cheap file identity; an unchanged
installation does not run help again. Valid unchanged evidence can safely survive an app
session. A changed path/mtime triggers a new probe. Capability metadata is not action
proof and is never a portable preference.

Legacy verification uses projected `crew status --all --json`. `--all` is necessary to
retain finished Open/Draft PR candidates, regardless of task age. Crew owns its fleet
view/history policy; this app still checks GitHub eligibility. Only historical
Merged/Closed PRs expire, 24 hours after GitHub's actual completion timestamp.

After recorded verification publishes, shown Git's request can schedule a separate,
lower-priority read with `--discover-prs`. The first recorded inventory and attachment
never wait for GitHub discovery. Discovery can enrich only the same verified home,
owner and task membership; it never updates pair memory or renews verification age.
Changed membership requests higher-priority verification instead. An unchanged recorded
refresh preserves previous discovered links rather than briefly removing them.
Disabled Git makes no discovery request. The existing lifecycle services short-lived
shown-consumer intent; there is no extra discovery timer or hidden inventory worker.

The projected status shape remains:

```json
{
  "home": "canonical Crew home",
  "owner": {"terminal": "t1", "live": true},
  "tasks": [{"id": "task-id", "project": "herdr-app", "state": "working", "terminal": "t2", "pr": null}]
}
```

- Explicit `owner:null` is valid release evidence. Task states are preparing, working,
  reported, stopped, failed and closed. Only inactive tasks can have `terminal:null`.
- Discovery version 1 requires complete valid per-task status/url/source/reason fields:
  known uses a canonical HTTPS GitHub PR URL, recorded/github source and null reason;
  none uses null URL/source/reason; unavailable uses null URL/source and a bounded
  sanitized reason. Unknown/missing versions remain recorded-only, never confirmed none.
- Malformed required fields remain read uncertainty, never invented empty ownership.
  Exact live machine-qualified membership and adoption checks remain required.
  Task project is optional for legacy and v1 combined placement, required for
  per-project placement, and retained by the existing bounded transport projection
  whenever supplied. A present malformed project is a failed read, not absent evidence.
- No launch, recovery, standby, report/transcript or copy-return fields are consumed.

Recorded requests allow 15 seconds and discovery 25 seconds. Exact standalone unsupported
view/discovery refusals alone permit capability fallback; all attempts share a 40-second
command budget within a 45-second maximum envelope. Auth, timeout and transport errors
never trigger that fallback or mean none. Missing/unknown discovery versions reuse the
payload without another read. Only an actually requested discovery flag can fall back
for its refusal.

## Source projection and decoding

The existing `hc exec --json -- powershell -NoProfile -NonInteractive -Command ...`
transport projects unused legacy fields before Core Base64 encoding. No shell profile,
new filter process, remote companion or source-checkout import participates. PowerShell
5 ErrorRecords preserve exact unsupported-flag stderr and native exit codes. Stdout,
stderr and task projection use amortized constant-time collection and one join, not
quadratic growing-array concatenation. Size/task bounds remain one MiB / 4096 tasks;
projection never silently drops old Open/Draft PRs.

Base64/UTF-8 processing uses at most 65536 encoded characters / 48 KiB per piece,
4096-unit string buffers and UTF-8 carry. Between pieces, zero-delay one-shots yield
real native task turns; microtasks alone share the host's 500 ms watchdog budget.
Generation/token/identity checks run between pieces. Raw receipt publishes processing
phase before synchronous JSON/decoding, with its own two-second deadline.

## Why the old reader waited about 45 seconds

Native tasks belong to their initiating view. Cancelling/closing/reloading that view
can strand its native async promise permanently, without running catch or finally.
The SDK explicitly documents that cancelling a Task leaves its promise pending. In #51,
Settings could start the read while Spaces owned the recurring lifecycle. If Settings'
continuation disappeared before `hc` returned to JavaScript, **receipt never ran**, so
the new two-second processing deadline was never published. Spaces saw only the old
45-second **transport** lease and waited for it to expire. Decoder improvements could
not fix a continuation that never reached the decoder.

This was reproduced on App 0.1.18/Core 0.1.22 using the **real read-only Crew command/home**
in a disposable native instance. Closing only the fixture Settings view 300 ms after
its read started left the transport lease behind. The actual command wrote completion
at 3555 ms, but no native receipt callback ran. Spaces replaced the lease at 45119 ms;
verified publication/attachment occurred at approximately 48813 ms. A control with
Settings left mounted completed normally. No decoder error or watchdog interruption
occurred for that real payload.

The old live diagnostics do not identify which event destroyed/interrupted that
particular continuation, so they cannot prove whether it was a view closure, reload or
another native interruption. The reproduction establishes the stranded-owner mechanism
and the recovery defect, not a reconstructed history of the person's UI interactions.

Reads now belong to the recurring **Spaces** service. Settings/Git/menu instances request
or join it rather than owning IO. Other consumers can witness a current shared read,
never a completed persisted token. The actual owner's lifecycle renews a shared
two-second transport liveness lease only while its native Task is not done, bounded by
the original command envelope. A replaced owner, cancelled task or lost processing
continuation becomes replaceable after two seconds plus the next 250 ms lifecycle tick,
without finally or a previous attempt TTL. An expired continuation resuming before the
tick leaves its marker intact. Older leases without owner liveness receive the same
short recovery bound. Healthy 4–5-second commands stay single-flight while their owner
lives. Late predecessor replies cannot retire successors or renew freshness.

Ordinary failed verification retains the 2 s, 5 s, then repeated 10 s completion-based
backoff. Healthy verification retains its ten-second TTL; action freshness stays 30
seconds. Recovery ends on disablement, success, missing candidates or authoritative
absence. Sleep or a blocked UI delays callbacks; this is not a wall-clock guarantee.

## Real-path measurements

These are observed loaded-machine samples, not SLAs or additive component costs. Crew
was updated during investigation; do not compare changing history counts as a decoder
loss. Private replies remain only in ignored local artifacts, never in committed tests.

Before Crew's minimal view became available, the real Core path measured:

| Read | Wall ms | Stdout bytes |
| --- | ---: | ---: |
| Recorded legacy status | 2239 | 411513 |
| Legacy status with discovery | 6402 | 434515 |
| Production legacy discovery wrapper | 7499 | 46105 |
| Production recorded-only wrapper | 2137 | 23103 |

After the installed Crew advertised the fleet view, a later real-home sample contained
36 fleet-view tasks:

| Core/PowerShell path | Wall ms | Stdout bytes |
| --- | ---: | ---: |
| Trivial Node startup | 257 | 2 |
| Crew help | 275 | 4954 |
| Direct fleet recorded status | 319 | 8748 |
| Direct fleet discovery | 1043 | 8748 |
| Recorded wrapper, first probe | 512 | 8713 |
| Recorded wrapper, cached capability | 449 | 8713 |
| Discovery wrapper, cached capability | 1028 | 8713 |

The full disposable native path uses real Core/PowerShell/Crew collection and the actual
native decoder/provider/Settings/Spaces, translating only source terminal identities to
its own inert topology. A separate consumer mod exercises Git's fresh-context request.

| Native case | On → verified ms | On → attached render ms |
| --- | ---: | ---: |
| First pair, final three-copy run | 590 | 594 |
| Remembered off/on, same final run | 683 | 5 |
| Closing fixture Settings mid-read | about 630–679 | about 621–642 |
| Captured real 434515-byte legacy reply, first pair | 634 | 643 |
| Same captured reply, remembered on | 639 | 13 |

In the final three-copy run, verification commands took 580/519 ms and subsequent
separate discovery took 2641/2577 ms; discovery finished at 3444/3276 ms after on,
after first inventory eligibility. Exactly **one help probe** served both toggles and
all four reads. Decoder turns peaked at 5 ms, and first receipt-to-publication was
6 ms. An earlier real-path run observed faster discovery (1242/1226 ms), illustrating
network/load variability without delaying attachment or recorded inventory.
Native status reported no errors; attached-row screenshots were inspected. Another
native captured-real-reply run injected a failed read followed by a successful explicit
no-owner reply: memory stayed attached after failure and cleared on authoritative gone,
with no native errors.

With an intentional four-second transport delay and a reload of **only the disposable
Spaces owner**, the replacement started 2025 ms after the last heartbeat (2291 ms after
the old command started), not after 45 seconds. Its healthy replacement command took
4493 ms; first pairing verified at 6933 ms including injected delay and recovery. A
subsequent healthy delayed read verified at 4614 ms, with remembered picture at 14 ms.
The lost predecessor's private fixture command completion was also recorded; no person's
processes were stopped, restarted or altered.

A takeover rerun after the final reader/cache repairs used the current real home with
separate Spaces, Settings and inventory-consumer copies. First pairing verified in
797 ms and painted attached in 812 ms; remembered off/on painted attached in **6 ms**
and verified in **706 ms**. Recorded commands took 744/508 ms; separate discovery took
1251/1571 ms and completed 2101/2300 ms after on. One help probe served all four reads,
decoder turns peaked at 4 ms, and native status had no errors. The attached screenshot
showed adjacent rows, both chains/Crew pills and shared green numbered badges.
A fresh owner-reload run with the same intentional four-second delay replaced the
abandoned owner 2270 ms after its command started, rather than 45 seconds later.
First verification including recovery took 7038 ms; subsequent remembered attachment
took 17 ms while its healthy delayed verification took 4654 ms. Native status again
had no errors. Abandoned commands can finish without returning their capability fact;
that fault-injected case can therefore require another probe by the replacement.

## Regression and opt-in runner

- `fleet-toggle-live.test.mjs`: mounted local/remote Settings/Spaces, repeated toggles,
  same-render memory, zero completed reads, slow healthy commands, failures, large
  replies, lost processing turns, owner replacement and actual Spaces.drop calls.
- `fleet-refresh.test.mjs`, colour/menu and Git integration suites: memory preservation,
  missing-space pruning, cold restoration, exact identity, remembered-only action refusals,
  independent consumer witnessing, cold Loading versus warm header activity and no cross-toggle inventory.
- `fleet-transport.test.mjs`: recorded-first reads, shared capability evidence, isolated
  discovery, Task cancellation with permanently pending promise, cross-copy two-second
  recovery, healthy long reads, enrichment age and obsolete-reply guards.
- `fleet-command.test.mjs`: real Windows PowerShell projection, path/mtime capability
  invalidation, unsupported refusals, UTF-8, malformed shapes and 5k/20k/50k-line scaling.
- `base64.test.mjs`: bounded pieces, split UTF-8, cancellation, one MiB and 4096 tasks.

`tests/features/fleet-real-native.mjs --run --real-home <explicit-home>` is Windows-only
and opt-in. `--discovery` adds a separate inventory consumer; `--replay <captured-json>`
replays a private real reply through production PowerShell projection; `--lose-settings`
closes only its own Settings; `--fail-and-gone` injects failure and then authoritative
no-owner into disposable transport/projection; `--reload-owner --delay 4000` replaces only its own sidebar
and delays its own child. `--baseline` loads #51's provider/reader for comparison. It
creates and stops only its disposable app/Core session and inert terminals. Evidence
(JSON timings/phases, native status and screenshots) stays under `.artifacts/fr-*/`.
The user's installed app, preferences and Crew home are never written. The older
synthetic native runners remain useful for bounded decoder fixtures but are not proof
of real Crew collection latency.
