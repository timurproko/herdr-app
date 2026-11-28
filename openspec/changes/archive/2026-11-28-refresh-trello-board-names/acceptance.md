# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Opening Boards and either existing Check refresh renamed boards by canonical ID without removing or re-adding grants.
- Saved names remain visible during pending reads and survive offline or partial discovery without a new message or control.
- Board grants, order and write policy remain unchanged, and stale machine or account results cannot replace the current view.
- Refreshed display revisions reach account actions without duplicate provider reads, and unrelated list disclosures keep their prior behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "refresh-trello-board-names",
  "sourcePr": 106,
  "archive": "openspec/changes/archive/2026-11-28-refresh-trello-board-names/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-28-refresh-trello-board-names/acceptance.md",
  "finalizedDate": "2026-11-28",
  "specBaseSha": "340fe83f753093d9c537b1d282fc0aba7804cd56",
  "acceptanceScenarios": [
    "Opening Boards and either existing Check refresh renamed boards by canonical ID without removing or re-adding grants.",
    "Saved names remain visible during pending reads and survive offline or partial discovery without a new message or control.",
    "Board grants, order and write policy remain unchanged, and stale machine or account results cannot replace the current view.",
    "Refreshed display revisions reach account actions without duplicate provider reads, and unrelated list disclosures keep their prior behavior."
  ],
  "archiveDigest": "c104eae6687a65509ed1ef6651bbd4e37aab1a8068ab51f891a219dc996c95e6",
  "specDigest": "5f1ca6d394dfadf270175d3f6505a3e0731cc9d80139af1c519ae42a11310aa0",
  "tasksDigest": "b4bba7ce865d4f823e9a95248f566e0f76752f77ec09f41a9cbf0a2b793c341c",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
