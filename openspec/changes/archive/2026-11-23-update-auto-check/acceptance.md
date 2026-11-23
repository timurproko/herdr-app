# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A configured Git relay serves the shown Git panel and hidden-panel update discovery through one chrome-owned subscription.
- Target pushes and reconnects request only rate-bounded fixed-main checks; installation remains an explicit Update action.
- Disabled or unconfigured Git leaves mount/hourly and manual checks available without relay warnings.
- Git notices refresh loaded pages when visible and catch up after hiding; the merged Settings reload guards remain intact.
- Enrollment uses the existing Account and Add repo picker; the shipped receiver supports push without redeployment.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "update-auto-check",
  "sourcePr": 11,
  "archive": "openspec/changes/archive/2026-11-23-update-auto-check/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-update-auto-check/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "42d2325e5756b50d697453becd96374f15eb966d",
  "acceptanceScenarios": [
    "A configured Git relay serves the shown Git panel and hidden-panel update discovery through one chrome-owned subscription.",
    "Target pushes and reconnects request only rate-bounded fixed-main checks; installation remains an explicit Update action.",
    "Disabled or unconfigured Git leaves mount/hourly and manual checks available without relay warnings.",
    "Git notices refresh loaded pages when visible and catch up after hiding; the merged Settings reload guards remain intact.",
    "Enrollment uses the existing Account and Add repo picker; the shipped receiver supports push without redeployment."
  ],
  "archiveDigest": "8a85f323a3e6b348249f4cf3d78dfbf665de2ed9bca0734baa0c4907d38f0236",
  "specDigest": "5ab0922c4470f417f4a4933c0c0708205eeb1aca8aaca1af6f6bb9db7931dad2",
  "tasksDigest": "7fb14698f45edd6d5e6414402eafe2d783b4874fa78824ccd3f7eab8b842cf54",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
