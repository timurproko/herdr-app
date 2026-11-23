# Design

## Context

See `proposal.md` for motivation and the decisions requiring approval. Implementation is approved for recorded links only. Deployment and live native interaction checks are not authorized.

Observed sources:

| Source | What it establishes |
| --- | --- |
| `src/plugins/crew/plugin.js:625-693,769-773` | App-launched coordinators have `custom.crew.home=1` (a role marker, **not a home ID**); current Crew tags classify coordinators/workers from live pane membership and labels. |
| `D:/Git/crew/crew.mjs:154-167,184-195,981-987` | A home has a persistent `crew.json` tag. Workers carry `crew.home=<tag>`, `crew.task=<id>`, and adoption label `herdr.space=fm-crew-<tag>`. The home owner is an exact Core terminal in `owner.json`. |
| `D:/Git/crew/crew.mjs:2090-2109` | `crew status --json` is read-only and returns `{home,owner:{terminal,live,mine},tasks:[{id,state,terminal,core,project,pr,...}]}`. `pr` is the stored task PR; `mine` depends on the caller and must not be used as authority in the app. |
| `D:/Git/crew/crew.mjs:1191-1212,1794-1866` | Workflow report first lines populate task `stage`/`pr` at `crew done`; `crew land` can record PRs too. Status does not discover a PR opened during a first in-progress report. |
| `src/features/spaces/main.js:298-310,405-420,425-516` | Spaces uses native order, native numeric indexes, `space.move` and the shared list reorder interaction. Compact rail currently has selection but no drag gesture. |
| `src/plugins/git/mod/main.js`, `location.js`, `agent-links.js`, `webhooks.js` | Git is single-repository/folder scoped; rows, pin motion and measurements use PR numbers alone. Its 10-second timer reads local context, not GitHub CI; one authenticated socket receives repository invalidations. |
| `src/shared/space-preferences.js`, `src/features/settings/spaces-ui.js`, `tools/runtime/preferences.mjs` | Spaces has version-1 allowlisted boolean preferences. New runtime pair state must not be exported. |
| `src/plugins/api.js`, `registry.js`, `tests/architecture.test.mjs` | Plugins communicate through generic app moments/API. Spaces and Git cannot import Crew implementation files or each other's mod implementation. |

## Goals / Non-Goals

**Goals:** one explicit opt-in, defensible identity, native-space-preserving attachment, block reorder and a coordinator-wide PR context across projects. Keep ordinary mode unchanged.

**Non-Goals:** merge two native spaces, spawn workers in the coordinator's tabs, change Crew spawning/ownership, cross-machine attachment, new native/Core document writes, automatic webhook enrollment, expanded CI-fix authority, transcript reads, terminal input, deployment, or edits to the separate Crew repository. Custom-home discovery outside the currently installed per-machine Crew home is not inferred from a folder name.

## Decisions

### 1. Keep preference and runtime evidence separate

Add `connectFleetToCoordinator: false` to the Spaces preference accessor/setter and allowlisted snapshot validation. Retain version 1 with an optional additive boolean: older snapshots missing the field mean false; invalid present values are rejected. Settings renders the exact requested label and explains that it also enables the coordinator PR overview. Toggle changes do not create/close/move any space.

Use a separate versioned, expiring `custom.fleet.links` runtime projection, excluded from exports. It contains only machine/home identity, owner binding, optional fleet binding and sanitized task/PR facts, never entire status payloads, report contents or pending mutations. Off stops new discovery and invalidates consumers; it does not erase unrelated native/plugin state.

Alternative rejected: save relationships beside portable preferences. Those IDs are machine-local and expire when terminals are replaced.

### 2. Join exact owner and task terminals; do not guess from Crew tags

Crew owns a new status/binding helper in its plugin folder. Extend generic registry contributions for workspace links and contextual PR sources, using a synchronous validated snapshot getter and an async refresh moment. Feature consumers see generic `{parent,child,machine,binding}` links and `{kind,scope,links,discovery}` PR context, not Crew files. Extend the plugin API only for the portable preference access it needs; packaging includes each helper once per sandbox.

Discovery sequence:

1. From current panes, spaces and live terminal labels identify relevant connected machines with a coordinator marker or Crew workers. Through the existing Crew tool-resolution/PowerShell transport, run only installed `crew status --json` on that machine. Never run init, home --ensure, start, update or a setup probe that installs anything.
2. Pin the resolved machine and returned home; require valid status shape and `owner.live`. Qualify owner/task terminal addresses for that machine exactly once and reject foreign prefixes. Join owner terminal to one current pane/tab/space. Role markers are hints, not proof of which fleet belongs to that owner.
3. Join each task's exact terminal to live Core/model membership and require matching `crew.task`. Worker `crew.home` tags must agree for that home. Verify the fleet's actual native space against its `fm-crew-<tag>` adoption identity and current membership; use the actual qualified space ID, not a fabricated native ID.
4. Attach only a unique fleet distinct from the coordinator on the same machine. Ambiguous multiple fleet candidates or conflicting labels produce no attachment. Workers manually moved into ordinary spaces do not cause those spaces to be pulled under a coordinator. A verified owner with no fleet/tasks can still have an empty coordinator PR context.
5. Capture a generation and binding fingerprint including owner, machine, home, task-terminal identities and actual memberships. Recheck before publication and at drag/navigation actions. Immediate model removals revoke the projection without waiting for another status call.

Piggyback Spaces' existing refresh event, with one in-flight request and a 10-second cache per machine/home; membership changes may invalidate the cache immediately. Commands run after yielding, not during render. A 15-second request bound and payload/schema bounds produce unavailable/incomplete, never guessed identity. Git reuses that projection and can request refresh through the same generic moment when shown; duplicate mod copies coalesce with short runtime read leases. No daemon or persistent operation queue.

Current default per-machine homes are discoverable without a Crew change. For an externally started custom home without an explicit trustworthy route, leave it unlinked rather than using a worker's cwd as its home. Future custom-home support would need a published home path/routing contract, outside this plan.

### 3. Project visual attachment, commit native ordering only on explicit drag

Build a display block model from native spaces: ordinary singleton blocks and validated `[coordinator,fleet]` blocks. Remove the fleet from its original display position and insert it after its coordinator; preserve other spaces' relative native order. Keep original native indexes for every numbered badge and native shortcut behavior: replacing the fleet badge does not renumber the rest.

Expanded fleet rows receive a small child inset and a shared outlined link glyph in the existing badge slot. Compact rail uses the same glyph. Suppress only the Crew plugin's own tags for both members of a valid link; keep unrelated tags, colors, selection, rename, menus, close behavior and arrival feedback. Off removes the projection without issuing native reorder commands. A later explicit drag can of course have changed native order; disabling does not restore a historical snapshot.

Use `src/ui/reorder.js` for all thresholds, previews, cancellation and interaction suppression. The Spaces adapter maps either member to one drag block while retaining the originally pressed ID for a non-drag click. Extend the shared component minimally if needed to support multiple source IDs and a two-row preview; do not copy its motion engine into Spaces. Both sources dim, the preview shows coordinator and link child, and markers sit at block boundaries. Preserve the compact rail's existing no-drag behavior; where the app already supports dragging, either member moves the pair.

For a drop, calculate the desired same-machine native permutation from a fresh snapshot and emit a finite sequence of public `space.move {id,index}` commands. Commands use the documented one-based global indexes and a simulated evolving order. Wait for each native acknowledgement before the next move, using the existing observer rather than trusting an immediate `spaces()` reread. A second drop cannot overlap a pending block commit. Changes in membership, unrelated order or binding cancel remaining commands; a bounded missing acknowledgement reports an uncertain partial result without automatic replay or rollback. Keep active selection untouched.

Alternative rejected: reorder Core documents atomically. The approved document exception is tab movement only, and is unnecessary here. Public commands are not atomic across two spaces; expose that limitation rather than promise a transaction.

### 4. Give Git an explicit aggregate context, not a fake working directory

Select the aggregate context when attachment and Crew are enabled and the **coordinator space** is selected, even when its selected tab is a shell/Start pane. Do not require its cwd to be a repository. Fleet and unrelated spaces retain ordinary Git. Changing context invalidates prior work immediately, including pin-motion state and stale actions.

Eligible tasks are `working`/`reported` with exact live worker terminals, not just Core status `working`. This intentionally includes plans awaiting approval and idle/done/blocked live agents. Exclude stopped/failed/closed/absent workers. Match status tasks and labels even for review/fix workers; only those with a PR contribute a row. A shared PR is rendered once and can retain several related workers.

Accept only validated GitHub PR URLs, parse repository and positive PR number, and key all aggregate data/element IDs by normalized full repository plus number (not task ID or number alone). Read exact PR metadata using `gh` on the owning machine, by explicit repository/number, without relying on coordinator cwd. Group rows by repository in stable order. Open/Closed counts are the number of distinct linked PRs in those states, not totals of all repository PRs. Aggregate mode has no single active pin, no bulk repository menu, and no unrelated repository-wide inventory/pagination. Its scroll frame can render all bounded task links; large link sets use bounded request concurrency rather than dropping rows.

Reuse Git PR glyphs, checks, checklist indicators, URL context menus and browser handling. Related-agent robots use task-provided exact terminals and revalidate the current binding before focus, with deterministic selection among tasks sharing a PR. They need no footer/branch heuristic and no pin-swap animation. Ordinary folder mode retains its existing branch/footer matching, native pin motion, counts and 10-row pagination.

### 5. Reuse event-driven Git facts and keep failures scoped

Initial links, explicit Refresh and newly discovered links trigger exact PR fetches. Existing links do not fetch GitHub on every 10-second local status refresh. Use the existing one socket with a repository-to-linked-PR index; authenticated repository events invalidate only that repository's rows, coalesce bursts and refresh on reconnect. Removed links retire their pending reads. New home/owner/selection/plugin generations make late results inert.

Hide/disable stops new aggregate work and closes unused subscriptions. Preserve last good same-binding metadata with an explicit repository-scoped error after a transient fetch failure; do not preserve a previous coordinator's rows. Global missing setup uses the existing Settings link; unenrolled repositories get scoped setup links with their captured repository, not automatic enrollment or one misleading single-repo footer. Aggregate visibility never changes auto-fix settings, monitor scope or repository selections.

### 6. Recorded-link source with a future discovery seam

The approved source is only `tasks[].pr` from plain `crew status --json`. A Crew-owned source adapter owns the command and conversion into sanitized task facts; generic consumers never construct Crew commands. A later `crew status --json --discover-prs` can replace that adapter without changing Spaces or Git, but is not called, implemented, awaited or required here.

Current status can have `pr: null` until `done`/`land`. When any eligible task is still working/unreported, show **Recorded PRs · possibly incomplete until tasks report** even if it already has a recorded PR. Missing links are not guessed through branches, footer/transcript searches or GitHub inventory. Newly recorded links enter at the next local status refresh. No separate Crew task is needed for this implementation.

## Risks / Trade-offs

- **Recorded links can lag PR creation** → explicit possibly-incomplete wording for unreported tasks and an isolated future source adapter; no companion dependency.
- **Public ordering is not a two-space transaction** → finite acknowledgement-bound sequence, one active commit, no document writer, no blind rollback/replay; concurrent clients can require another deliberate drag.
- **Owner changes and reused terminal/task IDs** → machine/home/owner generation plus exact live membership at publication and action time; no persisted authoritative IDs.
- **Remote hc/status and GH latency** → coalesced local-context reads, bounded concurrency/timeouts, scoped errors and stale reply guards. No source checkout required remotely; use the installed Crew tool.
- **Native row/geometry assumptions** → repository-qualified aggregate IDs and disabled aggregate pin motion; fixture trees do not prove actual pixel/drag behavior.
- **Preference/schema drift** → additive optional boolean with absent=false round trips; unknown runtime versions fail closed and runtime bindings never export.

## Migration Plan

1. Apply the approved recorded-links-only choices in `proposal.md`; no deployment or Crew modification.
2. Implement only this repository's five outcomes, each with fixture coverage; update README and relevant architecture/command guidance alongside code.
3. Build/package and run quick targeted tests without touching real homes, Core, accounts or terminals. No deployment in this task unless separately authorized later.
4. After a separately authorized rollout, the absent preference remains off. Switching off is the immediate feature rollback; normal guarded package rollback remains available without restoring live documents. No migration of old task or session state.
5. Real expanded/compact visuals, dragging each source both directions, focus preservation and remote identity need separately authorized native checks after fixture coverage. Do not infer native success from a mock pass.
