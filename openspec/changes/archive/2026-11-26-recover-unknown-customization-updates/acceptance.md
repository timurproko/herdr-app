# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Final deployment content survives transient Windows sharing errors and persistent rename refusal, with complete recovery evidence retained when destination publication also fails.
- Matching settled terminal evidence distinguishes a deployed-but-unsaved result from genuine uncertainty without manufacturing installed revision provenance.
- Retrying an unknown run requires explicit stopped-work confirmation, current run identity, a fresh main check and process, deadline and exclusive-lock revalidation.
- Stopped-state recovery requires dead recorded owners and complete process proof, archives stale locks/status/results, preserves journals and ownership, logs consent and returns to Check now without deployment.
- Cancel, reload, status reads, availability checks and relay hints never authorize replay; competing confirmations dispatch at most one new guarded run.
- The Windows supervision fixture separates slow bootstrap expiry from a post-dispatch timeout instead of racing a one-second wall clock or retrying assertions.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/herdr-app",
  "change": "recover-unknown-customization-updates",
  "sourcePr": 86,
  "archive": "openspec/changes/archive/2026-11-26-recover-unknown-customization-updates/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-26-recover-unknown-customization-updates/acceptance.md",
  "finalizedDate": "2026-11-26",
  "specBaseSha": "e7387ec91a5b9aea4719f353ec56d3f0db165efd",
  "acceptanceScenarios": [
    "Final deployment content survives transient Windows sharing errors and persistent rename refusal, with complete recovery evidence retained when destination publication also fails.",
    "Matching settled terminal evidence distinguishes a deployed-but-unsaved result from genuine uncertainty without manufacturing installed revision provenance.",
    "Retrying an unknown run requires explicit stopped-work confirmation, current run identity, a fresh main check and process, deadline and exclusive-lock revalidation.",
    "Stopped-state recovery requires dead recorded owners and complete process proof, archives stale locks/status/results, preserves journals and ownership, logs consent and returns to Check now without deployment.",
    "Cancel, reload, status reads, availability checks and relay hints never authorize replay; competing confirmations dispatch at most one new guarded run.",
    "The Windows supervision fixture separates slow bootstrap expiry from a post-dispatch timeout instead of racing a one-second wall clock or retrying assertions."
  ],
  "archiveDigest": "3a18a5dd17cd7e652daa5e9d02daaf562197722cad679dc221ce5f171f3a3238",
  "specDigest": "4b17fe70394ad85bf7f41f459a7c3204dedd8f047180bdaf5e851eb85af902c6",
  "tasksDigest": "99d5609944c82c2b41112803c039a1d61224fe773f29507bf860d238b954269f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
