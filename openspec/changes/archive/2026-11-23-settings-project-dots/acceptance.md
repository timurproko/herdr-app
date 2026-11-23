# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Adding agentnumberone.dev preserves its safe dot, and listed dotted registrations remain visible and removable by exact name.
- Project names follow the 1–40-character lowercase ASCII policy, with no leading punctuation, consecutive dots or trailing dot.
- An older Crew rejection remains visible without silent renaming, alternate-name retries or a false successful registration.
- Folder-change errors identify Crew as the refusal source and distinguish its home ownership from the attempted folder operation.
- Batch changes retain successful operations, identify add and removal failures, and refresh the authoritative project list.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "settings-project-dots",
  "sourcePr": 16,
  "archive": "openspec/changes/archive/2026-11-23-settings-project-dots/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-settings-project-dots/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "c3d9e4d60744df32130efa2819ea25d3b591219e",
  "acceptanceScenarios": [
    "Adding agentnumberone.dev preserves its safe dot, and listed dotted registrations remain visible and removable by exact name.",
    "Project names follow the 1–40-character lowercase ASCII policy, with no leading punctuation, consecutive dots or trailing dot.",
    "An older Crew rejection remains visible without silent renaming, alternate-name retries or a false successful registration.",
    "Folder-change errors identify Crew as the refusal source and distinguish its home ownership from the attempted folder operation.",
    "Batch changes retain successful operations, identify add and removal failures, and refresh the authoritative project list."
  ],
  "archiveDigest": "9f5fbf6f3d7bbaae67f904b38d01ca35233cb584c17053bd07955638935a66ba",
  "specDigest": "95f1c190c595a132271ae7afbc1f25facc821486d921ffb55c3f8183fb1f30d3",
  "tasksDigest": "3d35524d10e2d8f657ea1c91b09fdb773ff54ea2cd68ba838f74b39a773fcb2a",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
