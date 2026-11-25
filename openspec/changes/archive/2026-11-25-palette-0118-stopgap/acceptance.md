# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Exact LF and independently verified Windows CRLF 0.1.18 stock select the new release-specific replacement without changing the 0.1.17 payload.
- Native manifest discovery, validation, canonical deduplication, Mod grouping, hotkey matching and explicit clone arguments remain available.
- Custom presentation, search resets, navigation and safe routing remain available, with plugin-gated Usage and explicit native targets preserved.
- Unknown originals still skip without changing targets, helpers or opt-ins; recovery restores current reviewed stock rather than an older release.
- The temporary palette exception adds no installer hooks or keybindings and reaches existing opt-ins through normal customization Update.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "palette-0118-stopgap",
  "sourcePr": 65,
  "archive": "openspec/changes/archive/2026-11-25-palette-0118-stopgap/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-25-palette-0118-stopgap/acceptance.md",
  "finalizedDate": "2026-11-25",
  "specBaseSha": "1ab72f5bce765e3c314f59155a48656ed0692652",
  "acceptanceScenarios": [
    "Exact LF and independently verified Windows CRLF 0.1.18 stock select the new release-specific replacement without changing the 0.1.17 payload.",
    "Native manifest discovery, validation, canonical deduplication, Mod grouping, hotkey matching and explicit clone arguments remain available.",
    "Custom presentation, search resets, navigation and safe routing remain available, with plugin-gated Usage and explicit native targets preserved.",
    "Unknown originals still skip without changing targets, helpers or opt-ins; recovery restores current reviewed stock rather than an older release.",
    "The temporary palette exception adds no installer hooks or keybindings and reaches existing opt-ins through normal customization Update."
  ],
  "archiveDigest": "a043cc0b77e64df9db0f7ab1161e7e4877d82767c633e3f358bdbf034211fed3",
  "specDigest": "7876d111816e13aba3d71181c6f3c4f36910864e36d84e7d38c012c8929dd93f",
  "tasksDigest": "b51ef673cb2f54d0aa9a576302b23a3d7f020fed983efa27e84fd32e8975e5b5",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
