# Proposal

## Why

People need one choice for how Crew organizes new work across all their computers, rather than configuring each coordinator home separately. The earlier global-intent plan identified Crew's owner-only setter as a blocker; Crew PR 23 now proposes a narrow desktop setter that can support this without controlling running coordinators.

## What Changes

- Add a Crew-contributed **Separate space per project** switch directly below **Connect fleet space to coordinator** in Settings → Spaces, reusing the standard row, toggle and status badge.
- Use the description **Give each project its own space under the coordinator for new work; running agents stay where they are.** Keep the title and description free of per-machine wording.
- Store one global intent in the existing Herdr plugin preference mechanism: absent/off means combined; on means per-project. The switch never mirrors an individual home's observed mode.
- Reconcile every authoritative known coordinator home on this computer and connected machines, including several homes per machine. New homes and returning offline machines receive the latest intent without another click. Fleet attachment and the selected machine do not scope this choice.
- Require Crew's advertised `worker-space-local-set` v1 capability and explicit-home JSON setter. Unsupported Crew leaves the row disabled with a short reason; no version guessing or ownership workaround is permitted.
- Preserve intent on partial application, with concise existing-style machine-named pending, unsupported, refused or failed status. Never imply universal application from a successful subset.
- Change future independent admissions only: no movement, restart, relabeling or control of running agents, reviews or replacements.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: global Crew Spaces switch, durable intent, existing presentation and truthful machine status.
- `plugin-integrations`: capability-gated explicit-home reconciliation across known machines, discovery, retry and configuration safety.

## Impact

Affected areas are Crew's declaration and owned policy/command helpers, the generic plugin registry contribution seam, Spaces settings composition, existing preference round-trip coverage and existing Spaces lifecycle. Reuse Crew's current machine execution transport; no native changes, new transport/service, installs or changes to Trello/shared Plugins-card visuals.

This separate change adapts the earlier `global-crew-worker-space-intent` plan on PR 88, without its five already-delivered UX outcomes. Base is current main; PR 88's forthcoming multi-child integration must be incorporated from main before finishing. Crew PR 23 is an upstream dependency: inspect its final `docs/worker-spaces.md` contract and promised PR 88 comment before implementing the adapter. During planning the v1 contract became documented in `docs/worker-spaces.md` at Crew head `841ff2da60c5e44a6a582e5193b8a2826975b74b`; that full contract was reviewed. The promised final-contract comment on PR 88 is still pending and must be checked alongside the latest branch docs before adapter work.

Verification uses fake Crew only for on, off, missing capability, one refused home, offline-then-reachable, later home and restart persistence. Native row proof uses synthetic disposable App 0.1.18 at 100%/130%, never the person's Crew configuration or running coordinators.
