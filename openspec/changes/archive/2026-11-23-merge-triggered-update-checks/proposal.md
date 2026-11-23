# Proposal

## Why

Merges to this customization's main branch can remain invisible until an hourly check or a manual Check now. Each desktop needs prompt, independently verified availability, including when Settings and the Git panel are closed, without granting automatic installation authority.

## What Changes

- Replace both hourly gates with machine-local healthy checks every 120–180 seconds, persisted jittered scheduling, bounded failure backoff, startup and supported focus/resume catch-up.
- Add an update-owned subscription mounted with non-footer workspace chrome to Git's existing authenticated relay. Main pushes and merged PRs for timurproko/herdr-app invalidate only availability; the existing bounded remote-main comparison decides the badge.
- Consolidate relay socket ownership under the mounted Git integration and let the visible Git panel consume public invalidations rather than open a second socket. Keep Git's disable semantics: disabled Git means no relay subscription; Custom polling remains active.
- Preserve Check now, explicit Update, installed-revision provenance, locks, single-flight checks, eager-check guards and every deployment safety gate.
- Add fixture coverage and update update/webhook/setup documentation. No deployment, cloud provisioning, webhook enrollment or real-account testing is part of this task.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: replace hourly availability checks with bounded frequent polling and event-triggered authoritative catch-up.
- `plugin-integrations`: define one authenticated relay owner, independent update subscriptions, minimal branch/merge notices and disabled/unconfigured behavior.

## Impact

Updater worker/cache and shared controller, workspace chrome lifecycle, Git plugin relay transport and panel consumption, relay notice producer, plugin API/registry boundary as needed, package mappings, update/webhook fixtures and README/docs. No new external service, native patch, Actions workflow, daemon or deployment mechanism.

After eventual merge, the person must install the observer once on each Desktop/Custom machine using the existing guarded clean-main full-deploy flow. For near-immediate events they must explicitly redeploy their existing relay (Configure) and enroll timurproko/herdr-app in Git's Repositories list using its explicit save action. Each machine needs its own valid local relay setup/credentials; these are never preference-synced. pc2 without relay setup still checks independently every 2–3 minutes. Core-only machines have no desktop badge. No setup or deployment will be performed by this change's agent.
