# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Monitor scope follows the current relay and GitHub account's durable added list through notice invalidation, Add/Remove, Configure and startup without a preference re-save.
- Empty, missing and mismatched selections stay empty in actual worker configuration without notice-cache or legacy fallback.
- Enabled empty or wholly skipped cycles report suppression; local diagnostics retain at most 128 sanitized entries and 64 KiB without affecting receipts or adding UI.
- Unchanged completed-failure and conflict evidence remains deduplicated for an idle agent across restarts; Working stays opt-in and workflow completion, templates and non-forced transport remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "repair-monitor-scope",
  "sourcePr": 74,
  "archive": "openspec/changes/archive/2026-11-25-repair-monitor-scope/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-25-repair-monitor-scope/acceptance.md",
  "finalizedDate": "2026-11-25",
  "specBaseSha": "463bd78f81885c83cdd47a2257d0454dafeb5315",
  "acceptanceScenarios": [
    "Monitor scope follows the current relay and GitHub account's durable added list through notice invalidation, Add/Remove, Configure and startup without a preference re-save.",
    "Empty, missing and mismatched selections stay empty in actual worker configuration without notice-cache or legacy fallback.",
    "Enabled empty or wholly skipped cycles report suppression; local diagnostics retain at most 128 sanitized entries and 64 KiB without affecting receipts or adding UI.",
    "Unchanged completed-failure and conflict evidence remains deduplicated for an idle agent across restarts; Working stays opt-in and workflow completion, templates and non-forced transport remain unchanged."
  ],
  "archiveDigest": "17266204370387b581c7c65cd88447e96bf786290eb6448f967c4fd710d4ec17",
  "specDigest": "0a2cd547724a2aea886f80a86fe4984223d262d3c99e2289cdf2556c7fa38ddd",
  "tasksDigest": "628652de9540716738b7ffcc9a4e5aadc2f07c4264888c47cbf57e743295b287",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
