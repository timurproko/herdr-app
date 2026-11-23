# Tab-move Core 0.1.22 review

## Cause and decision

App **0.1.16** was already reviewed. The running local Core's read-only `hello`
reported **0.1.22**, generation **1**, and all required methods. The old private
adapter allowed only Cores 0.1.19/0.1.21, so it refused preflight before reading a
layout. That same local gate also prevents routing a move to reviewed pc2 Core
0.1.19. This is compatibility-review lag, not a missing native command or a
copy-toast regression.

The gate was imported in `12867b4` and its adapter/worker/bridge did not change
through `e3beda6`; neither copy-toast commit (`7ab56d6`, `e3beda6`) touched them.
Installed adapter, worker, bridge and menu bytes matched that head at investigation.
The regression begins when unreviewed Core 0.1.22 starts; repository history does
not establish the exact local upgrade/start time.

Review finding: **Core 0.1.22** retains the needed semantics. The person then
explicitly requested capability-based eligibility: App **0.1.15+**, Core
**0.1.19+**, generation **1**, required methods/App commands and recognized v1
document shape. Reviewed lists are evidence only; newer unreviewed versions work
when these and identity/session, expiry and CAS checks pass. No remote companion,
deployment or native changes are implied.

## Immutable evidence

Compared Core 0.1.21 commit `1b0393f80c35b1dae34f37934d33d0144a8fc8d7` with
0.1.22 commit `6e2984629fcd600b0165f69b2e5b0bda5985ec1c` (November 22, 2026).

[Full comparison](https://github.com/herdrdev/herdr-core/compare/1b0393f80c35b1dae34f37934d33d0144a8fc8d7...6e2984629fcd600b0165f69b2e5b0bda5985ec1c).
Read the following at the latter immutable commit; hashes are Git blob SHA-1s,
not hashes of rendered GitHub responses. Paths below `src/` are relative to
`crates/herdr-core/`; `schema/` is relative to the repository root.

| Path | Reviewed blob |
| --- | --- |
| `src/api.rs` | `06889e5d4f69918321920078e04a05c80ae856a5` |
| `src/api/doc.rs` | `b9fcbf3dd239e4c40f756766308cac090987ff55` |
| `src/api/types.rs` | `ce42234d2ab1843ad90de77d74edcf14c5fa80eb` |
| `src/events.rs` | `1a6071f5c8b78ecd5a8df5e2506179b6d6143009` |
| `src/remote.rs` | `b03cef1ac058d19bd4f647870ef4cdbb75e8045e` |
| `src/remote/run.rs` | `d6e30224cdf0209eb1b09581594e7cd7ba5abe20` |
| `src/runtime.rs` | `9e287161a97303c21d66d247117794e9026ba22b` |
| `src/runtime/persistence.rs` | `e3b44839c777c9b6282e41eb2aedb8054dece75a` |
| `src/paths.rs` | `6889a1b618227d2459bbb8a500a2aa1969dce53b` |
| `src/server.rs` | `3505629c7c913ee47825ff3ff2788fd0b273830b` |
| `src/cli.rs` | `87a9e7bf072db1595ddf80621bcc7cec4e22b965` |
| `src/platform/windows.rs` | `6960044c93ce3805df543ab8daaf6ec03ce635b5` |
| `schema/hc.openrpc.json` | `a670005d2d90a52dbc9d47181a9a8c3406b4b8ab` |

## Contract findings

- **Handshake and shapes:** generation remains 1; `hello` reports the running
  version, stable Core identity and method names. Published request/result shapes
  for hello, document reads/writes, terminal get/list/label remain unchanged;
  `CoreInfo`, `HelloResult`, `DocGetResult` and `DocSetResult` are unchanged.
- **Document persistence:** `api/doc.rs` still validates names and the 1 MiB size,
  compares the supplied version under the state lock, increments safely, persists
  the full document store with `write_atomic`, and restores the previous in-memory
  entry if saving fails. `paths.rs` writes/syncs a sibling temporary file then
  renames it. No terminal-registry background retry was added to `doc.set`.
  A successful write emits the same name/version doc event. Internal RPC error
  code changes from -32000 to -32603; the adapter uses `data.kind`, not that code.
  Only `conflict` is retried; other write errors retain readback/unknown handling.
- **Events and App visibility:** named-document subscription filters are added.
  An existing unfiltered subscriber still receives every document event; terminal
  filtering alone still excludes documents. `remote.rs` forwards a direct peer's
  doc event with the machine name; missed document streams still trigger refetch.
  Thus the reviewed App's existing unfiltered reconciliation remains supported.
- **Routing:** `server.rs` still routes before local dispatch. `remote::route`
  consumes `on` for document operations and strips only the terminal address's
  machine prefix for terminal operations. `remote/run.rs` retains opaque document
  results, localizing terminal results only. Its new callback-grant policy applies
  only to `terminal.run`, which moving never calls. Ordinary doc/get/label
  forwarding is single-attempt, not the reconnecting wait path. Machine/session
  pinning and the adapter's separate read-only remote hello remain necessary.
- **Terminal persistence and label errors:** `terminal.label` changes labels in
  memory, queues the newest registry snapshot, emits the label event, then awaits
  `flush_saved`. Failure or its ten-second timeout can return **unavailable after
  labels changed**. The writer retries the newest snapshot (not a move request).
  `terminal.get/list` use `flush_observed`, retaining observed facts after a
  completed save failure, but can still time out. The existing worker catches a
  label error as metadata partial success, never rolls back the committed layout,
  and explicit repair derives membership from the current document. Even if the
  in-memory labels already match, a reported persistence error remains partial;
  successful reads alone cannot certify disk durability while the disk is broken.
- **Connection/Windows changes:** `hc connect` counts plain replies and waits for
  owed responses after stdin EOF instead of prematurely disconnecting Windows
  pipes. Persistent EOF signaling prevents a later read hanging. The adapter
  keeps stdin open for correlated JSON lines and closes only its own short-lived
  client after replies; no new framing or Core restart is required.

A specific future risk remains: if `doc.set` silently stops checking the expected
version while keeping generation 1 and its method name, a stale whole-document
write could overwrite another client's newly added tabs. If it acknowledges before
atomic durable persistence, an accepted move could be lost on crash. Capability
checks cannot prove these semantics. The requested policy does not retain an
exact-version pin to address that risk; the real CAS call, structural preservation,
readback and conservative unknown/partial handling remain mandatory.

No incompatible safety contract was found in 0.1.22. This review concerns source/API
compatibility, not proof of installed binary provenance or live multi-client
session continuity. The known whole-document/unflushed-client and non-CAS label
races in [the ADR](TAB-MOVE-ADR.md) remain unchanged.

## Regression coverage and limits

The synthetic adapter suite covers all exact reviewed App/Core pairs, routing
from 0.1.22 to 0.1.19, unchanged opaque payloads, unknown local/remote versions,
generation/method/identity failures, CAS conflicts, failed document persistence,
uncertain replies and label-unavailable both before and after in-memory updates.
A menu fixture connects the real worker's preflight to the destination/refusal UI.
Newer unreviewed versions with complete capabilities pass; missing capabilities,
unknown generation and below-minimum versions refuse. These tests do not execute
downloaded Rust or mutate live workspaces. No native
continuity/concurrency or new pixel validation is claimed; those remain separate,
explicitly authorized disposable checks. No deployment was performed.
