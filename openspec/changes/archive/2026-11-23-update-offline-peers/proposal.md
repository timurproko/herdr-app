# Proposal

## Why

A successful desktop update currently warns about pc2 merely being switched off. Removing that warning alone would conceal another gap: after the desktop becomes current, Settings no longer offers Update to revisit a skipped peer.

## What Changes

- Treat positively identified offline/unreachable peer skips and the deliberate `needs its own full deploy` exclusion as benign, while keeping their reasons in the log/result.
- Keep reachable deployment errors, unknown outcomes, locks, inventory errors and other ineligibility skips visible under the existing partial/failed diagnostics and safety gates.
- Remember offline catch-up needs in host-local update runtime bookkeeping, separate from installed provenance, published-main availability and portable preferences. Offer the ordinary Update action for deferred peer work even when the desktop is current, without a warning, log pointer or update badge.
- Revisit peers on every explicit update, including equal-main runs; clear a deferred peer only after a successful/current deployment or confirmed exclusion/removal. No reconnect-triggered deploy, background worker or automatic replay.
- Update focused deployment/row/indicator regressions and the documentation defining partial outcomes and practical catch-up timing.
- Use the concise Updating… description throughout launching/running feedback, preserving the existing button label and every other state's wording.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: distinguish benign unavailable/excluded peers from partial failures and allow quiet peer catch-up through the existing explicit all-machine Update action.

## Impact

- `tools/deploy-all.mjs` and `tools/deploy-all-worker.cjs`: result classifications and durable deferred-peer facts, preserving source, eligibility, lock and installed-manifest evidence gates.
- `src/services/updates/update-worker.cjs`, `src/shared/customization-update-model.js` and `src/shared/customization-updates.js`: consistent terminal outcomes, separate catch-up launch eligibility and desktop-only availability.
- Existing `tests/deploy-all*.test.mjs`, `tests/update-{check,runner,row,markers}.test.mjs` and deployment pipeline fixtures; README, COMMANDS and TESTING documentation.
- No new dependency, deployment, restart, peer provisioning, portable preference or native API change. Desktop-equipped peers still require their own full Update and are not queued for shell deployment.
