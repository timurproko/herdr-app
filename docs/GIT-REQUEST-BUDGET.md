# Git panel request budget

The panel needs no relay redeployment for quiet refusals, batching, final-history
caching, shared in-flight facts or demand-driven reads. Optional exact numbered
relay hints are **not implemented**; they are a separate, default-off follow-up.
Known final coordinator history is session-cached: external reopen/metadata edits
are not polled. An authoritative Open inventory can contradict cached final facts
in ordinary mode; restarting the mod session also starts with fresh facts.
Historical expiry remains a local 24-hour eligibility rule, not a cache TTL/read.

## Measurement

`node --experimental-vm-modules tests/git-request-budget.test.mjs` runs the actual
before controller from main `386fcc4` and the changed controller against synthetic
GitHub transport. Workload: repository A has 3 Open + 15 Closed PRs, B has
2 Open + 15 Closed, all history eligible, one hundred or fewer contexts/labels.
The generated `.artifacts/git-budget/measured.json` contains the counts. Semantic
legacy fixtures use per-PR data suppliers; those are not HTTP measurements.

These are **measured fixture API-operation counts**, not a live GitHub wire trace
or latency benchmark. Before `gh pr view -R` represents one bounded PR GraphQL
operation; CLI/wrapper versions, additional context pagination and REST hook
pagination can add HTTP calls. After batching uses explicit single GraphQL API
operations; no implicit per-PR CLI lookup remains. Estimated GraphQL cost below
uses approximately one hourly point per bounded operation (minimum-one and
connection rounding), not a measured charge or a secondary-limit guarantee.

| Coordinator trigger | Before requests / estimated GQL points | After requests / estimated GQL points |
|---|---:|---:|
| Cold initial 35 task PRs, either tab | 35 G / ~35 | 4 G / ~4 |
| Warm manual refresh, unchanged heads/summaries | 35 G / ~35 | 2 G / ~2 |
| One repository invalidated directly (A) | 18 G / ~18 | 1 G / ~1 |
| Warm Open/Closed switch and presentation paging | 0 / 0 | 0 / 0 |
| Hidden panel | 0 / 0 | 0 / 0 |

Cold reads use one metadata/summary batch and one check-detail batch per
repository. Metadata and details are bounded to twenty PRs per command; safety
probes retain forty. A single new PR can therefore need two reads rather than
one monolithic read: the aggregate win is batching, not a claim that every
isolated trigger is cheaper. New/changed checks require details; unchanged
heads/summaries reuse their known contexts on every path.

## Complete request inventory

| Reader / trigger | Before | Current policy |
|---|---|---|
| Aggregate initial unknown live/history | One full PR query per identity | Repository metadata batches, then only needed details; unknown history is classified once for truthful totals |
| Aggregate warm manual/events/reconnect/show | All linked identities reread | Mutable facts only; session-final facts and their labels/checks reused |
| Aggregate counts/history aging | Local, no GitHub count API | Still local, full verified task inventory, independent of UI paging/folding |
| Ordinary initial/Open pages | Canonical repo lookup, then ten-row page including checks/totals | Canonical lookup then metadata/summary page and only new/changed details |
| Ordinary Closed pages | Full ten-row page with checks | Membership numbers/counts only; cached final details reused, unknown rows hydrated once |
| Ordinary events after both tabs visited | Every loaded Open and Closed page, plus older pin | Selected-tab pages only, no hidden Closed rereads |
| Older/targeted/pinned PR | Independent full PR query | Shared targeted facts, final cache, pending page result when compatible |
| Counts | Embedded in pages; one compatibility query if missing | Same; no extra count query after a complete page, shared admission/cooldown |
| 45 s unenrolled / 120 s enrolled safety | Thin state/head/summary, changed details | Same bounded shapes and healthy cadence; no context lists for unchanged heads/summaries |
| Pending checks | Same safety controller | No independent polling reader added |
| Webhook burst | Delivery/in-flight-only coalescing, coordinator loses repo identity | Two-second per-repository windows, one pending dirty follow-up |
| Hidden/disabled/offline/obsolete reads | Existing guards, some list follow-ups unguarded | Gate every start and follow-up; keep retained data |
| Inactive window | Shown panel continues reads | Explicit inactive pauses; one catch-up on return, respecting cooldown |
| Rate cooldown | Safety blocked; other paths could retry | All panel API starts share cooldown; manual admits one bypass attempt, refusal stops fan-out |
| Access identity diagnosis | REST user, at most once per repository/refresh | Same; pure rate refusal starts no account diagnosis; refused diagnosis preserves original access notice |
| Enrollment | REST hooks pages, named-account REST user per worker | REST only, cached per configuration/explicit refresh; batch named-account verification for repositories |
| Global setup notice | Relay configuration HTTP, not GitHub | Same; not counted as GraphQL |
| Ordinary agent linking | Canonical repo query per distinct machine/folder every ten seconds | Reuse verified unchanged folder identity; footer reads remain local; action confirmation stays fresh |
| Coordinator agent/older pin discovery | None: explicit task identities | None |
| Label definitions | None | None: assigned names/colours included in row metadata |
| Legacy desktop auto-fix / Core monitor | Not panel readers | Independent, unchanged; excluded from panel totals |

REST hooks and user endpoints already avoid GraphQL. Moving full PR/check/review
facts wholesale to REST would multiply PR, check-run, status and review calls,
so batching GraphQL is preferable. Local root/branch probes, Core footer reads
and Crew status are not panel GitHub requests; Crew may have its own independent
discovery budget. Neither this panel nor its cooldown throttles other agents.

The host exposes `window().active`; explicit false pauses work. Unknown activity
preserves compatibility. No independent minimized-state signal is assumed, and
no native patch is added. Safety delay is cadence plus queue/read/propagation
latency, not a fixed end-to-end SLA. A stable overall rollup summary can conceal
changed individual jobs; this retains the head/summary trade-off from PR 49.
