# Private action handoff

An explicit Settings action starts one loopback-only, single-use WebSocket bridge.
Its payload stays in memory and reaches the fixed owner worker through stdin.
There is no permanent service, temporary secret file, argv/environment payload or
shared-state rendezvous. Sessions expire within 60 seconds, reject browser Origin
requests, disable compression and cap input at 256 KiB. Closing an authenticated
socket terminates the bridge and any still-running worker; a possibly completed
setup must be reconciled from destination status, never replayed automatically.

The Trello route additionally captures a configured direct-SSH Core/session and
execution user/home, verifies READY before stdin payload, and uses only existing
host-key/key-auth trust. The bridge remains local; no listener runs remotely.
Temporary/custom-via/unverifiable/elevated identities refuse rather than falling
back to local setup. Only a fixed owner worker or public Trello-only runtime
installer is reachable, never a caller-supplied command/path/script. Runtime
installation reuses the owned launcher module, refuses conflicts, preserves
private files and keeps a public rollback snapshot. Tests inject SSH/identities.

`vendor/ws/` is the unmodified npm `ws@8.23.0` package (MIT):

- npm tarball integrity: `sha512-wCkmX8QMOrKjgO8HW2WyDbTSGeqkocxgDzS9iR79rEAexty6/2qzilx3Ag8Tqf9ykop3irLKle0MtVn5qjVnoQ==`
- npm shasum: `e1af4314ad9d4cfde4684d08a9f09b322830e84e`
- Upstream: https://github.com/websockets/ws
- Full license is retained and shipped as `vendor/ws/LICENSE.txt`.

The fixed entry disables ws's optional native addons before loading it. Review
focus: bounded receive payload, no per-message compression, no caller-controlled
URL/command/path, first-frame session check, consumed-session rejection, sanitized
fixed-worker JSON, hard lifetime and disconnect cleanup. No third-party code is
modified or downloaded at runtime. Tests inject fake workers and transport.
