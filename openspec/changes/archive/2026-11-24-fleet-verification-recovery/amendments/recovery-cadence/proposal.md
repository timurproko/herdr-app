# Approved review correction: preserve the former retry cadence

The coordinator requested and approved implementation of a correction before review completes: an unverified pair must not acquire a longer recovery delay than the former ten-second attempt TTL.

Use 2 seconds, 5 seconds, then repeated 10-second completion-based delays for every retryable failure. No reason-specific slower interval is introduced; remote machines whose native layout is unready retain the existing readiness gate, rather than a longer retry timer. Updated modules reject persisted 15/60-second policy deadlines so an update cannot inherit a slower wait.

Keep the same PR, diagnostic/log behavior, existing lifecycle ownership, command/read lease bounds and identity/freshness guards. Update the archived design/tasks/delta and canonical specification coherently; delivery automation regenerates the acceptance manifest on the repaired head. Packaged regressions cover repeated local/remote transport failures and timeouts, no early reads, no delay above ten seconds, and replacement with old-policy deadlines.
