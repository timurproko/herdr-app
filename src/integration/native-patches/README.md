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
catalog. Only entries with an existing local opt-in record are repaired. The optional
`mainByOriginal` mapping selects a release-specific entrypoint from exact reviewed
stock bytes (or embedded bytes when owned code masks stock), never an App version
allowlist. Ambiguous embedded originals selecting different payloads skip safely.
Apply/check use the same selection; updated recovery records retain earlier raw
originals in `previousOriginals` and restore the current reviewed native original.

## Maintenance

1. Run `npm run check:host-api`; update the central compatibility profile for public API/command changes.
2. Inspect the new host's unmodified shipped file and its supported APIs.
3. Preserve byte-faithful reviewed originals. Update the private patch source only
   after checking its native actions and its Custom-only scope.
4. Add every local dependency to the registry, including helpers required by helpers.
5. Run regression tests and disposable native checks; inspect the real dialog.
6. Deploy. Unknown stock is skipped with an advisory during automatic refresh,
   never overwritten. Explicit apply still refuses it. Personal dependency edits,
   corrupt records and concurrent-write conflicts remain failures. Doctor reports
   skipped optional patches as advisories, not broken customization ownership.

From the project directory:

```powershell
$HerdrHome = if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { Join-Path $HOME '.config/herdr-app' }
node "$HerdrHome/.customizations/runtime/scripts/frame-patch.mjs" check palette
node "$HerdrHome/.customizations/runtime/scripts/frame-patch.mjs" restore palette
```

## Reviewed 0.1.16 and 0.1.17 stock

`palette/provenance.json` records pinned release commits and raw LF/Windows CRLF
originals with SHA-256 digests. The separate 0.1.17 Custom palette preserves native
`themes()` discovery and the light/dark and active-layout filters, in both Custom
and native layouts. The 0.1.16 replacement retains its original theme choices;
legacy reviewed 0.1.13 source coverage is retained with its native import restored.
With Custom active, the person sees the styled palette, fixed headings, scroll
fades, keyboard navigation, Usage entry, Custom Settings/pickers, inline rename and
last-tab-aware close, plus 0.1.17's dynamically discovered theme choices. Nothing
opts in automatically. See [review evidence](../../../docs/HERDR-0.1.17-NATIVE-PATCHES.md).

### Feedback

`feedback/provenance.json` records pinned v0.1.16/v0.1.17 commits and raw LF and
Windows CRLF originals with SHA-256 digests. Their feedback JavaScript is unchanged.
The previous original had a facade-rewritten import and different byte formatting;
its 0.1.17 rejection was a false negative, not a new native feedback form. The
Windows original was compared byte-for-byte with installed v0.1.17 embedded stock,
read-only. Canonical originals retain native imports and are never executable
Custom replacements; authored patch code continues to use the facade.

Existing feedback opt-ins can refresh on these reviewed bytes. With Custom active,
the person sees compact thumbnails, **+ Add image**, muted **Drag or add images to
attach them.** guidance, expandable JSON details and the simplified **Feedback
sent** thank-you view. Sending remains native. This source review is not live UI
validation and does not enable a new opt-in or deploy anything.

## Unreviewed native bytes

Public API compatibility does not authorize either native patch. Automatic refresh
checks reviewed target bytes; when an old owned patch masks current stock, a
reviewed original must also occur in the installed executable's embedded bytes.
Unknown/unavailable native evidence skips that patch without changing its files,
helpers, opt-in or recovery record. This is not a version allowlist.

- **Palette:** the patch supplies Custom's command-search styling, fixed group
  headings/scroll fades, Usage entry, and routing to Custom Settings/pickers,
  inline rename and last-tab-aware close actions. With new stock left in place,
  the person sees Herdr's standard command palette. Its commands use native
  destinations and native rename/close behavior, not these Custom overrides.
  Custom's own buttons and sidebar remain available and unchanged.
- **Feedback:** the patch supplies Custom's dialog styling, compact attachment
  thumbnails, **+ Add image**, muted drag/add helper, collapsible JSON details and
  the simplified **Feedback sent** thank-you view. With new stock left in place,
  the person sees Herdr's standard feedback form/attachments/success view;
  sending feedback itself is still native and available.

Both corrected feedback and the new 0.1.17 palette originals match the reviewed
installed native bytes, including when a previously owned patch masks them.
Unknown future bytes still skip without uninstalling or certifying an old owned
patch. No native files are rewritten to hide an unreviewed state.

To restore supported customizations, review the new unmodified native source and
binary provenance, rebase the patch while preserving native actions, add its
byte-faithful reviewed original and regression coverage, then deploy. Existing
opt-ins can refresh after that review; adding an App version to a public profile
cannot restore either patch. Never use a live patched file as the stock baseline.

`apply <id>` is an explicit opt-in. Restore a patch before deleting its registry
entry. Restoration preserves unfamiliar newer stock instead of downgrading it.
Patch state/backups are local under `.customizations/`; never track or fabricate
ownership records. Adding a registry entry alone must never opt it in.
