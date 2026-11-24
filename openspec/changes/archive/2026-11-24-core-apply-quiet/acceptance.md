# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Apply retains its original hint through saving, restarting and fresh-status reconciliation; progress stays in Status only.
- The Core footer and fixed-size Discard/Apply buttons keep their geometry, with an empty hint and disabled actions when clean.
- Status does not advertise cached Running during post-restart inspection; eligible runtime controls recover with fresh verified facts.
- Failures remain visible in the existing page error area, and offline, unknown-permission and duplicate-submission guards remain intact.
- Lifecycle regressions cover deferred inspection, save-only edits, late replies, request replacement and machine isolation.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "core-apply-quiet",
  "sourcePr": 41,
  "archive": "openspec/changes/archive/2026-11-24-core-apply-quiet/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-24-core-apply-quiet/acceptance.md",
  "finalizedDate": "2026-11-24",
  "specBaseSha": "eaea7a2ac6c11724700e61166483a403896c2e33",
  "acceptanceScenarios": [
    "Apply retains its original hint through saving, restarting and fresh-status reconciliation; progress stays in Status only.",
    "The Core footer and fixed-size Discard/Apply buttons keep their geometry, with an empty hint and disabled actions when clean.",
    "Status does not advertise cached Running during post-restart inspection; eligible runtime controls recover with fresh verified facts.",
    "Failures remain visible in the existing page error area, and offline, unknown-permission and duplicate-submission guards remain intact.",
    "Lifecycle regressions cover deferred inspection, save-only edits, late replies, request replacement and machine isolation."
  ],
  "archiveDigest": "b9ed3622640991374a4633141d7180911ea09e77f52eb6fb06aa1f12d1ac0ab9",
  "specDigest": "442596065a0329f0143675a0814b5869e39d665f6b9b1b6abee59ceb3e5976cf",
  "tasksDigest": "6977e1b316ab85a4ccba4330a3990603a934b25fc77da73f217809d77e7849df",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
