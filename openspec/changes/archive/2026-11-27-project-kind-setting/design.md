# Design

## Context

See `proposal.md` for motivation and `specs/plugin-integrations/spec.md` for behavior.

Observed during planning:

- Installed Crew 0.12.1 returns human help for both `crew --capabilities --json` and `crew project --help`, not project capability JSON. Neither invocation changes a home.
- Read-only `D:/Git/crew/crew/crew.mjs` has an older `cmdProject`: text-only list and add/remove, no machine-readable listing or kind setter. Its legacy treehouse handling differs from installed Crew, so that checkout is not treated as the installed API authority.
- Read-only installed `crew.mjs` confirms text-only project listing, `--workflow delivery|plain`, replacement of the entire registration on add, and delivery detection owned by Crew. A task's `deliveryKind` in status is historical task data, not an editable project setting.
- `src/plugins/crew/plugin.js` already quotes project arguments and routes them through `ps`/`on`/`hc exec --on` for the selected machine. `parseProjects` deliberately ignores extra human-text columns. Existing project refusal summaries, dotted names and duplicate-folder protection must survive.
- `src/features/settings/plugins-ui.js` owns generic list actions, captured machine/session guards, single-flight application and authoritative rechecks. `src/ui/settings-kit.js` owns `removableRow` and `optionDropdown`; the row currently has only a hover-revealed 80px Remove rail. Generic saved rows also use it.

## Goals / Non-Goals

**Goals:** Add only a generic optional row-choice declaration, strictly gated Crew adapter and explicit machine-bound operation; share existing dropdown, hover reveal and list lifecycle.

**Non-goals:** No Crew edits in this repository or `D:/Git/crew`, automatic Crew upgrade, repository detection in Herdr, direct configuration edits, ownership bypass, new SSH path, worker/task mutation, native host patch, deployment or live-machine validation. No durable Herdr preference for project kinds.

## Decisions

### 1. Require a new Crew project-kinds v1 contract

The following commands and JSON are a **proposed upstream dependency**, not existing supported commands. The coordinator must arrange them in Crew and confirm this contract before real integration can be accepted. Herdr can implement against fakes after plan approval; unsupported machines remain unchanged.

**Discovery, without opening/creating a Crew home:**

```text
crew project --capabilities --json
```

Exit zero, one JSON object:

```json
{
  "capability": "project-kinds",
  "version": 1,
  "listJson": true,
  "setKind": true,
  "explicitHome": true,
  "expectedPath": true,
  "kinds": ["workflow", "plain", "gate"]
}
```

Require the exact capability/version, all advertised safety features and all three kinds; tolerate unrelated extra fields. Text/help, missing keys, unknown versions or ignored flags do not enable the feature. Probe on Projects checks, not render/hover, memoized within the check; no new background polling or minimum-version guess. Transport failure is an unavailable read, not evidence for a write.

**Authoritative listing of the same default home the existing Projects list uses:**

```text
crew project list --json
```

Exit zero:

```json
{
  "capability": "project-kinds",
  "version": 1,
  "ok": true,
  "home": "C:/Users/fixture/.crew",
  "projects": [
    {"name": "myworkflows", "path": "D:/Git/MyWorkflows", "kind": "workflow"},
    {"name": "site.dev", "path": "D:/Git/site.dev", "kind": "plain"},
    {"name": "gated", "path": "D:/Git/gated", "kind": "gate"}
  ]
}
```

`home` is canonical absolute identity on that machine, not a local-home substitution. `projects` is the complete list, including an empty array when genuinely empty; names are exact unique registered names and paths are absolute. `kind` is Crew's authoritative project delivery selection for future ship tasks. Crew resolves any legacy detection itself; a successful explicit setter persists that selection and subsequent list/ship behavior honors it. Herdr never equates a missing workflow override with Plain or derives Gate from remotes/tool presence. If a selected kind cannot be honored, Crew refuses rather than confirming one mode and silently choosing another. Existing task delivery records remain unchanged.

**Kind-only mutation of an existing registration:**

```text
crew project set-kind <name> --kind workflow|plain|gate --home <absolute-home> --expected-path <registered-folder> --json
```

Example exit-zero acknowledgement:

```json
{
  "capability": "project-kinds",
  "version": 1,
  "ok": true,
  "home": "C:/Users/fixture/.crew",
  "project": {"name": "myworkflows", "path": "D:/Git/MyWorkflows", "kind": "plain"},
  "changed": true
}
```

`changed` is a boolean (false for an already-stored same selection). Under Crew's existing registry serialization and ownership policy, the command requires an existing name with matching canonical path, then updates **only** its kind selection. It must preserve path, gate-skip choices and every unrelated/unknown registration field. It must not create/re-register a project or change running tasks, worktrees, remotes or other repositories. Unknown homes/names, changed paths, unavailable kinds and ownership refusals must not create a home or bypass its owner. The expected-path check prevents a removed/reused name from silently retargeting the click.

Nonzero refusal response, where the target is known:

```json
{
  "capability": "project-kinds",
  "version": 1,
  "ok": false,
  "home": "C:/Users/fixture/.crew",
  "error": {"code": "home-owned", "message": "Another session owns this Crew home."}
}
```

Requested stable codes: `home-owned`, `home-missing`, `project-missing`, `project-changed`, `kind-unavailable`, `invalid-arguments`, `registry-busy`, `internal-error`. Error messages are public, concise and contain no credentials or task dumps. Herdr maps known codes to one sentence and uses a fixed generic failure for unknown/invalid responses; raw usage output is never copied into the row.

**Rejected alternatives:** parsing the optional human-text workflow column; inferring project kind from task status; re-adding with workflow flags; editing `crew.json`; using a successful exit code alone. None provides both authoritative project kinds and a non-destructive acknowledged write.

### 2. Extend the shared list declaration, not Crew-specific rendering

Add an optional generic `list.rowChoice` declaration providing options, accessible label and async setter; checked rows carry their public choice value plus an opaque captured revision/identity token. Crew supplies the three labels and its validated target identity through that declaration. No plugin name, Crew wording or Crew command belongs in `settings-kit.js` or `plugins-ui.js`.

Extend `removableRow` with an optional choice slot **before**, not instead of, the existing Remove rail. The resting label and shared `optionDropdown` use the same reserved width (existing 150px dropdown width); Remove keeps 80px. The left path uses remaining flex width and truncates with its existing full-path tooltip. Other callers retain byte-equivalent geometry when no choice is declared. Keep row height, Settings theme and shared menu surface unchanged.

Reveal on row hover, keyboard focus within the row, or an open popup. Use host-supported focus tracking and keyboard events, retaining focus handles on the view rather than allocating during render. Tab reaches the choice and Remove; Enter/Space opens, shared keyboard menu behavior chooses, Escape closes without writing. Leaving the row with an open menu must not unmount its trigger. Losing focus after dismissal restores the quiet muted right-aligned label. Fake renderer tests cover keyboard paths explicitly, not only pointer hover.

### 3. One captured explicit write, then reconciliation

Use the existing list action machinery's single-flight guard and busy/settling feedback, adding row-scoped sanitized errors keyed by stable row identity. Capture machine, returned home, registered name/path, row revision and view/enable session when opening the menu. Revalidate them and capability evidence before dispatch; do not rely on mutable row indices or a late header-machine value. Pass all arguments through the existing PowerShell quoting helper and selected-machine execution path.

Selecting the current value is a no-op. While a change is pending, retain the last confirmed kind and prevent duplicate list mutations. On exit zero, validate capability/version/ok, canonical home, exact name/path, requested stored kind and changed boolean. Only a matching acknowledgement can replace the confirmed choice; retain the existing authoritative section recheck afterward. Do not optimistically save the selection in plugin preferences.

A Crew refusal retains the old label and shows one short failure sentence directly below that row (for example, **Could not change delivery kind: another session owns the Crew home.**), replacing rather than duplicating failure text. A timeout/disconnect/malformed success is unknown, never confirmed: show **Could not confirm the delivery kind. Refresh before trying again.** and require a successful fresh list read before another write. Do not replay the setter automatically. A later authoritative read may reveal that an uncertain write actually succeeded; do not pretend it was rolled back. A failed read retains confirmed rows without publishing empty facts or authorizing a new write.

Machine changes, close, disable, session replacement and registration replacement retire menus, errors and callbacks. An already-accepted write may complete on its original machine, but cannot populate the replacement view or start obsolete follow-up work.

### 4. Backward compatibility without text-kind inference

A machine without valid capability evidence uses today's `crew project list` and existing `parseProjects` solely for names/paths; no new kind label or editor appears. Existing Add, Remove, duplicate-folder checks and concise refusal behavior remain intact. Never fall back from a malformed advertised JSON list to guessing kind from human text. A genuine transport failure remains a failed read, not an authoritative unsupported result or success.

## Risks / Trade-offs

- [Crew API absent today] → Ship the adapter capability-gated and fake-tested; the coordinator owns the separate upstream work. No claim that installed 0.12.1 can expose the new UI.
- [Three kinds are not today's two workflow override values] → Crew must own explicit selection semantics, including gate precedence/availability; Herdr does not translate these into legacy add flags.
- [Home held by another coordinator] → Honor Crew's refusal and show concise guidance; no impersonation or local-set ownership exception is assumed.
- [Narrow rows and long Delivery workflow wording] → Reserve dropdown and Remove columns, truncate only the path within available width, and exercise geometry at supported narrow widths/zoom in fake tests.
- [Native focus/menu behavior differs from a mock] → Use existing supported primitives and honest fake-only evidence; no live native acceptance claim or unauthorized app launch.

## Migration Plan

1. Obtain plan approval and coordinator agreement on the upstream Crew contract; do not implement in this planning round.
2. Implement the three outcomes in tasks order, with targeted fake tests for each. Update README and `docs/PLUGIN-UI.md` with the declaration and compatibility boundary.
3. Publish through the existing Git remote/SSH publication path in the same draft PR. Check one final-head CI run snapshot and report immediately without waiting; draft CI intentionally skips platform suites, while OpenSpec/Readiness still run.
4. Older Crew keeps current behavior until it advertises the supported API. Disabling/reverting this app change removes only the editor; stored Crew choices remain Crew-owned and no rollback write is attempted.
