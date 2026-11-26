# Design

## Context

See proposal.md for motivation. Investigation is against merged main `69f3af9` (PR 88), not an assumed older installation.

The installed Crew `cmdFleetStatus` maps records to id/state/terminal/PR/discovery but omits `project`. Its full `status --all --json` retains project. Read-only local inspection found the owner alive with `custom.crew.home=1`, an older worker without placement fields, and a newer worker with version 1, mode combined and project herdr-app in the same `fm-crew-<home>` native-space label. Both owner status formats name the same owner. The current Core connection exposes no pc2 route, so remote live state was not verified; remote reproduction is synthetic.

`fleetStatusScript` prefers explicitly advertised `--view fleet` and preserves project only if supplied. `recordedSource` also retains project conditionally. In `placement`, a v1 worker requires `project === task.project` before the combined-mode branch. Consequently, omitted task project makes placement return null. `bindFleet` rejects the whole status on that worker, not just its child or robot. Refresh publishes a witnessed binding-null negative, removes the remembered display, and the current negative lets `pullContext` fall back to folder Git. That explains missing nesting and Not a git repository from one failed join despite a recognized coordinator and recorded PRs.

Synthetic reproduction through the real packaged provider/registry confirms this locally and with pc2-qualified identities: legacy-only binds; mixed workers with omitted project reject; identical data with task projects restored binds sidebar and three live/historical PR links. Renaming the child from crew to xrbuild changes neither result.

Commits `377fa36` and `34c1707` protect discovery/project identity and coherent retained-display replacement. They do not restore a field absent from the fleet reply and cannot rescue a null initial binding. Existing mixed tests combine separate legacy-combined and v1-per-project spaces; they do not put new v1-combined workers beside legacy workers under minimal fleet-view transport.

## Goals / Non-Goals

**Goals:** distinguish absent optional combined project metadata from a contradiction; cover the real reduced payload and Settings-to-Spaces-to-Git lifecycle, retaining action/presentation separation.

**Non-Goals:** no Crew source edits, new companion, installation, native mutation, live setting changes, restart, worker migration, label repair, forced discovery or repository-wide PR lookup. Do not change per-project permission requirements or generic workspace projection to compensate for provider rejection.

## Decisions

### 1. Combined identity does not require an absent task project

For placement v1, validate the supported version, mode and nonempty bounded project label first. For combined mode, continue requiring the exact combined native space/adoption/task join and absent per-project name. Compare project with task project, including the existing internal-self alias, whenever authoritative status supplies that field. Missing task project is compatible only with combined placement; it is not a wildcard that defeats an explicit contradiction. A present malformed project must remain invalid rather than being coerced into absence.

Legacy no-placement labels keep their existing interpretation. Normalize legacy and v1-combined children to the same project-independent child identity so different task projects within that child cannot conflict. Per-project placement continues to require a matching authoritative task project; do not derive it from the label being verified.

Alternative: require a Crew release to add project to the fleet view. That is the exact producer omission, but this task cannot modify Crew, and combined identity can be established without it. Alternative: always use full status or add a second status read. Reject this for combined binding: it increases payload/read cost and changes minimal-view/history semantics unnecessarily. Per-project missing evidence remains fail-closed and is documented as a separate producer compatibility limitation.

### 2. Keep one stable read owner and test actual toggle propagation

`updateSpacePreferences` already increments generation and clears links/leases on each actual toggle. Settings publishes `workspace.context.refresh`; its transient task requests work, while recurring Spaces services `spaces.refresh` unconditionally every 250 ms. A Settings module cannot directly reuse another module's private lifecycle reference. Thus a read is not guaranteed to launch inside the Settings callback, but it should launch on the existing next owner tick without an unrelated event or dialog close.

There is no demonstrated independent missing-toggle-event defect yet. Reproduce with separately packaged Settings, Spaces and Git copies, no helper force-refresh calls, and the actual Settings callback. If a stale request/negative cache delays current verification, fix that generation/request handoff within the existing lifecycle. Do not add another timer or let transient Settings/Git own transport. Pending Git uses the current owner hint and Loading; successful binding then supplies current task PR scope. Old inventory and old replies cannot cross toggles.

### 3. Preserve current title and projection semantics

`displaySpace` uses a worker-directory-derived name only for unnamed native spaces. `spaceDirectory` chooses current/focused, active-tab, remembered or first available worker. Crew deliberately supplies no combined `crew.space.name`, so a combined child can display crew or xrbuild as that chosen directory changes. Binding uses exact IDs and labels, never that displayed title. Leave naming alone and explain this in documentation.

### 4. Proof uses production boundaries with synthetic data

Add provider/transport tests for reduced fleet replies, both worker orders, multiple worker projects, all-legacy/all-v1/mixed combined populations and finished PRs on local and qualified remote models. Include wrong home/task/native membership, conflicting present project, partial/unsupported placement, duplicate membership, cross-machine and obsolete-generation refusals. Assert registry links, durable display and coordinator task context, not only the placement helper.

Extend or reuse the existing native interface fixture with the same reduced status and real toggle handlers. At 100% and 130%, capture independent/off, pending/on and verified/on views for local/remote groups and task PR panels. Verify the supplied 0.1.18 executable against published checksum evidence before starting it; use disposable homes/Core, no install, and stop every owned process in finally. Record controller-driven versus actual input proof honestly. Dispatch the repository test workflow on the final pushed head and inspect both Windows and Ubuntu results without marking ready or merging.

## Risks / Trade-offs

- Missing project could be mistaken for contradictory project → preserve field presence/type when normalizing, compare explicit evidence, and include negative cases.
- A permissive combined branch could leak into per-project identity → branch-specific tests require matching authoritative project for per-project children.
- Mocked helpers could conceal cross-mod request propagation → exercise independently loaded production modules and the real Settings event with only ordinary lifecycle ticks.
- Remote synthetic proof is not live SSH proof → explicitly report the unavailable pc2 route and never claim live remote acceptance.
- All workers finished cannot establish a new child from PR history alone → retain the existing remembered-identity policy; closed PRs do not invent adoption or navigation.

## Migration Plan

No state migration, relabeling or install is part of this task. After approval, implement in this checkout and deliver through the draft PR. Existing preference/display formats remain unchanged. A future authorized customization deployment can reverify existing combined workers without restart; rollback uses the ordinary customization mechanism, not Core or Crew edits.
