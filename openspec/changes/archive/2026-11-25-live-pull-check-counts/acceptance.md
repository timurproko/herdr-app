# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Unchanged-head pending counts advance without events through one combined repository request per bounded chunk.
- Counts retain newest-workflow and rerun semantics, including passed skipped and neutral results and mixed status contexts.
- Enrolled pending rows use 45 seconds, settled rows retain their cadence, and overdue numeric demand cannot reuse an already-started response.
- Quiet cooldowns preserve loaded data and retry at the shared expiry without requiring another event.
- Detailed probes retain the first-100-context refusal and cap detailed aliases at twenty within forty state aliases.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "live-pull-check-counts",
  "sourcePr": 71,
  "archive": "openspec/changes/archive/2026-11-25-live-pull-check-counts/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-25-live-pull-check-counts/acceptance.md",
  "finalizedDate": "2026-11-25",
  "specBaseSha": "c1dfeeda50d8f8a86e7014d424c1e643f8a2795a",
  "acceptanceScenarios": [
    "Unchanged-head pending counts advance without events through one combined repository request per bounded chunk.",
    "Counts retain newest-workflow and rerun semantics, including passed skipped and neutral results and mixed status contexts.",
    "Enrolled pending rows use 45 seconds, settled rows retain their cadence, and overdue numeric demand cannot reuse an already-started response.",
    "Quiet cooldowns preserve loaded data and retry at the shared expiry without requiring another event.",
    "Detailed probes retain the first-100-context refusal and cap detailed aliases at twenty within forty state aliases."
  ],
  "archiveDigest": "83c0237e3f2ac0c369314bed3460b99d62575057fb6859b86fc5ec900f8b4078",
  "specDigest": "8887095e3adceb7f0f01728fd80ec592114ecc2a775d92f346080c63ff82c3d6",
  "tasksDigest": "ce787167690877abf245435fb607fbb9fecda92ff1440e340e962897b38509a0",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
