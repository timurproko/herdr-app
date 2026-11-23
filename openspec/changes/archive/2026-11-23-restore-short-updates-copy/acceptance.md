# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The Settings Updates paragraph exactly matches its pre-20 wording and punctuation, without Custom cadence or relay details.
- The existing quiet unknown-revision title, update controls, workers and discovery behavior remain unchanged.
- Maintained documentation retains detailed cadence guidance without attributing it to the Settings paragraph.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "restore-short-updates-copy",
  "sourcePr": 24,
  "archive": "openspec/changes/archive/2026-11-23-restore-short-updates-copy/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-restore-short-updates-copy/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "25b0fa9a3adb6ce05c12b7042c91e2db09610ad9",
  "acceptanceScenarios": [
    "The Settings Updates paragraph exactly matches its pre-20 wording and punctuation, without Custom cadence or relay details.",
    "The existing quiet unknown-revision title, update controls, workers and discovery behavior remain unchanged.",
    "Maintained documentation retains detailed cadence guidance without attributing it to the Settings paragraph."
  ],
  "archiveDigest": "d44dc59f44c0ac1944e29ea1f4f2014e3b482b2b484b784d84a91440ae71319f",
  "specDigest": "83f8f3716a6390b1dc5ba75a51298911a6117b5db065cfe1523e62f673dcd46a",
  "tasksDigest": "bfe436d52c88451a9f182c4e37fd1273acee9b290eef5b8a0d8727d0e89a017c",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
