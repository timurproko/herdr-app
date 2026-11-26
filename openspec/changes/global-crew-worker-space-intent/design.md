# Design

## Context

See proposal.md for motivation and scope. Spaces currently renders its three standard rows in `src/features/settings/spaces-ui.js`. Crew owns its configuration declaration and transport in `src/plugins/crew/plugin.js`; plugin implementations import only their facade and their own files. The registry already dispatches plugin lifecycle/setting-change hooks, but has no Spaces-row contribution seam. The generic Plugins-card renderer must stay untouched.

Crew main inspected at `73ee0136ca1d76c15efaf31ffa1520c7528efbf0` supports `crew config worker-space [combined|per-project]`. `cmdConfig` calls `requireOwner` before any write. `ownerState` accepts only the owning terminal session, including when a different owner's liveness is unknown. An unclaimed home also refuses a non-owner; merely finding no live owner is not write authority. Its text getter requires no ownership. The optional registry field defaults to combined when absent; invalid values fail closed. The transaction preserves other registry metadata and only affects new independent task admissions, not existing workers, reviews or replacements.

The inspection harness copied those actual command/ownership functions into a VM with fake homes, Core responses, environment and registry writes. All app/unrelated callers refused with exit 3 and zero writes; the fake owning-session reference wrote once. No real home was read or mutated and no coordinator was controlled. The task report links the private evidence.

## Goals / Non-Goals

**Goals:** Separate durable global intent from real per-home observations and authority; make machine-specific partial application visible without extra visual patterns; leave the current-Crew implementation safely read-only.

**Non-Goals:** A machine selector for this preference; a second global synchronization transport; task orchestration; new desktop services; moving/relabeling existing spaces; automatic Crew installation/update/init/migration; direct registry writes; cloud federation of independent Herdr preference stores.

## Decisions

### 1. One global intent, not a home-derived switch

Declare one hidden Crew boolean preference, default false, using the existing plugin preference storage/portable allowlist. The Spaces contribution displays it: false → combined; true → per-project. Do not initialize or overwrite it from whichever home happened to respond first. Do not use Crew's selected-machine setting, selected space or active coordinator to scope this policy. Its catalog and observed modes are separate private host-local state, never portable settings.

The policy scope is every verified machine/home Herdr knows through its existing machine inventory and successful Crew home/status inspection, plus homes subsequently discovered. Remember verified homes across temporary outages; key them by existing machine identity plus canonical home path, not terminal/task IDs, project names or local-only IDs. Use bounded catalog retention (at most 256 targets) with explicit capacity/unavailable status instead of silently claiming complete coverage. Do not guess paths or scan arbitrary folders. Independently known homes on one machine stay distinct.

Alternative rejected: one selected-machine setting, one toggle per home, or deriving the switch from the first reachable home. Those would contradict the corrected global-intent contract.

### 2. Generic contribution, existing presentation

Add a small generic registry query for declarative section rows. Crew contributes row metadata, current intent, disabled/reason facts and concise machine-status facts; the Spaces page composes them through its existing standard row/toggle and `settings-kit` badge/working-status primitives. Features do not import Crew implementation or inspect its setting key. No change to `src/features/settings/plugins-ui.js`, Trello, or shared card visuals.

Place the contribution directly after Connect fleet space to coordinator. Use the proposal's title and one-sentence description with no per-machine wording. Current-Crew fallback is a disabled/read-only toggle plus a short support/ownership reason. Missing Crew, unsupported command, unsupported existing transport/platform and no home get similarly short reasons; no install/update/init is triggered. Hide contributions and pause policy work when Crew is disabled, preserving intent. Fleet attachment itself is independent: turning Connect fleet off does not change or cancel the worker-space intent.

Reuse status badge styling rather than inventing a banner, spinner or control. Label affected machines in concise badges/status text, e.g. `pc2 pending`, `pc2 owner only`; use existing diagnostics/hover for sanitized detail. Do not squeeze a long machine name into the fixed badge column: preserve the standard badge width and put bounded machine text in the adjacent existing detail area. Coalesce multiple homes per machine for row summary while retaining per-home diagnostic facts. No multiline CLI dumps or per-machine descriptions.

### 3. Existing lifecycle and transport own the policy

A Crew-owned policy helper runs from the recurring mounted Spaces lifecycle/setting-change hook, not render or a transient Settings task. Reuse `on`/`powershell`, explicit machine routing, tool discovery and literal quoting for an explicitly observed `CREW_HOME`. The mode command must never invoke home initialization or migration. New/reconnected machines and newly observed homes trigger a bounded read; offline known homes retain pending intent. Attachment-off still permits this independently enabled Crew configuration policy.

Bound reads and future authorized setters with shared single-flight ownership, finite transport limits and completion-based retry/backoff. Persistent target state contains only minimal private identity/observed-mode/pending facts; it grants neither terminal nor orchestration authority. A replaced scope, disabled plugin or changed intent invalidates publication and future follow-up. Multiple mounted copies coalesce. No second polling loop. Retry transport failures when reachable and reconsider version/authorization refusals on changed capability or bounded reinspection rather than spinning every lifecycle tick.

### 4. Current Crew cannot authorize active reconciliation

The current production adapter is read-only. It can observe each known home's mode with `crew config worker-space` and report match/mismatch, but cannot present itself as able to apply intent. Do not infer setter permission from successful reads, version age, absence of owner, existing fleet attachment or a matching mode.

Current app write attempts are known to fail with exit 3. Never supply an owner's `CREW_TERMINAL`/`HC_TERMINAL_ID`, borrow inherited coordinator identity, inject input into its terminal, call start/end, alter owner/lock files, or write `crew.json` around this gate. Use a read-only row with reason rather than an apparently working toggle. A matching observation can be described as matching intent, not as successful app-managed global policy.

**Exact upstream dependency for the Crew worker:** Crew must document and advertise a narrowly authorized desktop/non-terminal way to set only worker-space mode for an explicit existing home, with a live/unknown owner or with no owner, without granting task/session control. That interface must validate combined/per-project, use the existing registry transaction, preserve projects/unknown metadata, and return a truthful effective mode/refusal. Keep the existing owning-session setter's orchestration boundary intact. The Crew maintainer must choose its authorization/capability contract; Herdr must not invent a flag, minimum version or spoofed identity. Current getter syntax is sufficient for reads. Integrating a new setter requires reviewing its published contract before any production write path is enabled.

The current-Crew read-only fallback is the recommended shippable choice explicitly allowed in the request. Active synchronization remains blocked, not completed by this fallback. A later documented Crew capability can enable the same global intent row without changing its meaning; that integration is a follow-up dependency, not a speculative command implemented now.

### 5. Authorized reconciliation semantics, once Crew supplies the capability

Keep per-home policy logic separate from transport so it can be exercised with fake Crew now. When a documented authorized adapter exists, changing intent queues every known home, not only the selected machine. New/offline homes receive the latest intent on their next eligible reachability check. Read current mode, skip unchanged values, serialize writes per home, then read back. Only current-generation confirmed equality counts as in sync; a refusal/failure never mutates the observed mode or flips the intent back. A changed intent supersedes queued work; an older in-flight setter is followed by the latest intent after settlement, never concurrently. A timeout has unknown outcome and requires a fresh read, not blind replay. One successful home never implies global application while any target is pending, unsupported, blocked or failed.

These semantics are testable with fake adapters but are not a claim that today's production Crew accepts desktop writes. Keep badges explicit about read-only/blockage until the upstream dependency is satisfied.

## Risks / Trade-offs

- [Current authority cannot fulfill active global synchronization] → Ship only the approved read-only-with-reason fallback, or wait for Crew's explicit capability; report the missing behavior rather than bypass ownership.
- [Several default/custom homes can exist on a machine] → Retain each authoritative known home; never equate a machine with exactly one home or invent unknown home locations.
- [Offline/missing/old installations cannot confirm application] → Keep pending/unsupported state naming that machine; never claim universal success, auto-install or reset intent from observations.
- [Global policy conflicts with manually different home modes] → Once authorized, explicit global intent is authoritative for known targets; document that only new independent work changes placement, existing workers/reviews/replacements do not move.
- [Closing Settings abandons native tasks] → Use the recurring Spaces owner, shared liveness and generation guards, not a Settings-owned transport task.
- [Private paths/terminal facts leak through a portable policy] → Export only the boolean intent; target catalog, pending/error details, home/owner identity and transport facts remain host-local and sanitized.

## Migration Plan

This plan adds no runtime migration. After approval, introduce the default-false global intent and declarative row, inspect only already existing homes, and leave current Crew read-only with a support reason. Prove both intent values and unavailable states with isolated fake data; never change the person's mode. Disablement/rollback stops work while retaining the boolean, without restoring old home configuration. Active write integration is separately gated on Crew's published authorized setter and the approved plan being updated if that contract changes the approach.
