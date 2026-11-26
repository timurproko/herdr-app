# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Managed current and previous label names select Build, Review or Approved independently of CI.
- Build and Review focus only their live role-specific targets; stale, ended and disconnected targets remain inert.
- Build round and finding metadata enrich the chip only when supplied, while unlabeled rows retain the robot fallback.
- Ordinary and coordinator rows retain stable title reservations, trailing anchors, lower metadata and 74px height.
- The full local suite covers all 245 default entries in an isolated environment with no deployment or live agent input.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "review-flow-stage-chip",
  "sourcePr": 87,
  "archive": "openspec/changes/archive/2026-11-26-review-flow-stage-chip/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-26-review-flow-stage-chip/acceptance.md",
  "finalizedDate": "2026-11-26",
  "specBaseSha": "69f3af919ef1572e945e616c70dec0e484165f65",
  "acceptanceScenarios": [
    "Managed current and previous label names select Build, Review or Approved independently of CI.",
    "Build and Review focus only their live role-specific targets; stale, ended and disconnected targets remain inert.",
    "Build round and finding metadata enrich the chip only when supplied, while unlabeled rows retain the robot fallback.",
    "Ordinary and coordinator rows retain stable title reservations, trailing anchors, lower metadata and 74px height.",
    "The full local suite covers all 245 default entries in an isolated environment with no deployment or live agent input."
  ],
  "archiveDigest": "86387ff90c545e3fefa2ce14401a5b0dfc325456dfd46b3d419fcc1507ea46da",
  "specDigest": "332fa130950b74fdf0192b774eb24cfd66e58c8c6eed5a484ea825a74c49f2ca",
  "tasksDigest": "063ecfd8a1b69ae15884bf96047d8e305c351e7e8290126c70a5035b91038731",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
