# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- One live draft and three recent finished merged PRs retain Open 1 and Closed 3 with no historical error notice under Open.
- Each repository section shows at most one applicable read notice while healthy rows and last-good eligible facts remain visible.
- Spawn failures, abnormal Windows exits and local command timeouts offer Refresh to retry without claiming GitHub is unreachable.
- GitHub resource refusals identify access with the current account, while actual DNS or connection failures retain a clear connectivity notice.
- Historical expiry removes stale rows and their notices without extra reads, and folding hides notices with the section body.
- The original installed process failure remains unproven; no deployment, account switch, automatic enrollment or new retry loop is introduced.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "fleet-pull-read-notices",
  "sourcePr": 31,
  "archive": "openspec/changes/archive/2026-11-23-fleet-pull-read-notices/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-fleet-pull-read-notices/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "113e9031f90b31e4ca34255fb9a8ac7dce34a33d",
  "acceptanceScenarios": [
    "One live draft and three recent finished merged PRs retain Open 1 and Closed 3 with no historical error notice under Open.",
    "Each repository section shows at most one applicable read notice while healthy rows and last-good eligible facts remain visible.",
    "Spawn failures, abnormal Windows exits and local command timeouts offer Refresh to retry without claiming GitHub is unreachable.",
    "GitHub resource refusals identify access with the current account, while actual DNS or connection failures retain a clear connectivity notice.",
    "Historical expiry removes stale rows and their notices without extra reads, and folding hides notices with the section body.",
    "The original installed process failure remains unproven; no deployment, account switch, automatic enrollment or new retry loop is introduced."
  ],
  "archiveDigest": "d5665810a4b9f5820ae4115287498a389d687aac9989282eb821fa291fdca6c4",
  "specDigest": "eafc9adc035eb2c7a87663f498aa618a0dae5fc4047ebb543014161d66a5730b",
  "tasksDigest": "f2e1e937747dbc3851fd79c121e3b48dd849818bb8ba9f7a47835c070113f9e1",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
