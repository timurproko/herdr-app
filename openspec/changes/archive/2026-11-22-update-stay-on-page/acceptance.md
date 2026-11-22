# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Replacing the Settings mod retains the open dialog's selected section without closing or reopening its overlay or exporting navigation state.
- Pending and running updates keep disabled Updating feedback across replacement; a missing launch receipt becomes outcome unknown rather than cached success.
- Final status reconciles verified revision and published main while preserving partial, failed and unknown outcomes and blocking duplicate launches.
- Explicit navigation, dismissal and new-dialog destinations remain deliberate; no native patches, deployment or live-home operations are introduced.

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
    "Replacing the Settings mod retains the open dialog's selected section without closing or reopening its overlay or exporting navigation state.",
    "Pending and running updates keep disabled Updating feedback across replacement; a missing launch receipt becomes outcome unknown rather than cached success.",
    "Final status reconciles verified revision and published main while preserving partial, failed and unknown outcomes and blocking duplicate launches.",
    "Explicit navigation, dismissal and new-dialog destinations remain deliberate; no native patches, deployment or live-home operations are introduced."
  ],
  "archiveDigest": "582dc784d123103cd240e18ecf94711294a96173e16dbbf23ac176deaca3f0d1",
  "specDigest": "be07c08c45750b639747f408739c68a1de966a25bc7f14358e373f227eeb7c3b",
  "tasksDigest": "c25a71ed29a465ae6690f430afdfc03f34ae3e1e3eef93408886c281f9861fbd",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
