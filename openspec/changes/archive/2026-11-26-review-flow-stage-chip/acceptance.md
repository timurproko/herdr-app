# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Managed current and previous label names select Build, Review or Approved independently of CI.
- Build and Review focus only their live role-specific targets; stale, ended and disconnected targets remain inert.
- Build round and finding metadata enrich the chip only when supplied, while unlabeled rows retain the robot fallback.
- Ordinary and coordinator rows retain stable title reservations, trailing anchors, lower metadata and 74px height.
- Chip and fallback robot clicks share pin motion, including initially unpinned lists and coordinator-to-agent handoff.
- The full local suite covers every default entry in an isolated environment with no deployment or live agent input.

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
    "Chip and fallback robot clicks share pin motion, including initially unpinned lists and coordinator-to-agent handoff.",
    "The full local suite covers every default entry in an isolated environment with no deployment or live agent input."
  ],
  "archiveDigest": "32855ddc7d3d9d82a0af60685796728d262edb0161c595c77dc18c6d11fd6bf5",
  "specDigest": "b8aed6f77793c6297e4a14b34bef0f4619684a48b2180126e8c4efb0df359bc7",
  "tasksDigest": "3b87341e81884f69e7bee399efee6913c370f81e5d5f2d9601b5de2e8ebf98f9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
