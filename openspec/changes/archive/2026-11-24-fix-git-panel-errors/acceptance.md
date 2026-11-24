# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Caught Git render failures log their actual error and innermost component while preserving native last-frame fallback.
- Notice requests yield before synchronous transport failures can notify during render.
- Native interruption remains unreproduced; a surviving abort marker provides best-effort component diagnostics on the next render.
- Panel API and GraphQL reads set a nonempty per-child GH_REPO without changing explicit credentials or the global account.
- Missing PRs are grouped as not found without account diagnosis; real permission refusals identify the repository and verified or unknown account.
- Disabled, hidden or stale failed replies cannot start account follow-ups on their former repository or machine.
- Complete page reads include both totals, and permission failures reuse one account diagnosis per repository per refresh rather than per PR.
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
  "specBaseSha": "f6e03399d12a3292fdc16526c01f4334631cdcad",
  "acceptanceScenarios": [
    "Caught Git render failures log their actual error and innermost component while preserving native last-frame fallback.",
    "Notice requests yield before synchronous transport failures can notify during render.",
    "Native interruption remains unreproduced; a surviving abort marker provides best-effort component diagnostics on the next render.",
    "Panel API and GraphQL reads set a nonempty per-child GH_REPO without changing explicit credentials or the global account.",
    "Missing PRs are grouped as not found without account diagnosis; real permission refusals identify the repository and verified or unknown account.",
    "Disabled, hidden or stale failed replies cannot start account follow-ups on their former repository or machine.",
    "Complete page reads include both totals, and permission failures reuse one account diagnosis per repository per refresh rather than per PR.",
    "The host comparison records accepted 0.1.18 public capabilities, warned palette skip and owned feedback retention without live changes."
  ],
  "archiveDigest": "d3e8f1125c046a3a49c425d2904d91da9dfa00112fb54a616fbc48d900e07a1e",
  "specDigest": "c2a30b3bbd7454234b02c506e815c74a75cccd6fb4a2569dffa7fc61036018ad",
  "tasksDigest": "6a4654007aa4d5529f4db99cc203d231e002812cfb1ef47cc74091896e84491e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
