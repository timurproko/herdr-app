# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Unknown installed revisions show only herdr-app-custom without trailing whitespace across row states; known revisions retain their seven-character suffix.
- A successful main check with missing installed evidence still offers Update, and cached no-update results without a revision do not claim current status.
- Settings identifies native Herdr and herdr-core checks as hourly and Custom checks as normally every 2–3 minutes while mounted, with configured-relay merge hints kept conditional.
- Maintained documentation describes the quiet title and distinct cadences while retaining provenance, retry-backoff and terminal-continuity guidance.
- Host review profiles, deployment gates, failure wording and update detection and scheduling remain unchanged; no deployment is performed.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "update-row-unknown",
  "sourcePr": 20,
  "archive": "openspec/changes/archive/2026-11-23-update-row-unknown/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-update-row-unknown/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "579df2135f5fa71805c21c38748a7baa4fe6b810",
  "acceptanceScenarios": [
    "Unknown installed revisions show only herdr-app-custom without trailing whitespace across row states; known revisions retain their seven-character suffix.",
    "A successful main check with missing installed evidence still offers Update, and cached no-update results without a revision do not claim current status.",
    "Settings identifies native Herdr and herdr-core checks as hourly and Custom checks as normally every 2–3 minutes while mounted, with configured-relay merge hints kept conditional.",
    "Maintained documentation describes the quiet title and distinct cadences while retaining provenance, retry-backoff and terminal-continuity guidance.",
    "Host review profiles, deployment gates, failure wording and update detection and scheduling remain unchanged; no deployment is performed."
  ],
  "archiveDigest": "7e2b46e79416b9bdd3abc68cc1b9f62ba40223b5f24d6a94e98a951044f0b454",
  "specDigest": "f348d78c021027e109d2a3a9880d199d93a9d4a50535282997d0d5623cde34f3",
  "tasksDigest": "9d91dc1de0106be1925198bc46ada89997bb04f4f80e949de7052306ac32e15d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
