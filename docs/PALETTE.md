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
