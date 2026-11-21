# Optional native compatibility patches

These two frame-only exceptions are not the normal feature architecture. Prefer
private mods/layouts/themes and supported Herdr APIs. Built-in mod patches were
retired because Herdr quarantines them into `*-edited*` recovery directories and
warns on relaunch. A new exception requires explicit approval; never rebuild or
modify native binaries for a UI request.

`registry.json` maps patch IDs to host targets, reviewed stock snapshots and local
helpers. Every patch receives the same `host.js` facade and versioned
`compatibility.js`; patch code must not import `herdr` directly. The build packages this catalog, sources and workers under
`herdr-app/.customizations/runtime/`. Startup repair and deployment use that same
catalog. Only entries with an existing local opt-in record are repaired.

## Maintenance

1. Run `npm run check:host-api`; update the central compatibility profile for public API/command changes.
2. Inspect the new host's unmodified shipped file and its supported APIs.
3. Preserve byte-faithful reviewed originals. Update the private patch source only
   after checking its native actions and its Custom-only scope.
4. Add every local dependency to the registry, including helpers required by helpers.
5. Run regression tests and disposable native checks; inspect the real dialog.
6. Deploy. Unknown stock and personal edits must be refused, never overwritten.

From the project directory:

```powershell
$HerdrHome = if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { Join-Path $HOME '.config/herdr-app' }
node "$HerdrHome/.customizations/runtime/scripts/frame-patch.mjs" check palette
node "$HerdrHome/.customizations/runtime/scripts/frame-patch.mjs" restore palette
```

`apply <id>` is an explicit opt-in. Restore a patch before deleting its registry
entry. Restoration preserves unfamiliar newer stock instead of downgrading it.
Patch state/backups are local under `.customizations/`; never track or fabricate
ownership records. Adding a registry entry alone must never opt it in.
