# Proposal

## Why

Custom currently needs a terminal in a source checkout to update, unlike Herdr and herdr-core. The maintainer needs the familiar Settings notification dot and explicit Update button for this desktop and the existing Core-only shell installation on pc2, without involving development clones or their worktrees.

## What Changes

- Extend **Custom Settings → Updates**, below the untouched native Herdr/Core controls, with **Custom (herdr-app)** for this computer and **Shell integration** sub-rows for configured remote machines with existing shell installations.
- Show installed source revision, last successful check, available main revision, a short commit-subject summary, Check now and Update; combine Custom availability with the existing dots in Custom Settings/sidebar chrome.
- Record build-source provenance separately for desktop and shell deployments; represent legacy, dirty and mixed installations honestly instead of equating checkout HEAD with installed output.
- Use only a feature-owned clone at `~/.local/share/herdr-app` on the target machine, never `D:/Git/herdr-app`, crew worktrees or an arbitrary selected source folder. Update only explicitly approved, published main commits through existing guarded deploy commands.
- Execute a bounded, durable worker outside the mod being redeployed; retain per-machine results, logs and backup IDs through mod reloads, disconnects and partial failures. Preserve the stock-layout requirement for full rollback.
- Check while Custom is active, at most hourly automatically; checking never deploys. Remote updates use existing machine transport and shell-only deploy, not remote Desktop or a terminal.
- First version includes this desktop and existing pc2-style shell installations. New-machine shell installation/profile wiring and an in-app rollback wizard are deferred.

## Capabilities

### New Capabilities

None; this extends customization distribution and lifecycle.

### Modified Capabilities

- `customization-lifecycle`: installed revision provenance, Settings-driven manual updates and availability indication, isolated published source selection, and remote shell update/recovery boundaries.

## Impact

- `src/features/settings/` (Updates composition), `src/features/workspace-chrome/` (expanded/compact indicator and check lifecycle), a small shared update-state helper, and a new `src/services/updates/` worker.
- `tools/build.mjs`, `tools/deploy.mjs`, `tools/rollback.mjs` and their fixture tests: optional component provenance, metadata-only journaling, structured phase/backup reporting and shell-journal validation.
- `customization.json` packages the helpers/worker; the existing `updates` section catalog ID remains unchanged. No new optional plugin, dependency installation, native frame patch, binary/Core change or update channel.
- Public GitHub HTTPS reads for main/check summaries; explicit Update fetches the public repository and executes its build/deploy scripts with the target user's permissions. No credentials or runtime data are uploaded.
- See [design.md](design.md) for the page mock-up, source safety, pipeline, bootstrap limitations, remote states, failure handling and test plan. This PR is a plan only; implementation awaits approval.
