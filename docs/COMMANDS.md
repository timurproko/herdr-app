# Customization commands

Run customization commands from this standalone checkout, wherever cloned.
Deployment targets HERDR_APP_HOME or ~/.config/herdr-app, not the checkout parent.
See TESTING.md before running tests: the unchanged broad suite includes installed
host/private-environment assumptions; native/live commands need separate approval.

## Validate after a Herdr update

```powershell
npm run check:host-api
npm test
npm run test:integration
npm run test:native
```

`check:host-api` requires App 0.1.13+, required APIs/commands and the direct-import
boundary. Newer unreviewed hosts pass with a **newer than last reviewed** advisory.
The tab-move source audit is advisory, not a deploy gate.

Optional palette/feedback refreshes use proven current stock and checked structural
anchors/capabilities, not exact reviewed files or release membership. Both accept
0.1.17 stock and retain its native actions, including dynamic palette themes.
Automatic repair touches prior opt-ins only. An actual missing/ambiguous required
anchor, unavailable source evidence or failed self-check leaves the patch unchanged
with a specific advisory; ownership/conflict and recovery-required states are hard
errors. Doctor distinguishes active, repair-needed, incompatible and retained old
output without applying anything. No unknown target/helper is overwritten and raw
backups/journals remain available for guarded restoration. See
[compatibility and recovery](../src/integration/native-patches/README.md). No live
deployment or UI validation is implied by the disposable fixture results.

Definite update failures keep their stage/cause in the Settings row, for example
**host check refused Herdr 0.1.17: missing command tab.new**, **build failed** or
**install failed: Personal file conflict**. Details still link the matching log or
result; timeout/missing-result outcomes remain unknown and block replay.

## Build and install

```powershell
npm run build              # generate dist/ only; does not modify Herdr runtime files
npm run deploy             # compatibility check, build, guarded install and backup
npm run doctor             # verify installed ownership, version and native patches
npm run report:ownership   # classify Custom, Herdr, unknown and recovery runtime
npm run check:native
npm run check:tab-move      # pinned upstream release diff + synthetic move/menu tests
```

For a candidate release: `npm run check:tab-move -- --release 0.1.17`.
For no network: `npm run check:tab-move -- --offline`. Host/deploy checks automatically
audit versions unknown to tab moving; they never auto-approve an unknown release.
See [tab-move compatibility](TAB-MOVE-COMPATIBILITY.md) for exit codes and limits.

`npm run deploy` reports a backup ID such as `1794317616472-43564`. Keep that ID
if the live result needs to be reverted.

For a focused update while another branch has unrelated changes installed, use
repeatable canonical source selectors (a directory selector must end in `/`):

```sh
npm run deploy -- --source src/plugins/git/ --source src/integration/herdr/host.js --source src/integration/herdr/compatibility.js --source src/features/settings/main.js --source src/features/settings/plugins-ui.js --source src/features/settings/sidebar-ui.js --source src/ui/settings-back.js
```

This still runs the compatibility check and full customization build. Only selected
mod/runtime outputs are installed; existing unselected ownership hashes, bytes,
layout base and preference files are preserved. Dependency-only changes reload the
exact installed, verified-owned entrypoint, not the current branch's entrypoint.
All conflicts are checked before writes. It requires an existing owned installation,
rejects unmatched/unsafe selectors, never prunes unselected or obsolete files, and
cannot update layouts/themes. Include every changed dependency's canonical source;
this option is not automatic dependency or branch merging. A later **full** deployment
still installs the complete current checkout, so reconcile its other branches first.

## Core-only shell installation

From a standalone checkout with Node 20+, without Desktop or a Custom layout:

```powershell
npm run deploy:shell                 # build and install only the four shell files
npm run deploy:shell -- <home>        # optional explicit home overrides HERDR_APP_HOME
npm run rollback:shell -- <backup-id> # restore only a verified shell-only journal
```

This fixed subset shares the full deploy lock, manifest, conflict checks and backup
journals. It preserves non-shell ownership, files, layout base and preference bytes;
it does not validate/project layouts, enable Custom, refresh patches, edit profiles,
install remotely or restart processes. Preference bytes are read only for journal
safeguards, never parsed by this mode. A later full deploy recognizes the same shell
ownership. Use README's exact installed profile lines; no source checkout is needed
by the running shells. Shell rollback also accepts an explicit home after its ID.
Mixed/full journals, later edits and newer ownership/preference records are refused.

## Watched all-machine deployment

`npm run deploy:all` requires clean main on the desktop, including untracked files.
It fetches origin, refuses ahead/diverged or unsafe source before contacting peers,
then fast-forwards and uses the existing full deploy. It never stashes or resets.

Peers come from `hc machine ls --json`, not terminal membership. Connected eligible
peers run a supplied Node worker through `hc exec --on <machine> --timeout 600 --json -- node -e ...`,
without creating a terminal. The worker checks the existing checkout at
`~/.local/share/herdr-app`, fetches and fast-forwards clean non-ahead main of this
repository, then runs `npm run deploy:shell` into that peer's default
`~/.config/herdr-app` (remote HERDR_APP_HOME overrides are deliberately not used).
Offline peers, absent tools/checkouts, unsafe source and unreadable ownership are
skipped with reasons. Full desktop ownership is skipped as **needs its own full deploy**.
A failed local/remote deployment does not prevent later peer attempts. There is no
remote cloning, tool installation, checkout repair, terminal input or process restart.

```powershell
npm run deploy:all -- --dry-run
npm run deploy:all -- --only local,pc2
npm run deploy:all -- --skip-local
```

`--only` accepts comma-separated configured peer names, plus `local` or this
computer's hostname. Unknown names fail before deployment. `--skip-local` overrides
local selection; neither option bypasses the clean-main source gate.
`--dry-run` still fetches to compare: Git objects and remote-tracking refs are the
only mutation exception. HEAD, working files, dist, installed homes and backups
stay unchanged; no compatibility check/build/deploy runs. It reports **would deploy**,
not an installed-version claim. Every selected eligible checkout still runs its
installer in a real run, even at equal HEAD; only a successful no-change installer
can report **already current**.

The final table contains **Machine | Action | Source commit | Backup**. Deployed
rows name the source SHA actually used; failed rows label it attempted, dry-run
rows target, and unavailable values are `-`. Backup IDs come from the existing
deploy JSON, including any printed before a failure. The table alone records no
installed Git provenance. Real runs additionally write the latest atomic
`<Herdr home>/.customizations/deploy-all-result.json` after the desktop and each
peer, including source refusals, machine outcomes and printed backup IDs. A
successful full desktop result records its source SHA and ownership-manifest
digest; only matching evidence without a later local failure identifies an
installed revision. Old or changed installations omit the revision from the
Settings title, showing only `herdr-app-custom`, never checkout HEAD or a stale
SHA. A successful main check still offers Update when the revision is unknown. Peer skips/failures preserve a successful desktop revision;
dry-run writes no result sidecar. Main can advance between peers, so SHAs may differ.
Any failed machine, unsafe source, inventory or option error exits 1; only deployed,
current and stated-skip outcomes exit 0. Calls have tool/fetch bounds of 15/60 seconds,
a 600-second remote cap and a 615-second outer transport deadline. A disconnect or
timeout after dispatch means outcome unknown: inspect the machine before retrying.
There is no automatic retry or rollback, or cross-machine transaction; retain the
printed backup IDs and use the existing recovery commands below.

### Settings customization updater

The Updates row launches one terminal-free detached Node runner; the mod does not
supervise its own replacement. It uses only the desktop's ordinary clone at
`~/.local/share/herdr-app`, creating it on first Update if absent. Wrong, dirty,
ahead/diverged, redirected or linked source is refused, never repaired. Git,
Node 20+, npm and hc must already be available in the desktop/Core environment.
Before executing checkout code, the runner validates source, fetches and safely
fast-forwards that managed clone, then starts a fresh Node process and verifies
the CLI's read-only `--protocol` response. This bootstraps clones predating the
row instead of keeping their old CLI loaded through its own fast-forward. Only
then does a fresh deploy:all CLI run with the captured Herdr home; it repeats its
normal source gates. No developer checkout, npm install/prepare, daemon or
scheduled task is involved.

The native Herdr and herdr-core update rows check hourly. Custom uses its own
cadence, as the Settings explanation distinguishes; it does not change native
checking or herdr-core's terminal continuity through updates.

Automatic availability checks run independently on each Desktop/Custom machine
while its chrome is mounted: a jittered 120–180 second healthy cadence in both
the UI scheduler and worker cache. Startup, focus after two minutes inactive and
sleep-delayed timers catch up without opening Settings. Persisted failure retries
back off roughly 5, 10, 20 and at most 30 minutes with jitter, resetting on success.
Check now still forces a bounded read under the same check lease. There is no
guaranteed public online/resume event; retry/activation is the offline fallback.
Checks never deploy, fetch a checkout, probe peers or change native readiness.

An optional `updates.watch` subscription uses Git's single chrome-owned relay
without depending on the Git panel or selected repository. Main pushes and merged
PRs for this customization trigger only a 300 ms debounced authoritative main read,
with a persisted 15-second automatic floor, one dirty follow-up and the same lease.
Failure backoff wins over hints; Check now retains its manual bypass. While an
update is running, automatic checks wait at least 30 seconds between worker
requests even if the main-check deadline has expired. Pending hints survive that
busy interval and catch up after completion without launching another update. Git disabled,
legacy relay notices, absent credentials or no enrollment leave independent polling.
After eventual merge, each desktop needs an explicit initial full installation;
near-immediate hints additionally need a person-owned relay **Configure** upgrade
and **Repositories → Account → Add repo → select timurproko/herdr-app → Add**.
Existing relay protocol 1 remains usable for Git CI; Settings detects its old notice
version and offers Configure after explicit tooling/login readiness. No cloud or
webhook operation runs just because you install this code or open Settings. See
[complete rollout steps](GIT-WEBHOOKS.md#customization-update-discovery).

The selected Herdr home's `.customizations/` holds only the latest operation:
`update-status.json`, `deploy-all-result.json`, `update-check.json`, `update.log`,
`update-runner.cjs` and the active `update.lock` (plus a short check lock). These
are private runtime files, not portable preferences. Reload/reopen reads the same
status. The update has a 30-minute deadline in addition to existing subprocess
limits; a deadline/crash/missing result reports outcome unknown, never success or
automatic retry. The installer's own eight-minute npm timeout is also unknown:
especially on Windows, termination of cmd.exe does not prove npm/installer
descendants stopped. Its structured unknown result retains update.lock even
when the CLI exits and a fresh Check succeeds. Remote work already dispatched
might still finish.

When the desktop succeeds but peers skip/fail, the single row names that fact and
its matching details path: **Log:** points to `update.log` for a detached Settings
run; **Details:** points to `deploy-all-result.json` for an ordinary CLI run that
captured no log. A missing or unrelated earlier Settings log is never advertised.
Inspect the matching file for individual reasons and backup IDs.
Desktop failure states the short cause and documented rollback recovery for both
Settings and ordinary CLI runs, even after a successful version check. A definite
failure may offer an explicit retry after a fresh successful check, without hiding
the failure line. A CLI installer timeout remains unknown and blocks Settings
launches at the worker boundary too, even when no Settings job/lock was created;
its durable result itself carries the unresolved outcome. There
is **no automatic rollback**: from the managed clone with the same HERDR_APP_HOME,
use the existing `npm run disable` then `npm run rollback -- <backup-id>` sequence
below. If a failure produced no printed ID, inspect `.customizations/backups/` and
the log to identify the matching journal; do not guess or bypass refusal gates.

An unresolved `update.lock` blocks another Update even after a crash. Inspect its
matching `update-status.json`, PID/childPid, log, result and any dispatched machine;
wait for active work, and use normal rollback recovery for uncertain writes.
**Manual resolution, one step:** only after checking that the recorded processes,
all npm/installer descendants and any dispatched remote updates have stopped,
and completing any required recovery, move `deploy-all-result.json` out of the
captured home's active `.customizations/` path to a private recovery location,
and remove `update.lock` and `update-status.json` if present; then reopen Settings
and Check now. Preserve that moved result, the log and backup journals. This also
resolves a plain CLI timeout with no Settings lock. Removing only the lock/status
deliberately does not clear the durable unknown result; revision evidence will
be unknown until the next successful full deployment. Never delete
`.customizations/deploy.lock` to force an update, reset a checkout or replay an
uncertain remote request.

### Retrying the App 0.1.17 blocked update after merge

For an installation that already has the Updates row, no manual deployment or
installation is needed first. Open **Settings → Updates → herdr-app-custom**,
click **Check now**, then click **Update** once offered. The existing runner
fetches and fast-forwards fixed published main in `~/.local/share/herdr-app`
**before** loading its deployment CLI/host check, so the old exact-version refusal
does not prevent receiving this fix. A definite failed attempt can be retried
following a fresh successful check; a running/unknown outcome or unresolved lock
must be investigated, never bypassed by deleting status/locks or resetting source.
The desktop update can finish with optional palette/feedback skip advisories;
see the native patch policy above for what stays stock or retained. An already
current shell-only pc2 does not need an App upgrade or native patches.

### Trying the row after merge

These are maintainer actions, **not agent tests**. Do not install from an unmerged
feature branch or a crew worktree. Keep Node 20+, Git, npm and hc on Core's PATH;
existing host/A1 compatibility gates still apply.

1. After merge, create the ordinary main clone at `~/.local/share/herdr-app` if
   absent, or ensure its existing source is clean main of this repository. Run
   `npm run deploy:all` there; it fetches/fast-forwards and performs the first
   installation, including the new row. This command updates eligible peers too.
   Do not run npm install/prepare, switch an unsafe clone, or deploy automatically.
2. Open **Custom Settings → Updates**. Beside unchanged Herdr/herdr-core rows,
   **herdr-app-custom <short revision>** should use the same typography and one
   button. **Check now** must disable as Checking… and show **Up to date. Checked
   at HH:MM.** when installed and published main match. Its button briefly shows
   disabled **✓ Up to date** using the native recent-request window: the request
   timestamp is refreshed every 300 ms while checking and expires after 3000 ms
   of age, then the button returns to Check now without erasing the check time.
   A peer skip/failure instead
   keeps the desktop revision and matching log/result-path warning; read its reasons before trying
   those machines. Do not erase status files just to manufacture a clean result.
3. **Update available:** when published main advances after that installation,
   click Check now (or wait for the mounted 2–3 minute check); the button becomes
   Update and the existing Settings/compact More dots light. A first installation
   using ordinary `npm run deploy` instead of deploy:all legitimately has unknown
   revision and also offers Update after checking; do not fabricate a receipt.
   Click Update once, navigate away/reopen Settings during Updating…, and verify
   one operation completes through the mod reload. Confirm terminals/focus stay
   unchanged and only eligible existing peer shell installations were updated.
4. **Failure state:** with no update running, temporarily disconnect this
   desktop's network, click Check now and expect **Check failed. Try again.**
   Restore connectivity and check again. No deploy/rollback is needed to exercise
   this state. A previous confirmed available dot stays lit during failed checks.
5. Inspect the captured home's `.customizations/update-status.json` and
   `update.log`, and `deploy-all-result.json` for per-machine details/backup IDs.
   A real desktop deploy failure or timeout is not a test to induce in the live
   home: follow the manual recovery/unknown-outcome rules above. UI geometry,
   detached survival under the actual Core, permissions and real peer behavior
   remain observations for the maintainer, not conclusions from fixture tests.

### Read-only capture of a missing update dot

Before pressing **Update**, leave Settings → Updates visible with **Update
available.** and the expanded footer Settings icon in view. Merging a source change
puts published main ahead of the installed build, providing the next natural
reproduction; do not deploy first or alter any status/receipt/shared file.

From a checkout containing this inspector, run
`node tools/inspect-update-markers.mjs .artifacts/update-markers-before-update`.
An optional second argument selects the actual Herdr home; otherwise it uses
`HERDR_APP_HOME` or `~/.config/herdr-app`. It issues only **status, shot, status**
to the already-running desktop and fails if none is listening. It does not start
a desktop, install a diagnostic mod, open an overlay, check or deploy. Output is
`capture.json` and `desktop.png` under the checkout's ignored `.artifacts/`;
no live-home file is written. Keep captures private: they contain local paths,
update results, window status and a screenshot of your desktop.

Read the capture in this order:

1. Compare the before/after `published.check.available` from the selected
   `shared.json` key `custom.customization-update` with
   `.customizations/update-check.json` (`persistedCheck`), their checked/attempted
   times and any check error. Different facts indicate publication/persistence
   lag, a concurrent status publication or a different selected home; they do not
   prove a rendering problem. Both samples true rule out **persisted** false
   availability at those sampling times, not stale in-memory state at render time.
2. Inspect `status.layout`, zoom/errors, `footerConfiguration` and
   `savedLayoutState`. The expected Custom footer references
   `custom-workspace-chrome` with `{footer:true}`. A sidebar width under 160 selects
   More; an expanded sidebar selects icon-only footer items. Verify against the
   screenshot, because saved layout/state is not a live geometry API. Source hashes
   and relevant predicate lines identify the installed bytes and whether they
   differ from this checkout; differing hashes alone are not a diagnosis.
3. In `desktop.png`, inspect the Settings gear, the Updates navigation item and
   the Update-available row **in the same frame**. The native-ready and Custom-ready
   circle paths are identical within each Custom surface: footer circle is 6px at
   top 2 / right 2 of its relative icon target; navigation is 7×7px, radius 4. Scale
   logical pixels by status zoom. Look for clipping at the target/rail boundary,
   another surface covering the corner, or no contrast with the background.
   `configuredAppearance` supplies the configured palette, not guaranteed runtime
   theme colors. Do not infer a successful draw from the predicate alone.
4. **Important limit:** Herdr 0.1.16's supported `status`/`ls`/`shot` CLI exposes
   neither a mod render tree nor a last-render timestamp/in-memory shared read.
   The screenshot proves what the visible footer contained, not whether an absent
   circle was never emitted, was clipped/covered, or belonged to an older render.
   This tool deliberately reports last-render availability as **unknown**. These
   remaining possibilities cannot be distinguished retrospectively by pretending
   disk state is render state; preserve this capture for a separately authorized
   runtime-instrumentation investigation if necessary. Do **not** use
   `tools/inspect-live.mjs` for this read-only procedure: it installs a temporary mod
   and writes a receipt into the live home.

### One-time new peer setup

Do these manual steps **on the new peer**, not by running deploy:all. Install Git,
Node 20+ and npm yourself, ensure they are on **Core's PATH**, and configure this
peer in Herdr Machines. `hc` on the desktop must support machine listing and
terminal-free remote exec. A Core-only peer needs no Desktop or Custom mods.
A plain HTTPS clone is sufficient; no management/adoption record is created.

PowerShell on the peer:

```powershell
New-Item -ItemType Directory -Force "$HOME/.local/share" | Out-Null
git clone https://github.com/timurproko/herdr-app.git "$HOME/.local/share/herdr-app"
Set-Location "$HOME/.local/share/herdr-app"
npm run deploy:shell -- "$HOME/.config/herdr-app"
```

Bash on the peer:

```bash
mkdir -p "$HOME/.local/share"
git clone https://github.com/timurproko/herdr-app.git "$HOME/.local/share/herdr-app"
cd "$HOME/.local/share/herdr-app"
npm run deploy:shell -- "$HOME/.config/herdr-app"
```

The explicit home selects the same peer default used by deploy:all, even if an
interactive shell has HERDR_APP_HOME set. Keep this checkout clean on main.
Wire shell profiles explicitly using [README's installed lines](../README.md#installed-shell-reporting).
Installing updated files does not restart or inject input into live shells;
compatible Bash payloads reload at an idle prompt, while dispatcher changes may
need a person to re-source the installed loader or open a new shell. Existing
[backup-ID recovery](#disable-enable-rollback-or-remove) remains unchanged;
Core-only hosts use [shell-only rollback](#core-only-shell-installation).

## Disable, enable, rollback or remove

```powershell
npm run disable
npm run enable
npm run rollback -- <backup-id>
npm run remove
```

Ordinary rollback always requires a valid backup ID reported by deploy and a
verified stock layout: switch to Herdr/main first with `npm run disable`. It refuses
later personal edits or newer deployment records. The explicit shell-only recovery
above is the narrow Desktop-free exception, not a bypass for full journals.
`remove` removes only files owned by the customization manifest; it does not
uninstall or rebuild Herdr.

## Portable preferences

```powershell
npm run preferences:export
npm run preferences:import
```

Both commands use `<Herdr home>/preferences/`, never the checkout: home is
`HERDR_APP_HOME` or `~/.config/herdr-app`, matching deploy. Host snapshots use
`<lowercase-hostname>.json`; portable visual backups are `layout.json`,
`palette.json` (picker metadata) and `theme.json` (native-schema theme).
The underlying `node tools/preferences.mjs export|import [home]` and
`node tools/runtime/preferences.mjs export|import [home] [hostname]` entrypoints
also accept an explicit home, which takes precedence over the environment.
The lower runtime helper handles host settings and palette metadata. Full deploy
also installs a supported **export-only** entrypoint with all four snapshot classes:

```powershell
$HerdrHome = if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { Join-Path $HOME '.config/herdr-app' }
node "$HerdrHome/.customizations/runtime/scripts/export-preferences.mjs" export "$HerdrHome"
```

It requires `export` and an explicit home, uses the recorded installed layout base,
and works without the source checkout. Import and extra arguments are refused.
`npm run preferences:export` shares the same export operation, preferring the
installed base and retaining authored-layout validation for source-only usage.
No profile or pull hook is installed; preference restoration remains explicit.

Import is explicit: close Herdr Desktop first, leaving Core/terminals running.
Existing palette conflicts must be reconciled, not overwritten. Snapshots are
credential-filtered **private backups**, not anonymized or public-safe files;
keep them in private dotfiles, never this repository. Session data and per-space
color IDs are excluded; space colors remain machine-local in `shared.json`.

## Typical explicit host installation (not performed by this import)

```powershell
# Run from this checkout; choose HERDR_APP_HOME explicitly if needed
npm run check:host-api
npm test
npm run deploy
npm run doctor
```
