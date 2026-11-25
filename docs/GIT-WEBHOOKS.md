# Git plugin: automatic test updates

Open the Git panel's **Settings** link. Setup is a set of prerequisite actions,
not a wizard. There is no terminal command, secret copying or URL pasting in the
normal path.

## Quiet GitHub rate refusals

Primary and secondary rate-limit refusals keep last-good rows, counts, pins and
paging without a red notice, banner or new Stale alarm. A cold refused load stays
**Loading…**. Automatic retries wait at least fifteen minutes or a longer
Retry-After, even when the hourly quota is positive. Explicit Refresh may try one
read during cooldown; another refusal stays quiet and stops that refresh's fan-out.
One sanitized customization-log line records each refusal episode, not each retry.
Authentication/permission, connectivity, process, timeout and malformed-response
failures retain their existing actionable feedback. An account-identity diagnosis
that is itself refused does not hide the original permission error.

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
   independent. A successful confirmed Add saves its displayed effective GitHub
   account, including the unsaved default, after all mutation batches finish; checks,
   picker opening/cancellation and wholly failed Adds do not pin an account. Picker
   drafts are per-view and never exported or replayed.

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
  to relay/account as runtime state, not saved desired-state jobs. This durable
  confirmed added list also owns the opt-in Core monitor's allowlist; invalidating
  `custom.git.webhook-state` does not clear it. Final removal or a missing/mismatched
  scope stays empty without legacy fallback. Existing lifecycle sync writes changes
  to reachable workers; offline hosts keep their last configuration.
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
Reconnection has bounded jittered transport backoff. Events accelerate enrolled repositories, while 45-second pending and 120-second
settled safety reads repair enrolled shown Open/Draft rows independently of relay delivery or connectivity. Opening or
reconnecting also catches up using authoritative GitHub reads. Missing/invalid credentials block retries until an explicit retry or setup
revision, rather than retrying on every render.

`check_run`, `check_suite`, `status`, `workflow_run`, `pull_request` and `push` events
invalidate mutable facts in the affected repositories and the selected ordinary
tab, including an explicitly linked beyond-page PR. Hidden Closed pages are not
reread. Pinned/unpinned PRs and drafts are covered alike. Main's immediate event
delivery and same-turn/in-flight coalescing remain; there is no two-second window.
Each separately dispatched event uses the affected repository's batch. Expanded
depth is retained and cursors renewed. Stale replies
cannot overwrite another machine/repository. Failed reads keep the last good data.
Assigned PR label names and colours travel with those same list/targeted PR reads,
not additional requests per row. All `pull_request` actions invalidate facts,
including `labeled` and `unlabeled`; no label bodies or action-specific transport
are needed. The chrome-owned broker advances repository revisions for both label
actions, and the panel consumes them through the same deferred, render-guarded
refresh path. They do not count as main-merge hints for Custom update checks.
Reconnect and manual Refresh also replace mutable label facts, with no label polling.
Known final rows retain session-cached labels and checks. See the measured
[request budget and final-cache freshness limits](GIT-REQUEST-BUDGET.md). No relay
redeployment is required; optional precise numbered hints are deferred.

Event, window and enrollment scheduling deliberately match main. The removed
pending-demand transfer/acknowledgement state, inactive pause/catch-up and deferred
enrollment retries are not part of this change. Enrollment remains one worker
per repository on configuration or explicit Refresh, including normal account
verification; rate refusals stay quiet but do not schedule a later worker.

### Pending checks without enrollment

While Git is shown, pending/unknown Open/Draft checks use a **45-second fallback**
even when enrolled. Settled rows retain **45 seconds without confirmed enrollment**
(including unknown membership or missing setup), and **120 seconds when enrolled**,
even during relay outages. A repository with any shown pending row uses the shorter cadence. Known Closed/Merged rows are never safety-probed,
even when their last-known checks are pending or unknown. Settled or known-empty checks do not stop an open
row's state reads: a later merge must leave Open without relying on another event.
One coalesced repository job probes number, state, draft/completion dates,
head SHA and rollup **STATE**, including the existing first-100 context selection
for pending/unknown rows in that same request. Settled aliases remain thin.
Chunks contain at most **40 PRs and 20 detailed pending PRs**. Newly changed
settled heads/summaries can still fetch bounded follow-up details under the same lease.
Counts retain newest-workflow/newest-attempt filtering and SUCCESS/SKIPPED/NEUTRAL
as passed; raw aggregates are unsuitable because they include superseded runs.
More than 100 contexts retains the existing incomplete-context refusal and last-good facts.
A null rollup is authoritative empty checks and needs no detail read. Unrelated
labels/tasks/reviews remain intact. Ordinary totals come from the same repository batch, not the
loaded subset; aggregate totals derive from eligible task rows, including the
unchanged 24-hour historical completion bound. Commands stay below Windows'
process-argument limit, including a 120-PR expanded list. The queue lease covers
every chunk; values publish only after the complete selection succeeds.
Coordinator probes cover the revealed unfolded batch, including offscreen rows.
Unrevealed rows, folded sections and the other Open/Closed tab are not eligible.
Reveal/fold/tab/home/relevant projection changes advance the captured selection
generation and reject held replies, including away-and-back changes. Native viewport
motion within an unchanged revealed set keeps its generation and starts no extra
probes or inventory reads, and never shrinks full task totals. Both thin and changed-row detail reads
use the per-call GH_REPO Node carrier, not a bare gh api from the coordinator home.
Reads share the existing ordinary/aggregate queue; contention rechecks eligibility
after one second rather than starting a parallel request. Prior rows/counts stay
on screen during reads. Hidden/disabled panels, changed contexts, unverified
coordinators and disconnected remote machines stop reads and reject late replies.
Window activity does not gate Git reads, matching main. There is no inactive
pause, inactive-return catch-up or independent minimized-window mechanism.
Known Closed/Merged rows are session-cached, not periodically reread on generic events,
manual refresh or hide/show. Ordinary Open inventory can rediscover reopened rows;
coordinator final-history external changes wait for contradictory facts or a new
runtime session. This is the deliberate cost/freshness trade-off of final caching.

Failures retain last-good values and retry after **90s, 180s, 360s, then 720s** (the
cap); primary and secondary rate-limit refusals wait **at least 15 minutes**, or
longer when Retry-After says so. Safety API responses include headers so numeric
or date Retry-After is honored without a separate request. A secondary/burst refusal
is still a rate limit when the hourly quota has points remaining; there is no
immediate retry and no overlapping probe/detail cycle. The in-memory repository
cooldown survives hiding, reopening or switching tabs so those actions cannot
bypass Retry-After. A rate refusal also pauses this panel's other repositories;
it does not immediately fan out probes against the same machine's account. A successful read restores
the repository's 45/120-second cadence only if a shown row still needs it. A probe
encountering an existing cooldown retries at its absolute expiry, without another
event or restarting the fifteen-minute floor. No hooks are enrolled,
accounts switched or relay credentials changed by this fallback.

Healthy safety latency is up to **45 seconds while pending or unenrolled, or
120 seconds when enrolled and settled, plus queue/read time** (each command has a
30-second timeout). Pending rows refresh numbers every cycle, not only when head
or summary changes. Numeric confirmation timestamps advance only on successful
numeric reads, not cached or thin state reads. After more than **90 seconds** without
confirmation, the next eligible pending cycle demands a fresh read rather than
joining an already-started response. Busy queues retain their one-second retry;
active reads, cooldowns and failures still take precedence. Each bounded chunk
uses one combined request; newly changed settled rows can add a detail follow-up. This is the scheduling bound after the preceding read; it is
not an unconditional wall-clock maximum across errors, stale/offline contexts or
GitHub eventual consistency. Event-covered rows start after native relay dispatch
without an added debounce window: latency includes GitHub delivery and data
propagation, any existing request, and authoritative reads. Ordinary events publish
after selected-tab pages, narrow transition/older-PR reads when needed and counts;
coordinator reads queue at most three repository jobs with sequential twenty-row chunks. There is no fixed end-to-end short SLA.
These are source-derived timings, not measured live delivery evidence.

All PR read paths carry an epoch/generation and share the per-PR publication rule:
older replies cannot replace newer published facts. Ordinary list, related/older,
event and fallback reads share one queue; changing selection during an event cannot
start a competing targeted read. A failed event snapshot releases the related-PR
lookup key so the active PR can retry, without losing a previously loaded pin.
Failed/discarded standalone older-PR reads also release that key and use a bounded
10-second retry delay, rather than retrying on every render. Repository replacement
invalidates old epochs; coordinator targeted reads and fallback use the same guard.

For **5 or 30 unchanged settled rows**, estimated cost remains one primary
GraphQL point per repository cycle. Five pending rows also fit one combined request;
thirty fully pending rows need two existing twenty-detail-row chunks. Live one-row
measurements show one point with either selection, but nodeCount rises from 1 for
aggregate-only to 101 for the existing contexts. Ten fully detailed rows estimate
about 1,010 nodes; twenty about 2,020. See [the request budget](GIT-REQUEST-BUDGET.md).
At 120/45 seconds a one-chunk repository uses about 0.5/1.33 requests per minute
(30/80 per hour); events and other agents add separate account load. These are
query-shape estimates, not guarantees of GitHub's internal CPU/secondary limits.

A shown settled Open/Draft PR that starts a rerun or merges without an event is
rediscovered by the next successful safety cycle. Partial job-count changes with
the same head and overall PENDING summary now refresh in every pending probe;
event/manual paths also reread pending numbers immediately. Closed settled rows, folded
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

After a customization update, existing enabled preferences and confirmed repositories
with a saved GitHub-account binding are picked up by startup/code reload, with no
re-save or desktop/agent restart. Old added lists with a blank saved account remain
suppressed until you choose the matching account once or confirm an explicit Add;
the monitor does not infer authority from that old list alone. Run
an already-closed updated desktop once and reconnect offline managed hosts so its
normal lifecycle can update their owned companion packages and configurations.

In Git's **Settings** disclosure, **Auto-fix pull requests** enables an independent
Core-side companion; it defaults off. It messages the verified existing PR agent,
not a coordinator, with separate editable/switchable CI, conflict and merged-cleanup
messages. Saved Idle/Done/Error/Working selection remains authoritative; Working
is opt-in and Blocked excluded. Templates supply the whole message, with no hidden
suffix. This can authorize the existing agent to fix and push, but never starts
another agent. The companion reads its own local Core/GitHub facts without a shown
panel, relay event or state transition; webhook enrollment alone does not enable it.
CI waits for a completed failed/timed-out workflow, never an early individual failed
job. Persistent conflicts and CI evidence retain their existing durable duplicate
receipts and non-forced `hc send` transport.

Diagnostics are local only: `~/.local/state/herdr-ci-monitor/status.json` distinguishes
empty/all-skipped scope (**suppressed**) from acknowledgement (**ready**), verification
failure (**unavailable**) and uncertain submission (**uncertain**). Separate
`diagnostics.json` keeps at most 128 entries / 64 KiB with reason, time, repository,
PR and target terminal where known; unchanged suppression episodes coalesce.
Reasons include no monitored repositories, agent state not selected, workflow still
running and already sent (already recorded, possibly unknown, not proof of delivery).
No new toast or panel UI is added. See [the CI fix contract](GIT-CI-FIX.md) for current
messages, remembered oldest-live-owner selection, evidence, receipt and diagnostic
rules. No live message tests run during deployment, and no A1 API change is needed.

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
