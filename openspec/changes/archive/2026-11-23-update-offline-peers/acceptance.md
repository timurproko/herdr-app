# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Offline and unreachable peers remain plainly logged without a partial warning after a successful desktop update.
- Desktop-equipped peers are quiet exclusions and still require their own full Update.
- A current desktop offers Update for privately remembered offline peers without raising availability badges.
- The next explicit reachable eligible update catches peers up even when published main is unchanged.
- Reachable failures retain matching details, while locks and unknown outcomes cannot authorize replay.
- Deferred identities survive selection and inventory failures but never enter portable preferences.
- Launching and running descriptions say Updating… while the button and every other state's wording stay unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "update-offline-peers",
  "sourcePr": 34,
  "archive": "openspec/changes/archive/2026-11-23-update-offline-peers/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-update-offline-peers/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "120643ab6941b4df91d11e2fa06f764fa926e803",
  "acceptanceScenarios": [
    "Offline and unreachable peers remain plainly logged without a partial warning after a successful desktop update.",
    "Desktop-equipped peers are quiet exclusions and still require their own full Update.",
    "A current desktop offers Update for privately remembered offline peers without raising availability badges.",
    "The next explicit reachable eligible update catches peers up even when published main is unchanged.",
    "Reachable failures retain matching details, while locks and unknown outcomes cannot authorize replay.",
    "Deferred identities survive selection and inventory failures but never enter portable preferences.",
    "Launching and running descriptions say Updating… while the button and every other state's wording stay unchanged."
  ],
  "archiveDigest": "96ab1743972ecb3f9bb22c58c3382fb266dd9530d0ac2c5a3020d0301e433eef",
  "specDigest": "eaeb3f675ad91774686e128b5103db03f00ea00c677082c1ac0e5c4983ef504e",
  "tasksDigest": "9dffe8c9df3e17efdcf2c4f8e8e8564f0db56492a62ba875e45509cb39a3bd73",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
