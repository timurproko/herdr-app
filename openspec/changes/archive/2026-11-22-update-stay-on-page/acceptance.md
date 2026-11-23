# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Update-triggered replacement restores Updates only for the initiating opening while pending or running, or within two minutes after completion, without reopening the overlay.
- Pending and running updates keep disabled Updating feedback across replacement; a missing launch receipt becomes outcome unknown rather than cached success.
- Final status reconciles verified revision and published main while preserving partial, failed and unknown outcomes and blocking duplicate launches.
- Native or backdrop dismissal and Desktop restart cannot retarget a new opening through a reused overlay ID; requested pages and the Look default win, with no native patches or deployment.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "update-stay-on-page",
  "sourcePr": 10,
  "archive": "openspec/changes/archive/2026-11-22-update-stay-on-page/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-22-update-stay-on-page/acceptance.md",
  "finalizedDate": "2026-11-22",
  "specBaseSha": "58c540b64bfd880d8d2777a38f902a9352f89542",
  "acceptanceScenarios": [
    "Update-triggered replacement restores Updates only for the initiating opening while pending or running, or within two minutes after completion, without reopening the overlay.",
    "Pending and running updates keep disabled Updating feedback across replacement; a missing launch receipt becomes outcome unknown rather than cached success.",
    "Final status reconciles verified revision and published main while preserving partial, failed and unknown outcomes and blocking duplicate launches.",
    "Native or backdrop dismissal and Desktop restart cannot retarget a new opening through a reused overlay ID; requested pages and the Look default win, with no native patches or deployment."
  ],
  "archiveDigest": "3023cb0eb3af26489ed7ce482e59a1e7dadf42b35245567c21cce6a80a6cc509",
  "specDigest": "623eef5c66e8f27cca6e295c685ee0132a5c104b68477940ea0a8da4ee080e03",
  "tasksDigest": "d8a85579a2270cee24431f5eab9ebbb1a444b4903f2f22e5d1752a5f74ee31a6",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
