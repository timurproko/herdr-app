# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Coordinator enrollment stays visible below scrolling content, including when every repository section is folded.
- Only confirmed unenrolled canonical repository names appear once in section order, always in the shared account-style dropdown.
- Picker opening and choosing perform no membership or GitHub reads and never enroll a repository.
- Captured choices and scope are revalidated before filtered Settings navigation; obsolete menus close without retargeting.
- Expanded and folded repository headers show only names and chevrons; fitting names have no tooltip and top-level totals are unchanged.
- Account operations, ordinary Git notices, scoped PR errors, relay render guards and shared PR metadata remain intact.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "fleet-enroll-picker",
  "sourcePr": 29,
  "archive": "openspec/changes/archive/2026-11-23-fleet-enroll-picker/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-fleet-enroll-picker/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "113e9031f90b31e4ca34255fb9a8ac7dce34a33d",
  "acceptanceScenarios": [
    "Coordinator enrollment stays visible below scrolling content, including when every repository section is folded.",
    "Only confirmed unenrolled canonical repository names appear once in section order, always in the shared account-style dropdown.",
    "Picker opening and choosing perform no membership or GitHub reads and never enroll a repository.",
    "Captured choices and scope are revalidated before filtered Settings navigation; obsolete menus close without retargeting.",
    "Expanded and folded repository headers show only names and chevrons; fitting names have no tooltip and top-level totals are unchanged.",
    "Account operations, ordinary Git notices, scoped PR errors, relay render guards and shared PR metadata remain intact."
  ],
  "archiveDigest": "117b0d46ce5d8cd13631842fef2b9c6f20f68cf7f71f0e0b22ef084843c6b65f",
  "specDigest": "57fdddaefa9500017e8b52693811d882aeaf65b58cc4250992204e2f26b5d2e2",
  "tasksDigest": "6a98e7522170d39cbac73a364d61f661e5cedb14daa9aa8639594194bb6fa270",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
