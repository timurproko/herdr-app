# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Protected store checks retain permission enforcement and distinguish tooling, unsafe state and missing setup without secret diagnostics.
- Reopened cards use protected saved names without provider requests; explicit Requirements Check verifies and hydrates legacy names.
- Saved accounts and boards use shared Crew-style rows, captured machine scope, hover removal and Active or Inactive picker tabs.
- Installed CLI help and its offline reference work without a checkout, hook, MCP server or OAuth flow.
- SSH owner setup uses identity-bound stdin only; runtime fixes preserve private setup, unrelated files and modified owned output.
- Global consent is nonportable and gates real host CLIs; new hosts remain read-only, with durable Pending state and explicit Retry.
- Offline or replaced scopes retain last acknowledged rights until safely contacted; no automatic grant replay or atomic revocation is claimed.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "trello-card-improvements",
  "sourcePr": 83,
  "archive": "openspec/changes/archive/2026-11-26-trello-card-improvements/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-26-trello-card-improvements/acceptance.md",
  "finalizedDate": "2026-11-26",
  "specBaseSha": "14780731c6d985f9f97eb5602c7933ab684a3727",
  "acceptanceScenarios": [
    "Protected store checks retain permission enforcement and distinguish tooling, unsafe state and missing setup without secret diagnostics.",
    "Reopened cards use protected saved names without provider requests; explicit Requirements Check verifies and hydrates legacy names.",
    "Saved accounts and boards use shared Crew-style rows, captured machine scope, hover removal and Active or Inactive picker tabs.",
    "Installed CLI help and its offline reference work without a checkout, hook, MCP server or OAuth flow.",
    "SSH owner setup uses identity-bound stdin only; runtime fixes preserve private setup, unrelated files and modified owned output.",
    "Global consent is nonportable and gates real host CLIs; new hosts remain read-only, with durable Pending state and explicit Retry.",
    "Offline or replaced scopes retain last acknowledged rights until safely contacted; no automatic grant replay or atomic revocation is claimed."
  ],
  "archiveDigest": "d14682f362f6719070c3c38c1543452d6c6a1d67901b405169ce34b000166f51",
  "specDigest": "2960a12bad6fb58946635b5e1bd8b65639e95aad357e7b724022dedff0364da3",
  "tasksDigest": "827df20b7131a75902fd824bd4ec26247f268cdc9417732bd6b855a7d746e47d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
