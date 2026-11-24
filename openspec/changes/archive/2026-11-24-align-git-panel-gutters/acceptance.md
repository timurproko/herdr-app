# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Ordinary, pinned, scrolling, ghost and coordinator highlights have 8px left and right gutters, matching the actual Spaces renderer.
- Leading content remains 8px inside highlights, trailing controls remain 3px inside, and the shared corner radius remains 6px.
- Repository headers, notices, Loading and empty feedback, and ordinary and coordinator enrollment cards share the same outer column.
- Complete-panel geometry covers 280 to 480px widths and 75 to 200 percent zoom, including 130 percent, with independent edge and mutation assertions.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "align-git-panel-gutters",
  "sourcePr": 63,
  "archive": "openspec/changes/archive/2026-11-24-align-git-panel-gutters/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-24-align-git-panel-gutters/acceptance.md",
  "finalizedDate": "2026-11-24",
  "specBaseSha": "4e2e1486c6fd01ca4c80a1879b9cbb8883e7568e",
  "acceptanceScenarios": [
    "Ordinary, pinned, scrolling, ghost and coordinator highlights have 8px left and right gutters, matching the actual Spaces renderer.",
    "Leading content remains 8px inside highlights, trailing controls remain 3px inside, and the shared corner radius remains 6px.",
    "Repository headers, notices, Loading and empty feedback, and ordinary and coordinator enrollment cards share the same outer column.",
    "Complete-panel geometry covers 280 to 480px widths and 75 to 200 percent zoom, including 130 percent, with independent edge and mutation assertions."
  ],
  "archiveDigest": "2c8fbced24ac9d93dee3df7ff85651a333bbf1f01830bc58a28a16c4e6c3ce10",
  "specDigest": "cfe24d5c10e08171b23661fbf371b3d113ff5041a0f23595bebf5c12babffecb",
  "tasksDigest": "78121c7b7fd9af5793b7b3b6937d7d83eb8d6b8dc5c2b19fbbefb6fb47549469",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
