# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Pin holds the displayed machine, folder and agent context across agent, tab and space navigation while scoped refresh continues.
- Manual Files or Git changes and explicit close or reopen retain the same held source; Unpin resumes following the current agent.
- Held context lives only in app-session memory; restart and legacy per-tab state start unpinned without persisting source identities.
- Files actions retain the held machine and folder while viewers open in the current space without unsafe cross-machine reuse.
- Ordinary and coordinator Git resolve the held source without render-path changes; existing live identity and stale-reply guards remain.
- Existing pin visuals and controls remain unchanged apart from accessible wording, with no new messages, buttons or options.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "freeze-right-sidebar-context",
  "sourcePr": 109,
  "archive": "openspec/changes/archive/2026-11-28-freeze-right-sidebar-context/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-28-freeze-right-sidebar-context/acceptance.md",
  "finalizedDate": "2026-11-28",
  "specBaseSha": "43edc5b0b67fed1d1b8a6d200a98716c6e203b21",
  "acceptanceScenarios": [
    "Pin holds the displayed machine, folder and agent context across agent, tab and space navigation while scoped refresh continues.",
    "Manual Files or Git changes and explicit close or reopen retain the same held source; Unpin resumes following the current agent.",
    "Held context lives only in app-session memory; restart and legacy per-tab state start unpinned without persisting source identities.",
    "Files actions retain the held machine and folder while viewers open in the current space without unsafe cross-machine reuse.",
    "Ordinary and coordinator Git resolve the held source without render-path changes; existing live identity and stale-reply guards remain.",
    "Existing pin visuals and controls remain unchanged apart from accessible wording, with no new messages, buttons or options."
  ],
  "archiveDigest": "2a2d63b526610390135d38c11de50d6739dd56f8b4de816d8405dc0955aaa50f",
  "specDigest": "49628acc39328a5ab6a3c377dd0ec5a930ad2549519f8d303d9c120dc67206ff",
  "tasksDigest": "439dde954d8c660093f954587184a3816aa93912ec33cb6e1b4fa6548f820d4e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
