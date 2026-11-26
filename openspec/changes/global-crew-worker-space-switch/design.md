# Design

## Context

See proposal.md for motivation. This plan starts from the corrected global plan and ownership evidence in the earlier `herdr-ux-polish` report and its `global-crew-worker-space-intent` artifacts, plus the supplied Spaces screenshot. It deliberately replaces the old read-only-only completion scope with capability-gated active synchronization; read-only remains the compatibility fallback, not completion of the global behavior.

Observed current-main boundaries:

- `src/features/settings/spaces-ui.js` composes three rows through `owner.row`/`owner.toggle`; fleet connection currently terminates the list.
- `src/plugins/registry.js` owns enabled-only declarations, typed preferences and change/lifecycle callbacks. It has no generic Spaces-row contribution query yet.
- Crew's `plugin.js` owns `on`/`powershell`, tool discovery/quoting, launch checks and the recurring `spaces.refresh` hook. `fleet.js` consumes host machine inventory and validated status home identities, but its work is attachment-gated. The new policy must not inherit that gate or its one-home-per-machine cache key.
- Plugin settings already persist under `custom.plugins` and export through `tools/runtime/preferences.mjs`; only public scalar settings belong there. `settings-kit.js` supplies the existing badge and working-status primitives.
- The inspected main is `5b62e79d9ee1b69cf7120cb18423836911603f1c`. PR 88 is still open at planning time and owns the separate multi-child Spaces/Git work. Do not copy or redo that implementation here.

### Upstream contract status

Crew PR 23 is open and unmerged. Its initial planning head `793ae4f9f43ea2aab5107c83c7c24111e94bd554` was reviewed, then its full published `docs/worker-spaces.md` v1 contract was read at new head `841ff2da60c5e44a6a582e5193b8a2826975b74b`. The documented probe, setter, success/refusal envelope and exit codes match the design below. The promised final-contract PR 88 comment is still absent. Before adapter implementation, check that comment and re-read the latest branch docs, recording the exact revision. Material contract changes require reconciling this plan, not guessing. Runtime eligibility always depends on installed capability, not PR state, commit age or version text.

## Goals / Non-Goals

**Goals:** One durable intent, independent observations and honest per-machine application state; safe eventual application to every known target with existing execution/lifecycle infrastructure.

**Non-Goals:** A selected-machine preference, distributed preference federation between independent Herdr desktops, filesystem-wide home discovery, a daemon/new transport, Crew installs/updates/init/migration, general configuration editing, orchestration authority or moving existing agents. Existing Herdr preference persistence is the intent authority; applying that intent to connected machines does not require another preference database on each machine.

## Decisions

### 1. Crew owns the preference; Settings only renders declarations

Add a hidden Crew boolean setting such as `separateProjectSpaces`, default false, to the existing typed registry. Keep it within `custom.plugins.crew.settings`; existing scalar preference export already supports it. Add round-trip assertions, not another whole-shared-state synchronization path. A preference import or restart must resume current intent without requiring the setting-change hook to have fired.

Add a small generic enabled-plugin section-row contribution query to the registry. Crew supplies metadata, the setting binding and sanitized status facts; the Spaces page renders those facts with the existing row, toggle and settings-kit badge. No feature imports Crew files or knows its key, and no provider starts IO or writes state during render. Existing setting validation/availability is rechecked on activation, so an old enabled control cannot save after disablement or capability loss. Leave the shared Plugins-card/Trello renderer alone.

Insert the row immediately after Connect fleet, moving that row's end-of-content flag as needed. Use the exact proposed title and sentence. Preserve the neighboring toggle dimensions, accessibility role/label and right anchor. Machine detail occupies the existing detail area beside a standard-width status badge, not an oversized new badge or banner. The row's status can expose a bounded machine list with the same detail/badge primitives; coalesce several homes on one machine without hiding unresolved homes. Long names truncate only with full accessible/hover detail, never displacing the toggle or changing badge geometry.

Alternative rejected: a live per-machine setting on Crew's Plugins page. It would mirror observations rather than preserve one intent and would contradict the requested placement.

### 2. Separate durable target memory from preference and current proof

Maintain a bounded private catalog keyed by existing machine identity plus canonical absolute Crew home, not selection, task ID, project name, adoption tag or machine alone. Retain at most 256 targets; reaching capacity reports incomplete coverage and stops admitting new entries rather than silently dropping unresolved ones or claiming universal success.

Use authoritative existing-home evidence: successful Crew status `home` values, already validated Crew home inspections, and successful coordinator-launch inspection of the actual home. Retain independently observed custom homes as separate targets. Add a read-only home observation at the existing successful launch preparation boundary if needed; policy reconciliation never calls its `crew home --ensure` setup path. Native labels/names/cwd alone cannot establish a root. Never infer registry roots by stripping an arbitrary folder suffix or scan arbitrary directories.

The existing machine inventory supplies this computer plus every known remote machine, not Crew's selected checklist machine. On its normal lifecycle, inspect each reachable machine's existing default home using existing Crew command/tool discovery and read-only status, even if no current worker or connected child exists. Merge later authoritative homes from the same sources. Use scoped `CREW_HOME` only for the documented getter/status against an already known exact root; the new setter always receives explicit `--home`. No home is created, repaired or migrated. A disconnected known machine stays pending; a missing tool, no existing home or unsupported execution platform is unavailable, not applied. Machine removal or successful authoritative home disappearance can retire a target; an outage or absent terminal cannot.

Persist only minimal private catalog/observation/retry facts in a separate namespaced host-local shared value, excluded from portable preferences. Pending status survives interruption, but restart discards confirmation authority and rechecks the current intent. Do not store tasks, owners, transcripts or raw replies. A fully checked subset never implies coverage of an unread known machine or a catalog overflow.

Alternative rejected: reusing `custom.fleet.links` directly. Attachment-off suppresses it and its per-machine slot cannot represent several independent homes.

### 3. Implement exactly Crew's versioned single-setting interface

Documented v1 probe:

```text
crew config worker-space --capabilities --json
```

Require exit 0 and one valid JSON object with `capability: "worker-space-local-set"`, `version: 1`, both `modes: ["combined", "per-project"]` and `explicitHome: true`. Text, ignored flags, unsupported versions, malformed data and help/version matches cannot authorize writes. Reuse the existing CLI-path/file-modification identity cache pattern for bounded per-machine probe evidence, invalidating when the executable changes and rechecking on restart/eligible recovery. Transport timeout is unavailable, not proof of old Crew.

Read a known home's effective value with `crew config worker-space` scoped to that root; accept only the documented combined/per-project result. Missing configuration means combined only when Crew returns that value, never from a failed read.

Documented v1 setter:

```text
crew config worker-space --set-local combined|per-project --home <absolute-home> --json
```

Pass separate literally quoted arguments through Crew's existing `on`/PowerShell transport on the target machine. Reuse its tool selection rather than a new SSH or remote companion. No synthetic owner identity, owner-only positional setter, direct `crew.json` write, start/end or task control. Unsupported platforms retain a truthful status rather than adding a transport.

Validate the expected v1 envelope, boolean `ok`/`changed`, canonical home equal to the captured known target under that platform's path rules, and mode equal to the requested value. Only exit 0 plus a valid matching success is accepted; then re-read the home before marking current intent confirmed. Refusals preserve intent, contain `ok:false`, `mode:null`, `changed:false`, and stable `error.code` with these documented classifications:

| Exit | Codes | App interpretation |
| --- | --- | --- |
| 2 | invalid-arguments, invalid-mode | Refused; no guessed alternative invocation. |
| 2 | home-not-found, home-not-initialized, invalid-home, invalid-registry | Unavailable/refused; no initialization or repair. |
| 3 | registry-busy | Pending; bounded retry, never steal a lock. |
| 4 | io-error | Failed/refused; preserve unknown real mode and retry when eligible. |
| 70 | internal-error | Failed; no successful-application claim. |

A post-validation refusal may contain the canonical home; pre-validation refusal may have null home. Unknown codes, malformed replies, wrong targets/modes and contradictory exit/envelope are protocol failures, not application. Only sanitized categories reach badges; explanatory upstream text is not a parsing contract. Crew alone validates home structure, OS-user authority and transactional preservation. A capability grants only this setting, not any fleet action.

Alternative rejected: a minimum version or an owner's absence as permission. Existing merged Crew refuses app writes even when no owner exists, and old binaries may ignore flags.

### 4. One reconciliation owner on the existing lifecycle

Extend Crew's existing recurring Spaces lifecycle to service a separate policy helper, independently of fleet attachment. Settings changes publish new intent and request that owner; they never own subprocess work. Closing Settings cannot cancel policy execution. Disabling Crew increments the policy generation and stops new work while retaining intent/catalog. Re-enabling or replacing modules resumes from current facts.

Use a shared bounded single-flight lease and per-target serialization across mounted copies. A fair queue permits at most one policy command at a time; verification keeps precedence so policy cannot starve normal fleet reads. Each command has a finite 15-second transport allowance and bounded reply; probe/read/set/readback phases yield between commands with current-generation checks. No second recurring timer is added. Shared ownership/liveness follows existing abandoned-reader safeguards, but an expired UI owner is not proof a setter stopped: retain its maximum command deadline, settle or wait it out, then read before issuing another write. Never overlap an unknown setter and its successor.

For each target: establish current capability, read real mode, skip writes if already equal, otherwise set explicit home, validate reply and read back. Confirm only equality for current intent, capability and target generation. A newer intent replaces queued values. An older in-flight setter must settle first; its completion cannot confirm the new intent, and the newest value is reconsidered next. A timeout may have committed, so readback precedes any replay. External manual mode changes are observed on later existing lifecycle checks and brought back to global intent while this policy is enabled.

Healthy targets reuse the existing roughly ten-second refresh cadence rather than reading every 250 ms lifecycle tick. Transient failures back off from completion at 2, 5, then 10 seconds, gated by machine reachability; unsupported/protocol/configuration refusals use bounded slower reinspection and immediate eligibility on executable/home evidence change. New targets and reconnects use the latest intent. No render-driven retries or portable command queue. Status remains Pending, Unsupported, Refused or Failed until an actual current confirmation; no misleading Applied everywhere label is needed.

### 5. Disabled capability and partial-application presentation

Until at least one known target has verified support, the row is disabled with a short Checking, Crew support needed or No Crew home reason. A reachable installed Crew lacking the required capability disables the global control with a machine-named reason, preserving intent and every target's unresolved state. Re-probe after executable change or bounded reinspection and re-enable automatically when support is established. Supported homes can still reconcile already-saved intent; unsupported ones remain blocked, never silently omitted.

Offline machines do not erase known support or force intent rollback. With verified support elsewhere, the person can change intent while they are offline; their badge stays Pending until they return. A capability-supported home that refuses a write does not roll back intent or disable the whole policy: keep its machine-named Refused/Failed status and eligible recovery. Coalesce status by machine with refusal/failure ahead of pending, preserving additional unresolved-machine detail rather than letting a healthy machine hide it.

### 6. Verification and isolated native evidence

Exactly the requested fake-Crew behavior matrix drives the production preference, contribution and policy paths:

1. **On:** several local/remote homes, including two on one machine, receive per-project; switch shows saved global intent, not first response.
2. **Off:** absent intent defaults combined; toggling back applies combined without moving synthetic existing workers or changing attachment.
3. **Capability missing:** absent/wrong/ignored-flag JSON support disables the row and causes zero setter calls; transport uncertainty stays unavailable.
4. **One home refused:** partial success preserves intent and names the refused machine; stable codes and malformed/unknown responses cannot become applied. Include busy/timeout recovery and superseded-intent serialization within this case.
5. **Offline then reachable:** skip offline execution, keep machine Pending and reconcile only newest intent on reconnection through the existing lifecycle.
6. **New home:** a later observed home receives current intent, including a second home on an existing machine; bounded catalog/identity guards cannot silently lose targets.
7. **Restart persistence:** existing preference round trip restores the boolean, excludes private catalog/status from export and rechecks application after restart; duplicate owners and disabled continuations cannot publish stale success.

No test invokes the installed real Crew tool or real home. Use the existing plugin/Settings harness and opt-in disposable native fixture infrastructure; adapt the fake transport so inherited environment cannot accidentally reach real Crew. Document the contribution contract and scope/retry semantics in `docs/PLUGIN-UI.md`, `docs/FLEET-STATUS.md`, README and testing guidance as the behavior lands.

For visual proof, use only the provided release 0.1.18 copy at `C:/Users/tprokopiev/.crew/tasks/interface-improvements/native-bin`. Recheck `release.json`, archive SHA-256 (earlier verified value `e6e78e1bec1f47bd0d94dbc872a5670f4ac9c8f6740210b62365ab8b28f897c1`), extracted executable equality and `--version` before use; do not install or alter PATH. Capture and inspect six minimum frames: off, on and pending/refused, each at 100% and 130%, with synthetic machine/home data and production renderers. Save pictures, receipts and scratch in the task folder outside the checkout. Record controller-driven versus physical-input scope honestly. Stop all disposable app/Core/server processes before handoff. Exact-head hosted Windows and Ubuntu results are still required after implementation; planning validation is not runtime evidence.

## Risks / Trade-offs

- [Crew contract may change before its final handoff] → Recheck latest docs and the promised PR 88 comment before adapter work; missing capability stays disabled. A compatibility fallback alone cannot fulfill active synchronization.
- [Custom homes are not globally enumerable] → Scope discovery to authoritative homes Herdr actually knows; retain each separately and admit newly observed roots without arbitrary scans.
- [Several desktop windows race or a setter outlives its view] → Shared serialization, finite command deadlines, generation rejection and mandatory unknown-outcome readback.
- [Offline/old Crew prevents convergence] → Persist intent, machine-named unresolved status and bounded eligible retry, never a universal-success assertion.
- [PR 88 changes shared integration surfaces] → Incorporate its merged main code rather than copying a feature branch. Its separate worker-space plan was removed in restoration commit `ab60ac9`; this change carries only the new row outcomes and does not duplicate the earlier archive.
- [Private target paths leak] → Separate host-local catalog from the portable boolean and sanitize row diagnostics.

## Migration Plan

No Crew registry migration or production deployment is part of verification. Add the default-false hidden setting and its declarative row; connect the reviewed capable adapter and lifecycle incrementally, using only disposable data. Existing preference snapshots remain valid because the field is optional. Rollback/disablement stops policy work without restoring old home values or moving agents; future mode changes use only an authorized setting interface. New work uses the latest successfully applied home mode, so unresolved targets remain explicitly identified.
