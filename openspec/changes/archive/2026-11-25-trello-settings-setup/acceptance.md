# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The local Trello card verifies token identity, clears submitted inputs and offers explicit credential replacement and removal.
- Only the Node worker writes protected credentials; transient inputs never become shared settings, portable preferences or command arguments.
- The owner chooses named boards through Settings while agent commands remain restricted to the machine-local allowlist.
- Explicit Access changes update private write permission and the public gate; imported preferences cannot create private board or write authority.
- SSH-selected setup clearly refuses before local store access, and stale machine or credential selections cannot apply new grants.
- Installed headless setup remains available, while credential-bearing preference snapshots are refused rather than copied into shared state.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "trello-settings-setup",
  "sourcePr": 81,
  "archive": "openspec/changes/archive/2026-11-25-trello-settings-setup/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-25-trello-settings-setup/acceptance.md",
  "finalizedDate": "2026-11-25",
  "specBaseSha": "20fd74ff6ea2c00209b478b59dfe32fba220e37a",
  "acceptanceScenarios": [
    "The local Trello card verifies token identity, clears submitted inputs and offers explicit credential replacement and removal.",
    "Only the Node worker writes protected credentials; transient inputs never become shared settings, portable preferences or command arguments.",
    "The owner chooses named boards through Settings while agent commands remain restricted to the machine-local allowlist.",
    "Explicit Access changes update private write permission and the public gate; imported preferences cannot create private board or write authority.",
    "SSH-selected setup clearly refuses before local store access, and stale machine or credential selections cannot apply new grants.",
    "Installed headless setup remains available, while credential-bearing preference snapshots are refused rather than copied into shared state."
  ],
  "archiveDigest": "1355ae93cf1c660b082ee49c7c4660be7f86cc56e10002ca6c55c447e021c251",
  "specDigest": "8f146c09211e7502415dcf1014caf2a4e0b17889ed397dd9678256ae61091aee",
  "tasksDigest": "bc73e3a5b49aa6bc69057857f62103ab098c890a898e1fd80cc2a2353b0029ba",
  "evidenceDigest": "890609a2389bcef4b86498f15047fe333248c21fc0a3cc62d65fa4636b20001c",
  "knownGaps": []
}
```
