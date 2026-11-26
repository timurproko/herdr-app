# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Stage chips use 6px side padding without hover popups, including managed aliases and findings inherited through parent label groups.
- Unlabelled Open or Draft requests with verified live ship or fix owners show Build in the bottom-right slot, including planning-only owners.
- Completed review rounds retain Build 2 and Build 3 captions; assigned Review and Approved stages still take precedence over fallback Build.
- Build and Review retain guarded agent focus and pin motion; Approved opens the request and unavailable stages stay inert with accessible reasons.
- Ordinary, pinned and coordinator rows retain their fixed height, title width and trailing anchor without loading, counter or repository-order changes.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "consistent-pr-stage-labels",
  "sourcePr": 96,
  "archive": "openspec/changes/archive/2026-11-26-consistent-pr-stage-labels/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-26-consistent-pr-stage-labels/acceptance.md",
  "finalizedDate": "2026-11-26",
  "specBaseSha": "68fa7be454ac8800f1452b939c9a3e32199458a7",
  "acceptanceScenarios": [
    "Stage chips use 6px side padding without hover popups, including managed aliases and findings inherited through parent label groups.",
    "Unlabelled Open or Draft requests with verified live ship or fix owners show Build in the bottom-right slot, including planning-only owners.",
    "Completed review rounds retain Build 2 and Build 3 captions; assigned Review and Approved stages still take precedence over fallback Build.",
    "Build and Review retain guarded agent focus and pin motion; Approved opens the request and unavailable stages stay inert with accessible reasons.",
    "Ordinary, pinned and coordinator rows retain their fixed height, title width and trailing anchor without loading, counter or repository-order changes."
  ],
  "archiveDigest": "241252e3ebbf903a1230bd2d9f2f00d3b271656795e11fb18483c786b2faf1e7",
  "specDigest": "2944deae7facfbd56fe0633078c910201957e08be6a7adf83d7168b77efaf04a",
  "tasksDigest": "77ffbdf24fd0d41fa500b485450a926a86d9ebc854fdfbc657d6cf1acffaa636",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
