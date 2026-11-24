# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Shown Open and Draft PRs receive state-and-check safety reads every 45 seconds unenrolled or 120 seconds enrolled, including settled checks.
- Merge, close, reopen and draft transitions reconcile rows and both tab totals without clearing loaded content or duplicating pins.
- Aggregate history uses current GitHub completion dates and the existing 24-hour bound; ordinary counts remain repository-wide.
- Unchanged safety cycles request only state, head and rollup summaries; changed heads or summaries alone fetch full check contexts.
- Safety batches retain metadata and last-good values, back off at least 15 minutes for secondary limits, honor longer Retry-After and reject obsolete replies.
- Enrolled merge events trigger authoritative state rereads, with a coalesced follow-up when invalidation arrives during an aggregate read.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "refresh-git-pull-state",
  "sourcePr": 49,
  "archive": "openspec/changes/archive/2026-11-24-refresh-git-pull-state/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-24-refresh-git-pull-state/acceptance.md",
  "finalizedDate": "2026-11-24",
  "specBaseSha": "9a264db3a6ff166facb24c26497b401d930f801b",
  "acceptanceScenarios": [
    "Shown Open and Draft PRs receive state-and-check safety reads every 45 seconds unenrolled or 120 seconds enrolled, including settled checks.",
    "Merge, close, reopen and draft transitions reconcile rows and both tab totals without clearing loaded content or duplicating pins.",
    "Aggregate history uses current GitHub completion dates and the existing 24-hour bound; ordinary counts remain repository-wide.",
    "Unchanged safety cycles request only state, head and rollup summaries; changed heads or summaries alone fetch full check contexts.",
    "Safety batches retain metadata and last-good values, back off at least 15 minutes for secondary limits, honor longer Retry-After and reject obsolete replies.",
    "Enrolled merge events trigger authoritative state rereads, with a coalesced follow-up when invalidation arrives during an aggregate read."
  ],
  "archiveDigest": "169cbaf61f989715e9d3576ad1eb8f6ab70d8f888f0af4ae91cdede6d82f3603",
  "specDigest": "8dd8ecb117c2e97579d44a4505c420e3927514ebf9ab0380728fff03c2779ef8",
  "tasksDigest": "a5834f96925fd32734b5242b66668a83435ca91c3f9e9016f5aa21c6be7c528b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
