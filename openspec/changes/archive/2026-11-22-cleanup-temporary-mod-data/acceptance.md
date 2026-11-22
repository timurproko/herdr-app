# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Temporary tooling deletes only its claimed mod directory and the matching exact-name data directory; unrelated installed and stock state stays intact.
- Completion, thrown errors, checker failures, partial setup failures and handled exits dispose the temporary resources in disposable-home fixtures.
- All 26 temporary-mod caller files use shared disposal, with overlay cleanup failures unable to bypass filesystem disposal.
- Existing mod or data paths are refused rather than adopted; the inspection and enrollment source-content guards remain protective.
- Historical leftovers remain untouched; the reported feedback preview and plugins opener creators are absent from available source and searched history.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "cleanup-temporary-mod-data",
  "sourcePr": 4,
  "archive": "openspec/changes/archive/2026-11-22-cleanup-temporary-mod-data/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-22-cleanup-temporary-mod-data/acceptance.md",
  "finalizedDate": "2026-11-22",
  "specBaseSha": "0e14e0d3a2148862338732eccafcb48c7fca4ced",
  "acceptanceScenarios": [
    "Temporary tooling deletes only its claimed mod directory and the matching exact-name data directory; unrelated installed and stock state stays intact.",
    "Completion, thrown errors, checker failures, partial setup failures and handled exits dispose the temporary resources in disposable-home fixtures.",
    "All 26 temporary-mod caller files use shared disposal, with overlay cleanup failures unable to bypass filesystem disposal.",
    "Existing mod or data paths are refused rather than adopted; the inspection and enrollment source-content guards remain protective.",
    "Historical leftovers remain untouched; the reported feedback preview and plugins opener creators are absent from available source and searched history."
  ],
  "archiveDigest": "682527f6f7dbd39343b1e3bea223a3292bc688b57a28443a4c07cfd7b2bd3045",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "c022e81b3c458f9f7cd384ddc365b71977f89587d8e39d9e0b0c6c9b126cd753",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
