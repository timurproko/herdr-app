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
4. Expand **Repositories**, choose the signed-in GitHub **Account**, then open
   **Add repo**. Search/select individual repositories and press the picker's
   **Add** button to create/update their actual GitHub webhooks. Selection alone,
   search, Cancel or closing the picker does not change GitHub. There is no bottom
   Apply step for this list. The main list uses last-confirmed enrollment, and its
   Remove action deletes only this relay's matching hook. Only Add repo enumerates
   the account's paginated active admin repositories, never local clones. Account
   selection does not switch the global CLI login. Partial successes stay saved;
   failures need explicit retry. Requirements and Repositories checks remain
   independent. Picker drafts are per-view and never exported or replayed.

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

Configure starts immediately. Repository picker selections stay local until
**Add**; Add/remove binds the GitHub login, relay URL and immutable repository IDs
before changing only approved entries. Search or closing does not apply anything.
Changed scope/identity requires a fresh picker. Partial successes stay saved and
failures are reported, never rolled back or retried silently. Explicit mutations share a cross-process setup lock; inventory
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
  The old single-repo preference remains hidden for compatibility. Add repo reads
  actual GitHub hook state; the main list retains last-confirmed enrollment scoped
  to relay/account as runtime state, not saved desired-state jobs.
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

Custom's **updater owns its polling and retry policy**; the Git relay is an optional
accelerator, not the availability authority. With Git enabled and locally configured,
its chrome-mounted update subscription works even with Git hidden, a non-Git folder,
or another selected repository. Only **timurproko/herdr-app** pushes to
**refs/heads/main**, or **closed PRs with merged=true and base main**, invalidate
healthy freshness. A 300 ms debounce, persisted 15-second minimum, one dirty
follow-up and the existing check lease coalesce bursts and reconnects. Only the
bounded authoritative remote-main comparison decides existing dots and the row.
No payload revision is trusted; no update/deploy or agent message is launched by
this subscriber. Other Git automations remain separately configured.

Each desktop independently retains healthy 120–180 second jittered checks, startup,
idle-focus and timer-drift catch-up. Repeated failures persist roughly 5/10/20/30
minute jittered backoff, capped at 30 minutes; hints cannot bypass it. Check now
retains its manual bypass. Git disabled, no relay/keys, old metadata or unenrolled
repository means polling-only, not disabled updates. The app cannot receive a
merge while asleep/closed/offline; reconnect and fallback checks catch up later.

**Person-owned actions after merge** (none performed by this change):

1. Install the observer once on **each Desktop/Custom machine** from its ordinary
   clean-main clone with the existing guarded full-deploy flow. Another desktop's
   deploy:all does not install a full desktop on pc2. Existing host/A1 gates remain.
2. Open **Settings → Plugins → Git** and enable Git for the optional accelerator.
   For an old relay, Requirements detects notice version 1 and offers an explicit
   upgrade: install the private tooling/login if requested, choose its Cloudflare
   account, then press **Configure**. This redeploys only the owned receiver with
   the same private keys. Never copy keys into preferences. Version 2 needs no new
   redeploy; an independently managed receiver needs its own explicit upgrade.
3. Expand **Repositories**, choose the GitHub **Account** with webhook administration
   access to **timurproko/herdr-app**, then **Add repo → select → Add**. If already
   enrolled with a complete active hook, leave it. Resolve duplicate matching hooks
   in GitHub rather than creating another blindly. Push and pull_request were already
   included in enrollment; no new event types or secret rotation are required.
4. Each participating desktop needs its own valid local relay setup/credentials.
   **pc2 without a relay still detects independently every 2–3 minutes while healthy.**
   A Core-only machine has no desktop badge. Do not sync git-webhook.json or other
   private runtime files as preferences. Adding this repo also broadens the existing
   agent monitor scope if that separate auto-fix feature is already enabled; it does
   not turn it on. Leave auto-fix unchanged if only update discovery is wanted.
5. After a separately authorized live merge, inspect **GitHub → Repository Settings
   → Webhooks → Recent deliveries** and the existing Custom dots with Settings/Git
   closed. Verify each desktop separately. Fixtures prove scheduling/filtering and
   rendering contracts, not live latency or pixel visibility.

No cloud resource, webhook, tool installation or credential repair runs simply by
installing this code, receiving an event or opening Settings. Legacy protocol-1
notices without branch/merge metadata still refresh Git CI; Custom does not infer a
merge from them and continues polling. Near-immediate means a delivered hint plus
bounded check latency (and any rate/backoff delay), not zero-latency delivery.

## Runtime behavior

Enabled Git shares one authenticated native WebSocket owned by mounted non-footer
Custom chrome. A short runtime lease selects one owner across duplicate mounts or
windows; configuration changes and owner teardown invalidate stale callbacks.
Hiding Git or switching repositories leaves transport active but starts no hidden
PR/CI/agent-link reads. Disabling Git revokes ownership and closes the socket.
Reconnection has bounded jittered transport backoff. Events accelerate enrolled repositories, while a 120-second safety read repairs
shown Open/Draft rows independently of relay delivery or connectivity. Opening or
reconnecting also catches up using authoritative GitHub reads. Missing/invalid credentials block retries until an explicit retry or setup
revision, rather than retrying on every render.

`check_run`, `check_suite`, `status`, `workflow_run`, `pull_request` and `push` events
invalidate every loaded Open/Closed page and an explicitly linked beyond-page PR.
Pinned/unpinned PRs and drafts with running checks are updated alike. Bursts
coalesce, expanded list depth is retained, cursors are renewed, and stale replies
cannot overwrite another machine/repository. Failed reads keep the last good data.
Assigned PR label names and colours travel with those same list/targeted PR reads,
not additional requests per row. All `pull_request` actions invalidate facts,
including `labeled` and `unlabeled`; no label bodies or action-specific transport
are needed. The chrome-owned broker advances repository revisions for both label
actions, and the panel consumes them through the same deferred, render-guarded
refresh path. They do not count as main-merge hints for Custom update checks.
Reconnect and manual Refresh also replace label facts, with no label polling.

### Pending checks without enrollment

While Git is shown, Open/Draft PRs use a **45-second fallback** without confirmed
enrollment (including unknown membership or missing setup), and a **120-second
safety net** when enrolled, even during relay outages. Unenrolled pending/unknown
checks also remain eligible. Settled or known-empty checks do not stop an open
row's state reads: a later merge must leave Open without relying on another event.
One coalesced repository job probes only number, state, draft/completion dates,
head SHA and the last commit's rollup **STATE**, in chunks of at most **40 PRs**.
It does not enumerate check contexts for unchanged rows. Only a changed head or
summary fetches full contexts, batched at **20 changed PRs** under the same lease.
A null rollup is authoritative empty checks and needs no detail read. Unrelated
labels/tasks/reviews remain intact. Ordinary totals come from the same repository batch, not the
loaded subset; aggregate totals derive from eligible task rows, including the
unchanged 24-hour historical completion bound. Commands stay below Windows'
process-argument limit, including a 120-PR expanded list. The queue lease covers
every chunk; values publish only after the complete selection succeeds.
Coordinator folded sections, off-page rows and the other Open/Closed tab are not
eligible. Probes follow the same ten-item presentation paging as the renderer;
Previous/Show more invalidates held replies for the prior page without reading
immediately or shrinking full task totals. Both thin and changed-row detail reads
use the per-call GH_REPO Node carrier, not a bare gh api from the coordinator home.
Reads share the existing ordinary/aggregate queue; contention rechecks eligibility
after one second rather than starting a parallel request. Prior rows/counts stay
on screen during reads. Hidden/disabled panels, changed contexts, unverified
coordinators and disconnected remote machines stop reads and reject late replies.
Settled Closed rows need no periodic read; reopen is discovered by event/manual/
show/reconnect refresh rather than polling all closed history.

Failures retain last-good values and retry after **90s, 180s, 360s, then 720s** (the
cap); primary and secondary rate-limit refusals wait **at least 15 minutes**, or
longer when Retry-After says so. Safety API responses include headers so numeric
or date Retry-After is honored without a separate request. A secondary/burst refusal
is still a rate limit when the hourly quota has points remaining; there is no
immediate retry and no overlapping probe/detail cycle. The in-memory repository
cooldown survives hiding, reopening or switching tabs so those actions cannot
bypass Retry-After. A rate refusal also pauses this panel's other repositories;
it does not immediately fan out probes against the same machine's account. A successful read restores
the repository's 45/120-second cadence only if a shown row still needs it. No hooks are enrolled,
accounts switched or relay credentials changed by this fallback.

Healthy safety latency is up to **45 seconds unenrolled or 120 seconds enrolled,
plus queue time and the GitHub reads** (each command has a
30-second timeout). Unchanged selections need only one probe per 40 rows; changed
rows add one detail command per 20 rows. This is the scheduling bound after the preceding read; it is
not an unconditional wall-clock maximum across errors, stale/offline contexts or
GitHub eventual consistency. Event-covered rows start after native relay dispatch
and a microtask, without a configured debounce: latency includes GitHub delivery and
data propagation, any existing request, and the authoritative reads. Ordinary events
publish after all loaded pages, an older linked PR when needed and counts; coordinator
reads queue at most three targeted requests. There is no fixed end-to-end short SLA.
These are source-derived timings, not measured live delivery evidence.

All PR read paths carry an epoch/generation and share the per-PR publication rule:
older replies cannot replace newer published facts. Ordinary list, related/older,
event and fallback reads share one queue; changing selection during an event cannot
start a competing targeted read. A failed event snapshot releases the related-PR
lookup key so the active PR can retry, without losing a previously loaded pin.
Failed/discarded standalone older-PR reads also release that key and use a bounded
10-second retry delay, rather than retrying on every render. Repository replacement
invalidates old epochs; coordinator targeted reads and fallback use the same guard.

For **5 or 30 unchanged shown rows**, estimated cost is one primary GraphQL point
(the minimum per request) and one secondary read-query point per repository cycle.
There are no per-context connections in that steady-state probe. If all 5 change,
one follow-up detail batch adds roughly one point; if all 30 change, two batches
add roughly two. These are query-shape estimates, not measurements or guarantees
of GitHub's internal CPU limits. At 120/45 seconds this is about 0.5/1.33 steady
requests per minute per repository; other agents/events add separate account load.
GraphQL cannot condition field selection on a returned head/summary in that same
response, so changed rows require a follow-up; unchanged rows do not.

A shown settled Open/Draft PR that starts a rerun or merges without an event is
rediscovered by the next successful safety cycle. Partial job-count changes with
the same head and overall PENDING summary do not trigger detailed safety reads;
those counts catch up on events/full refresh or when the head/summary changes. Closed settled rows, folded
coordinator sections and hidden tabs are not periodically rediscovered. GitHub
eventual consistency, failed reads and offline/stale contexts can retain old values
until an applicable safety cycle or catch-up. A displayed **Add this repo in
Settings** does not imply a live event source; shown open/pending rows there use
the 45-second fallback described above.

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
one-time UI filter, not a selected picker entry or enrollment request. It neither
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
Repository enrollment is managed by Account → Add repo → select → Add. The optional manual Wrangler entrypoint remains
`tools/git-webhook-relay/worker.mjs`, re-exporting the single canonical receiver
`src/plugins/git/relay-worker.js`. The plugin packages that same receiver so setup
workers have no source-checkout dependency.

The receiver verifies exact raw-body GitHub HMAC, bounds input, authenticates
subscribers, and forwards only repository/event/delivery plus validated push ref
or PR action/merged/base metadata. Protocol 1 remains compatible; authenticated
configuration reports noticeVersion 2 to offer an explicit old-relay upgrade. Its endpoints
are POST /github, WSS /events, and authenticated GET /configuration. Secrets are
CLIENT_TOKEN (local token) and GITHUB_SECRET (local secret). Do not put secrets in
URLs, command arguments, configuration source, screenshots or chat.

Changing a relay URL does not remove previous GitHub webhooks or cloud resources.
Remove old resources explicitly after migration. Disable Git to stop subscriptions;
no terminal, Core or desktop restart is required.
