# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A first Update succeeds while the running App's mount-time native repair holds startup-frames.lock.
- A stale startup-frames.lock left by a killed repair no longer fails the first install and passes the second.
- A refresh lock held beyond 45 seconds fails with a reason naming the busy lock, never a command line.
- Rollback uses the same bounded wait for its native patch refresh.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "wait-startup-repair-lock",
  "sourcePr": 114,
  "archive": "openspec/changes/archive/2026-11-28-wait-startup-repair-lock/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-28-wait-startup-repair-lock/acceptance.md",
  "finalizedDate": "2026-11-28",
  "specBaseSha": "bc8d9893dfd66a7eeb54d2fd67872e08c918c5c7",
  "acceptanceScenarios": [
    "A first Update succeeds while the running App's mount-time native repair holds startup-frames.lock.",
    "A stale startup-frames.lock left by a killed repair no longer fails the first install and passes the second.",
    "A refresh lock held beyond 45 seconds fails with a reason naming the busy lock, never a command line.",
    "Rollback uses the same bounded wait for its native patch refresh."
  ],
  "archiveDigest": "50cf96fb4963f5c31eed16dbb457fbde66818394cf03a5f7a15e5e5fd871466a",
  "specDigest": "030f1c7ec5097d98fd975f4ef36c460ee2b8c7b611cf88eae4313074c790c79c",
  "tasksDigest": "5f515917a29d477bc9369411a01f6520be4e6af447db0258dce4b940c92ea82c",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
