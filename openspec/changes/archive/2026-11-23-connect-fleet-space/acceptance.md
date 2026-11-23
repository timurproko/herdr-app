# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Fleet attachment defaults off and preserves independent spaces and folder-based Git when disabled.
- Verified same-machine fleets use a link badge and follow their coordinator when either expanded row is dragged.
- The coordinator overview groups recorded PRs from live working and reported tasks with task-scoped counts and no active pin.
- Unreported tasks are labelled possibly incomplete; no Crew change or pre-report discovery is required.
- Relevant webhook events refresh linked repositories without periodic GitHub polling or expanded auto-fix permissions.
- Expired or superseded reads cannot populate another context or focus a replaced worker.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "connect-fleet-space",
  "sourcePr": 14,
  "archive": "openspec/changes/archive/2026-11-23-connect-fleet-space/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-connect-fleet-space/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "6bfce5a9f5ba3a705fbee7fe800452e2a50bea7e",
  "acceptanceScenarios": [
    "Fleet attachment defaults off and preserves independent spaces and folder-based Git when disabled.",
    "Verified same-machine fleets use a link badge and follow their coordinator when either expanded row is dragged.",
    "The coordinator overview groups recorded PRs from live working and reported tasks with task-scoped counts and no active pin.",
    "Unreported tasks are labelled possibly incomplete; no Crew change or pre-report discovery is required.",
    "Relevant webhook events refresh linked repositories without periodic GitHub polling or expanded auto-fix permissions.",
    "Expired or superseded reads cannot populate another context or focus a replaced worker."
  ],
  "archiveDigest": "06e3ef6c33231f9776d0a28406efc630714ca097e5458b1b3268fa022e07528b",
  "specDigest": "6a7707aca71d6d131bb46eddb67cb1c868e904ae2bfc7adec53bf3502ba6242c",
  "tasksDigest": "e0903f274d803e8b73dc685bec2e66086ad4227e8a7b2964641d6bb7cadc1437",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
