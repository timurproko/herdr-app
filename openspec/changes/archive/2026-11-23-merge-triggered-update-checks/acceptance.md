# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Each running desktop checks authoritative main independently on a jittered 120–180 second healthy cadence, including without Git relay setup.
- Startup, idle activation, delayed timers and relay reconnect catch up under single-flight leases and bounded persisted failure backoff.
- Only matching main push or closed merged-PR hints accelerate checks; event payloads never set availability or launch an update.
- One leased chrome transport serves independent Git and update consumers; hidden panels stay read-free and disabled Git leaves updater polling active.
- Existing manual Check now, explicit Update, installed provenance, locks, partial results and unknown-outcome safety gates remain intact.
- Legacy relays have an explicit Configure upgrade path, and documentation identifies per-desktop installation and repository enrollment as person-owned actions.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "merge-triggered-update-checks",
  "sourcePr": 17,
  "archive": "openspec/changes/archive/2026-11-23-merge-triggered-update-checks/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-merge-triggered-update-checks/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "c3d9e4d60744df32130efa2819ea25d3b591219e",
  "acceptanceScenarios": [
    "Each running desktop checks authoritative main independently on a jittered 120–180 second healthy cadence, including without Git relay setup.",
    "Startup, idle activation, delayed timers and relay reconnect catch up under single-flight leases and bounded persisted failure backoff.",
    "Only matching main push or closed merged-PR hints accelerate checks; event payloads never set availability or launch an update.",
    "One leased chrome transport serves independent Git and update consumers; hidden panels stay read-free and disabled Git leaves updater polling active.",
    "Existing manual Check now, explicit Update, installed provenance, locks, partial results and unknown-outcome safety gates remain intact.",
    "Legacy relays have an explicit Configure upgrade path, and documentation identifies per-desktop installation and repository enrollment as person-owned actions."
  ],
  "archiveDigest": "1793909041f81fd79273a9c1da5f1d41336ce6c7dd6a6e4447d95de77f02c276",
  "specDigest": "6c06568aacf40e4f42e5a6616d15b03f5dae66f099439f8049c9a6c3c2c4be6b",
  "tasksDigest": "1b2dcf400a97c6b3b6930e60bdb0173a62ab2ea91030ac82262e3cb5cf176e98",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
