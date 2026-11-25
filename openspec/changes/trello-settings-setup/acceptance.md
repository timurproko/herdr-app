# Trello Settings acceptance

## Delivered behavior

- The shared declarative form masks secret input, never persists it as settings, retires submitted native input/undo state and rejects stale callbacks.
- Settings sends credential input through the bounded loopback bridge into the fixed owner worker's stdin. Only the protected existing store receives credentials; saved values are never returned to the UI.
- The card verifies account identity before save, supports Verify saved and confirmed Replace/Remove, and includes official token-generation help.
- Named board discovery is owner-only; explicit Add/Remove changes local scope. Agent boards list remains allowlisted and incomplete discovery preserves unseen grants.
- Access changes explicitly update local write permission and the public gate; imported preferences cannot populate the private policy. Remote-selected setup clearly refuses before local IO.
- Headless commands and version-1 stores remain supported. Successful Settings replacement/removal clears local authority; removing the file does not revoke the token at Trello.

## Isolated checks

Targeted suites passed for transient renderer/forms, private transport, owner setup, existing CLI/reads/writes/real credential protection, full card composition, plugin UI contract, shared Crew/geometry/error regressions, actual installed owner/bridge flow, architecture, installed-export and preferences-home. No broad local suite or real Trello request was run.

## Running-app proof

App 0.1.18 was downloaded into the task evidence folder, not installed, from its official release URL. Its SHA-256 matched the published manifest: `e6e78e1bec1f47bd0d94dbc872a5670f4ac9c8f6740210b62365ab8b28f897c1`.

`tests/features/trello-settings-native.mjs` used a disposable home and unique Core session, actual packaged Settings/native controls and actual stdin bridge/owner file writer. Trello replies and unrelated host inventory were injected; credentials/accounts/boards were fake. The driver invokes production handlers through test-only exports rather than claiming mouse/keyboard hit-testing.

Outside-checkout proof files are `proof/missing.png`, `entered.png`, `saved.png`, `picker.png`, `allowed.png`, `writable.png`, `remote.png` and `native-proof.json` in the crew task evidence folder. Images were inspected: both inputs are masked, saved inputs are blank, the picker shows named checkboxes, Ready follows an allowed board, Read-write is visibly selected and the SSH machine shows the refusal. Final native errors were empty; desktop stopped, Core stop was acknowledged, and no home-qualified Node workers remained.

## Limits and hosted gate

No real-token success, real board modification, provider permission guarantee, remote setup support, same-user sandbox or cryptographic memory erasure is claimed. Owner discovery is bounded at 1000 visible boards with explicit incompleteness; local policy remains limited to 100 boards.

Hosted CI passed on implementation head `cc69efe0e2712158da7963b8c7ee96a49bcd198c`: Windows and Ubuntu test jobs, OpenSpec and CI required all succeeded in [run 45696882197](https://github.com/timurproko/herdr-app/actions/runs/45696882197). The earlier two fixture failures were repaired without dropping checks: the kit no longer adds an Input dependency to unrelated consumers, and the native proof uses shared temporary-mod disposal. The final confirmation snapshot regression is included in this green run.

Only acceptance/task metadata follows that implementation snapshot. The PR is never marked ready or merged manually.
