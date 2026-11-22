# Design: update Custom from Settings

## Context

See [proposal.md](proposal.md) for motivation. This is a plan for approval, not authorization to deploy.

### What the repository and host actually provide

| Evidence inspected | Finding and consequence |
| --- | --- |
| `src/features/settings/main.js`, `updates()` and `render()` | Custom already owns its Updates page. It renders the native versions/status and invokes `app.check_updates`, `app.update`, `app.update_core` and `app.whats_new`. Add a sibling row here, not a replacement native updater. |
| `src/ui/settings-sections.js`, `tools/runtime/settings-sections.js` | `updates` already exists in the canonical catalog; the tools file is a re-export. No extra section, parallel catalog or plugin is necessary. |
| Stock `frame/settings/main.js` and `mods/workspace-chrome/main.js` (read-only inspection) | Stock Updates is rendered in JavaScript; the stock corner dot reads `updates().app.ready`. The stock Settings navigation also includes unmanaged Core readiness. |
| Generated `herdr.d.ts`, especially `updates`, `notify`, `exec`, `hc`, `shared`, `setShared`, `checking` | `updates()` is a getter with fixed App/Core fields. There is **no supported third-party update registration, native row injection or native dot setter**. `notify()` posts a toast, not that dot. `setShared()` re-renders other mods and is sufficient for Custom-owned indicators. |
| `src/features/workspace-chrome/main.js`, `footerIcon()` and compact footer | Custom owns both expanded Settings and compact More dots; they currently read App readiness. Extend these predicates with Custom availability, preserving native behavior. No frame patch is needed. |
| `tools/check-host-api.mjs`, `host.js`, `compatibility.js` | A facade checks required functions/commands and reviewed host versions; this does not magically supply an extension API. New code uses the existing facade. Production deploy still runs the host gate. |
| `src/plugins/crew/plugin.js` | Precedent: per-machine Git/Node checks, no-terminal `hc exec`, bounded checks/install, installed revision, Install/Update vocabulary and refusing wrong clones. Reuse the approach, **not** its Windows-only scripts or its reset-to-rewritten-history exceptions. Feature code must not import a peer plugin. |
| `package.json`, `tools/build.mjs`, `tools/deploy.mjs` | Full deploy is host check → build → deploy. Shell deploy is build → fixed four-file deployment without App checks. Bundle/ownership records have hashes but no source SHA. Source-scoped updates can leave mixed branches installed. |
| `tools/deploy.mjs`, `tools/rollback.mjs` | Both share `.customizations/deploy.lock`; deploy journals before sequential writes, dependencies before entrypoints, shell revision last. It is **not an atomic multi-file transaction**. A patch-refresh failure can happen after payload/manifest writes. Full rollback requires leaving Custom; shell rollback verifies a shell-only journal without Desktop. |
| README, `docs/ARCHITECTURE.md`, `docs/COMMANDS.md`, `hc --help` and subcommand help | `hc run --on` creates a terminal; **do not use it** for updates. `hc exec --on` runs argv without a terminal, supports cwd/env/stdin and a capped timeout. Machine add/login remain existing Settings/Machines responsibilities. Remote environment/home belongs to that machine, not the desktop. |

Only source, docs, SDK/stock JavaScript and command help were read during planning. No deploy, host API audit command, native UI launch, live-home write, remote probe or pc2 connection was performed.

## Goals / Non-Goals

**Goals:** the existing dot, familiar row and explicit button; trustworthy installed revisions; full local updates and pc2-style existing shell updates; no development checkout touched; visible, recoverable failures while the app stays running.

**Non-goals:** native Settings/frame extension; Herdr/Core updates beyond existing buttons; automatic installation or deployment; new-machine shell setup/profile wiring; arbitrary checkout/home pickers; releases/tags/channels/semver; credential management; SSH setup; a daemon or scheduled updater; dependency managers; in-app rollback wizard; automatically repairing an incompatible host or missing A1 protocol installation.

## Decisions

### 1. Page and notification behavior

Use a **Custom** heading below the native Herdr/Core rows in Custom Settings → Updates. Keep row typography, spacing, 112px Check now slot and primary Update treatment; retain native What's new and its native actions. Name the customization **Custom (herdr-app)** so it cannot be confused with the native `herdr-app.exe`. Show a short (12-character) commit; the full SHA stays in operation details.

Illustrative page (SHAs and commit subjects are examples):

```text
Updates                                      [navigation dot]

Herdr
Herdr 0.1.16              Up to date · Checked at 15:59
                                            [What's new] [Check now]
herdr-core 0.1.21         Up to date · Checked at 15:59     [Check now]

Custom
Custom (herdr-app) · This computer
  Installed a123456789ab · Checked today at 16:05          [Check now]
  Update available · b234567890bc                            [Update]
  What's new ▾
    • Fix profile editor scroll position
    • Improve shell directory reporting
    • … 3 more commits                         [View changes…]

Shell integration · pc2
  Installed a123456789ab · Checked today at 16:05          [Check now]
  Update available · b234567890bc                            [Update]

  Checks hourly while Custom is open. Updates only when you click Update.
```

What's new is a local disclosure with at most five sanitized commit subjects, oldest-to-newest, and an HTTPS GitHub compare link for the full list. Do not reuse native `app.whats_new` for Custom. When a comparison is unavailable, show `Change summary unavailable` and a commit link; a summary error alone does not invent or hide availability. Older check timestamps include the date. Buttons show Checking… / Updating… and disable immediately, before repaint, for their own job; keep unrelated rows, navigation and close available.

A shared pure predicate combines existing native readiness with **confirmed eligible Custom updates**. Settings nav retains App/unmanaged-Core readiness; expanded Settings and compact More retain their existing native App readiness and gain the same Custom predicate. In the compact menu, the Settings entry gets the matching Custom indication too. Do not change native update metadata, stock frames, toast APIs or global notification state. Custom indications exist only in Custom layout/UI; the stock layout cannot gain this row/dot without native support, and this proposal deliberately does not patch it.

The dot is availability, not unread news: opening Updates/What's new never clears it. A successful verified update or a later successful check proving no applicable update clears only that component. Known updates on other machines still contribute. Failed checks/offline machines retain a marked last-known available state; confirmed absence/removal or newly detected ineligibility removes that contribution. Unknown revision, summary-only failure and missing prerequisites do not by themselves raise a new dot. A failure remains visible in the row, not disguised as Up to date.

### 2. Version means installed built source, not a package version or checkout HEAD

Keep manifest schema version 2 and add optional versioned component provenance, carried from `dist/bundle.json` into `.customizations/manifest.json`. Conceptually:

```json
{
  "provenance": {
    "version": 1,
    "desktop": { "commit": "<full SHA>", "state": "clean" },
    "shell": { "commit": "<full SHA>", "state": "clean" }
  }
}
```

`state` is clean, dirty, mixed or unknown; only a complete clean component gets a release claim. Capture Git HEAD and tracked/untracked source cleanliness **during build**, before payload generation, not from whichever checkout happens to exist when someone checks later. Ignore normal Git-ignored build/dependency/artifact files, but never ignore tracked modifications. Missing Git/source information is unknown; builds must still work without Git. Do not ship absolute source paths, branch names, credentials or a new semver scheme. The canonical update repository is a fixed feature constant, not a user-supplied URL.

- Full deploy stamps desktop and shell from that bundle.
- Shell-only deploy stamps shell only and preserves desktop provenance, layout and preferences.
- Source-scoped desktop changes mark desktop mixed. A selector updating the entire shell package can stamp shell; unrelated scoped work preserves shell provenance. Do not falsely retain an old clean desktop SHA after changing its files.
- Old manifests remain valid and show `Installed · revision unknown`. Never use pc2 checkout HEAD or the shell content `revision` hash as its installed Git commit: they are different evidence.
- Provenance-only changes must count as a transaction, receive a backup ID and be journaled. Preserve idempotency when both bytes and provenance are unchanged. Extend shell-journal validation to permit only the shell provenance delta, retaining its non-shell equality checks and all newer-record safeguards.
- A verified UI job records completion separately from the manifest. An interrupted job with writes started makes the row recovery-required even if the manifest advertises the target; deployment success is not inferred from that record alone.

Compare the installed component SHA with the fixed repository's current `main`. Equality is current. An ancestor can update. Ahead/diverged/unknown-history or dirty/mixed provenance is a development/custom installation and has no ordinary Update. This protects intentionally installed development output as well as the developer clone. Legacy unknown installations get `Update to <short SHA>` with a one-time explicit replacement confirmation, never `Up to date` or a fabricated available delta. A failed ancestry read is unknown, not permission to overwrite a development build.

### 3. Source: one managed clone per target machine, never the developer clone

The sole allowed source path is target-user `~/.local/share/herdr-app`, matching pc2. Resolve the user's home on that machine using Node and canonicalize every path component; reject symlinks/junctions/reparse redirects. Bind the clone to the specific resolved Herdr home in a private management record outside Git. There is **no browse field** and no fallback to `D:/Git/herdr-app`, process cwd, a deployed file's original source path or a crew worktree.

On Update, clone if absent **on this already-installed desktop only**. An existing default-path clone (pc2's precedent) is adopted only at the explicit button/confirmation after displaying the path and verifying: actual repository root equals that path; ordinary `.git` directory, not a linked/separate/shared repository; no other registered worktrees; exact canonical public origin `https://github.com/timurproko/herdr-app.git`; checked out `main`; clean tracked/untracked files; local HEAD equal to or behind the approved published target. Reject ahead/diverged history even when Git's `merge --ff-only` would silently keep an ahead HEAD. Wrong URL/SSH alias/configuration is a setup conflict, not an opportunity to rewrite origin. No reset, clean, stash, force-pull, branch switch or history-rewrite recovery.

Use a normal full clone (no shallow-history comparison surprises). Checks do not clone, adopt or fetch. Update performs a targeted fetch with interactive Git prompting disabled, verifies the fetched main identity and ancestry, then fast-forwards to the **captured displayed SHA**. If main advanced, that SHA must still be an ancestor of freshly fetched main; deploy it, not the newly discovered tip. If main rewound/replaced the approved SHA, refuse and ask for Check now. Revalidate clean HEAD/target and installed state before build/deploy. If another deployment already installed that target, finish as Already current; never downgrade a newer install.

This costs one additional clone, but it makes routine UI updates independent of development work and safe around crew. Building/deploying the developer's clone was rejected even with a clean-tree check: a clean feature branch can still contain unmerged work.

### 4. Desktop pipeline and self-redeployment

Place orchestration under `src/services/updates/`, with a small Settings renderer/controller and a shared state helper; do not put Git/build operations in the appearance layer. Package through `customization.json`. Reuse Crew's no-terminal, per-machine timeout/status style, but keep code ownership outside that plugin. There are currently no required external build dependencies; **do not run npm install/ci or prepare**, which would invoke unrelated workflow bootstrap/network writes.

One Update authorizes one machine, resolved home, component and immutable target. The worker does:

1. Read/validate operation and installation state, prerequisites (Git and Node 20+ on PATH), home and clone safety; obtain an exclusive updater lock covering clone/build/job state.
2. Clone/adopt as permitted, fetch and fast-forward as above. Record old and target SHA. A checkout that advanced successfully but has not deployed is not an updated installation.
3. Run the exact script sequence behind `npm run deploy`: Node `tools/check-host-api.mjs`, Node `tools/build.mjs`, then Node `tools/deploy.mjs deploy <captured-home>`, with captured `HERDR_APP_HOME` and resolved App executable. Launch each with Node's absolute executable and separate argv, no shell interpolation or npm dependency. This is the existing compatibility → build → guarded full-deploy policy, not a second installer; do not bypass an unknown-host gate.
4. Surface phases/backup information from deployment, then verify ownership/provenance with the existing doctor policy and require prior patch-opt-in refreshes to have succeeded. Preserve personal preferences and the full deployment's allowed layout projection; no enable/disable, preference import or new patch opt-in.
5. Persist success with the actual installed target and backup ID; publish shared availability facts for UI consumers. An installed SHA without successful verification is not enough to announce success.

The mod must not supervise the process that is replacing it. A short launcher copies the packaged, self-contained worker into an immutable per-operation directory under `.customizations/updates/jobs/<id>/` and starts one detached, bounded Node job with redirected private log output. The launch and status reads use facade exec/hc exec, not `hc run`. All worker code needed for this job is snapshotted before deploy, not lazily re-imported from replaced runtime files. No permanent service is installed.

The worker writes atomic status JSON before/after phases, including target/home identity, deadline, process identity, write-started flag, backup ID, outcome and a bounded public error. The existing shared API stores only public projections under a runtime-only `custom.updates` key; exclude it from preference export. On a shown Updates page, read an active job roughly once a second and stop when complete/hidden. Chrome only starts hourly checks and reads public facts, not an always-running status poll. After a mod reload/reopen, reconcile the durable job before allowing another update. Closing the dialog/app neither cancels nor repeats the approved job; it can finish within its deadline. It does not start another on reconnect.

### 5. Remote machines and pc2

First version includes remote updates, but only for **existing shell installations** and the prescribed existing checkout. Get configured machines from the supported machines model; never use terminal membership as machine discovery. Probe connected machines with Node over `hc exec --on <captured-name> --timeout … --json`; use the same source validation/worker protocol. Transfer only the small self-contained updater launcher/worker when Update is clicked, not a daemon or a remote Desktop. Pin the captured machine transport identity/session to the operation; a renamed/replaced machine cannot receive an old click.

Resolve remote home and `HERDR_APP_HOME` in the remote process. Default is that user's `~/.config/herdr-app`. Do not forward the desktop's home or `HERDR_APP_HOME`; nondefault remote homes must be present in that Core's environment. Do not guess by scanning arbitrary folders. pc2's OS, prerequisites and actual paths have **not** been probed in this plan. The worker uses Node's cross-platform filesystem/process handling; Windows and Linux paths/transports get fixtures, with native pc2 validation still required.

For pc2, run the script sequence behind `npm run deploy:shell` in its verified `~/.local/share/herdr-app`: Node `tools/build.mjs`, then Node `tools/deploy.mjs deploy-shell <resolved-home>`. It builds locally there and deploys only four owned shell files, using existing manifest/lock/journal behavior. No App API check, native patch, layout switch, Desktop install, profile wiring, terminal input or process restart. Compatible existing Bash payloads reload at the next idle prompt; dispatcher changes can still require a person to re-source the installed loader or open a shell. Do not claim live shells upgraded when only the package did.

| Target state | Row/action |
| --- | --- |
| Connected, existing shell installation, clean eligible clone | Installed shell SHA, check time and Check now/Update as applicable. A full remote App installation may also have shell ownership, but this row updates shell only. |
| Existing shell files but legacy manifest | Revision unknown, no inferred up-to-date status; explicit confirmed Update to the shown main SHA can establish provenance after safety checks. |
| Offline / login required | `Offline` / `Sign in in Machines`, last-known SHA/check clearly marked, no Update. No SSH prompt or automatic machine login. |
| Existing shell package, checkout missing | `Update source checkout missing`, Check now and a setup explanation; no clone/first-install shortcut in v1 remotely. Runtime shell reporting continues without a checkout. |
| Connected, no owned shell package | Compact `Shell integration not installed` row/explanation; no automatic Install. Files without recognized ownership are a conflict, not absence. |
| Missing Node/Git, unknown manifest, dirty/ahead/diverged clone | Specific setup/conflict reason and no Update; never install tools, fix permissions or discard work. |
| Connection lost after launch | `Outcome unknown · Check again`; on reconnect read that exact job and manifest before enabling actions. Do not resend. |

Machines added later are probed at the next eligible check; Check now forces a probe. Machines removed from configuration stop contributing stale availability. No bulk Update all: local failure and pc2 success, or vice versa, remain distinct outcomes.

### 6. Check frequency, network and privacy

Use the mounted non-footer Custom chrome as the lifecycle owner, guarded by `checking()` and window activity. On first active mount check if the persisted attempt timestamp is older than one hour; then schedule hourly while active. Activation and opening Updates reuse this cache unless due; explicit Check now bypasses the hour. Use a shared lease plus a worker lock to coalesce multiple windows. Store last attempt separately from last successful check to avoid retry loops on failure.

One bounded public HTTPS request resolves `timurproko/herdr-app` main per round, reused for local and remote components; fetch compare facts only for distinct installed-SHA/target pairs and cache them. GitHub's public API needs no account; honor ETag, rate limits and Retry-After. Limit commits rendered to five and bound comparison responses; no unbounded pagination just to build a summary. Use a compare result to distinguish ahead/diverged/unknown histories. Remote probes read only ownership/provenance, prerequisites, clone identity and outstanding job state. Hourly checks may contact GitHub and connected machines; they do not fetch into a checkout, install anything or write deployment state. Only their own cache/status changes locally.

Checks timeout after 15 seconds per network/probe operation (30 seconds overall round; at most two remote probes concurrently). Mark slow targets independently instead of stalling the page. Failed/rate-limited attempts retain last-success time and last-known facts with a stale/error label; back off until the next hour or the server's later retry time. Explicit Check now respects server rate limits. No background activity when Custom is unmounted or Desktop closed, except the one job already explicitly started.

Persist cache/job/logs privately under `.customizations/updates/`, not a public checkout or portable preferences. Never log environments, auth headers, credential-bearing remote URLs, terminal content or shared runtime state. Public GitHub metadata is fetched with a fixed host and no interactive credentials. UI shows bounded sanitized errors; an operation-details disclosure names its local/remote log location and backup ID. Open logs through read-only file viewing when supported; a log path remains useful if rendering is broken.

### 7. Concurrency, failure and recovery contract

- **No UI hangs:** async exec/network, immediate action guards and per-row progress. Outer launcher/status calls are short (15 seconds); the detached job has a hard ten-minute deadline. Fetch/clone get at most 120 seconds, compatibility/build at most 120 seconds each, deploy/verification at most 180 seconds within the remaining overall budget. Kill only the updater-owned child tree on timeout, not Herdr/Core or existing terminals. Because timeout may interrupt writes, classify it as unknown/recovery-required and inspect before retry.
- **Two locks, different roles:** updater lock serializes the managed checkout/pipeline per bound home; existing deploy.lock still serializes actual deploy/rollback writes, including CLI operations. Do not hold deploy.lock in a parent and deadlock the deploy child. A busy deploy is reported, not queued/retried silently. No automatic stale-lock deletion: verify job/process identity; uncertain ownership needs manual resolution.
- **Preflight failure:** wrong source, dirty/ahead/diverged checkout, incompatible host or output conflict reports the precise phase; nothing is stashed/overwritten to make progress. Fetch/build can have updated the managed clone/dist, but installed revision stays old until deploy succeeds.
- **Write/patch failure:** extend deploy's result/error channel so the worker learns the journal/backup ID *before the first write*, not only from a success return. Record files/phase and distinguish refusal, partial payload, post-deploy patch error and verification error. Preserve existing per-file CAS/conflict checks. Do not promise all-or-nothing rollback from this sequential installer.
- **Success:** only after deploy/patch result and doctor/ownership/provenance verification. Show `Updated to <SHA>` and backup ID in details; no App/Core/terminal restart. No requirement to keep a Settings promise alive through reload.
- **Recovery:** no automatic rollback under the running Custom layout. Full failure details link the existing recovery documentation: explicitly switch to Herdr/main, then rollback the reported backup ID, retaining newer-edit/refusal gates. The operation snapshot keeps the corresponding recovery tool/dependency closure available even if runtime files are half-updated or main moves on. Shell recovery uses its verified shell-only journal without Desktop. Recovery remains a deliberate documented CLI action in v1, not a new UI wizard; this is an exceptional failure path, not the normal update workflow.
- **Unknown outcome:** disconnect, worker crash or missing final status cannot produce Success. Recheck job identity, manifest and hashes; require explicit recovery if writes started and verification cannot complete. Never silently replay a click or rollback just because the UI timed out.
- **Logs:** retain the latest ten bounded operation logs/status snapshots per machine, at most 1 MiB output each; active/recovery-required records and backup journals are never pruned by this retention. No automatic pruning of deployment backups.

### 8. Delivery size and alternatives

Recommend one focused PR for **local + existing remote shell updates**, in four outcome groups: provenance/recovery metadata; local worker; Settings/dot/checks; remote shell rows/transport. Most pc2 work then reuses the same worker with a different deploy command. All outcome boxes remain unchecked in this planning PR.

If the maintainer prefers smaller PRs, approve a reduced first scope explicitly: outcomes 1–3 deliver the local dot/button; move outcome 4 and its spec scenarios into a separately approved follow-up before implementing. This plan does **not** silently omit pc2. First-time remote Install (with path consent and profile wiring guidance), UI rollback and release artifacts can each be separate later proposals, not hidden additions to v1.

Rejected alternatives: developer clone pull (unmerged-work hazard); native frame patch (unnecessary); pretending to write `updates().app.ready` (no API); reuse `hc run` (creates a terminal); auto-update on a timer (not requested); generic plugin installer (more UI/indirection than one existing Updates row); transactional installer rewrite (too broad).

## Risks / Trade-offs

- **Public main is executable code, not a signed release** → fixed HTTPS source, immutable displayed SHA, no feature-branch selection, reviewed host gate and backup journal. Button consent authorizes published repository build/deploy scripts with user permissions; it does not establish release signing or remotely execute untrusted URLs.
- **Shared App home is intentionally used for development deployments** → dirty/mixed/non-main installed provenance blocks ordinary UI replacement; never auto-adopt a developer installation as a release. The owner chooses a clean published baseline separately.
- **App reload behavior and detached child behavior are host-specific** → immutable worker, durable files, exact operation reconnect and mandatory native validation; fixtures alone cannot prove the UI survives its own deploy.
- **Partial deploy can break its own Settings renderer** → status/log/backup outside replaceable runtime plus snapshotted recovery tooling; recovery still needs the stock layout and can require CLI. Do not claim a failure-proof UI rollback.
- **Core-only machine environment can differ from interactive SSH** → use the Core transport environment, surface missing tools/home mismatch, never rewrite PATH/profiles or install dependencies automatically.
- **Hourly public API requests can be rate-limited; commit history can be rewritten** → cached/stale states, Retry-After and fail-closed ancestry; no reset fallback. A missing summary is not silently treated as current.
- **Any main commit can include no shell payload change** → v1 compares source commits, so pc2 may offer a harmless no-payload shell update that only advances provenance. Avoid a second shell release/versioning system in v1.

## Migration Plan

1. After approval, implement the four outcomes with fixture tests and docs, keeping the same PR. No live deployment is implied by implementation approval.
2. The updater cannot update an installation that does not contain it yet. The maintainer explicitly installs the first merged version using the existing deployment path; that one-time bootstrap is not a new automatic deploy permission. Existing manifest fields remain compatible.
3. A prior desktop/pc2 installation without provenance reads as revision unknown. pc2 needs no manual shell upgrade just to be inspected; the desktop can probe its existing manifest and explicitly upgrade its safe default checkout. Adoption/replacement confirmation establishes management and provenance only on that click.
4. Validate a disposable native home first, then obtain explicit permission for a real desktop self-update and an existing pc2 shell update. Never exercise real recovery against the owner's active development installation as a test.
5. Reversion uses existing backup-ID rollback rules, extended for provenance metadata; full reversion requires stock layout and shell reversion never touches non-shell state. No schema migration rewrites shared/session documents.

## Validation plan

**Hosted fixtures (no live home, network, account or pc2):**

- Provenance for Git/absent Git, clean/dirty/untracked sources, full/shell/scoped combinations, legacy records, no-op and metadata-only deploy, backup/rollback identity, later edits and forged mixed shell journals.
- Local bare Git fixture remotes: main advance, captured target versus a newer tip, rewound history, ahead/diverged/dirty clone, wrong origin/path, linked worktrees, symlink/junction redirection and attempted developer checkout routing; no repair/reset fallback.
- Fake child-process/App/Core transports: exact Node script sequence for local full and remote shell commands, explicit home handling, no dependency installation/native calls remotely; binary gate and conflict refusal; every phase timeout, deploy lock collision, partial writes, patch failure and backup ID preservation.
- Detached worker lifecycle with temporary job homes: renderer disappears, duplicate launch, crash, status reattachment, output cap, deadline and stale-process ambiguity; snapshotted recovery can run without source/runtime access. No fixture starts real Herdr or an agent.
- VM UI/pure state: row text/actions/disclosure/summary truncation; no success from SHA alone; native checks/core/app actions unchanged; native + Custom dots in nav/expanded/compact/compact menu; one-machine success never clears another update; failed/offline/stale/removed-machine states; unknown versus development replacement rules.
- Fake clock/HTTP: hourly/activation/open behavior, checking guard, cross-window coalescing, one source request per round, compare cache/ETag/Retry-After, hidden/closed lifecycle, no install/deploy without a click.
- Packaging/architecture and preference tests: local import closure, single facade, no source-checkout import by installed code, no update jobs/logs/state in exports. Integrate targeted tests with the existing Windows/Ubuntu hosted subset; do not weaken existing tests.

**Native validation, separately authorized after implementation:**

- Inspect actual rendered Updates rows, button states/overflow and dots at expanded/compact widths; keyboard/close behavior and genuine manual checks against a disposable home.
- Perform an explicitly approved desktop self-redeploy with Settings open, then reload/close/reopen it while updating; observe real worker continuation/result and unchanged terminals/layout/focus. Check native App/Core update controls still work without triggering their updates as a side effect of this test.
- On an explicitly approved existing pc2 shell install, inspect reported home/revision, update over the real transport, verify only four shell files/bookkeeping changed and existing idle-prompt reload behavior. Exercise offline/login state and disconnect/reconnect without duplicate dispatch, only with approval.
- Demonstrate conflict and rollback refusal/recovery with disposable full/shell homes, including the stock-layout gate. Real installed host compatibility, pc2 OS/environment, UI hot reload and transport survival cannot be claimed from fixtures or from this planning inspection.
