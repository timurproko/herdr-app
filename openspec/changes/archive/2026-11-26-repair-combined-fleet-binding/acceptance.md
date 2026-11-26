# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Same-home combined fleets bind mixed legacy and placement-v1 workers even when minimal status omits task projects.
- Explicit project contradictions, task or home mismatches, cross-machine identities and unsupported placement versions still refuse authority.
- Off/on restores remembered nesting immediately and current task PRs after verification, without closing Settings or adding a scheduler.
- Per-project placement still requires authoritative matching task project evidence; Crew and live state remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "repair-combined-fleet-binding",
  "sourcePr": 92,
  "archive": "openspec/changes/archive/2026-11-26-repair-combined-fleet-binding/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-26-repair-combined-fleet-binding/acceptance.md",
  "finalizedDate": "2026-11-26",
  "specBaseSha": "69f3af919ef1572e945e616c70dec0e484165f65",
  "acceptanceScenarios": [
    "Same-home combined fleets bind mixed legacy and placement-v1 workers even when minimal status omits task projects.",
    "Explicit project contradictions, task or home mismatches, cross-machine identities and unsupported placement versions still refuse authority.",
    "Off/on restores remembered nesting immediately and current task PRs after verification, without closing Settings or adding a scheduler.",
    "Per-project placement still requires authoritative matching task project evidence; Crew and live state remain unchanged."
  ],
  "archiveDigest": "477d9e150fecdd7349e1712c254de3e1a4027971f1499051f2be76a3f056c346",
  "specDigest": "80b1ba0453735ed86c1ade1f873b061b09ddacb56caa87a41f78f1963892b8c4",
  "tasksDigest": "8d55dc11d9247433f99de629f865f6ba7696a148e2a9b6d042d3e2d5cfccabeb",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
