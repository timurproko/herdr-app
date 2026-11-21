# Shared A1 API and space-color contract

## Coordinated rollout — not deployed

This source targets A1 integration **protocol 1**, merged in
[timurproko/a1#939](https://github.com/timurproko/a1/pull/939).
Customization plugin version is **3.1.0**. Only this current API is supported;
there are no older-protocol adapters or stored-state migrations.
Source and customization build are ready; deployment awaits publication and
installation of the matching A1 release. These yadm-managed files are delivered
separately from A1.

Before deployment, each target machine must have the matching A1 public API.
Old immutable running sessions remain usable but unavailable to this controller;
never restart agents, inject input, repair/delete labels or patch binaries to
upgrade color control. Building/testing these sources does not change the installed
consumer, user preferences or unrelated stored state.

## One public invocation contract

Execute a literal argument array: `a1 api <request-json>`. JSON alone selects the
operation. This is A1's own protocol, inspired by Pi correlation conventions,
not Pi RPC or a second agent process. Private pipes/sockets and profile files
are not consumer interfaces.

Request fields: `version: 1`, bounded `id`, `type`, plus operation fields.
Responses contain matching version/id, `type: response`, matching `command`,
`success`, and either `data` or `error: {code,message}`. Ordinary stdout is one
LF-terminated JSON record, at most 8192 UTF-8 bytes. Requests are at most 4096
bytes. LF alone separates records; Unicode line/paragraph separators inside
JSON strings do not. Zero exit means success; nonzero means structured failure.
The shared client preserves error code/message and the failed envelope.

Implemented operations:

- `capabilities`: delivered operations, `launchColor`, `terminalIdentity`, snapshots.
- `settings.list`: supported descriptors and declaration-derived choices.
- `settings.get` / `settings.update`: require `setting` and `target`; update adds `value`.
- `session.get`: bounded exact active-session identity/name/revision snapshot.
- `session.rename`: guarded external manual naming, with the current expectedNameRevision; retained by the reusable client, not called by the Agents sidebar.

Targets are `{scope:"profile",profileId:"a1"}` or
`{scope:"session",sessionId,runtimeId}`. Both session identities are complete
UUIDs. There is no implicit current-session selector. Unsupported version,
operation, scope, setting, value or stale identity fails before mutation.

Color policy uses profile `defaultAccentColor` and session `accentColor`. Compatible A1 versions additionally expose boolean session `sessionAutoName` for external applications. The client accepts both string and boolean descriptors so additive naming support cannot break color discovery.
Setting readback carries exact target, setting, storedValue, effectiveValue,
origin and application. Session updates return `status: applied` / `application:
live`; profile updates return `status: stored` / `application: next-session`.
For colors, session storedValue is an ephemeral selection, not a disk write. Profile
reads describe future initialization, not the color of any already-running agent.
For `sessionAutoName`, storedValue is null and origin is profile until overridden;
effectiveValue is boolean. An explicit boolean override has origin session, persists
across resume and takes precedence over profile policy. Disabling cancels pending
naming and preserves the current name; enabling only permits future ordinarily
eligible naming and never overwrites a manual name. Setup-only sessions without a
persistent conversation file cannot acknowledge a durable update.

The Agents sidebar no longer offers Rename, an inline editor, a naming gate or the
Sidebar rename setting, even if an old `renameSession` preference is present. Pin,
Close, tab/space naming and native A1-to-Herdr name reporting remain unchanged.
External applications can disable `sessionAutoName`, read `session.get` and call
`session.rename` through the shared client; there is no new sidebar toggle.

The settings service shared with A1 Settings owns validation, persistence,
refresh and session initialization. Profile writes are atomic per-key assignments,
preserving unrelated concurrent/unknown data; same-key assignments are last-writer-wins.
Engine settings remain behind A1's existing neutral settings port/Pi coordinator
and are not exposed in this slice.

A1 retains private process liveness, nonce, runtime/session binding generation,
serialized requests, bounded deadlines and applied acknowledgement. Timeout or
lost acknowledgement is not success and never creates a replay queue. Read a
fresh exact target before a separately chosen retry. The client validates version,
correlation, command, response-vs-event type, exact target, setting and applied
value/status; JSON parse success is insufficient.

## Shared consumer boundary

- `src/plugins/api.cjs`: supported Node plugin API; reusable executable/npm
  resolution, bounded literal subprocess calls, envelope/errors and exact targets.
  It contains no palette, space membership or reconciliation policy.
- `tools/plugins.mjs`: packages that API beside plugins and embeds it verbatim
  in the explicit `plugins.nodeWorkers` transport entries. Deterministic gzip
  keeps Windows/Core `node -e` below command-length limits. Local files and remote
  transported workers are self-contained, with no source-checkout imports or
  remote companion installation.
- `src/plugins/a1-colors/session-color.cjs`: native identity, captured membership,
  descriptor palette allowlist and expiring read/update color policy.
- `session-sync.js`: all live panes, single-flight per-machine groups, immediate
  membership/color reconciliation plus five-second fallback while active.
- `palette.js`: Herdr's visual space-palette mapping; available API values are
  checked against A1's descriptor, not a color-only inventory command.

Windows explicit executable/npm paths resolve only within that installation,
never to an unrelated PATH installation. Relative explicit paths fail safely for
external control because worker cwd is not the launch directory; configure an
absolute path instead. Ordinary profile startup argv is not rewritten for this.
The profile launcher attaches the exact
explicit configured A1 command as `custom.profile.a1-command` at terminal birth
because the actual terminal argv is a shell wrapper. It is only a routing hint:
native identity and the API still authorize the target. Captured hints are
rechecked with membership before writes. Direct A1 terminal argv is also retained;
ordinary manual shell starts without an installation hint use that machine's
normal `a1` command. No old labels are repaired or inferred from titles.

## First visible frame and replacements

Supported explicit interactive profiles in a known space receive
`--session-color <latest-space-color>` before startup and before a literal `--`
prompt boundary. The coordinated current contract is required; startup deliberately
has no capability/version probes or retries. Unknown flags, wrappers, comparison
`a1 pi`, CLI commands and user overrides are not rewritten. Literal prompt tokens
and configured executable paths remain unchanged.

Default color persists only in the selected A1 profile. Current color changes
only the exact live session. Startup overrides never persist or leak into tool
or shell environments. Successful new/resume/fork/import initializes from the
invocation override, otherwise latest Default; failed/cancelled replacement keeps
the old session/color. Live API changes do not replace invocation policy.
Manual starts/new-space launches without an ID gain subsequent live matching,
not a guaranteed first-frame match. Disabling matching stops new writes without
restoring previous colors; an already-admitted request may finish.

## Native identity and safety

A1 publishes complete `a1.session`, `a1.runtime`, `a1.at` labels only after its
endpoint is ready, and refreshes at the bounded producer cadence. Herdr accepts
**native labels only**: 90-second TTL and five-second future tolerance. Legacy
`custom.a1.*`, partial, stale, wrong-runtime, stopped or wrong-app targets fail
closed. Labels are discovery hints, not authorization. Fresh live A1 state and
captured terminal/space/tab/installation membership are rechecked before writes.
A move after the final check can still race an already-admitted update: no atomic
membership-and-setting transaction is claimed.

No service, inbound port, native patch, label repair or process restart is added.
Best-effort failures stay quiet in the UI, with bounded structured worker errors
available for diagnostics; there are no repeated toasts or persistent jobs.

## Fixture checks

`tests/a1-client.test.mjs` covers shared resolution, envelopes, LF framing, literal
metacharacters, structured errors and self-contained packaged file/transport entry.
Plugin fixtures cover local/remote membership, inactivity, rapid changes,
expiry and acknowledgements. `tests/a1-startup-color.test.mjs` retains conservative
argv/override/disabled matching and explicit-installation hint assertions.

`tests/a1-api-candidate.test.mjs`, with `A1_API_CANDIDATE_ROOT` selecting a built A1
checkout, runs the canonical client/color policy against that candidate's actual
public CLI and disposable runtime fixtures, proving exact targeting, independent
sessions and stale replacement refusal. Without that explicit candidate it reports
SKIP; ordinary mocks alone are not cross-project wire evidence. No test mutates
an installed user agent. Build/fixture success does not claim deployment or
interactive certification.
