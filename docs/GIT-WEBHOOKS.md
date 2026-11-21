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
4. **Repositories**, a collapsible section separate from Requirements. Its header
   keeps **Check** left of the status, like every plugin's Requirements header.
   Header and row statuses share the same fixed right-hand column. Check stays the
   same size/label while disabled; a blue bulb followed by blue **Checking** appears
   on checking headers, not every row. Repositories show their own checking status
   whenever their own list refreshes. Requirements and Repositories Check are
   independent: neither starts or waits on the other. Initial loading starts both
   separately, and each publishes its own result. The account tabs
   have no redundant visible title. **GitHub account** tabs
   show the signed-in CLI accounts and the selected login. They default to the CLI's
   active saved account. Changing tabs reloads that account's inventory, not the
   global CLI login; Apply or Discard pending edits before switching. Search locally by owner/name;
   the fixed-height list has an always-visible scrollbar and contains wheel gestures
   while hovered. Checkbox clicks update a local draft immediately. Use the fixed
   **Apply / Discard** footer (shared with Core settings) to save or cancel. Apply
   enables checked repositories and removes only this relay's webhook for unchecked
   repositories. Changes are individual-only; there is no All
   option. These are GitHub repositories accessible to the
   selected login with admin permission, not locally cloned folders. All API pages
   are fetched; archived/disabled repositories are omitted. No Connect button or
   second confirmation is shown. Per-row failures remain visible for retry.
   Zero eligible repositories hides the search field, status badge and list viewport.
   Only account tabs and the account-switch guidance remain; there is no icon or
   duplicate No repositories label. The description contains only the enabled count (for example,
   **1 of 128 enabled**) or account-switch guidance, without repeating the login or
   an extra empty-state sentence. A search with zero matches keeps its field and the shared
   magnifier/**No results** state, so the filter can still be cleared. While checking,
   the list viewport is omitted; a compact **Repositories will appear here.**
   description replaces it. Progress appears only beside Check in the header.

GitHub account discovery exposes only public login names. A named account's token
is captured privately in the Node worker and supplied only through a child environment
to GitHub CLI API calls pinned to github.com, never argv, shared state, preferences
or logs. Ambient token overrides are excluded, API identity is verified, and both
inventory and Apply stay bound to the selected account. Only its public login is saved.
The plugin never runs `gh auth switch`, logs in automatically or changes CLI credentials.

Node.js and GitHub CLI login have their own readiness checks. Existing private
credentials are reused. If keys are absent, Configure creates them automatically;
Create is still available as an optional separate action.

**Install all never logs in, creates cloud resources or connects webhooks.** Manual
and confirmation-required actions are excluded. Installation, login, deployment
and connection run only after their own explicit user action. Deployment of the
customizations itself does not install Wrangler or provision cloud resources.

Configure starts immediately. Repository edits are local until **Apply**; Discard,
search, collapse, navigation and closing never mutate webhooks. Apply snapshots
pending choices, revalidates GitHub login, relay scope and immutable identities,
and changes only those repositories. This uses Core's fixed editor footer, not a
confirmation dialog. Successful changes remain saved on partial failure; failed
choices remain pending for retry. Rechecking preserves pending selections unless
the server already matches them. Drafts are per-view, never shared/exported or
replayed after restart. Changed scopes/identities require discard or a fresh check.
Partial successes are retained and failed rows are reported, never rolled back or
retried silently. Explicit mutations share a cross-process setup lock; inventory
reads are read-only and there is no persisted desired-state job. Public settings use
validated compare-before-write updates; closed views cannot overwrite them.

## Storage and trust boundaries

- Local keys: `$HERDR_APP_HOME/.customizations/git-webhook.json` (normally
  `~/.config/herdr-app/.customizations/git-webhook.json`). The two independent
  256-bit keys are never saved in shared plugin settings, exported or displayed.
  Existing invalid/edited files are not overwritten. Unix creation mode is 0600;
  Windows uses the private user directory's inherited ACLs.
- Public account ID and relay URL are ordinary plugin preferences, filled by
  Configure. The URL is displayed read-only under Automatic test updates, like
  other configured prerequisite values; it is not an editable Settings field.
  The old single-repo preference remains hidden for compatibility. Checkboxes read
  actual GitHub hook state rather than saved local selection intent.
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

## Runtime behavior

The enabled, shown Git panel maintains one authenticated native WebSocket. Hidden,
disabled and changed-repository contexts close it. Reconnection has bounded
transport-only backoff; there is **no periodic CI polling fallback**. Opening or
reconnecting catches up using authoritative GitHub reads.

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
one-time UI filter, not a checked checkbox or enrollment request. It neither
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
Repository enrollment is managed by the checkbox list. The optional manual Wrangler entrypoint remains
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
