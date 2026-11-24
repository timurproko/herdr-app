# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- All four Custom running descriptions end with one full stop, including targetless and peer-only variants.
- Custom error, failure, partial and unknown descriptions terminate consistently while preserving diagnostic paths and avoiding doubled sentence stops.
- Sibling Core failures use the same sentence termination; existing current, checking, source, managed and restart-ready descriptions remain intact.
- Button ellipses, row geometry, revision provenance, update scope and action guards remain unchanged, with matching tests and current documentation/spec examples.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "update-row-period",
  "sourcePr": 58,
  "archive": "openspec/changes/archive/2026-11-24-update-row-period/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-24-update-row-period/acceptance.md",
  "finalizedDate": "2026-11-24",
  "specBaseSha": "386fcc4a01a4ed4ba6e0ec04792dd8ba34322d09",
  "acceptanceScenarios": [
    "All four Custom running descriptions end with one full stop, including targetless and peer-only variants.",
    "Custom error, failure, partial and unknown descriptions terminate consistently while preserving diagnostic paths and avoiding doubled sentence stops.",
    "Sibling Core failures use the same sentence termination; existing current, checking, source, managed and restart-ready descriptions remain intact.",
    "Button ellipses, row geometry, revision provenance, update scope and action guards remain unchanged, with matching tests and current documentation/spec examples."
  ],
  "archiveDigest": "be477e1522d0703bcdd8aa26a770d8db1f00486b918bff0e79090dcf5e36dcb5",
  "specDigest": "8002612f88524217b915476923dfad20dad20472c14af77b3a8ef72ae97b7d32",
  "tasksDigest": "ffc4335c544f67c1a8a5786d645641c1b31c7f5f7475fb515bf863de077dd3ed",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
