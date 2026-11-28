# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Both Git views have one right-aligned 24px disclosure icon in the existing Open/Closed strip, with pointer, Enter and Space activation.
- The global default applies to unseen repositories across agents and spaces; individual exceptions persist until the next bulk toggle clears them all.
- Disclosure survives client restart and panel recreation, imports existing saved folds and remains excluded from portable preferences.
- Collapsing retains the selected agent pin, scoped counts, cursor state, headerless failures and the existing coordinator reveal and render guards.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "git-headers-toggle",
  "sourcePr": 110,
  "archive": "openspec/changes/archive/2026-11-28-git-headers-toggle/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-28-git-headers-toggle/acceptance.md",
  "finalizedDate": "2026-11-28",
  "specBaseSha": "971941d01749393996ababf31f547653170e1c99",
  "acceptanceScenarios": [
    "Both Git views have one right-aligned 24px disclosure icon in the existing Open/Closed strip, with pointer, Enter and Space activation.",
    "The global default applies to unseen repositories across agents and spaces; individual exceptions persist until the next bulk toggle clears them all.",
    "Disclosure survives client restart and panel recreation, imports existing saved folds and remains excluded from portable preferences.",
    "Collapsing retains the selected agent pin, scoped counts, cursor state, headerless failures and the existing coordinator reveal and render guards."
  ],
  "archiveDigest": "c3099e9587ea4049ab1813e3705ee042f6c111dad6810cb0d924960379589736",
  "specDigest": "8212395d50a2c1b7fa04f985270c641f6268ddc4d1ac731a785127e77f6998f1",
  "tasksDigest": "9f74ba1526d59a0309a9bd9e157fe3a91e957dccd696f28b560a66b11cb8dae6",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
