# Design

## Context

See proposal.md for motivation. Existing implementation seams are:

- `src/plugins/crew/worker-space.js` publishes Pending for discovery, mismatched mode, offline hosts and registry-busy results. `worker-space-state.js` exposes those facts directly and `features/settings/spaces-ui.js` renders per-machine detail plus badge. Application uses the recurring Spaces lifecycle, a shared finite lock and explicit-home read/set/readback.
- `src/shared/workspace-links.js` derives child order from native spaces. Every drag captures the entire block; `planBlockDrop` refuses moves within it. `SpaceBlockCommit` serializes public `space.move` commands and waits for exact native acknowledgements.
- `src/plugins/crew/fleet.js` already binds each live task to an exact native child (`space`, terminal, tab and pane). Its generic pull links currently omit the space. `src/plugins/git/mod/aggregate.js` alphabetically sorts canonical repositories in `repositories()`.
- Current synthetic worker-policy and worker-review suites pass, including normal on/off, offline return and superseded timeout serialization. This establishes transitional Pending in supported fixtures, not the cause or duration of the person's screenshot. A static screenshot cannot establish a real stall.

## Goals / Non-Goals

**Goals:** Reuse native persistence and existing presentation/gesture patterns; keep failure evidence separate from routine work; derive Git ordering without repository discovery requests.

**Non-goals:** No native patches, direct Core document writes, Crew installs, real-agent tests, added polling, space reparenting or change to Git loading/counters/PR-stage rendering. Joining existing project spaces is Crew's task, not this implementation.

## Decisions

### 1. Quiet policy projection, not suppressed failure evidence

Retain host-local target states and retry/serialization facts, but derive the Settings contribution separately: normal checking/application/success has no status lines; only a finished failure, refusal, unsupported capability or confirmed unreachable machine yields a short machine-named line. Reuse existing row description styling, not the routine Pending badge stack. Collapse multiple failed homes into one line per machine. The saved boolean never changes to mirror one home.

If disabling the switch while applying, derive that only from current bounded work, never a forever-pending target or offline retry. Keep unsupported capability disabling as today. Add deterministic held-command and interrupted-continuation cases on the actual lifecycle, including local/remote multi-home fairness, capability/discovery/read/set/readback, Settings staying open, restart and dead task/expired lock replacement. Fix a reproduced liveness defect at its owner/lease seam; do not just hide it or shorten the uncertain-setter allowance. Record whether any failure is reproduced and which transition caused it. Preserve the existing 18-second per-command serialization envelope and read-before-retry.

Alternative rejected: remove all statuses indiscriminately. That hides real refusals and leaves unsupported/offline targets indistinguishable from successful application.

### 2. Two domain scopes on the existing drag component

Keep `src/ui/reorder.js` as the only gesture/preview/marker engine. Capture whether the source is a coordinator, child or independent space. Coordinator sources keep whole-block dimming and edge targets; child sources dim only themselves and target only siblings of the captured parent, clamping outside rows to the group's first/last child or cancelling. A singleton child cannot reorder. Other blocks remain indivisible, including a folded destination. Compact rail remains selection-only.

Extend the domain planner/commit guard, not the UI engine, to distinguish stable relationship membership/bindings from sibling order. Acknowledged own-command permutations must not look like membership changes; preserve exact before/expected-order guards to stop concurrent external edits. Preserve machine interleaving and unrelated native space slots for a sibling permutation. Native `space.move` provides restart persistence; do not introduce another order store. Recompute rows, native index badges and final-child connectors from acknowledged snapshots. Selection is never changed.

Alternative rejected: a presentation-only sibling array. It would diverge from shortcuts and compact/native order and add a second persistence authority.

### 3. Verified membership supplies a pure repository-order projection

At the existing generic task-context boundary, expose the minimum sanitized presentation association: canonical repository from the already validated task PR URL and the exact connected child space of that live task, qualified by existing machine/home/owner scope. Use the existing verified children and current native space order, the same authority used by Spaces. Do not import Crew internals into Git or use display names, registered-name-to-repository guesses, shell folders or extra GitHub reads.

A child matches only when its verified live task PR associations represent exactly one distinct canonical repository. A combined child containing several repositories supplies no unique match. For a repository associated with multiple uniquely matching children, use the earliest in sidebar order. Sort full eligible repository inventory stably by that rank; unmatched repositories retain the current baseline relative order (currently alphabetical) after matched repositories. Selected-tab filtering and the existing enrollment picker consume that same ordered inventory; PR order within a section does not change.

Re-evaluate ranks on acknowledged native order updates through the existing lifecycle without resetting aggregate scope, facts, folds, counts or caches. Compatible warm/stale presentation may retain previously verified associations only for ordering; new reads and focus retain all current freshness guards. Remove associations for absent child IDs, and never restore prior-generation inventory from persisted display. Apply the current ordering to compatible warm return lists rather than replaying an obsolete snapshot order.

Alternative rejected: sorting repository labels by project names or filesystem probes. Registered projects need not share GitHub names, one repository may have several projects, and combined children are ambiguous.

## Risks / Trade-offs

- Multi-command native reorder is not atomic → wait for each acknowledgement, stop on uncertainty or concurrent changes, never replay a persisted job.
- A screenshot may show a real transport stall not reproduced synthetically → exercise specific lifecycle/command boundaries and report evidence honestly; do not operate on live homes to infer a cause.
- Finished-only repositories and combined multi-repository spaces lack unique child evidence → preserve them in the stable unmatched tail rather than guessing.
- Concurrent Git loading and stage-label tasks → restrict Git edits to ordering and context metadata; do not rewrite shared rendering/loading/counter code.
- Crew join-project-space interoperability → multiple workers already bind to one existing child when they retain the supported native adoption ID and matching placement labels/task project. Current provider intentionally refuses an arbitrary differently named native space even if its title looks like the same project. Flag that constraint to the coordinator; no expansion of identity permission is planned here.

## Validation and rollout

Only targeted synthetic regressions for worker policy, fleet reorder/project membership and aggregate section order; no full local suite. Extend the existing disposable native fixtures to show Settings off/on/applying/failure, multi-child Spaces before/during/after both drag directions plus coordinator/compact behavior, and coordinator Git section changes at 100% and 130%.

Use only the supplied App 0.1.18 copy in `C:/Users/tprokopiev/.crew/tasks/interface-improvements/native-bin`, verifying release archive SHA-256 and executable equality with its release before launch. No installation, real Crew registry, credentials or live terminal changes. Keep screenshots, receipts and scratch in the crew task output directory and stop every disposable desktop/Core/server started, including on error.

Update README and relevant fleet/reorder/testing documentation with the changed child-drag contract. After approved implementation, push through normal Git publication, dispatch branch CI if draft suites would otherwise skip, and report immediately without waiting or polling. Deployment is not part of this task; rollback uses existing customization deployment mechanisms. Native persisted order needs no migration.
