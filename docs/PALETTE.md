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

Full install merges just `keys.json["layout:Custom"]["ctrl-shift-p"]` to
`mod.open:custom-palette`, with intent/baseline in
`.customizations/palette-binding.json` and deployment rollback journals. It does
not edit Herdr defaults or globally register/override `app.palette`. Other global,
terminal and layout bindings are preserved. Unknown personal collisions (including
higher-priority terminal/mod mappings) fail instead of being clobbered. Removal
and rollback refuse later edits. A never-started home with no native keys defers
until startup can merge the native fallback `keys()` listing, rather than inventing
release defaults.

Mounted non-footer Custom chrome checks on startup/reload and every five seconds,
comparing the local key catalog and retry generation; unchanged healthy state gets
an integrity check at most once a minute. One expiring lease coalesces windows.
Repair yields, checks owned palette payload hashes/overlay metadata and generated
GPUI capabilities, and writes through `readTextFile` / `writeTextFile` expected-value
CAS, with one bounded retry. It pauses for deployment and does nothing under native
`checking()`, after close or outside Custom. Native key reload errors and catalog
readback are reconciled after 1.1 seconds. `keys()` reads disk, **not the installed
GPUI key table**: reconciliation is not claimed as actual event-dispatch proof.

Failures retain **Palette needs attention · Retry** in the status bar, with the
sanitized reason on hover, plus one notification per changed failure. The normal
commands button stays available. `.customizations/palette.log` keeps at most
128 lines/64 KiB without key-file dumps or transcripts; log failure is diagnostic
and cannot change successful key repair. A native reset can briefly show stock
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
