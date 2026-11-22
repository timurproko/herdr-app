# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Unsafe local source refuses the whole run before deployment or remote calls, and eligible local source uses the existing full deploy.
- Eligible existing peers receive shell-only updates in their default homes through bounded hc exec, while skips and independent failures remain explicit.
- Dry-run fetches for comparison without fast-forwarding or deploying, and selection never bypasses the source gate.
- Final machine summaries retain source commits and printed backup IDs, with non-zero exit for failures and manual setup documented for new peers.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "deploy-all",
  "sourcePr": 6,
  "archive": "openspec/changes/archive/2026-11-22-deploy-all/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-22-deploy-all/acceptance.md",
  "finalizedDate": "2026-11-22",
  "specBaseSha": "ca18f57edfe67eb316244438db410be5ba06f019",
  "acceptanceScenarios": [
    "Unsafe local source refuses the whole run before deployment or remote calls, and eligible local source uses the existing full deploy.",
    "Eligible existing peers receive shell-only updates in their default homes through bounded hc exec, while skips and independent failures remain explicit.",
    "Dry-run fetches for comparison without fast-forwarding or deploying, and selection never bypasses the source gate.",
    "Final machine summaries retain source commits and printed backup IDs, with non-zero exit for failures and manual setup documented for new peers."
  ],
  "archiveDigest": "90988bbcb15bda0b22f587dfd6799adaa40a85608c603bfd66d596cbec46fb84",
  "specDigest": "3b179ce193c668079c9d9377e35c93bc1b602b0791e8f0bd55e8fd848959d01d",
  "tasksDigest": "5ddf0ec3d7f6f0ea830fea78802456e827f1aecd4496c3e7e57f35c14839c52b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
