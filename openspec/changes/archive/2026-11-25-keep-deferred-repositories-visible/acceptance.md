# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Verified unresolved repositories retain their headers and standard Loading while healthy sibling rows stay visible.
- Incomplete task totals use loading badges instead of partial exact totals, preserving compatible last-good values.
- Existing cooldown recovery fills sections without a new event, invented PR rows or a same-context scroll reset.
- Repository read diagnostics retain bounded sanitized phase, refusal and retry facts without UI or portable export.
- Ordinary Git preserves known full totals and retries quietly refused compatibility count reads.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "keep-deferred-repositories-visible",
  "sourcePr": 79,
  "archive": "openspec/changes/archive/2026-11-25-keep-deferred-repositories-visible/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-25-keep-deferred-repositories-visible/acceptance.md",
  "finalizedDate": "2026-11-25",
  "specBaseSha": "4ce6d871d13f24ae5d95195b116f9d5e3622542c",
  "acceptanceScenarios": [
    "Verified unresolved repositories retain their headers and standard Loading while healthy sibling rows stay visible.",
    "Incomplete task totals use loading badges instead of partial exact totals, preserving compatible last-good values.",
    "Existing cooldown recovery fills sections without a new event, invented PR rows or a same-context scroll reset.",
    "Repository read diagnostics retain bounded sanitized phase, refusal and retry facts without UI or portable export.",
    "Ordinary Git preserves known full totals and retries quietly refused compatibility count reads."
  ],
  "archiveDigest": "f965e673c02dcacbb5c6b5a7e090f6af14747dc532e00de76ac4afa90400e3d3",
  "specDigest": "fe581f0ad4cb6e8cfa8f7b90450be3cb0cd7c150f12518ea83542a144b8091a0",
  "tasksDigest": "83686d4a9c4191c14fae4bb396a80450fa7ef7fd4bdf52b306f06623b0fd0a51",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
