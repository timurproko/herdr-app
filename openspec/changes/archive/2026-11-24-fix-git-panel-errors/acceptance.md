# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Caught Git render failures log their actual error and innermost component while preserving native last-frame fallback.
- Notice requests yield before synchronous transport failures can notify during render.
- Native interruption remains unreproduced; a surviving abort marker provides best-effort component diagnostics on the next render.
- Panel API and GraphQL reads set a nonempty per-child GH_REPO without changing explicit credentials or the global account.
- Scoped refusals name the repository, refused PR numbers and verified effective login or explicitly unknown account.
- The host comparison records accepted 0.1.18 public capabilities, warned palette skip and owned feedback retention without live changes.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "fix-git-panel-errors",
  "sourcePr": 45,
  "archive": "openspec/changes/archive/2026-11-24-fix-git-panel-errors/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-24-fix-git-panel-errors/acceptance.md",
  "finalizedDate": "2026-11-24",
  "specBaseSha": "70fd212c94505a4d7b85d84cdefccc218f19e473",
  "acceptanceScenarios": [
    "Caught Git render failures log their actual error and innermost component while preserving native last-frame fallback.",
    "Notice requests yield before synchronous transport failures can notify during render.",
    "Native interruption remains unreproduced; a surviving abort marker provides best-effort component diagnostics on the next render.",
    "Panel API and GraphQL reads set a nonempty per-child GH_REPO without changing explicit credentials or the global account.",
    "Scoped refusals name the repository, refused PR numbers and verified effective login or explicitly unknown account.",
    "The host comparison records accepted 0.1.18 public capabilities, warned palette skip and owned feedback retention without live changes."
  ],
  "archiveDigest": "0b0182b0357290ac9075b07fa1b90070a10523cbdef84bbe306183a5bc5d9134",
  "specDigest": "1acbdc82490ab0197624caec7b32456bbd46e48a30c08f3ba37fe225d236b2ca",
  "tasksDigest": "2faca4c4119701d4b1458a5792ff416dc09b75823edbf0c11de43fd6f4a7450e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
