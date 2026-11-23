# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Newer unreviewed App/Core releases pass moving preflight when minimum versions, required capabilities, generation, identity and document-shape checks pass locally and remotely.
- Missing methods or preparation commands, unknown generation or shape, stale targets and below-minimum versions refuse without a layout mutation.
- Expected-version CAS, payload preservation, unknown-result handling and metadata partial success remain; silent changes to doc.set semantics remain an explicit risk.
- Move to and Back use matching leading outline chevrons, destination badges remain, and long inert explanations wrap within a bounded scrolling viewport.
- Synthetic adapter, menu and audit regressions pass; no deployment, live mutation or native pixel and multi-client continuity validation is claimed.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "restore-move-to-menu",
  "sourcePr": 15,
  "archive": "openspec/changes/archive/2026-11-23-restore-move-to-menu/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-restore-move-to-menu/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "e3beda6542f09d869d853ad71b8a1773689c852a",
  "acceptanceScenarios": [
    "Newer unreviewed App/Core releases pass moving preflight when minimum versions, required capabilities, generation, identity and document-shape checks pass locally and remotely.",
    "Missing methods or preparation commands, unknown generation or shape, stale targets and below-minimum versions refuse without a layout mutation.",
    "Expected-version CAS, payload preservation, unknown-result handling and metadata partial success remain; silent changes to doc.set semantics remain an explicit risk.",
    "Move to and Back use matching leading outline chevrons, destination badges remain, and long inert explanations wrap within a bounded scrolling viewport.",
    "Synthetic adapter, menu and audit regressions pass; no deployment, live mutation or native pixel and multi-client continuity validation is claimed."
  ],
  "archiveDigest": "737d39164a647a3b51d721fe954d0d20689d79d85fc5ffc765a651bf382bb6b0",
  "specDigest": "d1c43b0eaa923dee611ab8a2ec509b98fde4dc4eeb14b7000dcb38ba20c4da53",
  "tasksDigest": "f519d7bf9f1c2c9593503c2cfa511e8b1d60fa2ce075994c3af8ac31896291d5",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
