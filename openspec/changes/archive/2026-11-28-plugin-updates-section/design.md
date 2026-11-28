# Design

## Context

See proposal.md for motivation. `src/features/settings/main.js` renders the existing Herdr heading, three update rows and fixed native explanation. `src/shared/customization-updates.js` owns mounted-chrome update observation; workspace chrome, the compact menu and Settings consume availability separately.

Plugins declare prerequisite checks and fixes through the registry. Crew's `crew` prerequisite returns Outdated and the existing `UPDATE_CREW` fix only after comparing installed and remote revisions; missing tools instead offer installation. `plugins-ui.js` owns `viewContext`, `runFixes`, settling feedback and authoritative rechecks. `settings-requests.js` supplies bounded admission. The current context overlays the captured machine, so no batch should change portable machine settings to select a target.

`tools/deploy-all.mjs` inventories machines, processes local first, then iterates peers sequentially in inventory order and continues after failures. This is the ordering/error-handling reference, not a second plugin installation backend. Its shell-only eligibility exclusions apply to customization payloads, not to plugin-tool updates.

## Goals / Non-Goals

**Goals:** Reuse plugin-owned checks and update actions, generic Settings action orchestration and current visual components. Publish one connected-machine availability projection usable by already-mounted indicator consumers, independently of visiting Plugins.

**Non-Goals:** New installers, broad Install all behavior, tool provisioning, automatic updates, preference changes, native patches, detached deployment infrastructure, live terminal interaction or a second machine picker. Do not alter native/customization update cadence, receipts, recovery, row-specific control locking or explanation text.

## Decisions

### Explicit update eligibility in existing plugin check results

Add a generic explicit update marker to prerequisite results, with Crew's confirmed outdated result as its first producer. Discover only update-capable prerequisites rather than running every plugin's setup/project checks. Retain the existing fix object and callback; never infer eligibility from the words Update/Outdated, an error or an unmet requirement. Installed-tool updates can be discoverable without enabling a plugin, but dispatch must preserve any declared enablement or confirmation requirement.

An alternative that treats every fix as an update would silently provision missing tools or configure external services. A Crew-specific branch in Settings would break the declaration boundary.

### Shared, bounded connected-machine discovery

Use a shared controller packaged through the existing mod mapping. Mounted non-footer chrome owns coalesced read-only discovery at startup and bounded refresh opportunities; opening Updates requests or joins a refresh. Use the existing mounted update lifecycle for scheduling rather than a separate daemon or render-time work. Checks follow Settings execution admission, with per-machine/plugin sessions, captured target context and generation guards. Publish sanitized pending facts and active-batch outcomes under a namespaced runtime key, never callback objects, credentials or portable preferences.

Use this computer once, then connected peers in the same machine-inventory order as deploy:all. Reconcile connection changes, retaining last confirmed facts on a failed connected-machine check but excluding disconnected peers from current pending availability. Older checks cannot overwrite a newer generation. Eager native-check contexts must start no discovery or actions.

An Updates-only scan would leave Settings dots unaware until the person already opened the destination. Independent per-consumer scans would duplicate reads and increase native execution contention.

### One shared execution path, sequential batch orchestration

Extract the reusable captured-context action/recheck core from the existing Settings fix lifecycle so the existing Plugins buttons and the new batch call the same per-plugin update action with the same guards. Keep view-specific confirmation and UI bookkeeping in their adapters. Do not copy install commands or call deploy:all to install plugin tools.

The Update click captures pending identities and machine ordering, claims single-flight ownership, and rechecks each target before dispatch. Complete this computer before proceeding through peers; multiple tools on one machine are sequential. A refusal ends that machine's current action sequence, records a concise inline failure and proceeds to the next machine. A disconnect before dispatch starts no action. Submitted writes are never retried automatically; only the existing exact pre-dispatch capacity-refusal retry remains permitted. Recheck after completion and clear pending facts only from authoritative results.

Closing or replacing the initiating view retires future dispatch using the existing task/generation rules, not by killing a running tool. Reopening reconciles actual plugin status; an unfinished/uncertain action is not automatically replayed. Shared ownership prevents an old callback or duplicate click from dispatching another batch while an action remains unresolved.

### Minimal existing Settings presentation and dot composition

Append the Plugins heading beneath the complete Herdr block, preserving the existing explanation under its three rows. Reuse Settings heading/row/control and status components: plugin name, machine and short progress/failure text, plus one section-level Update action. No per-row actions, info cards, new options or duplicated native explanation. Keep successful/failed captured rows long enough to communicate the batch result in place; no success toast or navigation.

Compose the plugin pending predicate into existing Settings and Updates dot predicates, including expanded/compact chrome and the compact More menu. Preserve the existing native managed-Core distinction. Reuse exact marker markup, not a new count or badge. With no pending or retained batch results, the section can remain an empty heading without extra explanatory text or an enabled action.

## Risks / Trade-offs

- [Background checks add remote work] → Check only declared update prerequisites, coalesce requests and reuse bounded admission and mounted lifecycle ownership; no project-list reads or writes.
- [Selected machine or plugin preferences change mid-batch] → Capture target/session identities and revalidate before every action; never select machines by mutating saved settings.
- [Plugin action and batch drift] → Both adapters use the same extracted executor and existing fix callbacks, with regression tests proving reuse.
- [Timeout after a submitted write] → Preserve machine-specific unknown feedback and ownership protection; fresh status reads reconcile without automatic write replay.
- [One machine fails] → Preserve completed outcomes, name the failing machine inline and continue sequentially with the remaining captured machines.
- [Discovery is not instantaneous] → Mounted bounded refresh plus explicit Updates-entry refresh; no fabricated current state when reads fail.

## Migration Plan

No persistent schema or native migration is required. Deploy through normal customization packaging after implementation approval. Any new runtime facts remain outside portable preferences. Reverting the owned customization output removes the shortcut and plugin contribution without changing installed plugin tools; existing Plugins actions remain available.

## Targeted Validation

Add focused plugin-update discovery/controller and UI tests for mixed local/peer availability, explicit eligibility, exact order, shared fix callback execution, duplicate clicks, captured-machine safety, failure continuation, disconnects, stale replies and uncertain writes. Extend `tests/update-markers.test.mjs` for plugin-only and mixed readiness across mounted indicator surfaces. Run only affected tests, including the relevant Crew fixture and plugin UI contract tests, plus strict validation of this OpenSpec change. Use mocked actions only; no live tool updates, full suite, disposable app or server is needed for the plan.
