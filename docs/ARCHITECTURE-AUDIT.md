# Architecture audit — follow-up to native-mod recovery warnings

Scope: source/build/deployment boundaries, installed mod ownership, native patches,
facade bypasses, worker coupling, state placement, legacy leftovers and agent rules.
This is an inspection snapshot, not a guarantee of future compatibility.

## Unresolved risks (most important first)

1. **Shell replacement resolved; profile read-only coupling remains.**
   The document-mutating `shell-replace.cjs` and its handoff controller were retired
   after approval to change behavior. **Open new tab in…** now uses native `tab.new`
   and preserves the old terminal. No core-document writers remain in source.
   The separated profile-launch worker still reads the core document to reject a
   closed space; this internal read shape is not checked by `check:host-api`.
2. **Two native frame exceptions remain.** Palette and feedback still contain
   copied native UI implementation and require startup repair after Herdr rewrites
   frames. Reviewed originals, hashes and opt-in guards reduce overwrite risk;
   they do not remove coupling. Retiring them would remove their Custom UI/routing.
3. **The facade is not a complete compatibility layer.** It covers Herdr public
   API and command names, not GPUI signatures, arbitrary command arguments,
   worker RPC schemas, third-party auth formats or provider/network behavior.
   New versions need review plus focused tests and real interactions.
4. **Old namespace compatibility retired.** Temporary source bridges, old mod
   stores, label aliases and migration tooling are no longer part of the Custom
   installation. Third-party licenses remain byte-faithful. Host-owned history
   must be cleaned only while Desktop is closed; leave cores and terminals alive.
5. **Shell source coupling resolved.** Deploy now owns the scripts and content
   revision under `.customizations/runtime/shell/`; profiles only source those
   installed entrypoints. Bash resolves siblings at source time and reloads
   compatible payloads at idle prompts. Existing old dispatchers still need one
   explicit re-source/new shell after profile migration; see the current README.

## Corrected during this audit

- Removed stale five-patch wording from active docs; current native checks cover
  15 private mods and 2 frame exceptions.
- Added `docs/ARCHITECTURE.md` as the agent decision guide and linked it from
  project rules, README and app-root README.
- Added `npm run report:ownership`: distinguishes manifest-owned Custom mods,
  Herdr-catalogued mods, unknown mods, host-generated declarations, recovery,
  and missing Custom mod directories. Catalog membership is not
  content verification; use `doctor` and reviewed integration baselines too.
- Routed temporary diagnostic mods through the same facade instead of
  generating direct `herdr` imports.
- Removed duplicate identity injection and documented deliberate build-injected
  dependencies. Architecture tests reject unmapped source, new native exceptions,
  tool facade bypasses and additional core-document writer locations.
- Fixed `hostVersion()` caching transient missing startup metadata forever.
- Fixed a test VM loader race where a dependency could be returned before linking.
- Retired completed namespace migration tools, fixtures and provenance.
- Renamed ambiguous `upstream/baseline.json` to `upstream/baselines/0.1.13.json`;
  baseline tooling and tests now use explicit version paths.
- Removed obsolete test-only mod and recovery copies after ownership verification.
- Removed ignored test output logs from the source project. No runtime/history
  stores, settings, terminal inputs or live core documents were cleaned up.

## Ownership result

- 15 manifest-owned Custom mod directories.
- 21 mod directories listed in Herdr's read-only installed catalog.
- No unknown or unowned Custom mod directories, live recovery mods, or legacy mods.
- 30 generated declaration/editor files inside Custom mods belong to Herdr.
- Palette and feedback are the only active registry exceptions.
- Any new deployment rollback records remain machine-local and ignored.

The next feature should follow the architecture guide, not this historical audit.
A green ownership report means runtime ownership is accounted for, not that all
internal/external contracts have been decoupled.
