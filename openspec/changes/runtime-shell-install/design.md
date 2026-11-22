# Design

## Context

See proposal.md for motivation. The scout report was read in full and checked against this branch's `218cdc5` baseline, not treated as instructions to change private files.

Verified findings:

- `customization.json:399-401,433-435` builds preference helpers and shell scripts, but `tools/build.mjs:69-76` selects neither for deployed ownership. `tools/deploy.mjs:9-12` also rejects shell extensions and the extensionless revision.
- `src/integration/shell/bash-cwd-loader.sh:7-8` resolves both payload and revision through fixed home/yadm paths. The reporter itself is already independent of Desktop.
- `tools/preferences.mjs:4-7,26-32` imports the checkout build module and validates against authored source. The lower runtime helper exports only host preferences and picker metadata, not layout/native-theme snapshots. Copying either entrypoint as-is is insufficient.
- Existing source-scoped deployment requires an installation and unconditionally consults layout-preference state. It is not a fresh Core-only installer. `tools/rollback.mjs` likewise invokes Desktop status outside fixtures.
- `tools/runtime/settings-sections.js` is a deliberate development bridge; packaging must use the canonical UI catalog bytes, not install that bridge's source import.
- Current source-location prose and screenshot paths listed by the scout still exist. Historical preference relocation examples and architecture negative guards are not runtime dependencies and stay intact. The audit's unresolved shell-source exception should become a resolved item without rewriting its historical execution evidence.

The report's proposed paths are adopted. Its shell-only suggestion needs one addition: Core-only recovery must not depend on the absent Desktop. This plan makes that a tightly scoped extension of existing journal recovery, not a new installer architecture.

## Goals / Non-Goals

**Goals:** Stable external paths, one source of shell bytes/export filtering, existing conflict and recovery protections, and a small explicit Core-only installation mode.

**Non-Goals:** Editing profiles or dotfiles; installing on this PC or pc2; migrating snapshots; new filters; import-on-pull; background refresh services; native changes; terminal input, process restarts or remote commands. This task's mutating tests use disposable `HERDR_APP_HOME` values only.

## Decisions

### 1. Exact installed contract and external profile content

Here `home` means the explicit deployment home, otherwise nonempty `HERDR_APP_HOME`, otherwise `~/.config/herdr-app`. Source checkout location is irrelevant after installation.

| Exact installed path beneath home | Contract |
| --- | --- |
| `.customizations/runtime/shell/bash-cwd-loader.sh` | Bash profile entrypoint |
| `.customizations/runtime/shell/bash-cwd.sh` | Sibling Bash reporting payload |
| `.customizations/runtime/shell/powershell-cwd.ps1` | PowerShell profile entrypoint |
| `.customizations/runtime/shell/revision` | Deterministic lowercase SHA-256 plus newline for the three named script byte streams |
| `.customizations/runtime/scripts/export-preferences.mjs` | Export-only Node CLI, `export <home>` |

Full export's private outputs are exactly `preferences/<lowercase-hostname>.json`, `preferences/layout.json`, `preferences/palette.json` and `preferences/theme.json`, when the corresponding current inputs are available. Helper modules are deployed with the exporter under the same runtime tree, owned like the entrypoint.

The following are **literal profile contents for the later dotfiles change**, not commands executed by this task. Each fenced block is one exact profile line; guards allow a machine without the package to start its shell normally.

Bash profile line:

```bash
_herdr_cwd_hook="${HERDR_APP_HOME:-$HOME/.config/herdr-app}/.customizations/runtime/shell/bash-cwd-loader.sh"; if [[ -r $_herdr_cwd_hook ]]; then source "$_herdr_cwd_hook"; fi; unset _herdr_cwd_hook
```

PowerShell profile line:

```powershell
$herdrHome = if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { Join-Path $HOME '.config/herdr-app' }; $cwdHook = Join-Path $herdrHome '.customizations/runtime/shell/powershell-cwd.ps1'; if (Test-Path -LiteralPath $cwdHook -PathType Leaf) { . $cwdHook }; Remove-Variable cwdHook, herdrHome
```

Profiles select the home. At source time Bash captures an absolute directory from `BASH_SOURCE[0]`, resolving relative source paths before later `cd` calls. The dispatcher uses that captured directory; it does not recalculate from `$HOME`, current directory or a later environment change. Explicitly re-sourcing a loader from another home retargets it. No yadm marker remains in active code.

### 2. Extend ordinary payload ownership, not a second shell installer

Generate `dist/shell/revision` from an unambiguous ordered encoding of filenames and exact script bytes; identical builds produce identical revisions. Add the four explicit shell destinations to `bundle.json`; narrowly permit exactly those shell paths rather than allowing arbitrary `.sh` or `.ps1` runtime payloads. Existing safe-relative, symlink, lock, digest, unknown-file conflict, obsolete-file and later-edit protections remain authoritative.

Publish `revision` after all shell script replacements in both deployment modes. Keep dependency-before-entrypoint ordering for existing mods. When source selectors select any shell script, expand selection to all four shell files so a source-scoped update cannot publish a stale or mismatched revision. Revision publication is a prompt-refresh signal, not a claim that the whole deploy is transactionally atomic.

The Bash dispatcher retains interactive/TTY/`HC_TERMINAL_ID` guards, prior-command status, string/array hook chaining and deduplication, failed-report retries and silent missing-file behavior. Source payload definitions with reload-only mode at an idle prompt when revision changes; don't run agent tools or inject input. The existing optional Claude shell initializer stays optional; no new external dependency is introduced. Loader structural changes require explicit re-source/new shell; revision changes automatically refresh compatible payload definitions, not already-resident dispatcher code.

Alternative rejected: copy files outside deploy or broaden the runtime allowlist. Both would evade or weaken ownership protections. A yadm-written revision is also rejected: deploy owns script updates and must publish their revision itself.

### 3. Share complete export orchestration and package its import graph

Extract the existing full export branch into a reusable module, rather than maintaining another filter implementation. Extract pure layout override/projection validation from deploy into a shared helper if needed; preserve deploy's public exports for existing callers. Keep source preference import explicitly separate and unchanged.

Map the reusable export module to `scripts/export-preferences.mjs`. Package its host/palette helper, canonical settings catalog, file helpers and pure layout helpers with local relative imports. For example, a canonical `tools/preferences-export.mjs` can import `./runtime/preferences.mjs`, `./layout-preferences.mjs` and `./files.mjs`, emitted respectively as `scripts/export-preferences.mjs`, `scripts/runtime/preferences.mjs`, `scripts/layout-preferences.mjs` and `scripts/files.mjs`, with `scripts/runtime/settings-sections.js` mapped directly from `src/ui/settings-sections.js`. No development bridge, build module or source CLI wrapper is installed. Check this deployed graph rather than relying on the build's current blanket scripts-import exception.

The installed CLI accepts only `export` and an explicit home; missing/extra arguments and import fail before writes. It reads installed ownership `manifest.layoutBase` to validate layout snapshots. The source command uses the same export operation, preferring an installed base when present and retaining the authored-base fallback for source-only usage. Installed export has no authored fallback: if layout data needs validation but no recorded base exists, report a clear error instead of guessing. If there are no layout inputs, omit that snapshot as before.

Preserve current schemas, existing filtering, palette ownership checks, lowercase host naming, raw theme backup behavior and no-op writes. Export changes only private snapshots. No import functionality is exposed by the installed CLI, even if a shared internal helper also supports source-only import. Do not add sanitization or filtering under this change.

Alternative rejected: install `tools/preferences.mjs` verbatim or just expose `syncPreferences`; the former imports source, the latter omits two snapshot classes.

### 4. Small fixed shell-only mode, compatible ownership and recovery

Add `npm run deploy:shell` as build plus `node tools/deploy.mjs deploy-shell`; it accepts an explicit home, with normal home defaults. It skips the App/API check intentionally: the payload consists only of shell reporters. Installation still runs from a standalone checkout with Node 20+, but nothing in an installed shell needs that checkout afterward. Copying/installing remotely is a later explicit operator action, not an SSH feature of deploy.

Use the existing `deploy` implementation with a fixed four-file shell selection. Unlike general `--source`, this mode permits a fresh ownership record. It shares the lock, digest preflight, writes and backup journal; it neither prunes unselected files nor parses/projects/writes layout preferences, creates Custom mods/themes/layouts, or invokes native patch refresh. Preference bytes are captured read-only for the existing journal's unchanged-preferences guard. Keep previous non-shell ownership and metadata exactly; a fresh shell record has no layout base. Full deploy can later add one normally and sees the same shell hashes. This is bounded enough to include now, not defer as a larger distribution system.

Add `npm run rollback:shell -- <backup-id> [home]`, mapped to explicit shell-only mode in `tools/rollback.mjs`. Shell-only deploy marks its existing-format journal with a shell scope. Recovery must validate that every recorded payload path is one of the four shell paths, preferences are unchanged, and before/after ownership metadata differs only in shell hashes (allow the initial null-to-shell-only record). It must also retain existing current-manifest hash, newer-deploy and later-file-edit refusal checks. Only that validated path skips Desktop status and native patch workers. Reject ordinary/mixed journals; do not make a caller's flag a general status-check bypass. Restore old script bytes before publishing the old revision.

Ordinary `npm run rollback -- <backup-id> [home]` still always needs a valid reported backup ID and a verified non-Custom layout (switch to Herdr/main first); “when practical” is incorrect. No generic Core-only remove mode or new ownership file is added.

Alternative rejected: general deployment profiles or a second manifest. Both add unnecessary configuration and reconciliation. Reusing `--source` unmodified fails fresh hosts and still assumes layout state.

### 5. Current instructions and fixtures only

Update README's ownership/preferences/install/shell/closing caveat text; `docs/ARCHITECTURE.md`'s source exception and Required workflow; `docs/ARCHITECTURE-AUDIT.md`'s unresolved-risk status; `docs/COMMANDS.md`'s exporter/modes/rollback wording; current path guidance in `docs/GIT-CORE-MONITOR.md`, `docs/TAB-MOVE-COMPATIBILITY.md`, `docs/TAB-MOVE-ADR.md` and `docs/VALIDATION.md`; `src/plugins/git/setup-guide.txt`; `tools/report-ownership.mjs`. Use standalone-checkout/repository-relative paths or public documentation links. Keep recorded historical validation results and migration/archive/history examples intact, with current guidance distinguished from them.

Move `tests/regression/directory-loader.test.mjs` fixtures to installed shell directories and sibling revisions. Keep fake Core, non-TTY guards and no real profile reads; include alternate home, spaces, changed working directory, reload, retry, status and hook idempotence. Change the two opt-in native screenshot scripts to checkout `.artifacts/` output (resolved from their own file location and created explicitly), never Herdr-home `customizations/.work`. Do not execute those native scripts in this task.

Add deployment/export/Core-only fixtures to existing runners. Retain protective negative source-path assertions. Update testing documentation where its fixture/path claims change, without turning this into a general suite portability project.

## Validation strategy

All operational tests explicitly set a disposable `HERDR_APP_HOME` and an unavailable/fake native executable, with scratch under this checkout's ignored `.artifacts/`. No real home deploy/enable/disable/remove/rollback/import, real profile reads, credentials, live SSH or native UI actions.

- Build: deterministic shell revision; exact allowlisted payload paths; no test/source bridge in installed import graph; altered build bytes and linked/unsafe paths refused.
- Shell: source installed loader with a fake Core, historical folder/marker absent; alternate/space-bearing homes and `cd`; changed revision, unchanged revision, missing files, failed labels, string/array hooks, status and non-TTY/identity gates. Keep existing PowerShell reporter safety fixtures.
- Deployment: fresh/no-op/update/conflict/rollback fixtures including revision-last ordering; modified shell conflict before unrelated writes; source-scoped shell group coherence; ownership doctor sees all shell assets.
- Export: byte parity with source full export using a representative installed fixture; then remove/rename disposable source and export again; all four snapshots, explicit-home precedence, omitted unavailable visuals, no-op, palette/credential/layout refusals, unsupported-action no-writes and unchanged live/runtime bytes.
- Core-only: no native executable, no layout or preferences; install/update/rollback; full-then-shell and shell-then-full; exact non-shell preservation; mixed/tampered journals and newer records refused.
- Docs: targeted scan of current operational paths, preserving explicit historical/migration/negative-test occurrences. Screenshot scripts are inspected, not run.

Run quick targeted checks per delivered outcome; leave broad integration to CI. Passing mocks does not claim real profile, UI or remote-machine validation.

## Risks / Trade-offs

- Existing shells keep the old dispatcher's absolute path until re-sourced → document a one-time idle-prompt relocation; never reload busy shells or all profiles.
- Individual file replacement is not a multi-file filesystem transaction → preflight all files, use existing atomic writes, publish revision last, and retain journals; no deploy redesign.
- Installed layout bases may differ from the current source branch → installed ownership is authoritative for installed export; parity tests compare matching baselines, and source export prefers the installed base.
- Core-only rollback bypass could weaken recovery → explicit shell scope plus strict path/manifest/preferences validation before skipping any Desktop check; ordinary recovery stays unchanged.
- Optional Claude initializer is separately managed private integration → preserve its existing behavior, but do not promise an external companion change triggers a deploy-owned content revision.
- Private snapshots can contain personal identifiers despite filtering → retain private-backup warnings; nothing is exported to this public source.

## Migration Plan

1. Land only this plan in a draft PR and wait for approval. No implementation or live installation yet.
2. After approval, implement the four outcomes and disposable tests. Hand off without marking ready or merging, as required by this task.
3. Separately authorized rollout must install the full runtime on the desktop host and the shell-only package on every Core-only recipient before dotfiles switch to the exact paths above.
4. A separate dotfiles change updates profile/export-hook/verifier wiring; existing Bash shells re-source only the installed loader at an idle prompt or start a new shell. No automatic import or process restart.
5. Only after every recipient is prepared may the separate cleanup remove historical source and retire its yadm marker. Existing private snapshots and all `.customizations/` data remain outside that cleanup.
6. Full recovery uses a reported backup ID with stock layout selected; validated shell-only journal recovery is available without Desktop. Both refuse later edits or newer ownership records.
