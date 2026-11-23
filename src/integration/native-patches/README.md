# Optional native compatibility patches

Only `frame/palette` and `frame/feedback` are approved exceptions. Prefer private
mods/layouts/themes and supported host APIs; never patch built-in mods or binaries.
Native startup deletes/reseeds `frame/` from the executable, then loads the modules
as `frame-palette` / `frame-feedback`. Custom repairs **prior opt-ins only** after
mounting or deployment. Explicit `apply` is the only way to create an opt-in.
Pending journals are discovered independently of opt-ins; recovery-only work never
turns an interrupted first apply or completed restore into a fresh opt-in.

## Compatibility, not a release allowlist

The registry declares structural transforms, required host capabilities and helper
graphs. Current stock is proven read-only against the current executable, directly
from the target, a saved raw original, or bounded unique embedded-file boundaries.
An owned old patch hash proves ownership, not compatibility with a newer host.
No runtime download, release allowlist or reviewed-whole-file equality is used.
Raw 0.1.16/0.1.17 fixtures are evidence only, not runtime permission.

Offline packaged Acorn 8.15.0 (MIT) finds unique AST anchors and applies range edits.
Untouched native regions remain unchanged. Output parsing, static import/export
closure and required capabilities are checked before activation. Missing/ambiguous
necessary sites, unavailable current-stock evidence or failed self-checks leave
all patch files/records untouched, with a concrete optional incompatibility advisory.
Every transform and inspection source boundary turns unexpected AST shapes into
anchor-named incompatibility advisories, including extracted callback references.
Personal dependency edits, corrupt records, filesystem failures and unsafe recovery
remain explicit hard safety errors; they are not disguised as source incompatibility.
Descendant-only matches never authorize replacing surrounding wrappers or sibling
actions. The [replacement-site audit](../../../docs/NATIVE-PATCH-AUDIT.md) lists
preserved regions, explicit refusal contracts and future-variant regressions.
Unknown newer stock is never overwritten or downgraded on restore.

## Surface behavior and native actions

`palette/ui.js` owns Custom search/selection, virtual scrolling, fixed group/results
headings and passive bottom fade. The bridge retains native entries, fuzzy search,
history identities, key labels and special dispatch branches. 0.1.17's dynamic
light/dark/layout-aware themes and compatible future actions survive. Usage follows
its plugin switch. Only Custom activation routes Settings/pickers/worktree/machine
choices, inline rename and untargeted close; explicit close arguments remain native.
Other layouts retain native presentation and activation.

`feedback/ui.js` owns Custom field chrome/counts, compact Add image/helper/thumbnails,
viewer navigation, JSON disclosure, one-use drafts and the Feedback sent thank-you.
The Custom branch derives from current native child operations and retains unknown
sibling actions/callbacks. Native preview, pick, send, disable predicates and
thumbnail-removal callbacks remain native. Unsafe overlapping edits refuse before
writes rather than discarding actions. Sending/sent forms reject drops and late
picker/draft results. Other layouts keep their native form/success behavior.

Feedback attachment and sending APIs require actual `frame-feedback` authority.
An ordinary mod/overlay cannot fully replace it. This bridge does not spoof identity
or send directly to a network endpoint. A private palette could cover selected
Custom openers, but cannot universally intercept native `app.palette` entrypoints.

## Transaction and recovery contract

The engine stages a complete immutable content-addressed helper generation before
one atomic main-entrypoint activation. Main always references a complete graph;
new staging cannot mutate active helpers. Durable journals preserve raw originals
and previous records. State v2 records source/executable digests, generation and
installed hashes; v1 migrates only after ownership and current-stock checks. Prior
hash evidence for retained legacy helpers survives an interrupted v1 refresh.
Final validation includes expected main, record and the complete generated graph,
even when only a missing helper was written. Unchanged checkpoints participate in
journal recovery too; external changes retain a recovery-required journal.
Restore enumerates all recorded originals as well as installed paths, and restores
nonempty originals even when the helper is missing. Unchanged original checkpoints
are checked too. Identical refresh is a no-op, including main/record timestamps.

Before a journal is retired, its complete raw bytes are durably copied and verified
under `.customizations/recovery/native-<id>-<digest>.journal.json`. This append-only
private evidence retains originals even when current stock supersedes an older
native backup. Legacy record retirement/rebasing similarly retains raw record
backups. Failed copies or rollback readbacks keep active evidence; no automatic
archive cleanup exists. Never sync or commit these potentially personal backups.

Explicit CLI, deploy, startup and restore serialize native mutations with the same
lock. Rollback recreates dependencies needed by the previous main before
reactivating it, then restores its record and removes new staging. A later
mutation resolves an interrupted journal before doing new work. A fully written
interrupted restore is finalized without recreating an opt-in; other interrupted
operations roll back with complete readback before journal retirement. Startup,
doctor and removal discover pending disk journals even without a record. Doctor
also lists retained recovery backups (including without a deployment manifest),
read-only. Removal settles pending work before deleting its recovery worker.
Completed archives are evidence only, never a source of opt-ins or replay jobs.
Obstructed rollback retains backups and reports a hard recovery-required error;
it never overwrites another writer's edits to pretend recovery succeeded.

The filesystem does **not** provide multi-file atomicity or a native CAS lock.
Native startup and external editors do not honor Custom's lock. Rechecks/readback
expose detected races, but cannot guarantee rollback despite external interference.
Same API names with changed semantics, a rewritten controller/form, GPUI changes
or a compressed/unrecoverable stock container can still break a future release.
Structural compatibility is guarded best effort, not universal certification.

## Diagnostics and commands

Deploy, startup, check and doctor share compatible-active, repair-needed,
incompatible/retained-unverified, ownership-conflict and recovery-required verdicts.
An incompatible optional patch does not fail unrelated deployment. Unsafe ownership
or recovery does. Never delete locks/journals or fabricate stock/ownership to force
an update; preserve the reported backups and investigate the concrete reason.

From the project directory (read-only first):

```powershell
$HerdrHome = if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { Join-Path $HOME '.config/herdr-app' }
node "$HerdrHome/.customizations/runtime/scripts/frame-patch.mjs" inspect palette
node "$HerdrHome/.customizations/runtime/scripts/frame-patch.mjs" check palette
# restore is a mutation; use only when explicitly authorized:
node "$HerdrHome/.customizations/runtime/scripts/frame-patch.mjs" restore palette
```

## 0.1.17 findings

Palette added dynamic native theme choices. Feedback stock JavaScript did not change
between 0.1.16 and 0.1.17. The former catalog originals had facade-rewritten imports
and were not raw stock, causing a false-negative native-byte gate. Those snapshots
and full replacements are removed; byte-faithful stock fixtures and pinned source
provenance live under `tests/fixtures/native-stock/`. Generated regression previews
are derived from those fixtures, never maintained or selected as full replacements.
The installed Windows stock has CRLF; backups/restoration preserve exact raw bytes.

Tests cover actual release stock, a synthetic future variant, native-action
callbacks, v1 migration, current-stock discovery, write/crash/recovery failures,
independent optional patches and relocated offline workers in disposable homes.
They do not prove live GPUI pixels, permission changes or future host semantics.
No deployment or installed-app mutation is part of this implementation task.
