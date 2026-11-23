# Proposal

## Why

Settings Update cannot install merged customization fixes on Herdr App 0.1.17 because deployment equates an unreviewed release with incompatibility despite all required capabilities being present. Optional native frame refreshes can independently turn a successful customization install into a failed update when upstream bytes change.

## What Changes

- Separate supported public-host capability checks from review history: accept newer unreviewed releases meeting the minimum supported version and required API, command and import rules, with a visible newer-than-last-reviewed advisory.
- Keep every tab-move upgrade audit result advisory, including unavailable release source; preserve runtime capability, generation and document-shape gates.
- Skip unsupported palette/feedback targets during automatic refresh without touching unknown bytes, retaining opt-ins and recovery records and exposing clear patch advisories through deploy and doctor. Preserve genuine ownership/dependency/corrupt-record refusals.
- Carry actionable host-check/build/install/patch failure causes into all-machine results and the Settings row instead of the generic deployment-failed text.
- Cover real 0.1.17 read-only host validation, disposable end-to-end deployment/update fixtures, supported and unsupported version cases, native-patch safety and honest stock-baseline coverage; update operating documentation and retry instructions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: capability-based desktop compatibility, advisory optional-patch skips and actionable update failure reporting without weakening installation/recovery ownership gates.

## Impact

`src/integration/herdr/compatibility.js`, `tools/check-host-api.mjs`, `tools/deploy.mjs`, `tools/deploy-all-worker.cjs`, frame registry/refresh workers, update runner/result projection, deployment and integration tests, reviewed-baseline selection and README/development/architecture/command/testing/native-patch documentation. No new dependencies, native rebuild, host installation, deployment, peer operation, live session mutation, 0.1.17 allowlist entry or fabricated reviewed baseline is authorized.
