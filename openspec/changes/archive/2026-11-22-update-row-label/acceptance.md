# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The customization row shows herdr-app-custom followed by its short installed revision or the existing revision-unknown text.
- Tests, fixtures, README, command documentation and current and archived spec quotations use the new display label.
- The label is display-only and is never compared or parsed as the native app name; update state, identifiers, actions and layout are unchanged.
- Targeted pure and VM fixtures pass without deployment or live-home access; actual native rendering remains a maintainer-only check.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "update-row-label",
  "sourcePr": 8,
  "archive": "openspec/changes/archive/2026-11-22-update-row-label/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-22-update-row-label/acceptance.md",
  "finalizedDate": "2026-11-22",
  "specBaseSha": "b7e00d57ab978152bd8f27cc17afe27654e35e61",
  "acceptanceScenarios": [
    "The customization row shows herdr-app-custom followed by its short installed revision or the existing revision-unknown text.",
    "Tests, fixtures, README, command documentation and current and archived spec quotations use the new display label.",
    "The label is display-only and is never compared or parsed as the native app name; update state, identifiers, actions and layout are unchanged.",
    "Targeted pure and VM fixtures pass without deployment or live-home access; actual native rendering remains a maintainer-only check."
  ],
  "archiveDigest": "bc03cb41090c2db5c157fb5c5ee9a2c6f502559e25f93597d0e95714df63d42a",
  "specDigest": "b0828170aae9c0fa9646e495038ea5afb562306a89503999b542392592307ad8",
  "tasksDigest": "b30ae40e1af8f4c0f27cb176e36ca9f80611163686917477da335fb2fdc93e46",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
