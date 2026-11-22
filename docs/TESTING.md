# Testing the repository split

The split retained imported suites, apart from neutral status-reveal labels
and the architecture assertion's moved-guidance path. Preference-home regression
coverage was subsequently added as described below. The directory-loader fixture
now exercises installed sibling paths and selects Git Bash or /bin/bash; other
imported suites retain their existing platform/private-environment assumptions. `npm test` retains the original command and is **not** the hosted CI
selection: it includes installed Core/private-profile assumptions and Windows
recycle operations. Do not run the broad command on a working installation just
to reproduce hosted CI.

## Supported hosted subset

The existing Windows/Ubuntu matrix invokes `npm run test:ci` on **Node 24**.
Only the hosted test-runtime selection changed: the repository's declared Node
20+ build minimum and imported test/tool code remain unchanged. Node 24 avoids
observed Node 20 experimental-VM crashes and meets the unchanged Cloudflare
fixture's Node 22.12+ prerequisite.
`scripts/test-ci.mjs` only builds this checkout, selects existing test entrypoints,
passes their original VM flags, and propagates failures. It prints every included
and excluded source path before execution. CI children use a disposable Herdr home,
unavailable native app executable and temporary fixture directories under ignored
`.artifacts/`. No Herdr install, private snapshot or external A1 checkout is supplied.
On Windows the CI child environment drops inherited PowerShell 7 module paths so
original helpers invoking Windows PowerShell 5 can load its own default modules.
Temporary fixtures have a CommonJS package boundary, matching the default OS temp
directory, so original .js subprocess helpers do not inherit this checkout's ESM
package type. This is CI environment setup, not a test/helper rewrite.
The command refuses full execution outside `CI=true` because original OS-specific
tests may recycle fixture files. It is not a local test-isolation framework.

Safe read-only discovery from this checkout:

```sh
npm run test:ci -- --list --windows
npm run test:ci -- --list --linux
```

A clean `npm run build` writes only dist/. No preference snapshot is needed:
shipped defaults come from `src/appearance/`, not personal host/layout/palette/theme
backups under `<Herdr home>/preferences/`. The scaffold build fixture omits all
snapshots and compares emitted defaults with their authored sources.
`tests/preferences-home.test.mjs` exercises the actual source/runtime preference
CLI files in a disposable checkout/home. A test-only Node preload isolates the
reported user home/hostname and replaces desktop process checks; no real desktop
or user configuration is accessed. It covers environment/default/explicit home
selection, round trips, conflicts, open-desktop refusal and untouched legacy files.
These fixtures are discovered by the existing hosted and local unit runners.
`tests/shell-deployment.test.mjs`, `tests/shell-only.test.mjs` and
`tests/installed-export.test.mjs` cover owned shell payload/revision ordering,
Core-only installation/recovery and full export parity without a source checkout.
They explicitly use disposable homes and fake/unavailable Desktop executables;
no real profiles, credentials or native sessions are used. The packaged
`tests/regression/directory-loader.test.mjs` uses fake Core and installed paths,
on both Windows Git Bash and Linux Bash. Only its fixture's TTY check is relaxed;
production non-TTY/identity guards are separately checked.
`tests/runtime-contract.test.mjs` statically checks exact profile documentation,
CI discovery and the two native screenshot scripts' checkout `.artifacts/` paths;
it never runs those scripts. Existing old dispatchers and live/remote profile
wiring still need separately authorized rollout checks.
`tests/deploy-all*.test.mjs` cover the all-machine command with local bare Git
origins, temporary source/default homes and a mocked hc/remote transport. The pipeline
fixture runs actual npm scripts and the existing full/shell installers only against
its disposable home, with a fake host check and synthetic bundle; no real machine,
Core, native app or account is contacted. Cases include source refusal, peer skips,
independent failures, selection, dry-run byte preservation, backup IDs and exit codes.
CI otherwise executes library fixtures, not real-home
deploy/enable/disable/remove/rollback/preference-import operational commands.
The real gh CLI fixture uses synthetic auth and a GET-only localhost server.
Provider/relay/Cloudflare unit transports are mocks, not live requests.

## Exclusions (whole suites, not rewritten assertions)

| Entry | Runner | Reason |
|---|---|---|
| `tests/regression/directory.test.mjs` | Both | Executes installed hc schema and reads the user's real .bashrc; requires native/private environment. |
| `tests/file-delete.test.mjs` | Windows | Original Git-sh Darwin-backend mock returned exit 7 instead of 0 at line 77 in run 44947261103, before the real recycle-bin branch. Whole suite left unchanged; its Linux lane remains. |
| `tests/a1-api-candidate.test.mjs` | Both | Requires a separately built external A1 checkout and tsx. Normal A1 client/color tests remain included. |
| `tests/regression/test.mjs` / test:integration | Both | Installed Herdr binary, stock baseline/layout and real host files. Mock UI cases remain inside this original integration file, not extracted. Its historical theme-selection assertion is not claimed fixed or rerun. |
| tools/validate-native.mjs / test:native | Both | Native Herdr checks, even though its app home is disposable. |
| 20 scripts under tests/features/ outside new-menu | Both | Native rendering/checks, preview UI or actual click/screenshot handling. The two new-menu unit tests remain included. |
| Live smoke/inspection/Core/relay/provider/deploy/preference tools | Both | Operational effects, real services, sessions, credentials or native installation; not invoked. |

Any additional unsupported unmodified suite discovered on hosted runners is listed
here with its concrete failure, not rewritten or silently skipped. Passing hosted
checks establishes only this documented subset, not GPUI interactions, private
shell wiring, live SSH/core permissions, provider refreshes or relay hardening.

## Capability coverage

- Lifecycle: checkout build; full/scoped/shell-only deployment and guarded rollback; installed shell reload/export and preference-home fixtures; ownership-report; preferences/frame-registry/frame-palette; host-facade and tab-move compatibility. Architecture verifies single-source packaging and the native boundary.
- Workspace: close-space, rename-selection, panel-state/pin, profile-workflow/Firstmate-role, new-menu, tab-move and tab-move-ui fixtures. Real native interactions remain excluded.
- Plugins: plugin lifecycle/UI, file viewer/recycle policy, Git/PR/CI policy and webhook mocks, Usage/Claude/account fixtures, A1 adapters and Crew fixtures. External service correctness is not inferred from mocks.

The scaffold package contract and scripts/ci-required.test.mjs also run in each lane.
`CI required` retains its exact name and fails on a failed/cancelled/missing required
dependency. Drafts skip app suites; the finalized ready head is the integration gate.

## Observed hosted failures

Run 44946866722 on finalized head 6f87f962 failed on both lanes: Ubuntu's original
previews suite crashed with SIGSEGV after seven passing subtests; Windows' original
Claude-refresh suite failed its real credential-file ACL-save branch with
ClaudeRefreshError(storage), whose helper suppresses the native stderr. The
required aggregator correctly failed with the matrix. Ubuntu initially excluded
that whole crashing suite; it is restored unchanged with the Node 24 runtime. Windows first retries with its native PowerShell module environment
rather than rewriting the test/helper; the precise original native error is not
claimed established from the suppressed diagnostic. It passed unchanged in run
44947261103 after the CI module-path correction.

Run 44947261103 exercised all selected entries instead of stopping at the first
failure. Ubuntu failed usage-accounts and Cloudflare prerequisites; Windows failed
those plus file-delete and file-tab-reuse. The usage helper failure was a CI wiring
defect: temporary .js CommonJS helpers inherited the checkout's ESM package type.
A temporary CommonJS package boundary restores normal OS-temp semantics without
changing the helper or test. It passed on both runners in run 44947787876. That run
passed all 119 selected Ubuntu entries, but Windows hit a further Node 20 access
violation in a different original VM suite, usage-plugin. Rather than successively
exclude otherwise portable VM tests, the hosted runtime moves to Node 24. The
previews, file-tab-reuse and Cloudflare prerequisite suites are re-enabled unchanged;
only the demonstrated Windows Git-sh fixture remains an observed suite exclusion.

## Exact selected source entries

The list below is generated from CI selection, not inferred from naming. On Node
24 the current selection is **131 Ubuntu / 130 Windows entries**, with two/three
explicit exclusions respectively. The installed directory-loader fixture now runs
on both; the preference-home and four runtime-contract suites are included. It includes scaffold/aggregator tests. Earlier Node 20 attempts selected
122/121 and then 119/119 entries while diagnosing the crashes; those temporary
Node-20-only exclusions no longer apply.

### Both runners

```text
tests/regression/claude-refresh.test.mjs
tests/regression/core-control.test.mjs
tests/regression/dialog-scroll.test.mjs
tests/regression/directory-loader.test.mjs
tests/regression/feedback-draft.test.mjs
tests/regression/feedback.test.mjs
tests/regression/file-icons.test.mjs
tests/regression/files-location.test.mjs
tests/regression/frame-palette.test.mjs
tests/regression/frame-registry.test.mjs
tests/regression/machine-add.test.mjs
tests/regression/modal-layout.test.mjs
tests/regression/palette-ui.test.mjs
tests/regression/palette.test.mjs
tests/regression/pane-folder.test.mjs
tests/regression/permission-launcher.test.mjs
tests/regression/permissions.test.mjs
tests/regression/picker-labels.test.mjs
tests/regression/preferences.test.mjs
tests/regression/preview-font.test.mjs
tests/regression/previews.test.mjs
tests/regression/profile-cache.test.mjs
tests/regression/profile-launch.test.mjs
tests/regression/profiles.test.mjs
tests/regression/pulls.test.mjs
tests/regression/readline-paste.test.mjs
tests/regression/rename-keys.test.mjs
tests/regression/shells.test.mjs
tests/regression/sidebar-scroll.test.mjs
tests/regression/sidebar-usage.test.mjs
tests/regression/space-colors.test.mjs
tests/regression/space-rename.test.mjs
tests/regression/spaces-branch.test.mjs
tests/regression/startup-frames.test.mjs
tests/regression/terminal-drag.test.mjs
tests/regression/terminal-input.test.mjs
tests/regression/terminal-spacing.test.mjs
tests/regression/terminals.test.mjs
tests/regression/usage-accounts.test.mjs
tests/regression/usage-summary.test.mjs
tests/regression/usage.test.mjs
tests/regression/workspace-labels.test.mjs
tests/regression/workspace-status.test.mjs
tests/features/new-menu/shell-switch.test.mjs
tests/features/new-menu/panel-switch.test.mjs
tests/a1-client.test.mjs
tests/a1-startup-color.test.mjs
tests/accessibility-roles.test.mjs
tests/agent-context.test.mjs
tests/agent-rename.test.mjs
tests/agents-grouping.test.mjs
tests/architecture.test.mjs
tests/ci-message.test.mjs
tests/claude-isolation.test.mjs
tests/claude-session-account.test.mjs
tests/close-space.test.mjs
tests/cloudflare-prerequisites.test.mjs
tests/copy-toast.test.mjs
tests/crew-projects-ui.test.mjs
tests/deploy-all-options.test.mjs
tests/deploy-all-pipeline.test.mjs
tests/deploy-all-remote.test.mjs
tests/deploy-all.test.mjs
tests/deployment.test.mjs
tests/empty-state.test.mjs
tests/file-refresh.test.mjs
tests/file-tab-reuse.test.mjs
tests/files-plugin-tabs.test.mjs
tests/files-refresh-policy.test.mjs
tests/firstmate-profile-role.test.mjs
tests/folder-browser-multi.test.mjs
tests/folder-content.test.mjs
tests/git-ci-fix.test.mjs
tests/git-context-menu.test.mjs
tests/git-core-monitor.test.mjs
tests/git-github-accounts.test.mjs
tests/git-location.test.mjs
tests/git-monitor-settings.test.mjs
tests/git-notices.test.mjs
tests/git-repository-checkboxes.test.mjs
tests/git-repository-cli.test.mjs
tests/git-webhooks.test.mjs
tests/host-facade.test.mjs
tests/installed-export.test.mjs
tests/native-selection.test.mjs
tests/ownership-report.test.mjs
tests/pane-crew-role.test.mjs
tests/panel-kit.test.mjs
tests/panel-pin-ui.test.mjs
tests/panel-state.test.mjs
tests/pin-swap.test.mjs
tests/pinned-pr-refresh.test.mjs
tests/plugin-prerequisite-ui.test.mjs
tests/plugin-ui-contract.test.mjs
tests/plugins.test.mjs
tests/pr-agent-links.test.mjs
tests/preferences-home.test.mjs
tests/profile-workflow.test.mjs
tests/pulls-pagination.test.mjs
tests/refresh-feedback.test.mjs
tests/rename-selection.test.mjs
tests/reorder.test.mjs
tests/runtime-contract.test.mjs
tests/scaffold.test.mjs
tests/scoped-deployment.test.mjs
tests/settings-back-button.test.mjs
tests/settings-catalog.test.mjs
tests/settings-refresh.test.mjs
tests/shell-deployment.test.mjs
tests/shell-only.test.mjs
tests/sidebar-footer.test.mjs
tests/sidebar-plugins.test.mjs
tests/sidebar-refresh.test.mjs
tests/space-start.test.mjs
tests/spaces-settings.test.mjs
tests/spaces-startup.test.mjs
tests/spaces-worktree-layout.test.mjs
tests/status-reveal.test.mjs
tests/tab-arrival.test.mjs
tests/tab-move-compatibility.test.mjs
tests/tab-move-ui.test.mjs
tests/tab-move.test.mjs
tests/temporary-mod.test.mjs
tests/terminal-labels.test.mjs
tests/usage-plugin.test.mjs
src/plugins/a1-colors/session-name.test.mjs
src/plugins/a1-colors/session-sync.test.mjs
src/plugins/a1-colors/settings.test.mjs
src/plugins/crew/plugin.test.mjs
scripts/ci-required.test.mjs
```

### Ubuntu only

```text
tests/file-delete.test.mjs
```
