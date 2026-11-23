# Design

## Context

See proposal.md for motivation. Read-only inspection of default main `58c540b` established:

| Evidence | Observed behavior / consequence |
| --- | --- |
| `src/shared/customization-updates.js:13-57` | The chrome calls `refreshCustomizationUpdates(..., 'check')` on mount and hourly. Settings' Check now calls the same helper with `force: true`. Owner-local pending state prevents same-view overlap; results are projected to `custom.customization-update`. |
| `src/services/updates/update-worker.cjs:89-120` | `checkMain` uses fixed `https://github.com/timurproko/herdr-app.git`, `git ls-remote ... refs/heads/main`, a persisted one-hour attempt cache and exclusive 20-second `update-check.lock`. Merely forcing every hint would bypass the hourly cache but supply no burst rate bound. |
| `src/plugins/git/mod/webhooks.js` | One native authenticated WSS `/events` client validates protocol/events/repository/delivery, deduplicates 2048 delivery IDs, emits `onChange(null)` after ready, and backs off reconnects. Its current scope includes the visible panel's repository/context; hidden Git closes it. The delivery set currently resets on reconnect. |
| `src/plugins/git/mod/main.js:236-300` | `queueWebhook` filters to the selected repository; `flushWebhook` coalesces behind a dirty flag and refreshes loaded pages/counts with stale-context guards. The relay itself is not subscribed to one repository: every authenticated client receives all enrolled repositories. |
| `src/features/workspace-chrome/main.js:150-153`; `src/plugins/git/plugin.js`; `src/plugins/registry.js:164-175` | Non-footer chrome already announces `sidebar.sync`. Git already has an enabled/disabled lifecycle listener there for monitor coordination; add relay lifecycle work alongside it, not a new plugin registry mechanism. |
| `docs/ARCHITECTURE.md`; `tests/architecture.test.mjs:63-92` | Features may use the registry and namespaced shared state, never plugin files. Ordinary plugin code imports its own files, package modules and `../api.js`; the API already exposes file reads, shared state and checking. |
| `src/plugins/git/relay-config.js`; `relay-worker.js`; `setup.cjs`; `repositories.cjs` | All already include `push`. HMAC-verified POST `/github` forwards only `{type, repository, event, delivery}` to authenticated clients. No branch or revision is sent. The receiver has no repository allowlist; the GitHub webhook is per repository. |
| `src/plugins/git/actions.js:45-114`; `added-repositories.js`; `src/features/settings/plugins-ui.js:495-540` | Actual main uses Account → Add repo → searchable multi-select → Add, not the older checkbox-list Apply flow described in parts of README/GIT-WEBHOOKS. Add calls `set-repositories`; choosing without Add does not mutate GitHub. |
| `repositories.cjs:12-21,48-61`; `github.cjs`; `cloudflare.cjs:129-139` | Enrollment revalidates login and immutable repository IDs, then POSTs/PATCHes a matching webhook with JSON/SSL, all configured events and the local secret over gh stdin. Configure installs the dedicated receiver and uploads matching secrets; no such operation is needed for this code change. |
| PR #10, currently open | Changes Settings reload restoration and `customization-updates.js`/model. This change is based on main, not its branch. Rebase after #10 merges and preserve its reload guards; no Settings reload redesign here. |

## Goals / Non-Goals

**Goals:** Near-immediate best-effort discovery while Custom is mounted, with Git hidden as well as shown; one shared transport; authoritative fixed-main checks and unchanged markers/manual actions.

**Non-goals:** Automatic installation, new update UI/settings, native changes, Core-monitor integration, live setup, guaranteed delivery while the desktop is closed, global cross-computer exactly-once checking, or relay hardening beyond the existing trust contract.

## Decisions

### 1. Hoist the existing Git-owned socket, publish public counters

Move/adapt `mod/webhooks.js` into the Git plugin's ordinary integration files (imports through `../api.js`, plus the existing `websocket` package). Attach it to Git's existing `sidebar.sync` lifecycle alongside `ensureMonitors`. Its owner is only the mounted non-footer chrome root; Settings, footers, menus and Git panel never instantiate a socket. This is one stream per desktop window, not a new socket for each consuming mod. Multiple windows may each have a chrome owner as native views already do; worker-side durable rate/lease gates arbitrate their checks.

Scope the connection to enabled Git, validated relay/configuration generation and chrome lifetime, not selected agent/folder/repository or panel visibility. Yield before starting work/publication from render. Keep authentication, bounds, stale serial guards, authentication timeout, reconnect backoff and eager-check suppression. Missing keys/relay and transport failures stay silent; do not call setup actions. Disable/configuration change invalidates callbacks and clears active-generation signals. Retain the bounded delivery-ID set across reconnects within a configuration generation.

Publish `custom.git.webhook-events` (runtime-only) with a version, generation, active/connected state, ready counter and bounded per-repository counters for any event and specifically push. Normalize repository names to lowercase. Cap the table at 128 repositories; no webhook body, URL, revision, token, secret/hash or account data enters it. Counters latch a push independently of subsequent CI events, avoiding loss when host redraws coalesce. Evicted/absent entries are a missed hint, never a reason to check arbitrary repositories; normal fallbacks remain the reliability boundary. Ignore persisted counters on a consumer's first observation; a fresh authenticated ready generation provides catch-up instead of replaying old shared state.

The panel reads only its current repository's counter and connection-ready counter and uses existing `queueWebhook`/`flushWebhook`; opening still catches up. Hidden panels do not start PR/CI/agent-link reads. Remove its old socket construction/retry ownership; its manual Refresh can publish a bounded retry request for the single owner if needed, not open another socket. No CI polling is added.

**Why not only publish from today's visible panel?** That is fewer edits but misses merges whenever Git is hidden or no Git folder is selected. **Why not a second updater socket?** It duplicates credentials/transport and keeps the old panel connection unnecessarily. **Why not a new shared credential service?** Git already owns setup/security and the lifecycle hook exists; shared public counters are the sanctioned smaller boundary without widening plugin imports.

### 2. Treat hints as one pending fixed-main check

Add a chrome-only signal-consumption entrypoint to the existing shared update controller, invoked from non-footer chrome render and yielding to the view context before work. It reads the public key and registry enable state, never imports Git files or reads Git credentials. Only a fresh matching-repository push counter, or a new authenticated ready counter for catch-up, requests a hint check. Non-push notices do nothing to Custom updates. Ready catch-up is deliberately repository-independent because missed notices cannot be reconstructed; it is still one fixed-main read.

Use a one-second trailing debounce with a three-second maximum burst wait, one pending dirty signal, and a persisted ten-second minimum between automatic-hint attempts (measured from any previous check attempt). The bound limits reconnect storms/multi-window duplicates without waiting an hour after a newly merged revision. Typical latency is the debounce plus the existing git request; a recent attempt can add at most the remaining ten-second cooldown, plus request latency. No guarantee of sub-second delivery is made.

Keep action `check` and introduce only a validated hint reason in the worker request. Ordinary mount/hourly checks retain the hour cache; manual `force: true` remains unchanged. The hint reason bypasses the hour cache only, never `update-check.lock`, update-running guards or its own persisted cooldown. Return a retry-after time for a deferred hint so the chrome can use one bounded one-shot timer rather than spin. Failed attempts also consume the cooldown; do not retry a failed network check absent a new hint, reconnect or normal fallback.

If an owner is busy or the worker lease is held, retain one dirty hint and schedule only one deferred reevaluation at completion/lease expiry; consume only the captured signal so a newer hint during I/O can receive one rate-bounded follow-up. If a deploy is running, defer to its completion and the existing post-update check; never launch work or poll peers. Clear pending hints/timers on disable/configuration generation change. Stale callbacks cannot dispatch. Preserve the existing projection/error/availability-retention behavior and the Check now request/feedback path; automatic checks do not set the recent-user-request timestamp or steal Settings focus.

A notice never supplies the worker's repository, branch, SHA or command. Even forged public shared counters can only cause a rate-bounded read of fixed public main; the trusted revision comes only from the existing git command. No hint path may invoke `launch`, `prepareClone`, deploy:all or agent messaging.

### 3. Keep fallbacks; document the honest simpler alternative

Mount checking already exists; retain it and the hourly timer with the existing persisted cache. Reconnect ready gives one debounced, rate-bounded catch-up check for outages within the same hour. With Git disabled/unconfigured/offline, there is no relay dependency or error toast: the normal mount/hourly checks and manual Check now still work. They keep their existing handling of a real version-check failure.

**Alternative: startup + window focus + ten-minute polling, no relay.** It needs no Git setup, WebSocket ownership move or repository admin permission; it touches essentially only the update controller/worker and fixtures. It costs up to six normal remote-main checks per active hour instead of one, and foreground merges can wait ten minutes unless focus changes. Focus bursts still need a persisted cache/lease. The relay approach is materially heavier because today's socket is visible-panel-owned, but reuses configured infrastructure and discovers merges in seconds while the desktop stays focused. Prefer the approved relay route with no Worker change; if that ownership refactor is judged disproportionate, approve the polling alternative as a scope revision instead of building both.

### 4. One-time setup is a maintainer action, not part of implementation

For the current main UI:

1. Open **Settings → Plugins → Git** and enable Git. Leave **Auto-fix pull requests** unchanged; it is not required for update discovery.
2. If the relay is not already configured, complete **Cloudflare tools → Install**, **Cloudflare account → Login** (choose account if needed), then **Automatic test updates → Configure**. This is explicit initial provisioning and needs Node 22.12+/npm and the existing signed-in GitHub CLI account checks. Reuse an already verified relay; do not Configure it just for this feature.
3. Expand **Repositories**, select the **Account** that administers `timurproko/herdr-app`, press **Add repo**, search `timurproko/herdr-app`, select it and press the picker's **Add** button. That confirmation creates/updates the repository's actual webhook; a local list entry or search alone is not enough. Current main does not use the older bottom Apply flow for this list.
4. If it is already listed, it should already have an active matching hook. If marked incomplete, explicitly remove/re-add through this UI to repair it; resolve duplicate matching hooks in GitHub rather than creating another blindly.
5. Read **GitHub → timurproko/herdr-app → Settings → Webhooks**: verify the active hook targets the existing relay origin plus `/github`, JSON with SSL verification, and includes **push**. The UI uses the locally held secret already uploaded as `GITHUB_SECRET`; do not copy secrets to this plan or shared preferences. Inspect Recent deliveries after a real push/merge and check existing Custom dots. Configuration readiness alone is not delivery evidence.

The setup UI already performs the required hook creation, so manual GitHub creation or secret copying is unnecessary. Required access is repository webhook administration; choosing another account may be necessary if the repo is absent. Existing auto-fix monitoring reuses Git repository enrollment, so adding this repository also expands its scope if that separate feature was already enabled; it does not turn auto-fix on.

**No relay-worker source change or Cloudflare redeploy is required by this feature.** The shipped receiver, client allowlist and enrollment events already support push. If an independently managed older receiver lacks push, upgrading/redeploying it is a separate explicit maintainer action, not something this implementation can perform. No live receiver or local Herdr home was inspected to assert its installed version.

### 5. Fixture verification, not live operations

- Extend `tests/git-webhooks.test.mjs` with fake native sockets/timers: one chrome-owned connection for panel plus updater, authentication validation, hidden/non-repo panel still receiving hints, disabled/unconfigured/checking contexts, stale-generation replies, disconnect/reconnect/backoff and dedup across reconnect. Panel still filters its repo, preserves loaded pagination and starts no hidden reads.
- Extend updater fixtures with fake time and disposable `.artifacts/` homes: target push → one real fixed-main check → actual projection publication; burst/duplicate hints; unrelated repos/non-push; cooldown bypass of the hour cache; multi-owner lease contention; hint during check; blocked lease then one follow-up; failure preservation; repeated reconnect catch-up; no stale-state replay.
- Extend separate-sandbox marker fixtures (`tests/update-markers.test.mjs`) to feed the public stream into the real chrome controller and assert already-mounted expanded/compact/menu/navigation markers update without pressing Check now. Keep manual `force: true`, feedback and mount/hourly regression assertions; include no-Git fallback-only cases.
- Assert hint/fallback requests never use action `launch`, clone, deploy, peers, task installation or agent sends; use mocked dispatchers that fail if reached. Exercise plugin packaging/dependency closure with `tests/architecture.test.mjs`; no feature import of plugin files.
- Quick implementation checks are the targeted update/webhook/architecture fixtures with their existing VM flags after a fresh customization-only build. CI is the later broad integration gate. No automated live hook creation, cloud deploy, Herdr home writes, credentials, real notices or native UI clicks.

## Risks / Trade-offs

- [Socket lifetime extends beyond visible Git] → Explicitly document the deliberate behavior change; close on plugin disable/chrome lifetime, retain transport-only backoff and keep all hidden panel reads gated.
- [Cross-mod shared values survive reloads and redraws coalesce] → Generation/readiness validation, latched per-repository counters, bounded storage and no initial replay; hourly/manual checks remain authoritative fallbacks.
- [Burst or reconnect overlaps a slow/manual check] → One dirty bit, deferred one-shot, persisted ten-second cooldown and existing exclusive lease; manual behavior is not weakened.
- [128-repository signal-table eviction or unavailable network loses a hint] → Best-effort discovery only; mount/hourly and explicit Check now remain. No durable webhook/job queue is introduced.
- [PR #10 overlap] → Rebase after its merge, preserve its restoration/busy guards and rerun the targeted controller/marker fixtures. If still unmerged when implementation is approved, report that dependency rather than silently building on its branch.
- [Stale documentation describes old setup UI] → The implementation documentation outcome corrects the relevant enrollment instructions to Add repo/Add; do not change the UI to match old docs.

## Migration Plan

Implementation requires separate plan approval. After approval and the main rebase, deliver the three task groups in order. No data migration, webhook migration or Worker redeploy is needed. The new public signal is runtime-only and excluded from preference exports. The maintainer may explicitly enroll the repository using the steps above; absent enrollment only fallbacks run. A separately authorized ordinary guarded customization deployment installs the code; rollback uses the existing recorded-backup policy, not automatic cloud or webhook reversal. No live end-to-end delivery or GPUI timing claim is made by fixture results.
