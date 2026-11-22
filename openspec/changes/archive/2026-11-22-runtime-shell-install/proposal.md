# Proposal

## Why

Private shell profiles and preference-export hooks still depend on a fixed source checkout even though Custom supports standalone checkouts. Installing the missing runtime contracts is a prerequisite to removing that source from private dotfiles without losing directory reporting or preference backups.

## What Changes

- Full deploy owns `.customizations/runtime/shell/{bash-cwd-loader.sh,bash-cwd.sh,powershell-cwd.ps1,revision}` inside the selected Herdr home. Bash resolves its payload and content revision beside the sourced loader, not in a checkout or yadm state.
- Full deploy owns an export-only `.customizations/runtime/scripts/export-preferences.mjs` entrypoint and its local dependencies. It accepts `export <home>` and exports the same host/layout/palette/theme snapshot classes and existing filtering as the source command.
- Add an explicit `deploy:shell` command using the existing guarded deployment machinery for Core-only hosts; it installs only the four shell files and preserves other owned assets. Add narrowly validated shell-only journal rollback without a desktop dependency; ordinary rollback keeps its backup-ID and stock-layout gates.
- Replace obsolete current source-location instructions/help and installed-path fixtures, including screenshot output defaults. Retain history, migration provenance and protective negative assertions.
- Profile wiring remains external and explicit. Existing Bash dispatchers need one idle-prompt re-source after relocation; compatible payload updates then reload at prompts. Nothing installs into real homes or edits profiles as part of this task.

## Capabilities

### New Capabilities

None; these contracts extend the existing customization lifecycle.

### Modified Capabilities

- `customization-lifecycle`: owned installed shell reporting, checkout-independent preference export and explicit shell-only installation/recovery compatible with full deployments.

## Impact

`customization.json`, `tools/build.mjs`, `tools/deploy.mjs`, `tools/rollback.mjs`, preference-export orchestration and shared layout helpers, `package.json`, canonical shell code, deployment/preference/shell fixtures, current docs, Git setup help and ownership-report text. No new dependencies, configuration layers, native patches, remote deployment automation, import-on-pull, preference filters, session changes or dotfiles edits. Implementation and all mutating validation target disposable homes only; this PR stops at the plan until approval.
