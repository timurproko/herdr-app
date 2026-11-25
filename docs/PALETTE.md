# Owned Custom command palette

The owned palette uses host commands and public UI operations, not a native frame
patch. Its catalog preserves the reviewed 0.1.17 theme choices and 0.1.18 manifest
contributions. `commands()` lists only host commands: the installed metadata worker
reads direct mod manifests and checks target entrypoint existence, never imports or
executes another mod. Metadata failure must not erase the host catalog.

Custom routes Settings/pickers and untargeted inline rename/close through existing
Custom handlers; explicit rename/close targets remain literal. Usage appears only
while enabled. Native `app.palette` itself cannot be overridden: CLI/native callers
and other layouts keep the native palette. The owned shortcut/button use `mod.open`.

Recent history uses the stable `custom.palette.recent` runtime shared key, not the
transient overlay identity. A bounded shape-checked reader supports legacy native
palette recent IDs without modifying native stores or copying unrelated state.
It is local desktop runtime history, never a portable preference.

`tests/owned-palette-model.test.mjs` compares actual preserved native catalog code
with the owned model; those fixtures certify behavior, not native patch permission
or real GPU timing/pixels. No native installation or restart is part of these tests.

The owned `mod.json` uses the host's popup metadata (top anchor, 60px offset,
620px width, 85% window height cap). `mod.open` gives one toggled overlay; its
input takes focus. The 408px shared skin retains the old Custom virtual-list,
pinned heading/result count, fades, scrollbar ordering and clear behavior.
`tests/owned-palette-ui.test.mjs` exercises the packaged view with both reviewed
host-shaped fixtures. These are synthetic event/layout passes, not live screenshots.
The status-bar opener uses the same mod and advertises the Custom-scoped binding.

## Persistence and diagnostics

One installed-state rule runs after every Desktop deploy/rollback/remove and on
Custom startup/reload. If the owned mod is actually present and its capability
gate passes, it merges just `keys.json["layout:Custom"]["ctrl-shift-p"]` to
`mod.open:custom-palette`, with ownership in `.customizations/palette-binding.json`.
If the mod is absent, only that reserved owned action is changed to stock
`app.palette` and its sidecar is removed, even if startup created them after a
deferred installation, or the sidecar itself is missing. A personal rebind to
another command is left byte-for-byte untouched while stale ownership is removed.
Binding policy is derived from installed files, never a deployment key snapshot.
It does not edit Herdr defaults or globally register/override `app.palette`. Other global,
terminal and layout bindings are preserved. Unknown personal collisions (including
higher-priority terminal/mod mappings) fail instead of being clobbered. Collision
checks normalize GPUI modifier order/case, `secondary` by platform and uppercase
ASCII letters' implicit Shift. Equivalent Custom native mappings are consolidated
into one owned spelling; removal returns the owned spelling to stock rather than
replaying old keys. Personal rebindings are preserved, not a rollback error. Before
owned routing or native retirement, installer preflight and startup use the
same real capability gate: the selected home's SDK/GPUI declarations plus the
current executable's version and command argument catalog. An initialized home
missing a required API, UI symbol or command refuses before key/intent writes.
Only a home with both generated SDK files absent defers as uninitialized, without
changing routing or retiring the native patch. A capable home with no native keys
waits until startup can merge the native fallback `keys()` listing rather than
inventing release defaults.

Mounted non-footer Custom chrome checks on startup/reload and every five seconds,
comparing the local key catalog and retry generation; unchanged healthy state gets
an integrity check at most once a minute. One expiring lease coalesces windows.
Repair yields, checks owned palette payload hashes/overlay metadata and generated
GPUI capabilities, and writes through `readTextFile` / `writeTextFile` expected-value
CAS, with one bounded retry. Removing an absent mod's sidecar uses the same narrow
installed-state Node policy (the public write API cannot unlink files), not an
arbitrary path/content writer. Missing-payload cleanup does not require the absent
overlay's capabilities. It pauses for deployment and does nothing under native
`checking()`, after close or outside Custom. Native key reload errors and catalog
readback are reconciled after 1.1 seconds. `keys()` reads disk, **not the installed
GPUI key table**: reconciliation is not claimed as actual event-dispatch proof.

Failures retain **Palette needs attention · Retry** in the status bar, with the
sanitized reason on hover, plus one notification per changed failure. The normal
commands button stays available. `.customizations/palette.log` keeps at most
128 lines/64 KiB without key-file dumps or transcripts; log failure is diagnostic
and cannot change successful key repair. Installer logging is also best-effort:
a non-replaceable/unreadable log returns `logUnavailable` without aborting a
successful Update or skipping native retirement. A native reset can briefly show stock
until the next repair/reload; there is no atomic pre-start interception API.

Each desktop installs/repairs its own app home independently: this computer and a
pc2 Desktop use their own ordinary full Update. Selecting pc2 terminals still uses
this desktop's palette. Core-only shell deployment does not install a desktop
palette or silently broaden remote deployment policy. No background service,
watcher, native binary patch, terminal input or process restart is introduced.

Required host APIs/commands and GPUI capabilities, not reviewed-version membership,
gate the feature. The SDK reference fixtures cover both 0.1.17 and 0.1.18; capable
future versions pass, while missing capabilities report their actual cause.
`tests/owned-palette-persistence.test.mjs` covers isolated local/pc2 homes, stock
frame/key resets, missing defaults, update and reload, ownership/permission/CAS
failures, duplicate copies, retry notifications, rollback and Core-only exclusion.
Real native key dispatch/focus and pixel proof remain separately authorized manual
validation; no live app deployment is part of these tests.

## Native patch retirement

After owned payload, binding and capabilities are staged, install/startup stops
palette native refresh and retires a previous opt-in. The registry is retained for
historical recovery and the separate stop-gap, not as a continuing palette
implementation. Both possible merge orders are covered: a later legacy opt-in is
retired again, while explicit native apply refuses once owned intent exists.

Exact owned native code is restored only from reviewed **current-host** stock,
including when old code masks an update. Exact current stock is never overwritten
by an older backup. Personal helper conflicts/corrupt records refuse before writes;
masked unreviewed provenance defers retirement and leaves files/opt-in intact, with
visible attention, but never reapplies the native patch. An unknown entrypoint may
be new stock or a personal edit: preserve its entire frame tree and explicitly
archive management without classifying those bytes as reviewed. Recovery records
live under `.customizations/recovery/palette-retirement/`; the retirement marker
records preserved native files instead of claiming complete file cleanup. Feedback
files/opt-in are unchanged. None of this opts in a patch, deploys or restarts Herdr.

History seeds, binding intent, repair logs, leases and retirement/recovery records
are local runtime data, outside portable preference exports. Ordinary uninstall
uses the same installed-state rule: owned actions become stock, personal rebindings
stay untouched, and stale sidecars disappear. There are **no palette-specific entries
in deployment rollback journals**. Rollback restores payload and invokes the current
reconciler, even if the restored older bundle has no policy worker of its own.

The only extra recovery evidence is irreducible native intent/provenance. Retirement
archives the previous opt-in, writes an exact before/after receipt, then publishes
its recovery marker **before native mutation**. Once the owned mod is absent and
a legacy runtime is installed, the same reconciliation re-establishes that verified
opt-in and the restored runtime's ordinary reviewed-byte/ownership-checked startup
refresh rebuilds the previous native customization. Interrupted retirement uses
the same rule, not a deployment-journal special case. It never copies an old native
entrypoint blindly. Later personal/native edits or missing evidence refuse safely;
a skipped/failed guarded refresh is an explicit error with intent retained, never
claimed as a successful rollback to vanilla. Recovery evidence stays for diagnosis.

### What install, rollback and reinstall look like

- **Install from the reviewed 0.1.18 stop-gap:** Custom's shortcut/button open the
  owned palette. Native patch management is retired, with local native recovery
  evidence; the native frame itself returns to current stock.
- **Rollback that backup:** use the existing Herdr/main-layout guard first (no
  terminal restart). After returning to Custom, the shortcut/button again use
  `app.palette`, and the previous native patch gives its Custom palette styling
  and routing. Its opt-in is live again, so the old startup worker can reapply it
  after Herdr rewrites the frame. This deliberately returns to the stop-gap's
  release-specific compatibility limits, not the owned implementation.
- **Deferred install → first startup → rollback:** before SDK generation, routing
  waits. Startup establishes ownership once capable. Rollback removes the mod and
  the common rule restores stock routing/removes the sidecar, regardless of when
  startup created them. No shortcut is left pointing at a removed mod.
- **Personal rebind before rollback:** that command and unrelated keys remain as
  written; only stale ownership goes away. A later reinstall reports the collision
  instead of taking the person's shortcut back.
- **Reinstall through normal Update:** Custom switches back to the owned palette,
  safely retires the restored native opt-in again and keeps its owned repair policy.
  User preferences and running terminals remain untouched. Owned Recent history is
  retained for reinstall; rollback's native palette keeps its separate native history.
