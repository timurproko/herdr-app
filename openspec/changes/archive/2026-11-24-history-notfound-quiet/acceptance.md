# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Confirmed missing live and historical task PRs leave no rows, notices, hints, tooltips or empty repository sections.
- Historical misses remain session-cached; live misses recheck after five minutes on existing refreshes or immediately for a changed URL.
- Each missing repository and PR identity emits only one sanitized customization-log line per session, even across repeated rechecks.
- Real access and authentication refusals retain repository and account context, while network, rate-limit and timeout failures stay visible.
- Mixed sections show found eligible PRs only; obsolete replies cannot publish missing results and corrected links remain independently readable.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "history-notfound-quiet",
  "sourcePr": 55,
  "archive": "openspec/changes/archive/2026-11-24-history-notfound-quiet/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-24-history-notfound-quiet/acceptance.md",
  "finalizedDate": "2026-11-24",
  "specBaseSha": "3bf9eb078d4f91fc6e0e72033babac6cdbcc88d5",
  "acceptanceScenarios": [
    "Confirmed missing live and historical task PRs leave no rows, notices, hints, tooltips or empty repository sections.",
    "Historical misses remain session-cached; live misses recheck after five minutes on existing refreshes or immediately for a changed URL.",
    "Each missing repository and PR identity emits only one sanitized customization-log line per session, even across repeated rechecks.",
    "Real access and authentication refusals retain repository and account context, while network, rate-limit and timeout failures stay visible.",
    "Mixed sections show found eligible PRs only; obsolete replies cannot publish missing results and corrected links remain independently readable."
  ],
  "archiveDigest": "2f525b42223fe9da09423bd0ec64f1615d954a2e84617359320c94577615d96f",
  "specDigest": "a19544bca5d5c7ec3889a684d600675fedae566e6111f07c8a0fe5b44eca2932",
  "tasksDigest": "dc656e8722a70fefb65d8a3a8d576e4b69e27356917bd6da3b85c556f7a23278",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
