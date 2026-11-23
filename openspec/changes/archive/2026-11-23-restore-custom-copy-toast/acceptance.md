# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Terminal copy feedback renders the original bottom-center popup with terminal-font text, theme colors, rounded geometry, wording and fade/slide timing instead of standard notifications.
- Cold-start publication, re-enabling, stale selection cancellation, bounded direct clipboard reads and one popup per settled selection remain intact.
- Popup lifetime timers are canceled and guarded across repeated copies, eligibility changes and close, and feedback stays confined to its source tab.
- Focused controller and render-tree fixtures pass, packaging builds successfully, and README, testing guidance and the OpenSpec delta describe the custom popup and best-effort limits.
- No native changes, deployment or live clipboard/session operations were performed; native pixel validation remains outside this task.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "restore-custom-copy-toast",
  "sourcePr": 13,
  "archive": "openspec/changes/archive/2026-11-23-restore-custom-copy-toast/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-restore-custom-copy-toast/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "7ab56d6aa1d587fac3b7dbd1065512df21ff607e",
  "acceptanceScenarios": [
    "Terminal copy feedback renders the original bottom-center popup with terminal-font text, theme colors, rounded geometry, wording and fade/slide timing instead of standard notifications.",
    "Cold-start publication, re-enabling, stale selection cancellation, bounded direct clipboard reads and one popup per settled selection remain intact.",
    "Popup lifetime timers are canceled and guarded across repeated copies, eligibility changes and close, and feedback stays confined to its source tab.",
    "Focused controller and render-tree fixtures pass, packaging builds successfully, and README, testing guidance and the OpenSpec delta describe the custom popup and best-effort limits.",
    "No native changes, deployment or live clipboard/session operations were performed; native pixel validation remains outside this task."
  ],
  "archiveDigest": "e7e28d1da5028e63e90bf304613f79937528b2b62a5218b3596c50ca8b71ff4d",
  "specDigest": "6582251dd7c684be3e167d015ef2d261deafd70cf6fb34e28bcdabee77d3f84d",
  "tasksDigest": "f8edec07376ece97d0b9f4638bb58f1092ea3b2a98d77d69b8c01c9a87763e8d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
