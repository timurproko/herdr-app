# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- App and Core releases are compared independently with distinct reviewed source, host, document, baseline and native-original evidence.
- Candidate reports preserve scoped hunks and file-specific actions while separating static checks, fixture results and unavailable native proof.
- Publication requires explicit activation and a successful hosted no-write probe of the current workflow revision; disabled runs write no proposals or labels.
- The publisher creates the repository-local robot Skip label if missing and preserves existing proposal branches, delivery checklists and native update behavior.
- The runtime capability gate, reviewed-byte patch safeguards and reviewed originals remain unchanged; the shared MyWorkflows label manifest is untouched.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "herdr-upgrade-sync",
  "sourcePr": 27,
  "archive": "openspec/changes/archive/2026-11-23-herdr-upgrade-sync/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-herdr-upgrade-sync/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "d823d5ebac2cfd664fe3a61bfa2ec13476d5393f",
  "acceptanceScenarios": [
    "App and Core releases are compared independently with distinct reviewed source, host, document, baseline and native-original evidence.",
    "Candidate reports preserve scoped hunks and file-specific actions while separating static checks, fixture results and unavailable native proof.",
    "Publication requires explicit activation and a successful hosted no-write probe of the current workflow revision; disabled runs write no proposals or labels.",
    "The publisher creates the repository-local robot Skip label if missing and preserves existing proposal branches, delivery checklists and native update behavior.",
    "The runtime capability gate, reviewed-byte patch safeguards and reviewed originals remain unchanged; the shared MyWorkflows label manifest is untouched."
  ],
  "archiveDigest": "8e013aa76e787272995f4ffd25a5f12a6a82cb5ccc6fea2d9fdba1453b89c08b",
  "specDigest": "b9a698eb44860696067213d6e23fc56a2779d64df8717c11e46c9ec44ee42066",
  "tasksDigest": "da8d7eeab07098fb49df669e7a8e837b57cf78305c23f038233aee84cb694ba6",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
