# Preview interference investigation

## Finding

The original preview feature called `hc read <focused-terminal> --lines 200`
every five seconds. This is not a passive screen snapshot: `hc --skill` explicitly
documents that history reads may scroll full-screen apps and then restore their
view. Repeating that against an idle interactive agent interfered with normal
terminal use. Automatic history requests have been removed, not merely slowed.

Historical observation on a remote test terminal (not revalidated by this import):

| Read | Elapsed | Result size |
| --- | ---: | ---: |
| Screen only, `--lines 0` | 31–46 ms | about 2–3.5 KB |
| History, `--lines 200` | 2.1–4.6 seconds | about the same size; incomplete screen fallback |

A concurrent `hc get remote-workstation/test-terminal` completed in 38 ms during a 2.1-second history
request. CPU samples did not show saturation, and over 40 GB of physical RAM was
free. This supports terminal-view interference rather than a demonstrated
core-wide lockup. The existing core log also contains remote-workstation 45-second connection
timeouts, without timestamps; these cannot be attributed to this feature from
those entries alone. No app, core, or agent was restarted or stopped.

Four suspended Node children left by this task's native mod-checker invocations
were identified by exact command lines, dead parents and suspended thread state,
then removed. They used memory but no CPU. Empty checker views now launch no
preview helpers.

## Replacement

- Render the existing live terminal label `custom.preview.url`. No screen reads
  on initialization, focus changes, rendering, or timers.
- A known URL persists in the core's terminal metadata. The first click connects;
  subsequent clicks open a cached forwarded URL directly, with no helper or core
  query. Reconnect is an explicit status-bar context-menu action.
- There is no placeholder item. Status bar → Read screen reads the current
  screen once, strictly with `--lines 0`, then saves the URL as metadata without
  opening a browser. The localhost item's separate menu contains only Close.
- Reconnect/Close stop only the selected owned forward, wait for it to release
  its port, and leave other endpoints and owners untouched. Captured menu targets
  and one-shot command ids protect against focus changes and stale menu actions.
- An opened tunnel has a 15-second local-file lease heartbeat. The heartbeat
  performs no core or terminal requests. Closed layouts release their own
  leases; workers expire after 45 seconds without renewal.
- Fixed icon slots, compensated hover margins, and browser/connected-arrow
  states do not add animation timers or new polling.

## Validation

- Unit tests exercise 100 renders and repeated timer callbacks without any
  preview discovery processes; only explicit actions can scan.
- Read-argument regression test freezes screen discovery to `--lines 0`.
- Tests cover metadata validation/focus isolation, single-flight opening and
  lease renewal, no-URL handling, success/failure icon states, replacement
  Connecting label, geometry, owner-scoped cleanup and port collision policy.
- A 15-sample Windows process observation after deployment found zero preview
  scan processes. SSH tunnel reuse and lease cleanup are validated separately
  without sending keys or history requests to agents.
