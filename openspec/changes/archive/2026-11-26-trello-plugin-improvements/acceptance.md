# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Card detail and attachment listing retain allowed-board parent proofs, bounded metadata and truthful attachment counts and IDs.
- Read-only original and scaled-preview downloads enforce a 20 MiB ceiling, MIME and image signatures, private output and explicit other-type opt-in.
- Download credentials use only OAuth headers to exact Trello hosts; external links, redirects, attachment upload and deletion remain refused.
- Trello shows Add, Save and action-specific Saving, one named ready account row with hover Remove, and All ready with zero allowed boards.
- The Boards picker uses lightweight Active and Inactive tabs, preserves explicit selection semantics and omits the empty scope divider.
- Unsupported SSH setup shows one actionable explanation and Unavailable without a fix count or dependent controls; identity checks still precede credentials.
- Fake-server and disposable native fixtures cover the changed states without real Trello accounts, boards, remote setup or production deployment.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "trello-plugin-improvements",
  "sourcePr": 89,
  "archive": "openspec/changes/archive/2026-11-26-trello-plugin-improvements/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-26-trello-plugin-improvements/acceptance.md",
  "finalizedDate": "2026-11-26",
  "specBaseSha": "cccc23950be60f0be736fdb5778cf2069632a3ac",
  "acceptanceScenarios": [
    "Card detail and attachment listing retain allowed-board parent proofs, bounded metadata and truthful attachment counts and IDs.",
    "Read-only original and scaled-preview downloads enforce a 20 MiB ceiling, MIME and image signatures, private output and explicit other-type opt-in.",
    "Download credentials use only OAuth headers to exact Trello hosts; external links, redirects, attachment upload and deletion remain refused.",
    "Trello shows Add, Save and action-specific Saving, one named ready account row with hover Remove, and All ready with zero allowed boards.",
    "The Boards picker uses lightweight Active and Inactive tabs, preserves explicit selection semantics and omits the empty scope divider.",
    "Unsupported SSH setup shows one actionable explanation and Unavailable without a fix count or dependent controls; identity checks still precede credentials.",
    "Fake-server and disposable native fixtures cover the changed states without real Trello accounts, boards, remote setup or production deployment."
  ],
  "archiveDigest": "72812e604a097ab069fa17b95dc6fce9a616105999d930215e3f6432e9f92b8b",
  "specDigest": "77466d5f9d8451455b8447f66a0e6b335e809be336daa081dc78101d5c321829",
  "tasksDigest": "795f9ca5c4d897b4105f1b7c709b1f0175ed45a68f656e3a96f86408ab74ba7e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
