# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Ordinary and coordinator PR rows omit Owner and order present metadata as tasks, checks and assigned GitHub labels in Open and Closed tabs.
- Label pills retain exact names and GitHub colours, contrast their text and expose complete names through tooltips without adding row lines or horizontal overflow.
- PR label facts use existing paginated and targeted reads and refresh through labeled and unlabeled invalidations without per-row requests or polling.
- Number/author and status separators share a centred muted 3px dot with equal 6px spacing and no empty-group separators.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "git-row-labels",
  "sourcePr": 19,
  "archive": "openspec/changes/archive/2026-11-23-git-row-labels/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-git-row-labels/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "e73862dd1309a331398624f2a1d7d6ab7f8695da",
  "acceptanceScenarios": [
    "Ordinary and coordinator PR rows omit Owner and order present metadata as tasks, checks and assigned GitHub labels in Open and Closed tabs.",
    "Label pills retain exact names and GitHub colours, contrast their text and expose complete names through tooltips without adding row lines or horizontal overflow.",
    "PR label facts use existing paginated and targeted reads and refresh through labeled and unlabeled invalidations without per-row requests or polling.",
    "Number/author and status separators share a centred muted 3px dot with equal 6px spacing and no empty-group separators."
  ],
  "archiveDigest": "7540a80bf9e3145b433c04237743446d80bf536211726f945e9ff65c72bae300",
  "specDigest": "e2760f1474cad3b0b200320b4d97eaa3571dbe76e540ccb56050c4e838e8e9e1",
  "tasksDigest": "86b9e314f562c028cf4ab5990aacafb19129071906e7f2f04ef27ec5a61eeebc",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
