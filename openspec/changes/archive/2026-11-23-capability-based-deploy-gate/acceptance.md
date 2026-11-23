# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- App 0.1.17 and later capable releases pass without an exact reviewed profile, while minimum-version and real capability/import refusals remain fatal.
- Unknown native palette and feedback bytes remain untouched with explicit advisory skips; owned old patches are not treated as current native review evidence.
- Settings preserves host-check, build, install and native-patch failure causes without weakening unknown-outcome or recovery safeguards.
- Missing stock review is reported honestly, reviewed-stock mismatches still fail, and the managed Update runner fetches fixed source before deployment.
- Restoring palette and feedback customization on new native stock requires reviewed originals and a patch rebase; ordinary updates need only Check now then Update.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "capability-based-deploy-gate",
  "sourcePr": 21,
  "archive": "openspec/changes/archive/2026-11-23-capability-based-deploy-gate/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-capability-based-deploy-gate/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "5f40e05bee58bc5797ebf38000a94db99bba1435",
  "acceptanceScenarios": [
    "App 0.1.17 and later capable releases pass without an exact reviewed profile, while minimum-version and real capability/import refusals remain fatal.",
    "Unknown native palette and feedback bytes remain untouched with explicit advisory skips; owned old patches are not treated as current native review evidence.",
    "Settings preserves host-check, build, install and native-patch failure causes without weakening unknown-outcome or recovery safeguards.",
    "Missing stock review is reported honestly, reviewed-stock mismatches still fail, and the managed Update runner fetches fixed source before deployment.",
    "Restoring palette and feedback customization on new native stock requires reviewed originals and a patch rebase; ordinary updates need only Check now then Update."
  ],
  "archiveDigest": "8e741f1416b5d5a8deb55945ef94dd0c2021a679370d4523439eee4e5105dc4d",
  "specDigest": "516dcaf27ae0ddd9a79bfee7d3672730b215bbb2a5a970db6f10b7d4914a216a",
  "tasksDigest": "c82c8fb54cc8f8b2d79ebe1bb88428167ac301cda6aed71bc4b5282f009c74d6",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
