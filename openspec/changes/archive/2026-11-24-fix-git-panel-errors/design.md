# Design

## Context

See proposal.md for motivation. Source HEAD is 720ed1f and includes #39, #40, #41 and #43. The screenshot shows a native last-frame fallback whose detail is `interrupted`; that is not yet proof of a JavaScript exception or a particular render side effect.

The installed `mods/custom-changes/aggregate.js` and canonical source both currently execute `gh pr view <number> --repo <canonical repo> --json <PR_FIELDS>` with the context machine, a 30-second timeout and no explicit cwd or environment. `readNotice` prefixes a cold historical-only failure with `Task PR history`. Thus the existing aggregate call already meets the obvious repository-flag requirement; adding the same flag again is not an evidence-backed fix. `pullListArgs` and `countArgs` use `gh api graphql` with repository names only inside GraphQL fields, so ordinary per-repository reads also need wrapper-compatible routing coverage.

The public host facade delegates `exec` unchanged. The installed SDK exposes cwd/on/timeout but not an environment option. A read-only Core probe from this worktree and a second probe with coordinator cwd found GH_REPO and GH_HOST unset and GH_TOKEN/GITHUB_TOKEN absent for those probes. Those samples do not establish the live app's inherited environment or reproduce the historical refusal.

Existing fixtures provide packaged module resolution (`tools/plugin-harness.mjs`), complete aggregate controller tests (`tests/fleet-git.test.mjs`), history/read-failure fixtures, and row geometry tests. Some UI builders are permissive proxies and some fixtures stub notices or defer spawn, so their passing status cannot rule out the screenshot's actual path.

## Approved implementation fallback and findings

The implementation approval explicitly permits proven repairs plus diagnostics when either screenshot fault cannot be reproduced. The 30-row packaged fixture does not reproduce the native `interrupted` banner; no introducing PR for that interruption is established. Reviewed native QuickJS source confirms a 50 ms render deadline whose interruption is uncatchable. Caught JS errors can log exact text/stack/component; an uncatchable abort can only leave a component marker for a later render to log, not expose the exact native error to JS. A separate reproducible notice path starts inline and reaches synchronous notify if exec throws before its first await; that code dates to import PR #1. Only that proven boundary receives a repair.

Read-only Core execution from the native local-exec default (user home) reproduces unresolved crew PRs #36, #37 and #38 as account timurproko while crew #1–#9 and herdr-app #41/#43 succeed. The wrapper resolves first on PATH; GH_REPO/GH_HOST are absent and GH_TOKEN/GITHUB_TOKEN are absent in this reproduction. This is recorded-item inaccessibility, not proof of broken wrapper routing. Native local exec inherits the desktop environment, not Core's; the running desktop's full inherited environment was not captured, so that limitation remains explicit.

## Goals / Non-Goals

**Goals:** Establish both causes before code changes; repair the narrow source owner; retain account, identity, history, folding and stale-result safety boundaries. Exercise the complete packaged coordinator renderer rather than a replacement renderer or isolated row-only assertion.

**Non-Goals:** No running-app modifications, deployment, restart, UI clicks or session control. No changes to MyConfigs, PR #42 or fleet-attach-broken. No token collection, account switching, extra GitHub polling or background repair service.

## Decisions

### 1. Treat the native interruption as evidence to investigate, not a guessed exception

After approval, inspect installed provenance/update log and available host logs read-only. Load the actual packaged controller and dependencies in a disposable fixture with Closed selected, crew and herdr-app sections, merged/closed-unmerged rows, historical/live targets and the section read notice. Guard inline spawn, synchronous notify, focus allocation, shared writes and request starts. Use strict builder/API behavior where permissive mocks conceal native errors. Investigate native interruption/instruction-budget behavior if no JavaScript throw is reproduced. Compare the failing path with pre-change revisions in this worktree to identify the introducing merged PR before fixing it. Do not label #39 causal merely because it changed geometry.

Alternative rejected: removing the notice, hiding historical rows, suppressing the banner or blindly moving candidate callbacks. Those can conceal the failure without proving its cause.

### 2. Trace the exact failed full PR identity and execution boundary

Use the verified same-home task links to identify every crew history candidate and the working herdr-app comparison. Record arguments, machine, cwd, executable resolution and non-secret environment facts at the app/Core boundary; record only token presence, never values. Reproduce the same reads through `hc exec` with matching cwd and inherited environment. Compare explicit-repository reads to the real wrapper behavior, including absent/empty/wrong GH_REPO, explicit credentials, URL/number forms and unrelated origins. Classify a call-shape defect separately from a genuinely inaccessible recorded item or another execution failure. If refusal cannot be reproduced, say so and preserve the unresolved evidence gap rather than manufacture a cause.

Alternative rejected: trusting a successful manual read of crew #7 as proof all recorded crew PRs are accessible, or assuming the shell's active account is the account used by the app.

### 3. Apply command-specific repository routing, not an unsupported universal flag

Keep `--repo owner/name` on PR commands. For `gh api` commands, which do not support `-R`, use a nonempty per-child GH_REPO or another command-compatible wrapper-recognized form at the owned read boundary. Do not pass an invented exec environment option through the host facade. Any required process environment scoping belongs in a narrowly bounded read transport; preserve explicit credential variables and do not change the machine environment. Discovering a root repository before its identity is known remains a genuine cwd-based lookup, not a fabricated repository target.

If the evidence implicates MyConfigs, document the exact wrapper defect and proposed external correction without editing that repository. Our own known-repository reads must still be unambiguous.

### 4. Enrich refusals without collecting secrets or inventing account identity

Carry canonical repository identity into access notices and use non-secret effective-login evidence only when established. Otherwise state unknown/unverified account or explicit-credential context. Preserve one notice per repository/tab, historical age limits, last-good rows and partial recovery. Account introspection must remain bounded and read-only, never per-render IO or a global account switch.

### 5. Separate implementation outcomes and validation gates

First land render repair plus its regression; then land account-routing/read-notice repair plus call-shape regressions. Keep the draft PR and never ready or merge it. After approval and implementation, check for another suite before running `CI=true npm run test:ci`; do not overlap broad suites. Inspect required checks on the exact final head and report successful, failing, pending or absent status honestly. If draft policy prevents test checks, retain draft and report that conflict rather than promoting the PR to obtain checks.

## Risks / Trade-offs

- [The live error may be transient or native budget-related] → Retain provenance and exact scenario, strengthen the host-shaped fixture, and report a reproduction blocker rather than apply speculative code.
- [Wrapper routing differs by subcommand] → Regress PR and API/GraphQL shapes separately; unsupported `-R` on `gh api` is not a valid fix.
- [A recorded PR may no longer exist] → Identify its full repository/number and preserve an honest access notice.
- [Credential diagnostics could leak secrets] → Capture presence and public identity only; local scratch stays in ignored `.artifacts/` and public artifacts contain no private task snapshots.
- [Required checks may not run for drafts] → Never change readiness; report absent checks and the precise gate.

## Migration Plan

No live migration or deployment is part of this task. All edits remain in this task worktree. After a separately authorized merge/update, the existing guarded customization deployment can install the source fix; any rollback uses the existing deployment backup procedure, never hand edits to installed mods.
