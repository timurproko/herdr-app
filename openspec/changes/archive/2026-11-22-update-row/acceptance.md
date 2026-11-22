# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Customizations and its short revision share one row and one label constant; the native Herdr and herdr-core update actions remain unchanged.
- Updates use the fixed managed desktop clone and existing full-desktop and eligible-peer shell deployment policy without touching development worktrees.
- Detached execution reattaches through status files; partial failures and unknown outcomes retain logs and never trigger automatic replay or rollback.
- Published-main checks run hourly while mounted and on request, with shared Custom dots and no peer probes or deployments during checks.
- Isolated fixture coverage includes real detached Node supervision with synthetic deployment; actual Herdr rendering and self-reload remain maintainer checks documented in COMMANDS.md.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "update-row",
  "sourcePr": 7,
  "archive": "openspec/changes/archive/2026-11-22-update-row/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-22-update-row/acceptance.md",
  "finalizedDate": "2026-11-22",
  "specBaseSha": "028dcfb5312ad232986204727078830d9970f922",
  "acceptanceScenarios": [
    "Customizations and its short revision share one row and one label constant; the native Herdr and herdr-core update actions remain unchanged.",
    "Updates use the fixed managed desktop clone and existing full-desktop and eligible-peer shell deployment policy without touching development worktrees.",
    "Detached execution reattaches through status files; partial failures and unknown outcomes retain logs and never trigger automatic replay or rollback.",
    "Published-main checks run hourly while mounted and on request, with shared Custom dots and no peer probes or deployments during checks.",
    "Isolated fixture coverage includes real detached Node supervision with synthetic deployment; actual Herdr rendering and self-reload remain maintainer checks documented in COMMANDS.md."
  ],
  "archiveDigest": "6dd18c790c352da656afd9e80eb21a5e1c913ea42761544bdb4fe48cda7ee0b3",
  "specDigest": "9868c5cfcb08c774ac2aa6e6bf3c6f448f686cce60c4badd0d26e304f0dc1fce",
  "tasksDigest": "13068e79d310a6720380edea87c40381a975168490d8bc4da09767bae3160e0c",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
