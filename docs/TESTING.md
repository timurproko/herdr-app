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
`tests/deploy-all-result.test.mjs` additionally covers incremental result sidecars
and revision evidence. `tests/update-{runner,detach,check,row}.test.mjs` cover
managed-source refusal, clone-on-Update, deadlines, reload/late-result recovery,
main-only checks/coalescing, one-button states, dots, packaging and preference
exclusion. The runner fixture also upgrades a pre-feature clean clone through a local bare
origin and a fresh protocol-capable CLI, and simulates the installer's eight-minute
Windows timeout to verify unknown status/lock retention after Check. The pipeline
fixture runs ordinary npm deploy:all with a skipped peer and verifies that the row
links its matching result, not a missing/stale Settings log. It also runs the real
CLI with mocked definite installer failure and eight-minute timeout, then checks
failure/recovery details and launch blocking after a successful main check.
`tests/update-row.test.mjs` also covers the shared native/Custom 300 ms/3000 ms
confirmation path, success/expiry and unchanged busy/error/unknown states. Its
known/missing-revision matrix exercises the real model and row renderer across
idle, checking, available, launching/running, failed, partial and unknown-outcome
states. Unknown revisions show only `herdr-app-custom` with no trailing space;
known revisions retain their seven-character suffix. Missing evidence cannot claim
current even with a cached no-update result. The check fixture separately confirms
that changed ownership evidence still offers Update after a successful main read.
Focused Settings copy assertions distinguish native hourly checks from Custom's
normal mounted 2–3 minute cadence and conditional configured-relay merge hints,
while preserving corner indicators and herdr-core terminal-continuity guidance. Fresh
module graphs and owners simulate replacement before the launch receipt, during
running work and just after completion. Shared provisional launch feedback stays
Updating until durable status acknowledges it, or becomes unknown after the
22-second transport bound; obsolete replies cannot overwrite newer receipts.
The real Settings controller harness covers the same section-and-row flow together,
including final success, partial, failure and unknown outcomes. No fixture launches
a real update or demonstrates native process survival.
`tests/update-markers.test.mjs` uses separate Settings/header/footer/menu VM
contexts, the real controller/helper and a changed-shared-value refresh queue:
manual checks reach already-mounted roots, and all native/Custom combinations
produce the same marker markup. The Settings harness also runs real initialization
and navigation, replacing the complete module graph with original overlay props
and retained shared state to check update-only restoration and lifecycle teardown.
The actual Settings opener supplies fresh per-opening identities: native/backdrop
retirement without dismiss, a new VM with the same native `o1` ID, default/explicit
destinations, missing identities, ignored legacy navigation records and active or
recently finished jobs are covered together. Only the initiating opening can
resume Updates, and completed-job hints expire after two minutes. Deliberate
navigation and explicit dismissal disarm the hint. The update-check fixture
confirms opening identities/hints are not exported as portable preferences.
These are VM fixtures, not live GPUI reload evidence. The original-source comparison exposes the missing
More-popup Settings marker, but **does not reproduce** the reported real-app
expanded-footer missing dot. It proves neither GPUI pixel visibility nor native
runtime scheduling. `tests/update-marker-inspection.test.mjs` exercises the
read-only capture with fixture homes and a mocked status/shot CLI, proving no
live-home writes or invented last-render facts. See the read-only capture in
COMMANDS.md for the next real occurrence; no native app is launched by these tests.
The check suite enumerates every Settings-job/plain-CLI by success/partial/failed/
unknown combination using the real result writer, worker, check, projection and
row functions; all eight cells assert truthful text and source-matching details.
Unknown CLI receipts block even before peers finish and when no Settings lock
exists; stale completed Settings jobs cannot hide the latest CLI outcome. The detach fixture
runs actual detached Node supervision with synthetic Git and deploy CLI; it does
not prove survival under the real Herdr/Core process lifecycle. All use checkout `.artifacts/` homes; exec, peer transport and deployment
are mocked/synthetic. Real-app steps are in COMMANDS.md; no live home, machine,
terminal, account or native UI is used by these suites.
CI otherwise executes library fixtures, not real-home
deploy/enable/disable/remove/rollback/preference-import operational commands.
The real gh CLI fixture uses synthetic auth and a GET-only localhost server.
Provider/relay/Cloudflare unit transports are mocks, not live requests.

## Forward-compatible deployment gate

`tests/host-gate.test.mjs` checks the real host-audit function with synthetic SDK,
command and version facts: newer capable hosts pass without a reviewed profile;
old/malformed versions, missing capabilities and direct imports fail. Every
source-audit outcome remains advisory. `tests/frame-upgrade.test.mjs` covers both
optional patches against synthetic native originals/binaries, preserving complete
file/record bytes on skips and retaining conflict/corrupt/concurrent-write failures.
The existing deployment/startup fixtures also assert nonfatal unsupported patches
and doctor severity; reviewed repair and no-op timestamp checks remain intact.

`tests/deploy-failure.test.mjs` carries host/build/install/patch causes through the
actual all-machine worker, durable result writer, Update inspection and Settings
row. `tests/deploy-gate-pipeline.test.mjs` executes the real source host check,
customization build/install, npm deploy scripts, managed-clone Update bootstrap,
deploy:all and an eligible peer's shell-only path using local bare origins and
disposable homes. Only App/Core/network facts are synthetic; no native executable,
remote peer, real deployment or account is used. It proves 0.1.17's capability and
optional-patch policies compose, not native pixel/interaction compatibility.

Integration baseline selection is explicit: missing release-specific stock review
prints **stock baseline unreviewed**, never adopts live bytes or falls back to an
older release. Independent topology/UI fixture assertions continue. Reviewed
stock mismatches and malformed baseline records still fail. The new
`tests/stock-baseline.test.mjs` executes the actual stock-check block against both
reviewed/mismatching and missing-0.1.17 fixtures. Existing reviewed hashes remain
unchanged; a passing public capability gate is not a stock/native source review.

## Git PR label facts

Pull facts, pagination, fleet and webhook fixtures cover assigned label names/colours
in both GraphQL connection and targeted gh array results, including exact emoji names,
empty/null labels and malformed-colour fallback. Labeled/unlabeled events refresh
loaded Open/Closed pages and older active or coordinator PRs using the existing reads;
bursts coalesce and stale contexts cannot repopulate labels. These use synthetic
GitHub data, not real label mutations, credentials or relay deployments.

`tests/git-row-labels.test.mjs` loads the real shared row and facts with synthetic
host/elements. It covers ordinary/coordinator Open/Closed/merged and ghost rows,
Owner removal, tasks/checks/labels ordering with missing groups, exact emoji names,
light/dark/fallback colours, bounded strip/pill sizes, truncation and full-name
individual/strip/metadata tooltips. The same fixture checks 3px muted round separators,
optically lowered 1.5 logical pixels from the parent line-box centre with equal 6px gaps,
in bylines and every status/review/label boundary. Zoom cases from 75% to 200% retain
the same logical offset; comparison with the old separator tree protects neighbouring
text, icons, pills and row geometry. Missing-group combinations have no leading/trailing
or orphan dots.
Pagination/fleet fixtures also assert labels
in actual pinned/scrolling and coordinator render paths; existing menu and pin-swap
fixtures protect captured URLs, callbacks and measured motion. These prove render-tree
constraints, not GPUI pixel layout, tooltip hit-testing or native animation appearance.
No deployment or live label mutation is performed.

## Connected fleet fixtures

`tests/fleet-preferences.test.mjs` covers the actual Spaces preference and Settings
switch, explicit durable-identity clearing on disable, old/new snapshot round trips
and durable/runtime-identity exclusion in disposable
checkout artifacts. `src/plugins/crew/fleet.test.mjs` loads packaged plugin sources
with fake status/Core snapshots: exact owner/task joins, moved/conflicting/remote
identities, TTL/coalescing, order-independent binding, expiry and disable generations.
`src/plugins/crew/fleet-refresh.test.mjs` drives the real provider/registry with
fake clocks and deferred status reads. Every sampled Spaces projection and Crew
tag frame remains attached through Git/Spaces refresh, focus/unrelated topology
changes and the old expiry boundary. Adding/removing/renaming/reordering/selecting
unrelated spaces/tabs/panes on either machine does not even invalidate the pair's
fingerprint. Errors/malformed responses/timeouts preserve successful verification
age and the identity-lifetime display through long outages; retries back off while
actions expire independently. Fresh module graphs exercise first-frame cold/hot/
layout restoration, no render writes/IO, completed crash leases, corruption, remote
layout loading/pruning and explicit disablement. Persisted raw timestamps/tokens
never authorize a new runtime, and negative/expired/obsolete completions cannot
resurrect old bindings. Spaces drop fixtures refuse standalone
moves on retained unverified pairs; the real Git aggregate/relay refresh fixture
also samples actual sidebar projection across its in-flight status read.
`tests/fleet-reorder.test.mjs` exercises pure display blocks and queued public move
acknowledgements, either grabbed member, pair edges, timeout and no replay. Shared
reorder and Spaces render fixtures cover both-source dimming, stacked preview and
expanded/compact vector elbows and paired previews while preserving ordinary
worktree order. Geometry assertions put the thin 1px muted stem under the parent
badge centre, the bend on the child name's centre line, and only the name at its
8px child inset; rail selection and ordinary numbering stay unchanged. Packaged Crew
fixtures retain the coordinator's Crew tag, omit only the verified attached fleet's
tag, restore ordinary worker tags on confirmed detach/attachment-off, and hide all Crew
tags when the plugin is disabled; tag reads start no discovery or state writes.
Worktree layout fixtures compare actual local/remote machine-chevron and trailing
branch-slot right axes for ordinary/attached rows, Crew and multiple plugin pills,
long names, tag-only edges, hidden icons and rename mode.

`tests/fleet-git.test.mjs` loads the actual Git controller, aggregate source and Crew
provider through the package harness. Synthetic tasks/gh results cover coordinator
non-repo routing, recorded working/reported links, missing/new links, duplicate
cross-repository PR numbers, shared PR deduplication, scoped counts/errors, exact
worker robots, absent extra task heading/incomplete notice, repository enrollment
links, webhook burst coalescing, no periodic GitHub reads, hide/show catch-up and
stale completions. It loads the real shared UI header and covers machine-style
chevron geometry, default expansion, independent repository folds, localStorage
restore after panel recreation, temporary repository absence, tab/refresh changes,
zero and live counts while folded, hidden/restored scoped body notices, stale toggle
guards, no fold-triggered reads and no false empty state when all sections fold.
The merged fixture retains the real shared-relay deferred-delivery/render guards,
PR label add/remove assertions and new shared row. Repository counts reuse the 3px
centred separator. Long outages retain rows/counts/folds with Stale and no robot,
read or live-consumer authority; cold controllers render Verifying/waiting without
persisted PR inventory or folder fallback. Fresh verification restores controls.
Immediate-spawn guards reject synchronous notify, shared writes and new IO.
No fixture uses real Core, credentials, GitHub, terminals, native input or deployment.
`tests/fleet-history.test.mjs` drives the actual --all reader, Crew join, Git
controller/aggregate and UI with fake GitHub facts. It covers same-home finished
Open/Draft rows without robots, live/history duplicate precedence and one read per
PR, Core-first worker exit before the closed record (even with another live
worker preserving adoption), last-worker-exit scope continuity,
recent/old/undated/invalid/future and exact
24-hour Closed boundaries, unchanged live-task eligibility, accurate counts,
excluded empty history headers, webhook reopen/close, three-read concurrency and
stale robot refusal. Finished-task rows use the merged shared row's labels, absent
Owner badge and centred metadata separators rather than a separate historical renderer. The provider also checks source size/task bounds and rejects
another owner/home or machine. No fixture reads real task reports or GitHub.
Recorded links deliberately do not guarantee pre-report PR discovery. Native pixels,
actual drag motion and real remote execution remain unverified without separate
authorization; fixture success is not deployment evidence.

## Tab-move compatibility and menu regressions

`node tests/tab-move.test.mjs` builds only customization output and uses a synthetic
Core. It covers reviewed and unknown newer App/Core releases, local routing and
remote targets, minimum-version/generation/method/identity refusals, opaque
payload preservation, CAS conflicts, failed document persistence and uncertain
replies. Label-unavailable cases both before and after in-memory application must
remain partial success with explicit repair and no layout rollback.

`node --experimental-vm-modules tests/tab-move-ui.test.mjs` connects real menu,
bridge and worker preflight through synthetic RPC. Newer unreviewed App/Core
versions expose destinations and hand off captured requests; missing methods or
App preparation commands yield complete inert refusals before layout reads.
Command availability is rechecked when the mounted owner consumes the request. Render assertions cover the leading 14px muted
SVG chevron in Back's 16px slot, absent trailing glyph, retained badges and ordinary
rows, wrapping explanation text, initial height reservation, measured multiline
height/resize, 320px scrolling bound, stale measurement callbacks and Back/Left/Escape.
These are render-tree and simulated native-layout callback checks, not proof of
GPUI pixels or actual scroll gestures. No installed mod, live layout, label,
terminal or process is changed. The pinned Core review and outstanding disposable
native continuity/concurrency checks are in `TAB-MOVE-CORE-0.1.22-REVIEW.md`.

## Terminal copy-on-select controller

`node --experimental-vm-modules tests/copy-toast.test.mjs` loads the actual observer
and real selection model with synthetic host snapshots, a fake clipboard and
one-shot timers. It covers initially null/undefined/empty window facts followed by
Windows publication, simulated mouse selection and release-time clipboard updates,
custom centered terminal-font popup rendering, same-text selection inference,
eligibility changes, clearing/focus switches/close, stale callbacks, Unicode counts
and bounded failed reads. The recorded popup tree checks the original bottom-center
anchor, zero-size layout block, terminal-font fallback, white text, theme colors,
geometry and wording. Deterministic timers check the 16ms arming delay, 180ms
fade/6px slide, 2000ms hold, repeated-copy renewal, source-tab suppression and
animation cleanup, including already-queued callbacks after disable or close.
Standard notifications, clipboard writes and process launches fail the fixture.
It never accesses real clipboard contents, sends terminal input or starts processes.
This is controller/render-tree coverage, not proof of a real mouse release or native
popup pixels; explicit/repeated shortcut detection remains outside the best-effort scope.

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

`tests/git-relay-lifecycle.test.mjs` (also included by git-webhooks) uses fake
native sockets for main-only notice filtering, one leased chrome owner, bounded
public revisions, hidden/other-repository subscribers, reconnect, missing/invalid
keys, disabled Git and close during queued startup or credential/connect promises.
`tests/update-hint-check.test.mjs` combines the real check worker and UI controller
with a disposable home and fake Git/time: deferred rate/lease hints, authoritative
availability, burst backoff, manual bypass and Git-independent polling. A running
deployment spanning the check deadline keeps worker retries at a bounded 30-second
cadence, retains one pending hint and performs one authoritative check on completion.
The fleet fixture also uses the real relay consumer and pending-CI sweep under an
immediate-spawn render guard. Ordinary/fleet notifications coalesce after a
microtask, and disabled, hidden or replaced scopes cancel pending delivery. Relay
lifecycle, update-row and update-markers fixtures guard notify/shared publication
and new I/O against synchronous render work, including the chrome broker,
update subscription, idle activation and already-mounted marker roots. Existing
update-markers now covers a real registry subscriber through chrome publication
into already-mounted Settings/footer/menu markers without Check now. These are
fixture contracts, not live delivery, pixel or installed-host evidence; they never
deploy, enroll hooks, authorize accounts or send to real agents.

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
24 the current selection is **152 Ubuntu / 151 Windows entries**, with two/three
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
tests/deploy-all-result.test.mjs
tests/deploy-all.test.mjs
tests/deploy-failure.test.mjs
tests/deploy-gate-pipeline.test.mjs
tests/deployment.test.mjs
tests/empty-state.test.mjs
tests/file-refresh.test.mjs
tests/file-tab-reuse.test.mjs
tests/files-plugin-tabs.test.mjs
tests/files-refresh-policy.test.mjs
tests/firstmate-profile-role.test.mjs
tests/fleet-git.test.mjs
tests/fleet-history.test.mjs
tests/fleet-preferences.test.mjs
tests/fleet-reorder.test.mjs
tests/folder-browser-multi.test.mjs
tests/folder-content.test.mjs
tests/frame-upgrade.test.mjs
tests/git-ci-fix.test.mjs
tests/git-context-menu.test.mjs
tests/git-core-monitor.test.mjs
tests/git-github-accounts.test.mjs
tests/git-location.test.mjs
tests/git-monitor-settings.test.mjs
tests/git-notices.test.mjs
tests/git-relay-lifecycle.test.mjs
tests/git-repository-checkboxes.test.mjs
tests/git-repository-cli.test.mjs
tests/git-row-labels.test.mjs
tests/git-webhooks.test.mjs
tests/host-facade.test.mjs
tests/host-gate.test.mjs
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
tests/stock-baseline.test.mjs
tests/tab-arrival.test.mjs
tests/tab-move-compatibility.test.mjs
tests/tab-move-ui.test.mjs
tests/tab-move.test.mjs
tests/temporary-mod.test.mjs
tests/terminal-labels.test.mjs
tests/update-check.test.mjs
tests/update-detach.test.mjs
tests/update-hint-check.test.mjs
tests/update-row.test.mjs
tests/update-marker-inspection.test.mjs
tests/update-markers.test.mjs
tests/update-runner.test.mjs
tests/usage-plugin.test.mjs
src/plugins/a1-colors/session-name.test.mjs
src/plugins/a1-colors/session-sync.test.mjs
src/plugins/a1-colors/settings.test.mjs
src/plugins/crew/fleet-refresh.test.mjs
src/plugins/crew/fleet.test.mjs
src/plugins/crew/plugin.test.mjs
scripts/ci-required.test.mjs
```

### Ubuntu only

```text
tests/file-delete.test.mjs
```
