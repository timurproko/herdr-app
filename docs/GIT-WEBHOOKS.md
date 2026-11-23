# Git plugin: automatic test updates

Open the Git panel's **Settings** link. Setup is a set of prerequisite actions,
not a wizard. There is no terminal command, secret copying or URL pasting in the
normal path.

## Normal setup

1. **Cloudflare tools → Install.** Installs pinned Wrangler **4.162.0** privately
   under `.customizations/git-cloudflare/tool`. Node.js **22.12+** with npm is
   required. Nothing is installed globally; npm lifecycle scripts are disabled.
2. **Cloudflare account → Login.** Opens Cloudflare authorization in your browser.
   Wrangler manages its own authentication. If several accounts are available,
   use **Choose** on this row to select the account for this relay.
3. **Automatic test updates → Configure.** One click starts setup in the selected
   account; there is no second confirmation panel. Cloudflare limits and charges
   are noted beside the action. Setup:
   - creates local credentials only if the credential file is genuinely absent;
   - creates/updates this plugin's dedicated Worker and SQLite Durable Object;
   - registers a workers.dev subdomain if the account has none;
   - securely uploads CLIENT_TOKEN and GITHUB_SECRET over Wrangler stdin;
   - verifies the receiver's token and secret fingerprint;
   - saves the public relay URL automatically.
4. Expand **Repositories** and choose the signed-in GitHub **Account** that
   administers the desired repository. **Add repo** opens a searchable picker;
   select individual repositories and press its **Add** button. That explicit
   confirmation creates/updates their GitHub webhooks. Search, selection without
   Add, Cancel and closing the picker do not change GitHub. There is no bottom
   Apply step for this list. The main list shows last-confirmed connected
   repositories; its remove control deletes only this relay's matching webhook.
   Opening Settings does not enumerate every repository: Add repo requests the
   chosen account's paginated active admin inventory, not local clones. Changing
   Account does not switch the global CLI login. Per-repository failures are
   reported; successful changes remain saved and failed choices need an explicit
   retry. Requirements and Repositories checks remain independent.

GitHub account discovery exposes only public login names. A named account's token
is captured privately in the Node worker and supplied only through a child environment
to GitHub CLI API calls pinned to github.com, never argv, shared state, preferences
or logs. Ambient token overrides are excluded, API identity is verified, and both
inventory and Add/remove stay bound to the selected account. Only its public login is saved.
The plugin never runs `gh auth switch`, logs in automatically or changes CLI credentials.

Node.js and GitHub CLI login have their own readiness checks. Existing private
credentials are reused. If keys are absent, Configure creates them automatically;
Create is still available as an optional separate action.

**Install all never logs in, creates cloud resources or connects webhooks.** Manual
and confirmation-required actions are excluded. Installation, login, deployment
and connection run only after their own explicit user action. Deployment of the
customizations itself does not install Wrangler or provision cloud resources.

Configure starts immediately; repository selection alone is local until the
picker's **Add**. Add/remove revalidates GitHub login, relay scope and immutable
repository IDs before changing only the selected repositories. Partial successes
are retained and errors reported, never rolled back or retried silently.
Selections are per-view and never exported or replayed after restart. Changed
scopes/identities require reopening the picker. Explicit mutations share a
cross-process setup lock; inventory reads are read-only and there is no persisted
desired-state job. Public settings use validated compare-before-write updates;
closed views cannot overwrite them.

## Storage and trust boundaries

- Local keys: `$HERDR_APP_HOME/.customizations/git-webhook.json` (normally
  `~/.config/herdr-app/.customizations/git-webhook.json`). The two independent
  256-bit keys are never saved in shared plugin settings, exported or displayed.
  Existing invalid/edited files are not overwritten. Unix creation mode is 0600;
  Windows uses the private user directory's inherited ACLs.
- Public account ID and relay URL are ordinary plugin preferences, filled by
  Configure. The URL is displayed read-only under Automatic test updates, like
  other configured prerequisite values; it is not an editable Settings field.
  The old single-repo preference remains hidden for compatibility. Add repo reads
  actual GitHub hook state; the main list caches last-confirmed connected names,
  scoped to relay/account, as runtime state rather than portable desired intent.
- Wrangler owns login storage. Its supported `auth token --json` command is used
  only inside the Node worker for account-scoped Cloudflare API operations. Tokens
  are never returned to the UI, put in argv or copied to custom preference files.
  Wrangler disk logging and telemetry are disabled for these actions.
- The private tooling/config folder is local runtime data, not synced source.
  Unknown tooling manifests, linked directories and edited deployment configs are
  refused. Setup actions are locked against concurrent copies.
- Dedicated Worker names derive from the local client key and selected account.
  Existing Workers must carry this setup's ownership fingerprint before updates
  are permitted. Unrelated Workers and existing workers.dev subdomains are left
  unchanged. No cloud resource is deleted automatically.
- Cloudflare account quotas and possible charges apply. This uses your own account,
  not a public third-party webhook relay.

If a deployment or secret upload is interrupted, Configure can be retried. Its
errors distinguish deployment, secret-upload and verification failures without
printing CLI output or secrets. Cloudflare propagation/DNS can take time. Closing
Settings does not undo an already approved cloud request; reopening and retrying
Configure safely verifies/finishes the same dedicated relay.

## Customization update discovery

One-time maintainer enrollment for **herdr-app-custom**:

1. Open **Settings → Plugins → Git** and enable Git. Do not enable auto-fix just
   for update discovery; it is independent.
2. Reuse an already verified relay. Only if setup is missing, explicitly complete
   **Cloudflare tools → Install**, **Cloudflare account → Login** (choose the
   account if needed), and **Automatic test updates → Configure** above.
3. Expand **Repositories**. In **Account**, select the GitHub login with webhook
   administration permission on `timurproko/herdr-app`.
4. Press **Add repo**, search **timurproko/herdr-app**, select it, then press the
   picker's **Add**. This creates/updates the actual per-repository GitHub webhook;
   a local search/list entry alone is not enrollment. If already listed and
   healthy, leave it alone. An incomplete-hook warning requires explicit
   remove/re-add; duplicate matching hooks must first be resolved in GitHub.
5. In **GitHub → timurproko/herdr-app → Settings → Webhooks**, check the active
   hook points to the existing relay origin plus **/github**, uses JSON and SSL
   verification, and includes **push**. After a real push/merge, inspect **Recent
   deliveries** and the existing Custom update dots. Configuration readiness alone
   does not prove delivery.

The setup UI sends the local webhook secret through gh stdin; it already matches
this relay's `GITHUB_SECRET`. No secret copying or manual hook creation is needed.
If the repo is absent, choose an account with repository webhook administration
access. Adding it also expands the existing CI-monitor repository scope if
that separate auto-fix feature was already enabled; it does not enable auto-fix.

**No Worker redeploy is required for this feature:** canonical receiver, client
allowlist and enrollment already include push. An independently managed older
receiver that lacks push would need a separate explicit maintainer upgrade; this
change never deploys cloud resources or enrolls repositories automatically.

A target-repository push is only a hint to check fixed public main, never a
trusted revision or URL. One-second debounce (three-second maximum burst wait),
the existing check lease and a persisted ten-second automatic rate bound coalesce
bursts/reconnects. Git may be hidden. A new version raises the existing markers;
only **Update** installs it. Git disabled/unconfigured/offline silently leaves
mount/hourly checks and **Check now** available. There is no closed-desktop update
monitor and no delivery guarantee during network outages.

The simpler alternative considered was startup/focus/ten-minute polling: no
relay/enrollment/admin permission or socket refactor, but up to six regular main
reads per active hour and up to ten minutes of focused-desktop delay. This change
uses the approved relay route plus existing fallbacks, not both polling schedules.
Fixture tests establish controller/transport behavior, not live delivery latency
or GPUI pixel visibility; no live enrollment was performed during development.

## Runtime behavior

Enabled Git uses one authenticated native WebSocket owned by the mounted
non-footer Custom chrome, shared through public runtime invalidation counters.
Hiding Git or changing folders does not close that stream; disabled Git and relay
configuration changes do. Hidden panels still do no PR, CI or agent-link reads.
Reconnection has bounded transport-only backoff; there is **no periodic CI polling
fallback**. Opening the panel or reconnecting catches up using authoritative
GitHub reads. Settings/footer/menu copies never open extra sockets.

`check_run`, `check_suite`, `status`, `workflow_run`, `pull_request` and `push` events
invalidate every loaded Open/Closed page and an explicitly linked beyond-page PR.
Pinned/unpinned PRs and drafts with running checks are updated alike. Bursts
coalesce, expanded list depth is retained, cursors are renewed, and stale replies
cannot overwrite another machine/repository. Failed reads keep the last good data.

The bottom info card uses **Set up Git in Settings** for missing global relay
setup, even on non-Git agents. With setup ready, it uses **Add this repo in Settings** only for a resolved, unenrolled repository. Configured
non-Git contexts and enabled repositories have no prompt. Socket connecting,
disconnected and idle states never decide either message. Global checks are cached
across agent/folder changes; per-repo results are cached independently. Switching
repositories immediately hides the previous enrollment card. It stays hidden while
the destination's root or enrollment is unresolved, then appears only if that
repository is confirmed unenrolled. Cached same-repo results render immediately.
Checks run on configuration/Settings changes or explicit Refresh, not a timer.
Settings publishes only public facts in `custom.git.webhook-state` (not preference
exports); no tokens, credential contents or secret hashes enter this record.
The Settings link for missing setup opens the normal prerequisites view. The
**Add this repo in Settings** link opens Requirements collapsed, Repositories
expanded, and the captured **owner/repository** prefilled in search. This is a
one-time UI filter, not a selected picker item or enrollment request. It neither
switches GitHub accounts nor saves preferences; if the selected account cannot
see that repo, choose the appropriate account yourself. Opening the link never
applies changes or creates webhooks. Its header navigation uses the shared parent-name component:
‹ Plugins returns to the catalog, and Sidebar settings use ‹ Look.
The Git header shows the short repository name with its full GitHub URL on hover.

## Optional CI fix messages

In Git's **Settings** disclosure, **Auto-fix failed CI** enables
Core messaging to the agent already associated with the PR; it defaults off.
**Message** supports `{url}` for the PR and `{runUrl}` for the failed run.
This can authorize that existing agent to fix code and push; it is separate from
webhook enrollment and never starts a new agent. It consumes verified, loaded PR
facts while Git is shown, not a new background monitor. See
[the CI fix contract](GIT-CI-FIX.md) for current-head/run checks, duplicate receipts,
idle/done readiness checks, owned-refusal retries and unknown outcomes. No live message tests run during
deployment, and no A1 API change is needed.

## Verify

After the prerequisites are Ready, trigger/rerun CI and inspect both pinned and
unpinned PRs. GitHub's **Repository Settings → Webhooks → Recent deliveries** shows
actual delivery results; a configuration check alone is not proof of delivery.
Tests use disposable fixtures and never authorize accounts, deploy cloud resources
or create real webhooks. Live end-to-end setup still requires your button clicks
and browser/account authorization.

Manual native interaction regression: after `npm run build`, run
`node tests/features/git-repository-click.mjs` with other overlays closed. It opens
a temporary dialog using the candidate renderer and dummy repositories, clicks a
checkbox, verifies a local draft, clicks Discard, and sends a wheel gesture over
the list. Inspect `%TEMP%/git-repository-click*.png` for scrolling/visual behavior.
It never clicks Apply, reads auth, sends terminal input or changes real webhooks;
its fixture and nonce receipt are removed afterward. An existing overlay makes it
refuse the test without changing the UI.

## Advanced/manual deployment

For existing self-managed receivers, Settings accepts an HTTPS relay origin.
Repository enrollment is managed by Repositories → Add repo → Add. The optional manual Wrangler entrypoint remains
`tools/git-webhook-relay/worker.mjs`, re-exporting the single canonical receiver
`src/plugins/git/relay-worker.js`. The plugin packages that same receiver so setup
workers have no source-checkout dependency.

The receiver verifies exact raw-body GitHub HMAC, bounds input, authenticates
subscribers, and forwards only repository/event/delivery metadata. Its endpoints
are POST /github, WSS /events, and authenticated GET /configuration. Secrets are
CLIENT_TOKEN (local token) and GITHUB_SECRET (local secret). Do not put secrets in
URLs, command arguments, configuration source, screenshots or chat.

Changing a relay URL does not remove previous GitHub webhooks or cloud resources.
Remove old resources explicitly after migration. Disable Git to stop subscriptions;
no terminal, Core or desktop restart is required.
