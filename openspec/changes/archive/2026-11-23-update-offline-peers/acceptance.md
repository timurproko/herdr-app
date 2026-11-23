# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Offline and unreachable peers remain plainly logged without a partial warning after a successful desktop update.
- Desktop-equipped peers are quiet exclusions and still require their own full Update.
- A current desktop offers Update for privately remembered offline peers without raising availability badges.
- The next explicit reachable eligible update catches peers up even when published main is unchanged.
- Reachable failures retain matching details, while locks and unknown outcomes cannot authorize replay.
- Deferred identities survive selection and inventory failures but never enter portable preferences.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "update-offline-peers",
  "sourcePr": 34,
  "archive": "openspec/changes/archive/2026-11-23-update-offline-peers/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-update-offline-peers/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "b818c15d4da9b56c89774d361d008dbe8bc4e564",
  "acceptanceScenarios": [
    "Offline and unreachable peers remain plainly logged without a partial warning after a successful desktop update.",
    "Desktop-equipped peers are quiet exclusions and still require their own full Update.",
    "A current desktop offers Update for privately remembered offline peers without raising availability badges.",
    "The next explicit reachable eligible update catches peers up even when published main is unchanged.",
    "Reachable failures retain matching details, while locks and unknown outcomes cannot authorize replay.",
    "Deferred identities survive selection and inventory failures but never enter portable preferences."
  ],
  "archiveDigest": "4b5ba8afdae5bf02519c3404ad4f9aff20bf12aeb97af01caf4581a3ec324a54",
  "specDigest": "e5aef8732b0239d88dd246c5b8b4c2266b8685a77add8cd29b637fc15043369c",
  "tasksDigest": "061eef867e164c2f4763b647663b10106972fa93d6a047015a11c87995af57cb",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
