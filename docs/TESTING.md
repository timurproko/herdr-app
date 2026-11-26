# Testing the repository split

The split retained imported suites, apart from neutral status-reveal labels
and the architecture assertion's moved-guidance path. Preference-home regression
coverage was subsequently added as described below. The directory-loader fixture
now exercises installed sibling paths and selects Git Bash or /bin/bash; other
imported suites retain their existing platform/private-environment assumptions. `npm test` retains the original command and is **not** the hosted CI
selection: it includes installed Core/private-profile assumptions and Windows
recycle operations. Do not run the broad command on a working installation just
to reproduce hosted CI.

## CI trigger and required-check regressions

`node --test scripts/ci-required.test.mjs` checks the workflow event matrix and
aggregate guard alongside the real `scripts/ci-required.mjs` dependency validator.
CI runs for PR open, synchronize, reopen and draft/ready transitions, main pushes
and manual dispatch, not `edited`, `labeled` or `unlabeled`. No CI job consumes the
PR title/body: Readiness uses event/draft, OpenSpec validates checked-out files,
the platform suites test the checkout, and the aggregate uses needs/head facts.
Delivery retains its independent `edited` trigger for body reconciliation; label
additions call only the separate advisory workflow.

The `CI required` name and all three dependencies remain unchanged. Its explicit
`!cancelled()` status guard still runs after a genuine dependency failure (without
Actions' implicit success gate), but skips a cancelled/superseded run. Drafts still
skip suites and the aggregate; unexpected skips in a ready run still fail closed.
The tests cover these cases with the extracted guard and synthetic needs results;
they do not execute GitHub's scheduler or claim live cancellation proof.

For hosted proof on the change's own PR, note the CI run ID and head SHA, then
change a label and edit the description without pushing. Neither operation should
start or restart **CI** or replace/cancel its run; Delivery or advisory label runs
are separate and expected. A subsequent push should supersede the old CI run,
with the old aggregate skipped/cancelled rather than failed. On a ready head, a
real suite failure must still fail `CI required`. Check the latest head's required
checks, not an older cancelled run: the live main ruleset requires `CI required`
and `delivery / Delivery check`, with strict up-to-date checks. A skipped check
can satisfy GitHub protection, so metadata events must not publish a replacement
aggregate; the latest non-cancelled ready run must still pass all dependencies.
These live observations are separate from the local regression matrix.

## Connected project Spaces and coherent coordinator inventory

`tests/fleet-project-spaces.test.mjs` uses the Crew PR #22 placement-v1 contract
with combined-only, project-only and mixed populations on local/qualified remote
models. It covers exact native membership, malformed labels, project names versus
user renames, durable registry links and colour authority. `fleet-command.test.mjs`
checks actual PowerShell project projection; set `FLEET_TEST_ROOT` to an existing
outside-checkout scratch directory for local disposable output.

`fleet-combined-spaces.test.mjs` adds the minimal fleet-view shape (no task projects)
with legacy and v1-combined workers inside one native child, both worker orders,
multiple projects, live/finished PR links and local/qualified remote identities.
It checks that explicit malformed/contradictory projects, unsupported/partial
placement, wrong home/task/space, duplicate membership and foreign machines still
refuse; omitted project does not authorize per-project placement. Its pre-fix failure
is the whole combined binding becoming null, not a workspace drawing defect.

`fleet-toggle-live.test.mjs` also mounts separate Settings, Spaces and Git provider
copies with mixed combined workers and reduced status. The actual Settings callback
and ordinary 250ms Spaces lifecycle restore remembered rows, publish fresh live/history
PR context and clear inventory on off without a manual bind or forced refresh. The
rendered `fleet-git.test.mjs` uses mixed legacy/v1-combined labels too, including its
slow/failed first read and obsolete-generation cases. No separate toggle scheduler is
needed: current generation invalidation already makes the next owner tick eligible.

Opt-in `tests/features/fleet-combined-native.mjs --run --output <outside> --zoom 1|1.3`
uses the supplied `HERDR_APP_BIN` 0.1.18 copy. It requires its sibling release archive
to match the pinned published SHA-256 and the executable to match that archive. Actual
Settings row/callback, recurring Spaces verification and Git aggregate/renderers run
against synthetic local/remote membership, reduced status and GitHub replies. It captures
off, cold pending/verified and remembered pending/verified states, records exact counts
and native errors, and stops its isolated app/Core in finally. This is controller-driven
callback/native-pixel proof, not pointer hit-testing or live SSH acceptance. No real
terminal or account is used and nothing is installed outside disposable homes.

`spaces-worktree-layout.test.mjs` and `fleet-reorder.test.mjs` cover one/two/three
children, shared stem/last corner, native numbering, hidden-child selection,
compact membership, any-member block reorder, ambiguity/cycles and changed captured
membership without replay. Git's right-edge oracle uses an ordinary trailing Crew
pill; connected parent Crew now precedes disclosure and is deliberately not the
ordinary trailing-edge reference. Git geometry is unchanged.

`fleet-color-menu.test.mjs` runs the actual separately packaged provider and menu
with two/three verified children, coordinator/child origins, local/remote machines,
live/retained/restarted states, pointer swatches and keyboard Automatic. Siblings
share one captured coordinator binding; changed membership, conflicting parents or
bindings, duplicates, missing/cross-machine endpoints and expired proof still refuse.
Every child's saved colour and Automatic flag stays unchanged.

`git-inventory-presentation.test.mjs` covers cold whole-inventory admission,
immediate actionable notices, no partial-return leak, staged warm replacements,
header-only native activity, no warm body Loading and quiet cooldown behavior.
Healthy activity says Updating pull requests while worker actions remain available;
only unverified activity carries the paused-action warning and sanitized diagnostics.
`git-deferred-repositories.test.mjs` retains the exact-deadline no-event recovery
and truthful-count checks, now withholding cold partial successes rather than
displaying them. `git-checks-fallback.test.mjs` retains mounted safety admission.

The opt-in Windows `tests/features/interface-native.mjs --run --output <outside>
--spaces --children 1|2|3 --zoom 1|1.3` mounts actual production renderers with
synthetic identity/PR transport, never real agents. Supply a checksum-verified
`HERDR_APP_BIN`. It captures expanded/collapsed/selected/compact/reorder states,
cold partial/full/failure/cooldown, warm return/background activity (two native
phases) and completion. It stops its own desktop and isolated Core in finally;
inspect both screenshots and cleanup/error receipts. Controller-driven actions
are not real pointer/keyboard or live-SSH proof. No installed app or PATH changes.

## Git read-budget and refusal fixtures

`tests/git-deferred-repositories.test.mjs` runs a sanitized equivalent of the
reported mixed-fleet case through real Crew verification, aggregate/read modules
and panel rendering. With herdr-app #74/#76 refused and siblings supplying Open 2 /
Closed 5, it requires one top-left cold Loading indication without partial successful
sections or unknown-only headers and both badges 0/loading, then the complete
eligible list and task totals after an exact fake-clock
cooldown retry without another event. It also covers queued/in-flight uncertainty,
actionable/missing exclusions, folds, atomic boundaries, 100-item cap, surviving
anchors, new membership with retained/loading counts, warm retention and obsolete
retry guards. It is not evidence of the original unrecorded refusal or native pixels.

`tests/git-coordinator-return.test.mjs` checks exact-scope runtime return memory,
provider/Git generation invalidation even without an intermediate render, bounded
snapshot retention, stale-action refusal, cold panel Loading and visible cold
failures; warm return feedback now uses the header-only activity contract above. The renderer and safety selection share the same admission projection.

`tests/git-rate-quiet.test.mjs` exercises strict primary/secondary refusal handling,
episodes, Retry-After, manual bypass and the older-success/cooldown race. Ordinary
compatibility count refusals retain a cooldown retry and known totals; unknown
page totals never fall back to a loaded subset's length.
`tests/git-read-diagnostics.test.mjs` covers bounded read-phase/refusal/deadline
records, genuine refusal versus cooldown skip, recovery evidence, machine isolation,
late-attempt rejection and the actual main sink's yielded shared publication. It
checks 128-record eviction, safe fields, sink failure tolerance and actual portable
preference export exclusion without using the person's home.

Opt-in Windows `tests/features/git-deferred-native.mjs --run --output` takes an
outside-checkout evidence directory. It builds/deploys only into its own ignored
scratch app home, uses synthetic admitted links/GitHub transport, and holds the
production cooldown callback until its test clock advances. It captures Loading
and recovered screenshots at 130%, records native errors/build times and stopped
instance evidence, and stops only its generated app/Core session in cleanup. The
recorded four-row proof built in 0–2 ms with no native errors; this is small-fixture
JS/native-element construction, not full-inventory timing, paint or live rate-limit
proof. That historical native picture predates the panel-wide Loading revision and
shows the same herdr-app header before and after retry, with Loading becoming #74/#76 and tab totals moving from 0/0 to 4/5.

`tests/git-target-reads.test.mjs` covers shared target subscriptions, per-alias
failures with gh's real exit status 1 on partial GraphQL errors, final caching
and changed-only details. Healthy siblings survive missing/access aliases;
rate, HTTP, process and transport failures still refuse the complete batch.
`tests/pr-agent-links.test.mjs` includes a `remote.*.gh-resolved`-only default
change with unchanged remote URLs, plus warm routing-cache reuse. `tests/git-read-scheduling.test.mjs`
checks main's immediate per-repository event delivery and window-independent reads,
plus fake-clock cooldown recovery of the current selected tab with retained depth.
The retired debounce/pending-demand transition matrix is removed with that machinery.
`tests/git-request-budget.test.mjs` measures the actual frozen before controller
and the changed controller against synthetic transport; its baseline blobs live
in `tests/fixtures/git-before/` so shallow/offline CI needs no history fetch.
`tests/git-membership-budget.test.mjs` confirms unchanged main enrollment reads:
four REST operations for two repositories with a named account. Notice fixtures
also verify that rate refusals schedule no deferred enrollment worker.
`tests/git-worker-rate-headers.test.mjs` runs the actual worker transport with a
fake child to check numeric/date Retry-After, paginated header stripping and strict
permission/process/timeout exclusions without reading real credentials.
These are deterministic API-operation counts, not live wire, latency or billing
measurements. See [the complete budget](GIT-REQUEST-BUDGET.md).

Old semantic fleet fixtures adapt their per-PR data suppliers into GraphQL alias
responses, and inject explicit contradictory evidence where final facts change.
They do not measure request counts. Ordinary pagination now exercises real
membership/metadata/detail query shapes for both tabs, rather than assuming
`gh pr view` for each row. No fixture accesses live credentials, changes relay
setup or launches an agent.

## Trello offline contracts

`src/plugins/trello/*.test.mjs` uses fake credential/policy stores and injected
transport, including a CLI subprocess preload with no live-fetch fallback.
The credential suite exercises real owner-only permissions/ACLs on disposable
fake files, including a deliberately widened Windows ACL and a refused junction.
`tests/trello-deployment.test.mjs` installs only into disposable homes/bins and
checks real Bash/CMD/PowerShell launchers, Unicode/space/metacharacter argument
forwarding, runtime closure, conflicts, rollback, removal and private-store
preservation. Existing user-bin locks refuse both first installs and upgrades
without changing payload/ownership; commit probes verify the lock remains held
through runtime, mod and manifest writes and is released after failure. It starts no Herdr app, Core, server or Trello request.
`src/plugins/trello/pagination.test.mjs` models unsorted position-ordered card
collections with 101 distinct creation timestamps, traverses board/list pages at
limits 1/50/100, and checks multi-page read/write membership with explicit `sort=-id`.
`src/plugins/trello/cooldown.test.mjs` interleaves long/short 429 refusals and
repeated local CAS conflicts, checking that the longest deadline persists and a
new invocation cannot dispatch early. It makes no real HTTP request.
`tests/trello-contract.test.mjs` checks documentation/catalog and payload boundaries.

Set `TRELLO_TEST_ROOT` to an existing outside-checkout scratch directory to choose
fixture output. Hosted tests otherwise prefer `RUNNER_TEMP`, then the OS temp
directory: production setup intentionally refuses any store inside a checkout,
including an ignored `.artifacts/` under one. Fixtures never discover/read real
Trello credentials. These tests are not live API or native Settings UI proof.

### Trello Settings setup

`tests/plugin-transient-forms.test.mjs` exercises the actual shared renderer with a
synthetic plugin: native masking, explicit submit, native-input/undo retirement,
duplicate presses, sanitized exceptions and close/disable/machine-generation
invalidation without shared writes. `tests/private-actions.test.mjs` exercises the
real loopback server with wrong/replayed sessions, browser Origin, payload bounds,
timeout/cancel and installed fake-worker stdin/echo guards.

`src/plugins/trello/owner.test.mjs` injects every provider response and covers
verification before save, failed/explicit replacement, removal, protected CAS,
interrupted policy reset, account/board projection, incomplete discovery and
cooldown. Existing credential tests retain real OS permissions/ACL/link coverage.
`tests/trello-settings.test.mjs` composes the real declaration, renderer, actions
and owner worker with injected socket/provider IO. It covers named choices,
Cancel, empty/error/stale inventory, saved-account feedback, both write gates,
public-setting failure rollback, imported-authority refusal and remote zero-IO
checks. `tests/trello-installed-setup.test.mjs` uses actual installed owner/bridge
subprocesses, real fake-store permissions, injected fetch with no live fallback,
Unicode board names, agent allowlisted listing, actual preference export/import
and credential removal. No fixture reads a real token or account.

The opt-in Windows `tests/features/trello-settings-native.mjs --run --output
<outside-checkout-directory>` uses an explicitly supplied `HERDR_APP_BIN`, a
random outside-checkout home and isolated Core session. It mounts packaged Settings
as a terminal-free root and runs native masked inputs, the card, fixed confirmation
footer, WebSocket bridge, controller, owner and protected file writer. Only provider,
SSH and machine inventory are injected. The fake remote uses a second disposable
home and the real Trello-only installer; no real remote/Core routing is attempted.
Test-only exports invoke the same handlers as the controls; this is native pixels
and handler composition, not a mouse-hit-test or live Trello/SSH acceptance claim.

The driver captures empty/masked inputs, the single saved account with hover Remove,
zero-board readiness, Active/Inactive/search picker states, added-board hover Remove,
global Access, a remote runtime Install prerequisite, remote account/board lifecycle,
read-only new-host and explicitly applied global write states, captured-machine
removal confirmation and an injected permission-check error without Save. Its receipt
records each state, native errors, stopped desktop/Core and zero remaining owned
Node workers. The older seven-state SSH-refusal proof describes the prior version,
not the current supported SSH flow. Every instance/server/worker started for proof
is stopped before handoff. Hosted tests never launch this opt-in fixture.

`tests/trello-remote.test.mjs` exercises the public bootstrap, injected strict SSH,
pre-secret READY/identity refusal, distinct homes, lost replies, deadlines and owned
runtime conflict/update/rollback behavior. `tests/trello-global-access.test.mjs`
composes the real controller and card setter with installed CLI gates on fake hosts,
including preference refusal, offline retained rights, explicit same-value Retry,
new-host read-only defaults, missing control and local disable precedence.
`tests/trello-ssh-shell.test.mjs` executes the exact public command through real
CMD on Windows and sh on Ubuntu with default UUID and maximum-length captured
identities for every remote action, preserving at least 512 characters of CMD
headroom. Its public-only preload replaces only the bootstrap entry call, so no
real Core, SSH or private setup is consulted. It also checks the production
installer/bootstrap retain RUNTIME_PATH after successful fake identity readiness
and before any installation write.
`tests/plugin-saved-rows.test.mjs` checks generic declarations against the same Crew
row kit, header-machine scope without a stray selection dropdown, fixed description
links and category-local search/selection. These fixtures start no real SSH or Trello
request and do not read private user setup.

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
`tests/deploy-all-result.test.mjs` additionally covers incremental result sidecars,
revision evidence and bounded host-local deferred-peer identities. Offline repetition,
selection omissions, failed inventory, reachable failure, successful/current clearance,
full-desktop exclusion, confirmed removal, legacy receipts, explicit empty sets and
dry-run preservation are exercised. Preference export excludes deferred identities
alongside other updater runtime state. `tests/update-{runner,detach,check,row}.test.mjs` cover
managed-source refusal, clone-on-Update, deadlines, reload/late-result recovery,
main-only checks/coalescing, one-button states, dots, packaging and preference
exclusion. The runner fixture also upgrades a pre-feature clean clone through a local bare
origin and a fresh protocol-capable CLI, and simulates the installer's eight-minute
Windows timeout to verify unknown status/lock retention after Check. Its target
advancement cases use real local bare Git origins, worker preparation/inspection and
the real deploy:all result recorder: check at A, publish B before Update, then
publish C before deploy:all's fetch. Even before inventory or installation finishes,
the source receipt must identify C rather than carried installed provenance. During
a mocked connected peer's deployment, the row must use C from the same-run desktop
attempt, not A or bootstrap target B. The title retains verified pre-update provenance
during launch, fetch and installation, omits it if ownership changes before success,
and switches to C only when the real recorder verifies desktop success. While peers
remain active, the description then says **Updating other machines to C.**, including
with no remembered launch progress after replacement. Completion plus a fresh check
restores Up to date. Real-recorder failure cases cover pre-install refusal retaining
the previous revision, desktop failure invalidating it, and peer failure retaining
the newly installed revision with the partial-outcome warning.
Both ordinary updates and initially peer-only catch-up are covered; foreign tokens,
pre-launch timestamps, carried desktop-only provenance and malformed commits cannot
replace the active target. No fixture invents the worker's target receipt for this
advancement regression. The pipeline
fixture runs ordinary npm deploy:all with an offline peer and verifies successful,
warning-free desktop presentation after checking, while its matching result still
records the skip and an unrelated old Settings log is not advertised. It also runs the real
CLI with mocked definite installer failure and eight-minute timeout, then checks
failure/recovery details and launch blocking after a successful main check.
`tests/update-row.test.mjs` also covers the shared native/Custom 300 ms/3000 ms
confirmation path, success/expiry and unchanged busy/error/unknown states. Its
known/missing-revision matrix exercises the real model and row renderer across
idle, checking, available, launching/running, failed, partial and unknown-outcome
states. Launching, pending-receipt, active-running and replacement cases assert
**Updating to 4c4bff1.** from the published target, or **Updating.** without an ellipsis
until a valid target arrives, with the unchanged disabled **Updating…** button.
Peer-only catch-up says **Updating other machines to 4c4bff1.**, with a targetless
**Updating other machines.** fallback. Fixtures distinguish installed and target
revisions, reject malformed or foreign-run targets, preserve launch scope through
replacement and narrow scope after verified desktop completion without inferring
installation from the target alone;
other state meaning and the native action-slot geometry stay unchanged. Every Custom
description ends with a full stop, including completed/unchecked/checking states,
local errors and failed/partial/unknown log or details suffixes. Error fixtures cover
missing, existing, repeated and ellipsis terminators, without duplicate sentence-boundary
stops or changes to dotted paths. The real Settings renderer also covers every native
App/Core branch, including ready-to-restart, managed/source builds, checking, updating
and Core failures, preserving existing button ellipses and restart/retry controls.
Unknown revisions show only `herdr-app-custom` with no trailing space;
known revisions retain their seven-character suffix. Missing evidence cannot claim
current even with a cached no-update result. The check fixture separately confirms
that changed ownership evidence still offers Update after a successful main read.
A focused Settings copy assertion preserves the exact short paragraph from before
PR 20, including corner indicators and herdr-core terminal-continuity guidance,
without Custom cadence or relay details. Fresh
module graphs and owners simulate replacement before the launch receipt, during
running work and just after completion. Shared provisional launch feedback keeps its
known target and peer-only scope until durable status acknowledges it, or becomes unknown after the
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
The check suite enumerates Settings-job/plain-CLI by success/offline/full-desktop/
partial/failed/unknown combinations using the real result writer, worker, check,
projection and row functions; all twelve cells assert truthful text and matching
source details only when needed. The narrow benign classifier matrix retains warnings
for unknown inventory states, missing tools, unsafe source, locks and remote uncertainty.
Legacy completed Settings partial receipts refine only from matching final results,
never across live locks, unknown jobs, unfinished results or foreign tokens.
An offline-then-online fixture runs deploy-all again at equal main and proves deferred
peer deployment and clearance through the real recorder/inspection/check/row pipeline.
Checks remain main-only; simply restoring connectivity never dispatches work. Row
module replacement and all four mounted indicator surfaces retain badge-free Up to
date text plus actionable Update for pending peers, including stale-click lock and
unknown guards. Deferred work cannot replay a remote unknown result at the worker
boundary. All transports/installers are synthetic; no live pc2 or native UI is used.
Unknown CLI receipts block even before peers finish and when no Settings lock
exists; stale completed Settings jobs cannot hide the latest CLI outcome. The detach fixture
runs actual detached Node supervision with synthetic Git and deploy CLI; it does
not prove survival under the real Herdr/Core process lifecycle. Its bounded wait
requires both completed status and released lock: the supervisor deliberately writes
status before unlocking, and another process can observe that intermediate state.
Deterministic snapshots cover delayed unlock and reject a permanent lock, an
unfinished unlocked job and an unknown outcome; receipt/token assertions remain.
This avoids the Ubuntu completion/lock race without changing production ordering. All use checkout `.artifacts/` homes; exec, peer transport and deployment
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

## Herdr migration tooling fixtures

`tests/herdr-upgrade-{releases,evaluate,refresh,report,publish}.test.mjs` are automatically discovered
by the existing hosted runner. They use fake release feeds, hash-verified synthetic
Git trees/blobs, fake process results and ignored preview directories. They cover
independent versions, invalid evidence and rate limits, consumed SDK/command
changes, exact palette/feedback hunks, missing stock/native proof, step verdicts,
protected reviewed bytes, agent handoff and delivery/OpenSpec rendering. They never
open a live proposal, execute downloaded code, contact a Core or certify pixels.
The publisher fixtures additionally use fake paginated GitHub state and Git objects:
local Skip creation, closed/skipped/merged deduplication, component overlap,
agent-owned branches/checklists, supersession, interrupted initial publication,
freeze/activation refusal, stale heads and malicious evidence paths. Static workflow
assertions protect no-write defaults, credential separation and minimal permissions.
The refresh fixture creates a disposable Git proposal branch, observes missing API
and command contracts, commits real adapter aliases and an added contract, then
runs the trusted evaluator again. A credential-free child reads the evaluated
checkout's adapters, while the trusted baseline mappings remain separate. The
refreshed host verdict passes without losing historical upstream deltas. SDK
overloads/merged declarations, unavailable generation evidence for an exact older
Core, and retried supersession/cross-link comments have dedicated regressions.
A real hosted no-write probe remains a distinct activation prerequisite.

## Sidebar header hover parity

`tests/sidebar-plugins.test.mjs` renders the actual `sidebarTitle`/`panelTitle`
chain and compares its hover callback with the real inset `iconButton` and
active unpinned `panelPin` toggle. Both Files and Git title triggers match the
24px height, 4px radius and exact foreground-at-0x0a hover fill across dark,
light, custom and unavailable foreground colours. The title and div icon button
have no custom focus or transient pressed styling to replicate; the pin's
persistent selected state is separate. Default terminal titles keep their
28px/6px/themed-hover treatment. Single-panel static titles remain noninteractive,
and stale popup/disabled-plugin guards still run. This is customization-owned
chrome (`src/ui/sidebar-title.js`, `src/ui/ui.js`, and the plugin panel callers),
not a native patch; no coordinator Verifying presentation is changed. These are
rendering/style assertions, not live native hover or keyboard evidence.

## Shared account-style choice menus

`tests/choice-menu.test.mjs` loads the actual account caller, `ui/choice-menu.js`
and `ui/ui.js` with instrumented native elements. It checks the inherited muted
12px chevron, gap, upward Popover, surface bounds/padding, row hover/highlight and
fixed selected slot through both actual account and enrollment callers. It also
loads the real ordinary Git notice renderer and compares complete card padding,
height, icon dimensions, icon-to-text/Settings gaps and icon/text/Settings/chevron
vertical centres against enrollment at 75–200% zoom. The single-line geometry
model uses the panel's 20px text line box and popup trigger layout (not its menu);
it would catch the former 28px nested pill increasing the card from 32px to 40px.
Account trigger height remains pinned at 28px, while enrollment uses 20px without
wrapping. These synthetic geometry assertions are not native pixel evidence.
`tests/fleet-enrollment.test.mjs` runs the coordinator renderer with real notices,
picker and UI: zero/one/multiple choices, section-order deduplication, enrollment
completion, quiet pending/unknown state, global setup precedence, fold/long-scroll
footer structure, keyboard/pointer/dismissal, exact captured Settings payload and
pre-render invalidation on refresh/tab/home/account/config changes. Read counters
prove opening/choosing adds no membership/GitHub read or enrollment.
`tests/claude-session-account.test.mjs` retains controller
loading/switching/session guards. All three fixtures reject focus-handle allocation
and notify during render; coordinator coverage also checks that initialization creates
one handle which Popover reuses across repeated renders and context changes.
These are render-tree fixtures, not live pixels.

## Reviewed native frame stock

`tests/feedback-native-stock.test.mjs` and `tests/palette-native-stock.test.mjs`
use byte-faithful canonical release fixtures, never an installed host. They assert
pinned digest/raw build parity, native imports, 0.1.16/0.1.17 apply/owned refresh/
no-op/restore, masked and reset palette upgrades, earlier raw backup retention,
absent opt-ins and byte-preserving unknown/ambiguous-stock advisories. Existing
frame-upgrade, startup and actual deploy/update pipeline fixtures retain conflict,
corrupt-record, concurrent-write and advisory-composition coverage. Both palette
variants run the existing palette-ui list/heading/fade/keyboard fixture. The actual
native and Custom 0.1.17 catalogs are compared with non-hardcoded themes across
light/dark and active layouts, including native command arguments and Custom
Settings/picker/rename/close routing. Feedback's simulated native sending/UI suite
is unchanged. Installed 0.1.17 stock was separately compared read-only; provenance
and limitations are in HERDR-0.1.17-NATIVE-PATCHES.md. No deployment or live UI
interaction is implied by fixture success.

## Owned palette and persistent key policy

The owned model/UI/persistence/retirement suites (`tests/owned-palette-*.test.mjs`)
use the real pinned 0.1.18 palette and both public SDK declarations alongside the
retained 0.1.17 original. They compare native catalogs/themes/manifest validation,
IDs, hotkeys and clone dispatch; exercise the packaged search/virtual list and
heading/fade/scrollbar events; and run isolated install/reset/reload/CAS/rollback
and local/pc2/Core-only fixtures. Retirement covers masked/reset 0.1.17/0.1.18,
both landing orders with the actual merged 0.1.18 stop-gap (LF and verified
Windows CRLF originals), late record replay, unknown-target preservation and
feedback isolation. Key reset tests explicitly start with stock
Ctrl+Shift+P -> app.palette, repair it and simulate the host mod.open toggle.
`owned-palette-review.test.mjs` additionally exercises the real installer and
retirement gates with missing SDK/UI/API/command/version facts, uninitialized-home
deferral, GPUI-equivalent key spellings/alias restoration and a non-replaceable log
during full Update. SDK declarations are preserved release fixtures; the fake
executable/catalog and compact GPUI declaration are explicitly synthetic.
`owned-palette-rollback.test.mjs` installs a prior managed fixture carrying the real
#65 native palette and pinned legacy openers/startup worker, migrates it, rolls
back the reported backup, simulates a frame reset/startup and reinstalls. It covers
0.1.17/0.1.18 LF/Windows originals, feedback preservation, later-native-edit refusal,
personal shortcut preservation, deferred install → startup ownership → rollback,
reinstall and interrupted retirement. Assertions require no palette-specific deploy
journal fields. Mounted persistence tests cover missing-mod cleanup with/without a
sidecar and without SDK files; the same installed-state planner handles all paths. Other shared fixture files come from the current build;
it is not claimed as a byte-faithful historical distribution. Rollback restores
intent through guarded refresh, never by replaying an old native main.js.

These tests do not prove actual native event dispatch, focus or pixels; those
remain separately authorized live/disposable-native validation. No suite installs
into the person's app, activates migration variables, restarts a process or runs
live SSH/Core operations. See [ownership and limits](PALETTE.md).

### Merged 0.1.18 stop-gap reference

The 0.1.18 stop-gap extends the same real-stock suite to pinned LF and independently
verified Windows CRLF originals, release-specific selection, 0.1.17-to-0.1.18
masked/reset upgrades and current-original restoration. Real native and Custom
manifest readers/catalogs are compared on sorted/hidden/unreadable/malformed
metadata, missing targets, canonical duplicates, argument validation, Mod grouping,
object/index hotkeys, explicit/default clones and targeted dispatch. Usage is
checked enabled/disabled/default in the new variant. All three replacement
payloads run the shared UI VM fixture, including fixed 408px/57px geometry,
command-only paging, native wheel ownership, scrollbar ranges and complete
search/clear resets. Read-only installed Windows byte evidence and absent live
interaction proof are in HERDR-0.1.18-PALETTE-REVIEW.md.

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
individual/strip/metadata tooltips. Colour cases replace the former solid-fill assertions:
18 independent samples cover green, amber, purple, red, blue, yellow, black/near-black,
white/near-white and both sides of the label lightness/border thresholds. The expected
HSL results were derived with Python colorsys and the three reference hues cross-checked
against Primer CSS in Chrome; no test computes its oracle using the production helper.
RGB conversion allows one byte of rounding; alpha bytes are exact (18% becomes `2e`,
30% becomes `4d`). The real row runs through dark → light → dark palettes at each zoom,
state and ordinary/coordinator/ghost combination. Border plus padding preserves the
original 5px content inset and 18px outer height; neutral fallback retains exact names.

`src/plugins/git/mod/label-colors.js` adapts the MIT-licensed
[Primer IssueLabelToken CSS](https://github.com/primer/react/blob/2128032dca65a1bd565fe382c2e91c638c6473a4/packages/react/src/Token/IssueLabelToken.module.css)
and its [rounded HSL inputs](https://github.com/primer/react/blob/2128032dca65a1bd565fe382c2e91c638c6473a4/packages/react/src/Token/IssueLabelToken.tsx),
with attribution preserved in the helper. Perceived lightness is the weighted encoded
RGB sum divided by 255, not gamma-corrected WCAG luminance. Dark text adds
`(0.6 - perceived) * 100 * clamp(1 / (0.6 - perceived), 0, 1)` to rounded HSL lightness;
background/border alpha are 0.18/0.3. Light text switches at 0.453; the border uses
HSL lightness minus 25 with alpha `clamp((perceived - 0.96) * 100, 0, 1)`.
Effective panel backgrounds below weighted RGB lightness 0.5 use dark rules, others
use light; unavailable/invalid backgrounds default dark. This classification and
invalid label colours are covered separately from the upstream formula.

The same fixture checks 3px muted round separators with a one-logical-pixel downward
paint offset to centre on adjacent lowercase x-height, and equal 6px gaps in bylines
and between left-status groups, never before the right-anchored label group. Zoom
cases from 75% to 200%, including 130%, retain that offset; comparison with the
line-box-centred separator tree protects neighbouring text, icons, pills and row
geometry. Independently measured native ink on both lower lines selected the same
1px offset: zero screenshot-pixel error at 130% and 0.5px at 100% on the measured
1.5x display scale. The geometry suite rejects both zero and the former 1.5px dot
offsets on each line and retains the one-logical-pixel downward paint offset for every
task-progress and checks-state icon, including ordinary/coordinator and ghost rows. Missing-group combinations have no leading/trailing
or orphan painted dots; only present groups and separators occupy horizontal space.
The status line itself remains mounted at 18px even when empty.
Pagination/fleet fixtures also assert labels
in actual pinned/scrolling and coordinator render paths; existing menu and pin-swap
fixtures protect captured URLs, callbacks and measured motion. These prove render-tree
constraints, not GPUI pixel layout, tooltip hit-testing or native animation appearance.
No deployment or live label mutation is performed.

## Informative Git row tooltips

`tests/git-row-tooltips.test.mjs` settles ordinary/coordinator live/ghost rows at
75–200% zoom, including 100%/130%. Complete visible number, author, task, check,
review and label wording has no repeat-only item or parent tooltip. Compact,
clipped and omitted values remain recoverable. Exact UTC timestamps, failing or
pending check names and known agent identities add facts without hover reads.
Titles keep native truncation, inherited font and full-title hover unchanged;
same-ID edits at 200px also run with changed-size-only callbacks.

The tooltip layer reuses `RowPresentations.layout` and main's existing intrinsic
measurements. It adds no measurement, width cache, scheduler or native element.
Cached time/check tooltip facts invalidate with timestamps and check details.
Main's dot/icon geometry, mounted reveal/caps, native scrolling, fades, anchors,
quiet rate refusals and batched reads stay intact.

| Item | Tooltip policy |
| --- | --- |
| Title | Unchanged complete-title hover, whether fitting or truncated |
| Number | Full original only if hidden; normally none |
| Author | Full login when clipped |
| Time | Full compact/clipped wording, or known exact UTC timestamp |
| Tasks | Full progress phrase when compact/clipped |
| Checks | Known failing/pending job names; no count-only repeat |
| Label pills/group | Complete assigned names when clipped or omitted; no per-pill probe |
| Review | Full clipped/hidden decision, including surviving metadata recovery |
| State/robot | Unstated state/conflict or known agent name, without changed action authority |
| Combined strips/row | Only hidden/omitted values; no summary repeating visible items |

`tests/git-row-render-budget.test.mjs` compares the actual ordinary renderer and
coordinator renderer after full reveal with frozen main `f3fe341` counts. At
30/60 rows every requested row mounts; 100/200 coordinator inventories retain
main's 60-row/100-item cap. Both tabs and 100%/130% are covered. Element and probe
counts must equal main, with at most two additional decoration operations per row;
negative controls add a subtree/probe and must fail. This complements, rather than
replaces, the existing reveal/cap/scroll budget fixtures.

`tools/measure-git-row-budget.mjs --run` compares fresh native main/current checks
at 30/60 fully mounted ordinary/coordinator rows, five paired cold samples each,
using the same #56 reveal model and unchanged production caps. Main's renderer
and pure presentation helper are substituted together. Every sample completes and
each paired sample and median must stay within main +2ms. These are build-only
JS/native-element timings, not GPU paint or real input latency. The disposable
checker never contacts the live app/Core; see GIT-RENDER-BUDGET.md for results.

`tests/git-repository-counts.test.mjs` checks the actual aggregate/header renderer
for full-inventory 1/10/100 counts in both tabs and fold states, including unrevealed
rows. Agents keeps its shared 32px numeric rail; Git compensates the larger 24px
chevron slot and 8px surrounding gap to retain the same painted number-to-glyph
gap. The existing Agents column suite protects its unchanged time/count geometry.

## Closed-section fold exploration

`node --experimental-vm-modules tests/git-closed-folds.test.mjs` exercises the
actual coordinator fold handlers, reveal and scroll projection for 41, 60, 100
and 200 known Closed PRs at 100%/130%. Each case runs 60 fold/reveal/scroll
transitions with scoped notices, unchanged totals and no reads. It passes on the
pre-change source: **it does not reproduce or fix the reported native interruption**.

Opt-in `tests/features/interface-native.mjs --run --output <outside-checkout-dir>`
uses a supplied `HERDR_APP_BIN`, isolated app/Core session and synthetic facts.
It drives the exact production fold callback outside render, captures native
frames/status and stops its own session. It is not a mouse-hit-test or real-agent
proof. The 41-item pre-change App 0.1.18 run at 130% completed 20 fold callbacks
without native errors (0–13 ms JS/native tree construction); no cause for the
reported `interrupted` banner was established. Native deadlines and error handling
are unchanged. The combined `--spaces` fixture mounts actual Spaces, Agents and
Git together at 100%/130%, and captures counted headers, expanded/folded child
spaces, compact badges, production drag preview and acknowledged fake-model paired
reorder, panel Loading/failure and same-home stale return. It drives production
callbacks/domain APIs with synthetic events rather than pointer/key injection;
remote identity and keyboard-selection guards are deterministic fixtures, not a
live SSH or OS input claim. The final 41-item native runs had no errors and built
in 0–14 ms; timings exclude later layout/paint. The four-row failure fixture makes
the scoped notice visible without needing to scroll; long-list anchor retention
may correctly keep a newly inserted notice above the current viewport. Downloaded proof executables must match the official release
archive checksum; never install them or alter PATH.

## Coordinator render error diagnostics

`node --experimental-vm-modules tests/git-panel-errors.test.mjs` exercises the
packaged controller, aggregate reader, real notices and UI with 100 Closed rows
across two repositories, a history read notice, merged/closed-unmerged states and
live/historical agent variants. A 20,000-builder-operation / 8,000-element mounted
batch ceiling accompanies the measured 60-PR/100-item cap; every row is reachable,
even a 100-label PR builds fewer than 125 elements, and reveal/batch changes add no inventory reads. Distinct-string probes,
cache reuse across pages, zoom invalidation and stale measurement refusal have
regressions. The disposable native 30/60/100/200-row measurements and their exact scope
are recorded in [GIT-RENDER-BUDGET.md](GIT-RENDER-BUDGET.md). It uses inline spawn and render-side-effect guards.
A synchronous notice transport failure previously reached fallback `notify` during
render; yielding before request work fixes that proven path (present since import
PR #1). This is **not** a reproduction of the screenshot's native `interrupted`
error, and no introducing merged change for that error has been established.

Herdr 0.1.17/0.1.18's unchanged QuickJS sandbox has a 50 ms render/layout deadline and an
uncatchable interrupt. Node fixture timing is not evidence of native budget safety.
Caught render errors now log `[custom-changes] render failed` with exact error,
stack and innermost row/section/notice component, then rethrow so native last-frame
fallback remains. An uncatchable abort can leave an in-memory component marker:
the next render logs `previous render did not complete` with that component. Its
message explicitly defers the exact native error to the host banner/log; it does
not invent an exception or claim that the prior frame timed out. If no later
render occurs, JS cannot emit that next-attempt diagnostic. No live app is changed
or restarted by this fixture.

## Git repository routing and access refusals

`node --experimental-vm-modules tests/git-repository-routing.test.mjs` executes the
actual per-child environment script with synthetic process/CLI IO. Panel API and
GraphQL reads use `GH_REPO=owner/name` only in that child; the public host exec API
has no environment option and `gh api` does not accept `-R`. The fixture covers
absent, empty and wrong ambient GH_REPO, unrelated cwd, remote options, explicit
token/host preservation, invalid repository rejection and validated account output.
PR reads keep their explicit `--repo` flag. Root discovery before a repository is
known remains cwd-based. No global login or process environment is changed.

Authoritative targeted task-PR missing-resource/HTTP 404 replies are silent,
including unfinished tasks, with **no** login-problem wording or account lookup.
Uncertain repository resolution retains its scoped not-found error. Real permission/auth
refusals share one bounded `gh api user --jq .login` diagnostic per repository in
the current refresh, using the same routing/credential rather than the global
active account. Notices name the effective account or explicitly `(unknown)`;
the cohort cache is discarded afterward and the next refresh re-verifies it.
No token is returned to UI JS, put in argv, logged or shared. The ordinary reader
captures its original repository and checks request freshness before diagnosis,
not only before publication. Pagination regressions cover disabled/hidden Git,
changed folder/machine and replaced or mutated repository responses (404 and 403).

The reported crew history notice was reproduced read-only for recorded PRs #36,
#37 and #38: the explicitly targeted reads return `Could not resolve to a
PullRequest` as timurproko, while crew #1–#9 and herdr-app #41/#43 succeed. The
old red history notice described those missing records; confirmed task-PR absence
now contributes nothing to the interface and is diagnosed once per identity in the
customization log. This does not establish a wrapper defect and no record, account
or MyConfigs file is changed.
Local native exec defaults to user home and inherits the desktop environment.
The Core reproduction matched the documented command/cwd and had GH_REPO/GH_HOST
unset and no explicit tokens, but it cannot prove the already-running desktop's
inherited environment. Existing pagination, full-panel and read-notice fixtures
also cover the scoped notice and preserve healthy rows/history eligibility.

### Environment carrier process and latency budget

Read-only user-home/Core measurements on this Windows installation: bare Node
startup median **36.8 ms** (9 samples); paired `gh --version` runs add median
**49.6 ms** (9 pairs), and paired `gh api user` runs add median **45.8 ms**
(5 pairs). Network variance means the API difference is not a precise startup
estimate. The extra process is therefore not treated as free.

A normal coordinator refresh with two repositories launches **zero extra Node
carriers** for targeted PR reads: `gh pr view --repo` is direct. The reported
three missing history items formerly caused three Node + three identity-gh reads;
they now cause none. Real permission refusals reuse a diagnostic across the whole
refresh: at most **two Node carriers + two identity-gh calls** for two repositories,
regardless of how many PRs fail. These counts exclude existing setup/enrollment
workers and the gh wrapper's own unchanged internal processes. The safety reader uses the same repository-scoped transport: one carrier per
thin state/summary batch (up to 40 PRs), with full-context batches (up to 20)
only for changed heads/summaries, never a carrier per row. Coordinator safety
selection follows the revealed unfolded mounted batch, including offscreen rows,
while unrevealed history stays in inventory without widening its safety reads.

Ordinary list and webhook-page reads now include both totals in the same GraphQL
snapshot, avoiding the count-only carrier/gh call. Three real paired crew
list/count reads measured **2966→2383 ms, 2398→1977 ms, 2360→1751 ms**, reducing
two Node carriers to one (421–609 ms saved in these samples). This measures the
transport only, not native UI timing. `git-repository-routing` asserts two identity
children for twelve permission failures over two repositories, zero for missing
items and fresh diagnoses on the next refresh. Pagination asserts a complete
page applies both counts with one API request; partial responses retain fallback.

## Pending Git checks fallback

`tests/git-checks-fallback.test.mjs` drives the actual ordinary/coordinator snapshot,
repository-batched reader and scheduler with fake clocks and GitHub transport. It
covers pending 3/10 to 11/11 settlement with continued open-state reads, preserved render values
while in flight, hidden/offline cancellation, native remote `machines()` layout
readiness without an `hc` state field (and refusal for loading/missing/unrelated
layouts), failure retention and 90/180-second
backoff, the 15-minute rate-limit floor, 120-second enrolled safety reads, existing-queue
contention, authoritative empty rollups and late hidden/replaced-context replies.
The 120-row ordinary expanded-list case uses three thin state/summary chunks and,
only on changed heads/summaries, six 20-PR detail chunks. The same-sized coordinator
inventory reads its full 60-row revealed batch in two thin and three detail chunks,
including offscreen rows, and preserves unrevealed facts. They actually launch a
harmless Node child with generated arguments, retain all rows on a failed second
chunk, then retry successfully and continue while Open. Five- and thirty-row
steady cycles require exactly one thin request with no per-context list; changed
head/summary cases fetch only that row's contexts. Held probes refuse a competing
cycle. Secondary failures with positive hourly quota retain values and honor a
30-minute Retry-After; ordinary quota headers cannot misclassify auth failures.
`tests/git-checks-order.test.mjs` injects newer publications while replies are held
and asserts the single epoch/generation guard is wired into list, related/older,
event, fallback and aggregate paths. Pagination also covers selecting an older PR
during a held webhook snapshot (no competing read), an older lookup before a failed
replacement (no stranded key/pin), and bounded retry after a failed lookup.
Pagination and fleet fixtures also assert complete pending/success/failure and
rerun counts through in-flight event follow-ups. These do not measure live GitHub
latency, enroll hooks or use native UI/credentials.

`tests/git-state-refresh.test.mjs` drives the actual ordinary/coordinator readers
with fake GitHub state and held replies for merge, close, reopen and draft
conversion through event and safety paths. It checks both totals, current state
wording, completion timestamps, history without a robot, unchanged labels/tasks/
review, unaffected order and no clear-to-empty intermediate frame. Pagination
also covers a merge at the eleven-row/two-page boundary: the original depth and
cursor repair survive removal, the unopened destination stays lazy, and its older
merged pin appears once when loaded. These are packaged synthetic fixtures, not
live delivery or native pixel evidence.

`tests/git-safety-paging.test.mjs` composes the real coordinator mounted renderer,
aggregate, safety scheduler and repository-scoped carrier. A 25-Open/5-Closed,
two-repository inventory exercises offscreen revealed selection, merge/close tab
totals, unrevealed/fold exclusion, stable viewport-only scrolling, stale in-flight
replies after reveal/fold/tab/home changes and both 45/120s cadences. Scroll events themselves start no reads. Existing fallback/state tests also assert GH_REPO on every probe/detail
API invocation. Pagination distinguishes its selected-state filter from the new
combined totals fields, applies both totals on append and retains cursor-depth
repair. The 100-row render operation budget remains separately enforced.

## Always-visible Git tab counts

`tests/git-count-badges.test.mjs` renders the actual ordinary and coordinator chrome
with the real shared segment, ordinary snapshot reader and aggregate index. It
checks visible first-load/unknown zeros, loading tooltip/accessibility text,
authoritative totals, retained counts during delayed and failed same-context reads,
and first-load reset after a real repository/coordinator-home change. All IO is
synthetic. The geometry matrix additionally compares tab and badge boxes across
unknown/0/1/99/999/larger totals and verifies three-digit text fits inside the
reserved 32px badge with padding at every tested width and zoom. Another 2,400
complete-panel comparisons in `git-count-badges.test.mjs` cover both selected
states and both tabs in ordinary/coordinator renderers at 280–480px and
75–200% zoom including 130%. They compare the label's 8px left inset with the
painted badge's 8px right inset, not just its reserved slot, and require centred
one/two/three-digit text and stable tab/badge boxes. Known exact totals have no
count-only tab or nested badge tooltip; unknown zeros keep loading information,
and counts above 999 show a bounded 999+ with their exact total in a tooltip and
accessible label. The 4px symmetric badge padding also contains the overflow
indicator. Zero is an explicit first-load display choice, not an authoritative
claim that reads finished. These checks resolve synthetic boxes, not native pixels.

## Stable Git row geometry

`node --experimental-vm-modules tests/git-row-geometry.test.mjs` resolves the actual
shared row trees using a deterministic flex/absolute layout model with real `U`
metrics and content-dependent text widths. It dispatches the actual native-size
callbacks after layout (including clipped invisible natural-width probes), rerenders
until changed-only measurements converge, and excludes invisible probe text from
paint assertions. At 280/320/360/390/480 logical-pixel widths and 75/100/125/130/150/200%
zoom, 56,700 comparisons protect title right edges, state/robot and whole-line
boxes, line heights, 74px row heights and following-row positions across ordinary,
pinned, scrolling, coordinator and ghost paths in Open/Closed/merged states.
Optional agent transitions, untouched/partial/done and multi-digit tasks/checks,
pending/success/failure icons, absent/long/multiple labels, review decisions and
missing authors preserve those vertical/title boxes, not obsolete horizontal cell
reservations. Separate assertions require natural left-group widths, constant 6px
gaps beside 3px dots, absent-group removal and unchanged byline flow. Assigned
labels instead share the outer robot-control/content right edge, with spare space
before them and no joining dot. Cross-row Review/Rework/Approved cases compare
actual pill edges across task progress and missing/one-/two-/three-digit checks,
including 130% zoom. Both group and trailing-pill edges remain anchored when a
multi-label strip clips. Mutation tests reject left-aligned pills and a restored
joining dot. Separate review-decision text yields before label words after task
compaction; checks and compact fractions remain complete.
Full probe widths independently determine when the complete line fits: every fitting
value must remain full and unshortened. Screenshot-shaped 390px cases retain both
2 tasks done and opened 4 hours ago at every zoom. Exact fit thresholds assert
whole task fractions or compact times appear only on overflow and before label or
author clipping. Empty robot slots remain inert and ghost robots cannot navigate.
Removing the title reservation, stretching a group or restoring a fixed task budget
must fail the corresponding oracle.
The model preserves inherited line-height tokens and resolves numbers as effective
font-size multipliers, while `px` strings remain absolute lengths; numeric `size`
remains pixels. Independent oracles cover 20 × 13 = 260px and 18 × 11 = 198px,
child font-size changes, fractional multipliers, explicit pixel strings and zoom.
Every loaded row's measured text line must fit its containing title/byline/metadata
cell, not merely retain a stable outer box. Sixty mutation cases reintroduce each
numeric line-height defect in ordinary/coordinator live/ghost rows at every zoom
and require that containment check to fail. The production rows use `20px`/`18px`
strings explicitly. This closes the earlier fixture blind spot that treated all
line heights as pixels and missed invisible/clipped text inside stable cells.
Existing label-colour/tooltip, PR-action and pin-motion regressions remain intact.
Horizontal assertions also compare the full natural count width against every
ancestor, reject any check truncation, and cover one/two-digit totals through
99/99 in success/failure/pending states, plus the existing 101-check case. A tiny
checks-width mutation must fail even with stable outer boxes. Whole task/time
shortening replaces mid-word clipping only when necessary; metadata/pill text never
uses ellipsis-only values. These are synthetic resolved-box comparisons, not native
GPUI pixels or visual interaction evidence; no app, session, credential or deployment
is used.

The same fixture compares Open/Closed segment positions for unknown, zero and
multi-digit counts; empty badge reservations have no fabricated values.
`tests/git-location.test.mjs` now samples actual rendered row identities through
pending/rejected/timed-out/signaled/abnormal/permission-denied/empty root replies,
checks root/repository/count/page and native pin-size retention, then verifies
successful recovery and explicit non-repository clearing. Root reads yield out of
render even with inline spawn. `tests/pulls-pagination.test.mjs` samples manual
and staged webhook refreshes, including a targeted older active PR after page-one
replacement and a failed reread; the pin stays mounted until its facts are ready.
Synchronous transport throws cannot notify or allocate focus during render.
`tests/fleet-git.test.mjs` renders with inline-spawn guards during deferred same-home
refresh, partial PR failure and reconnect recovery, preserving prior rows/counts
until their individual replacements arrive. It also exercises real off/on
invalidation with slow/failed first reads: enabled verification never renders
Not a git repository and old inventory never returns across off/on. It covers a
negative completing before any Git render followed by off/on (Loading then only
fresh rows), and a previous owner's negative followed by a changed labelled owner
with a pending read (Loading, not ordinary Git). Existing same-context Stale
retention is unchanged; no additional presentation cache exists. Cold waiting
uses the actual standard panelMessage Loading bulb, with no Verifying header;
leaving a cold waiting context without any cache is covered too.

`tests/git-right-edge.test.mjs` additionally compares complete ordinary and
coordinator Git render trees (including the panel border, pinned/list padding and
motion overlays) against the actual Spaces chrome, sidebar scroll and Crew-tagged
row renderers. Across 280/320/360/390/480px and 75/100/125/130/150/200% zoom,
1,440 row comparisons require robot slots, header chevron slots and actual label
pills to share the actual Spaces Crew pill's inset from its own row highlight,
not its sidebar edge: 8px row padding minus the final pill's 5px negative margin
leaves 3px. Both actual Spaces rows supply the oracle. Separate assertions retain
Spaces' 8px sidebar-to-highlight inset and Git's 5px panel-to-highlight inset;
Git's controls now end 8px from its panel versus Spaces' unchanged 11px.
Renderer measurements at 100% / 130% zoom give Spaces highlight-to-pill gaps of
3px / 3.9px, unchanged, and Git highlight-to-robot-hover-box/pill gaps changing
from 6px / 7.8px to 3px / 3.9px. Neither row highlight moves. Negative Spaces
pill margins have an independent geometry oracle. Robot/chevron glyph centres align despite their
16px/14px SVG sizes; 24px hit targets, inert missing-agent reservations, fixed
line positions and 74px rows remain. Expanded/folded header slots stay aligned.
Mutations restoring 6px row/header insets, shrinking the chevron slot or adding
an unaccounted border fail; the latter is checked against the highlight-to-panel
inset because a row-relative-only oracle cannot detect a shifted highlight.
Title truncation boundaries stay identical with and without an agent.
Existing row/fold/menu fixtures retain callbacks and tooltip coverage. Another
9,740 comparisons exercise the actual mounted-scroll renderer with 25 PRs,
stable native list IDs and warm distinct-string measurements in both tabs across
the same width/zoom matrix. The extended 100-row panel regression scrolls to reveal
every row across measured capped batches while enforcing per-row/mounted-batch ceilings. These are synthetic
resolved-box checks, not live GPUI pixel or deployment evidence.

## Mounted Git scroll fixtures

`tests/git-measurement-lifecycle.test.mjs` models native size-change-only events
with a retained element-ID/dimension cache, not unconditional layout callbacks.
It covers equal-height wrapped-notice replacement, ordinary tab/context changes,
live ordinary/coordinator zoom with an unchanged physical viewport, coordinator
home-away-home, recreated header caches and pin body/reveal lifetimes. Its `anchor`
cases cover equal-height 30-row refreshes in the middle and at the end through a
yielded anchor correction, with both native size callbacks suppressed and exactly
one repaint requested even when both fades remain unchanged. `tests/scroll-metrics.test.mjs` separately checks the pure
geometry projection, getter-only fields and atomic notifications across 240 cases.
See the
[measurement audit](GIT-RENDER-BUDGET.md#measurement-lifetime-audit) for the full
cache ownership inventory and unchanged paths checked.

`tests/git-section-reveal.test.mjs` checks the actual rendered-section invariant
after every reveal and state transition, including the tenth-item header boundary,
notice-only sections, tab moves, history expiry, missing rows, notice resolution,
folds, refreshes and 200-row capped batch cycles. The same invariant wraps every
real renderer frame in `fleet-read-notices`, including authoritative 404s and
mixed failure/recovery transitions. Intentionally folded eligible headers are
exempt; every unfolded header must have a row or visible notice beneath it.

`tests/git-scroll-window.test.mjs` now checks the mounted prefix, ten-item reveal,
60-PR/100-item cap, 200-row reachability, cycling Show more, insertion anchors,
folds and notice-height updates. `tests/git-row-presentation.test.mjs` checks pure
memoisation/invalidation and fresh native callbacks. `tests/git-native-scroll.test.mjs`
changes only the actual native-handle model for thumb/track/keyboard movements,
without fake content/frame events. It checks truthful render-time fades, next-event
reveal, finite post-layout underflow fill and accepted middle/end anchor repaints.
`tests/git-scroll-anchor.test.mjs` exercises yielded native scroll-handle requests,
retired-handle release and obsolete-scope refusal without render effects.
`tests/git-scroll-fades.test.mjs` checks both views at 75/100/130/200% zoom using
actual shared `SidebarScrollState` and passive `topFade`/`bottomFade`: start, middle,
end, fitting content, scrollbar motion, resize and folds, plus byte-identical shared
packaging. `tools/measure-git-render.mjs` records five disposable native render-build
samples for complete 30/60/100/200 mounted trees, deliberately bypassing the runtime
cap; warm mode warms only pure caches, never native callbacks. It records native
interruptions honestly. These are not live desktop paint/input timings or deployment evidence.

## Connected fleet fixtures

`tests/fleet-diagnostics.test.mjs` loads the packaged Crew provider/transport and
uses disposable supported read/CAS log IO. It distinguishes transport, timeout,
status exit, malformed status, layout/membership uncertainty, authoritative absence
and generation/identity/lease discards; checks reason/time/generation, duplicate
mod deduplication, fixed bounds and logging-failure isolation; and rejects raw
secret-bearing process output in facts/logs. Render inspection is effect-free.
The real Git fixture exercises Stale/Loading tooltip details and cold Loading
without display history, PR inventory, folder probes or worker authority.
Preference round trips explicitly exclude the diagnostic key. These are synthetic
failures, not evidence that the original recovered incident was a timeout or any
other particular cause; no live installation, settings or process is changed.

`tests/fleet-missing-pulls.test.mjs` covers silent confirmed absence for live and
historical tasks, exact repository/number cache reuse across refresh, hide/show,
context changes and panel recreation, one sanitized log line per session, mixed
found/missing rows and removal of previously loaded missing facts. A synthetic
clock checks live misses immediately before/at the five-minute recheck boundary,
shared live/history links, task completion, corrected URLs, later creation at the
same number and no duplicate pending rechecks. It also checks explicit access/auth,
network, rate-limit, timeout and uncertain repository errors remain visible and
retryable, including refusals quoting missing-resource text. Hidden, disabled,
stale, removed-link and superseded replies cannot publish absence or log it. A new
module session reads again; no persistent negative inventory or timer is introduced.
The real renderer fixture additionally checks both tabs contain no missing-task
row, notice, hint, tooltip or empty header/enrollment footer while found rows remain.
These are synthetic responses and native-element fixtures, not live desktop proof.

`tests/fleet-read-failures.test.mjs` and `tests/fleet-read-notices.test.mjs`
exercise the actual targeted-reader and panel renderer with one live draft and
three finished-task merged PRs in the same repository. They preserve Open 1 /
Closed 3, the three-read concurrency limit, GitHub timestamp bounds and last-good
facts. Fixtures cover rejected spawns, signed/unsigned Windows 0xC0000142 exits
with empty stderr, command timeouts, account/resource refusals, rate limits,
malformed responses and real DNS/connection failures. Local command failures say
**Could not read pull requests; refresh to retry**; only genuine connectivity
failures say **GitHub is unreachable**. A known Closed failure never appears in
Open; each applicable repository section gets at most one notice, including mixed
causes and partial recovery. Cold historical failures use a Closed history-load
notice without inventing state/counts. Expired history cannot leave error-only
headers. Notice-only sections remain visible without an empty state; other-tab
rows/errors cannot keep empty headers, and settled empty tabs reuse ordinary Git's
wording. Folds, unenrolled repositories and hidden/stale/disabled contexts retain
the existing read and refresh boundaries. Folder-Git pagination tests also preserve
execution result facts and healthy rows on these failures. These are synthetic
process/provider responses, not proof that the original installed-app incident was
caused by Windows load or an account switch; the real-provider four-PR diagnostic
succeeded and no original failing process result was recovered.

`tests/fleet-toggle-live.test.mjs` mounts separate Settings-page and Spaces sandboxes
with the real registry, Crew reader, sidebar lifecycle, row renderer, badge colours
and shared-state invalidation queue. Local/remote assertions cover both toggle
directions without advancing a timer or closing Settings, pending verification,
transport/negative results, enable-disable-enable with obsolete replies and sibling
switch writes. Both expanded-row chains appear immediately before their Crew pills
after verification and disappear on disable. Expanded rows, compact rails and drag
chips retain native shortcut indices, and rails/chips never render chains. Render guards reject notifications, focus allocation, IO and shared
writes. The original toggle source fails because it starts zero reads until a
later Spaces lifecycle event. Additional fake-clock cases start with the preference
already enabled: rejected/timed-out first reads recover using only the actual
Spaces 250 ms timer, with no click or unrelated interaction. They pin completion-
based 2/5/10-second backoff with a ten-second cap for every retryable reason,
no early lifecycle retries, no new timer, immediate
disable, authoritative absence, module replacement, first-frame retained display,
expired abandoned readers and obsolete completion refusal. The pre-backoff source
fails the two-second timer-only recovery assertion (2 status reads instead of 4).
The previous 15/60-second policy fails the new ten-second deadline-cap assertion;
local/remote transport failures and timeouts exercise repeated ten-second recovery.
Replacement graphs also reject persisted old-policy deadlines. Strict Git
context recovers only after witnessed verification on both machines. These fixtures
prove scheduling and rendered rows, not native pixel timing. A read-only-state/native screenshot baseline on
0.1.17 showed verification pending at one second and attachment by seven seconds
with Settings still open; it did not reproduce a hard close-only repaint freeze.

The repeated-toggle regression now covers selected coordinator/fleet, one/seven
workers, 0/1/15-second off intervals, old success/failure replies in both orders,
local/ready-remote groups, supported one-MiB status replies and a lost decoder turn.
A two-second raw-response processing deadline recovers both cold and warm readers
without finally or the old successful-attempt TTL, and resumed obsolete work cannot
overwrite recovered state. Resume-before-replacement is covered separately: after
Spaces witnesses warm verification, a withheld decoder resumes at 2100 ms without
a lifecycle tick; the next tick at 2250 ms starts both local and remote reads rather
than waiting for the old ten-second TTL. Cold verification uses the same ordering. `src/plugins/crew/base64.test.mjs` checks bounded string
calls, real-turn yield boundaries, cancellation, split UTF-8 and 4096-task validation.
`fleet-command.test.mjs` executes the actual Windows PowerShell projection against a
disposable CLI, including advertised view/legacy branches, exact stderr/exit codes,
large unused fields, old Open history and malformed-shape preservation. Pretty
legacy fixtures scale together from 5k/400 tasks to 20k/1600 and 50k/4096 lines/tasks;
whole-wrapper wall-time ratios reject superlinear collection/projection growth.
The original growing-array collector times out on this regression.

The opt-in `tests/features/fleet-toggle-native.mjs --run` creates only a disposable
app/Core session with eight inert Node terminals, selects the actual seven-tab
fleet and focuses a worker before opening packaged Settings. Synthetic Crew output
alone replaces transport. The pre-fix App 0.1.17 reproduction interrupted the old
decoder on a valid approximately 925 KiB reply and left on plus independent rows;
PR 44 recorded expired-read with attempted/current generation 2 after 45 seconds.
The fixed native matrix attaches one-MiB replies (including 4096 tasks) in
1322–1486 ms for a 750 ms command, with decoder pieces at most 24 ms and status
parse/validation at most 16 ms. A deliberately uncatchable interruption was replaced
after 2084 ms, independent of finally. This proves the reproduced watchdog mechanism,
not the original person's exact response/load. No real A1, Crew/GitHub/SSH transport
or user installation is exercised. See [full evidence and the expected separate
Crew capability](FLEET-STATUS.md).

The additional opt-in `tests/features/fleet-transport-native.mjs --run --git-preview`
uses the **real Core exec / Windows PowerShell / projection / hc Base64 / native
decoder** path, not a synthetic transport. Only its legacy Crew CLI's data is fake;
10 KiB, 400 KiB/237 tasks and one MiB/4096-task replies are pretty-printed. It records
command wall time, projected UTF-8 bytes, whole decoder turns (including setup/final
join, excluding waits), and actual Settings-on-to-display publication. Its child
PowerShell pins and guards the disposable Crew path explicitly because Core exec
constructs its own environment. A final three-second read produces the native
Custom-theme Loading screenshot with no Settings/What's New overlay covering it.
It never targets the person's app/Core session. See the measured table in
[FLEET-STATUS.md](FLEET-STATUS.md#whole-path-windows-measurement).

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
reorder and Spaces render fixtures cover both-source dimming, a single ordinary
grabbed-row chip (`2 crew` or `1 coordinator`) with its own number/name and shared
coordinator fill from either grabbed member (including arm/return/fade), no stacked
preview or floating chain icon, and each expanded/compact row's own numbered badge
while preserving ordinary worktree order. The packaged Spaces layout regression
now compares the actual Agents branch/disclosure helpers: indented 16px numbered
child badges, 1.5px rounded connector, parent-only Crew and collapsed child count.
It covers both machine groups, truthful native indices, local fold restoration,
selection-transition disclosure, compact rail membership, unrelated child tags,
colour inheritance, previews, metadata/rename and independent cross-machine rows.
These are render-tree/geometry checks, not native hit-testing or pixels. Existing
Crew provider tests still assert its generic tag contributions; Spaces filters
only the attached child's Crew tag at presentation, with ordinary rules restored
on detach. No provider discovery or state write is added by tag rendering.
The existing colour-menu suites retain fresh-authority, Automatic, remote and
stale-target coverage; the shared right-edge suite uses the coordinator's actual
Crew pill as its reference now that attached children intentionally have none.
The packaged `tests/regression/space-colors.test.mjs` fixture covers coordinator and
fleet palette origins, selected swatches, mouse/keyboard and Automatic choices,
unchanged saved fleet colour/Automatic flags and unrelated-space preferences.
Rename/close/worktree targets remain the clicked space. Stale/changed/ambiguous,
disabled, missing, cross-machine or presentation-only unverified bindings refuse writes;
reopening a detached fleet restores independent controls. Actual detached row/rail
projections restore its own colour without copying preferences.
`tests/fleet-color-menu.test.mjs` uses separate packaged `custom-spaces` and
`custom-menu` instances with the real registry, Crew provider, menu and colour
state. Sidebar verification alone cannot authorize menu writes: opening an
attached palette starts or witnesses verification through the generic lifecycle,
yielding before shared writes or IO. The success matrix explicitly enumerates live
workers, closed tasks with a still-live terminal, a retained fleet after the last
worker exits, and a retained fleet with no tasks. Each runs locally and remotely,
from both menu origins, with mouse colour and keyboard Automatic choices, before
and after cold module restoration with persisted runtime facts or display identity
alone. Every state refuses a pre-verification click, then accepts the unchanged
binding after successful verification; retained fleets still have no live move links.
Shared in-flight witnessing/coalescing, reopening, failed/expired verification,
changed home/adoption/owner, missing members, unready/cross-machine layouts and
explicit disablement remain guarded. An empty fleet with no verified display
history stays independent instead of being inferred from names. Fleet saved colour
and Automatic flags stay untouched. No real Core or network is used.

`tests/fleet-git.test.mjs` loads the actual Git controller, aggregate source and Crew
provider through the package harness. Synthetic tasks/gh results cover coordinator
non-repo routing, recorded working/reported links, missing/new links, duplicate
cross-repository PR numbers, shared PR deduplication, scoped counts/errors, exact
worker robots, absent extra task heading/incomplete notice, repository enrollment
links, webhook burst coalescing, no membership-triggered GitHub reads, hide/show catch-up and
stale completions. It loads the real shared UI header and covers machine-style
chevron geometry, default expansion, independent repository folds, localStorage
restore after panel recreation, temporary repository absence, tab/refresh changes,
selected-tab counted expanded/collapsed headers, unchanged top-level totals while folded,
hidden/restored scoped body errors, fixed enrollment visibility, stale toggle
guards, no fold-triggered reads and no false empty state when all sections fold.
Open/Closed switches omit other-tab-only headers, restore saved folds on reappearance,
and retain unchanged totals. Enrollment fixtures keep hidden-tab repositories in
full-inventory picker order, independent of section visibility.
The merged fixture retains the real shared-relay deferred-delivery/render guards,
PR label add/remove assertions and new shared row/separators. The enrollment fixture
also feeds header available/intrinsic layout widths across 75–200% scales: fitting
names have no tooltip, overflowing names do, widening removes it, repeated callbacks
never loop notifications and old-scope measurements are ignored. The invisible
probe is clipped and absolute so no count-width placeholder or extra row remains.
Long outages retain rows/counts/folds with Stale and no robot,
read or live-consumer authority; cold controllers render standard Loading without
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
stale robot refusal. It additionally drives the actual relay consumer with settled
Open-to-Merged, close, reopen and draft transitions, including a merge during a held
read, checking current totals and unaffected row order. The delivered-event case
passes on the pre-fix source; this is not proof of the screenshot's missed-event
cause or live relay delivery. Finished-task rows use the merged shared row's labels, absent
Owner badge and centred metadata separators rather than a separate historical renderer. The provider also checks source size/task bounds and rejects
another owner/home or machine. No fixture reads real task reports or GitHub.
Recorded links deliberately do not guarantee pre-report PR discovery. Native pixels,
actual drag motion and real remote execution remain unverified without separate
authorization; fixture success is not deployment evidence.

## Agents group dot columns

`node --experimental-vm-modules tests/agents-dot-column.test.mjs` resolves the real
Agents renderer and shared status helpers at 220–390px widths and 75–200% zoom,
including 130%. Mixed Working/Done states and 1/10/100 counts share a dot column;
9/10 and 99/100 transitions retain it. Expanded counts keep the same right-aligned
32px slot; time and chevron rails stay unchanged. Resolving Done's horizontal
margins is essential: the regression fails on the original mixed-state renderer.
These are synthetic box assertions, not native pixels.

The explicitly opt-in Windows command
`node tests/features/agents-dot-native.mjs --run` builds into a disposable app home
under this checkout's `.artifacts/`, with synthetic agents and no terminals or
Core reads. It captures 130% native rendering with collapsed and expanded 1/10/100
counts, measures painted dot centres and count glyph bounds, and asserts aligned
group dots and count right edges (within one pixel of glyph raster rounding).
Its screenshot, status and measurements remain in the printed artifact directory.
Only its own app and isolated Core session are shut down; the running personal app,
installed customizations and preferences are untouched.

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
| 21 scripts under tests/features/ outside new-menu | Both | Native rendering/checks, preview UI or actual click/screenshot handling. The two new-menu unit tests remain included. |
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
The same fixture checks `.github/workflows/review-labels.yml` against the shared
label-only caller, keeps delivery/test triggers label-free, and preserves the
required-check set in `.github/protection.json`. The separate workflow publishes
only `review-labels / Reconcile managed review labels (advisory)`, never a required
gate. Its declared Actions-policy path still needs live authorization after merge;
a declaration or local fixture pass does not prove the advisory job ran.

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
24 the current selection is **178 Ubuntu / 177 Windows entries**, with two/three
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
tests/choice-menu.test.mjs
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
tests/feedback-native-stock.test.mjs
tests/file-refresh.test.mjs
tests/file-tab-reuse.test.mjs
tests/files-plugin-tabs.test.mjs
tests/files-refresh-policy.test.mjs
tests/firstmate-profile-role.test.mjs
tests/fleet-color-menu.test.mjs
tests/fleet-diagnostics.test.mjs
tests/fleet-discovery.test.mjs
tests/fleet-enrollment.test.mjs
tests/fleet-git.test.mjs
tests/fleet-history.test.mjs
tests/fleet-preferences.test.mjs
tests/fleet-read-failures.test.mjs
tests/fleet-read-notices.test.mjs
tests/fleet-reorder.test.mjs
tests/fleet-toggle-live.test.mjs
tests/folder-browser-multi.test.mjs
tests/folder-content.test.mjs
tests/frame-upgrade.test.mjs
tests/git-checks-fallback.test.mjs
tests/git-checks-order.test.mjs
tests/git-ci-fix.test.mjs
tests/git-context-menu.test.mjs
tests/git-core-monitor.test.mjs
tests/git-count-badges.test.mjs
tests/git-github-accounts.test.mjs
tests/git-location.test.mjs
tests/git-monitor-settings.test.mjs
tests/git-notices.test.mjs
tests/git-panel-errors.test.mjs
tests/git-relay-lifecycle.test.mjs
tests/git-repository-checkboxes.test.mjs
tests/git-repository-cli.test.mjs
tests/git-repository-routing.test.mjs
tests/git-row-geometry.test.mjs
tests/git-row-labels.test.mjs
tests/git-webhooks.test.mjs
tests/herdr-upgrade-evaluate.test.mjs
tests/herdr-upgrade-publish.test.mjs
tests/herdr-upgrade-refresh.test.mjs
tests/herdr-upgrade-releases.test.mjs
tests/herdr-upgrade-report.test.mjs
tests/host-facade.test.mjs
tests/host-gate.test.mjs
tests/installed-export.test.mjs
tests/native-selection.test.mjs
tests/ownership-report.test.mjs
tests/pane-crew-role.test.mjs
tests/panel-kit.test.mjs
tests/panel-pin-ui.test.mjs
tests/panel-state.test.mjs
tests/palette-native-stock.test.mjs
tests/pin-swap.test.mjs
tests/pinned-pr-refresh.test.mjs
tests/plugin-prerequisite-ui.test.mjs
tests/plugin-section-geometry.test.mjs
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
src/plugins/crew/base64.test.mjs
src/plugins/crew/fleet-command.test.mjs
src/plugins/crew/fleet-discovery.test.mjs
src/plugins/crew/fleet-refresh.test.mjs
src/plugins/crew/fleet-transport.test.mjs
src/plugins/crew/fleet.test.mjs
src/plugins/crew/plugin.test.mjs
scripts/ci-required.test.mjs
```

### Ubuntu only

```text
tests/file-delete.test.mjs
```
