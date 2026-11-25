# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Trello starts disabled and read-only; portable settings cannot grant a board or the private write opt-in.
- Credentials stay in protected local files, and only documented fixed-origin typed operations can reach Trello.
- Scoped reads and single-object writes reject forged parent identities; uncertain dispatched writes are never replayed.
- Full deployment installs owned Bash and Windows launchers without source imports, credential copying or profile edits.
- Credential and URL redaction, rate-limit cooldown and local revocation remain effective across CLI invocations.
- Owner guidance explains token generation, revocation, inherited PATH requirements and the same-user security boundary.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "add-trello-agent-cli",
  "sourcePr": 80,
  "archive": "openspec/changes/archive/2026-11-25-add-trello-agent-cli/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-25-add-trello-agent-cli/acceptance.md",
  "finalizedDate": "2026-11-25",
  "specBaseSha": "b047c73c27dcba5bbaa076e1f9bd36fcac7aa26c",
  "acceptanceScenarios": [
    "Trello starts disabled and read-only; portable settings cannot grant a board or the private write opt-in.",
    "Credentials stay in protected local files, and only documented fixed-origin typed operations can reach Trello.",
    "Scoped reads and single-object writes reject forged parent identities; uncertain dispatched writes are never replayed.",
    "Full deployment installs owned Bash and Windows launchers without source imports, credential copying or profile edits.",
    "Credential and URL redaction, rate-limit cooldown and local revocation remain effective across CLI invocations.",
    "Owner guidance explains token generation, revocation, inherited PATH requirements and the same-user security boundary."
  ],
  "archiveDigest": "819ff46f219079e7c812bb7662a7d92cdc8bbe8bafd5e81f4bf5445147ed0139",
  "specDigest": "745fa5af08d2e3c430ca13a60c42982488e23784822613a7a4acb3d74f9961c5",
  "tasksDigest": "707a76350beaebcef8d2555606afed8dd018d93af176396f31d611e25497c8e1",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
