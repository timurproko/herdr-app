# Tasks

## 1. Git and Custom consumers share one chrome-owned relay stream independent of panel visibility

- [x] 1.1 Move the existing native socket controller into Git's integration lifecycle alongside monitor coordination, preserving authentication, timeout/backoff, configuration guards and disable/checking behavior; fake-socket fixtures assert only non-footer chrome owns a connection.
- [x] 1.2 Publish versioned, bounded public repository/push and ready counters with generation invalidation and cross-reconnect delivery dedup; fixtures cover coalesced redraws, stale state, 128-entry bounds and absence of credentials/body fields.
- [x] 1.3 Replace the panel's socket ownership with the public signal consumer and a bounded retry request to the owner, retaining queue/flush filtering and hidden-read gates; fixtures cover hidden/non-repository context, opening catch-up, pagination, repository switching and reconnects without a second connection.
- [x] 1.4 Update the architecture/webhook runtime ownership guidance and any required packaging mappings with this outcome; a fresh customization build and architecture/webhook fixtures demonstrate dependency closure and no feature-to-plugin-file imports.

## 2. Debounced fixed-repository hints publish update availability while manual actions and fallbacks remain unchanged

- [x] 2.1 Rebase onto main after PR 10 merges before overlapping controller work, retaining its reload-restoration guards; the updated branch and targeted reload/controller fixtures demonstrate that the two changes coexist.
- [x] 2.2 Add chrome-only shared-signal consumption with one-second debounce, three-second maximum burst wait, one pending invalidation and disabled/stale-generation cancellation; fake-time fixtures cover target push, unrelated repository/non-push, duplicates, busy owner and reconnect catch-up.
- [x] 2.3 Extend only the existing check request with a validated hint reason, persisted ten-second automatic cooldown and retry-after response while honoring the exclusive check lease and update-running guards; disposable worker fixtures assert fixed public main, burst/race bounds, a new hint during I/O and failure-attempt retention.
- [x] 2.4 Keep mount/hourly checks, manual force/feedback and explicit Update dispatch unchanged, and preserve marker/error projections; separate-sandbox updater/marker fixtures assert availability reaches every mounted marker without a click, disabled/unconfigured fallbacks still run and no hint path clones, deploys, contacts peers or launches an update.
- [x] 2.5 Update README and update-command/testing guidance with this outcome's behavior and fixture coverage; targeted update/webhook/marker fixtures pass with their existing VM flags and the docs distinguish mocked results from live timing evidence.

## 3. Maintainer setup guidance describes explicit repository enrollment and requires no relay redeployment

- [x] 3.1 Correct the relevant webhook-enrollment guidance to the observed Account → Add repo → select → Add UI, including existing-relay reuse, webhook admin access, local-secret handling, incomplete-hook repair and Recent deliveries; review against actions/repositories/renderer sources confirms every step and no live operation is performed.
- [x] 3.2 Document that push is already accepted/requested, no Worker redeploy is needed, Git auto-fix is separate and existing enabled monitor scope expands with enrollment; include the startup/focus/ten-minute alternative comparison and fixture/live-validation limits without adding UI or performing setup.
