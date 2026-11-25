# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Primary and secondary GitHub rate refusals retain loaded rows, totals, pins and pages without adding error UI.
- Cold refused reads keep standard Loading, share the cooldown and allow one explicit manual retry without refusal spam.
- Authentication, permission, network, timeout, abnormal-exit and malformed-response failures keep actionable notices.
- Repository batches share pending facts, reuse session-final history and fetch check contexts only for changed heads or summaries.
- Selected-tab reads, two-second repository event windows and explicit inactive-window pauses preserve shown-open safety cadences.
- Existing relay deployments need no change; cached final coordinator facts wait for contrary evidence or a new runtime session.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "git-ratelimit-quiet",
  "sourcePr": 59,
  "archive": "openspec/changes/archive/2026-11-25-git-ratelimit-quiet/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-25-git-ratelimit-quiet/acceptance.md",
  "finalizedDate": "2026-11-25",
  "specBaseSha": "b69c8c875e278f89ac3df77ee36bd923354d0ac8",
  "acceptanceScenarios": [
    "Primary and secondary GitHub rate refusals retain loaded rows, totals, pins and pages without adding error UI.",
    "Cold refused reads keep standard Loading, share the cooldown and allow one explicit manual retry without refusal spam.",
    "Authentication, permission, network, timeout, abnormal-exit and malformed-response failures keep actionable notices.",
    "Repository batches share pending facts, reuse session-final history and fetch check contexts only for changed heads or summaries.",
    "Selected-tab reads, two-second repository event windows and explicit inactive-window pauses preserve shown-open safety cadences.",
    "Existing relay deployments need no change; cached final coordinator facts wait for contrary evidence or a new runtime session."
  ],
  "archiveDigest": "f05ccd86b9dc92c2189e5e7744acc81c95c683ffcd8ad9a1759114b0575ae3b4",
  "specDigest": "7ef9f3861c2f4a9b9ff34127f0f4d9184976af90551d5517a7784e33f204b221",
  "tasksDigest": "c2d19542f21e0ab9eb581fdbf4b81b62671d62570f19ae59dfea7205b9947060",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
