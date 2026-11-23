# Design

## Context

See proposal.md for motivation. The inspected base is `278e78531a5d23164cfce750c1c1710451ad7db3`. Its #21 policy deliberately allows newer capable App/Core versions; review history is not deployment permission. App review ends at 0.1.16, the tab-move App source contract pins `034f8b85f7e6bb71f8ff55cb4a80c548b2578c0f`, and the document adapter records Core 0.1.22 as reviewed. Only palette and feedback are registered native patches.

### Reference read first: a1

Read-only reference: `D:/Git/a1`, default branch `develop`, inspected HEAD `5256a6b3969f59a932893a479126fb641fb6f8f2`:

- `.github/workflows/pi-upstream-sync.yml`
- `scripts/pi/propose-pi-upgrade.mjs`, `scripts/pi/pi-upgrade-report.mjs`
- `test/repository-governance/pi-upgrade-report.test.ts`
- `docs/architecture/toolchain.md` upstream-proposal section and `docs/ci-release-runbook.md` schedule/recovery sections.

| Take over | Herdr difference and reason |
| --- | --- |
| Scheduled/manual draft proposal, stable identity, serialized writers | Discover two independently released components, not a single npm pin; resolve this repository's default branch, not hard-coded develop. |
| Continue after failures; passed/failed/blocked/skipped steps; detailed report comments | Report static source capability checks separately from actual native checks; no installed host is required or assumed on Actions. |
| Safe mechanical work before review; OpenSpec scaffold and ordinary delivery body | Generate candidate evidence, scoped diffs and tasks, not dependency bumps or three-way native rebases. Reviewed originals/baselines are safety authorities, not disposable derived outputs. |
| Closed-proposal skip and scheduled freeze | Repository-local robot label `🤖 Skip`, UTC variable `HERDR_UPGRADE_FREEZE_UNTIL`; malformed freezes fail closed. |
| Preserve human body edits and branch ownership | Stronger rule: after initial publication, never replace even a bot-only branch. Reruns comment only; explicit refresh evaluates the named head without pushing. |
| Never merges | Never marks ready or ticks migration outcomes either. Shared delivery remains the eventual readiness/finalization authority. |

Do not copy a1's npm installation, source-map inventory, feature-adoption matrix or bot-branch force-push. Do not copy its legacy non-robot skip label, hard-coded branch, identity configuration or generated task grouping that differs from current shared delivery guidance.

### Source observations and reachability

Read-only public requests during planning found:

- `https://releases.herdr.dev/app/latest.json`: HTTP 200, App **0.1.17**, `core_min`, target URLs and SHA-256 values.
- `https://releases.herdr.dev/core/latest.json`: HTTP 200, Core **0.1.22**, generation **1**, target URLs and SHA-256 values.
- App public tag `v0.1.17`: `a751b75b0418bf13950f7627d122bb934ac2c46c`; Core public tag `v0.1.22`: `6e2984629fcd600b0165f69b2e5b0bda5985ec1c`.
- App GitHub `/releases/latest` returns **404**: do not depend on GitHub Releases existing. Version tags and the native release feed are the appropriate sources.
- Immutable raw App source, including `defaults/herdr.d.ts`, `src/commands.rs`, `src/update.rs`, and `.github/workflows/release.yml`, is reachable without authentication. Native updater source confirms both feed URLs; the public release workflow publishes versioned archives before latest.json from GitHub-hosted runners.
- An anonymous GitHub API tag request returned **403 rate limit exceeded**, while authenticated metadata reads succeeded. Use the built-in read token for public GitHub API calls; never send it to releases.herdr.dev or arbitrary redirects.

These are local HTTP observations and source evidence, **not a successful egress probe from this repository's Actions runner**. The implementation must include read-only dispatch/summary output proving feed, immutable tag/tree/blob and Core-schema reachability on the hosted runner before live proposal writes are enabled. If that cannot be run before merge, document the first post-merge no-write dispatch as pending; do not claim hosted reachability proved. Tests use fake feeds/GitHub, not live release mutation.

## Goals / Non-Goals

**Goals:** deterministic independent release selection, actionable candidate evidence, one attributable draft per identity, and an agent task that names files and missing proof.

**Non-Goals:** deploying or delaying native updates; upgrading native binaries; approving release lists merely to silence advisories; live session/clipboard/UI checks; performing `native-patches-0117`; adopting PR #23 transforms; changing Crew or MyWorkflows here; creating any live migration proposal during this task.

## Decisions

### 1. Separate detection, evaluation, rendering and publication

Add `tools/propose-herdr-upgrade.mjs` with injectable release/GitHub/process adapters, a pure `tools/herdr-upgrade-report.mjs`, and small source/identity helpers as needed. Local default and manual dispatch default are read-only; publishing requires an explicit workflow mode. Add an opt-in repository variable `HERDR_UPGRADE_PROPOSALS_ENABLED=true` so merging the implementation does not immediately open a 0.1.17 migration before the no-write hosted probe and separate patch task are reconciled. This is activation, not another secret or runtime gate.

Discovery reads bounded HTTPS JSON from fixed feeds. Accept exact stable numeric versions; reject prerelease/malformed versions, missing generation and invalid checksums. Allow manual exact `app_version`/`core_version` inputs and `refresh` of a recorded proposal, with strict validation and argument arrays, never shell interpolation. Treat components independently: a failed Core feed does not hide a known new App; report Core as unavailable with last reviewed context, not as confirmed current. Resolve selected tags, including bounded annotated-tag peeling, to immutable commits. Missing/moved tags and source failures become explicit evidence failures rather than silently following master.

Build a read-only review inventory from `HOST_CONTRACT`/`HOST_PROFILES`, document `PROFILE.apps/cores`, `tools/contracts/tab-move-0.1.16.json`, `upstream/baselines/*`, the Core source-review record, and every native registry original. Add machine-readable provenance for the existing Core review hashes if needed, transcribing and validating the existing record rather than inventing a new review. Report disagreement among these authorities instead of taking one maximum as universal approval.

### 2. Identity, one proposal, and version controls

Use an identity containing the release components actually requiring review: `app-0.1.17`, `core-0.1.23`, or `app-0.1.17-core-0.1.23` when both advance. The other component is recorded context, not a reason to duplicate an existing App proposal. Branch: `chore/herdr-<identity>`; change: `herdr-migration-<identity>`. An App proposal is displayed as **Herdr 0.1.17 migration**; a Core-only proposal as **Herdr Core 0.1.23 migration**. Use conventional PR-title prefixes, e.g. `chore(herdr): Herdr 0.1.17 migration`, to retain the requested migration wording and shared delivery format.

A newly discovered Core while an App proposal exists gets its own Core migration (and cross-link), not a second App 0.1.17 proposal. If both components advance together but either already has a proposal, reuse/link that work and propose only the unrepresented component. Closed and merged proposals are included in the paginated identity lookup. Never create a second PR for an existing identity: closed-unmerged work requires explicit manual reconsideration on the same PR, including maintainer branch restoration if shared delivery deleted it. A merged proposal with inconsistent review metadata is reported as a metadata gap, not endlessly reproposed.

On schedule, an unmerged closed proposal carrying `🤖 Skip` suppresses its exact identity/components; it does not mean compatible and does not suppress later versions. Manual exact-version reconsideration explicitly overrides skips, reusing the proposal. This label is local to timurproko/herdr-app: the publisher creates it if missing, with colour `6e7781` and description `Closing a Herdr migration proposal with this label skips that version.` Preserve an existing label without overwriting its metadata. MyWorkflows' shared labels/base.json remains limited to shared review labels and is not changed. Read-only probes never create labels.

`HERDR_UPGRADE_FREEZE_UNTIL` accepts a UTC date or explicit UTC timestamp. Active freeze exits before evaluation/writes on schedule; malformed nonempty values report configuration failure and perform no writes. Manual dispatch bypasses the schedule freeze visibly. Use one non-cancelling workflow concurrency group plus a final server-state recheck before branch/PR creation. Recover push-before-create interruptions by finding the recorded bot proposal branch and opening its same missing PR, without overwriting unknown branches. A collision or uncertain write is reconciliation work, never blind retry.

For a later version of a component, create one new proposal and post a hidden-marker-deduplicated supersession comment on each older open proposal, linking the new PR and stating that earlier agent work is preserved. Do not close, retarget, force-push or rewrite bodies. The App/Core releases are not assumed to have one total version ordering; unrelated component updates are cross-links, not falsely labelled replacements.

### 3. Evidence is candidate data, not approval

Write durable proposal evidence under `upstream/migrations/<identity>/`: Markdown and versioned JSON reports, scoped unified diffs, and candidate-only stock/API/command inventories. Full bounded raw logs and downloaded data go under ignored `.artifacts/herdr-upgrade/` and an Actions artifact; actionable hunks and file lists remain in Git so an expired artifact does not erase the agent's task. Hash and bind reports to merged base SHA, evaluated head SHA, candidate commits, feed snapshots and generator schema. On reruns, comments/artifacts name their evaluated SHAs; never pretend a fresh default-branch evaluation tested the agent's edited head.

Scope the primary diff through a declarative consumed-surface map, not the whole upstream repository:

- App `defaults/herdr.d.ts` consumed exports and `src/commands.rs` consumed command definitions/argument contracts, linked to `src/integration/herdr/host.js`, `compatibility.js` and actual customization consumers. Include changed signatures, not only names. Unknown command declaration syntax blocks the command check rather than returning an empty successful set.
- App `src/{mirror,mirror_sync,layout,model,window}.rs` and recorded relevant document dependencies from the existing pinned audit.
- Core `schema/hc.openrpc.json` and the immutable reviewed document/CAS/routing/persistence/label dependencies in `docs/TAB-MOVE-CORE-0.1.22-REVIEW.md`, linked to `documents/tab-move-v1.cjs`, `core-rpc.cjs` and `services/tabs/move-tab.cjs`.
- Every registry target, currently `defaults/frame/palette/main.js` and `defaults/frame/feedback/main.js`, compared separately with **each** byte-faithful registered original. Resolve the registry's packaged paths through `customization.json`; do not confuse `frame-patches/` output paths with canonical `src/integration/native-patches/` sources. Emit original-to-candidate unified hunks plus stock-to-custom deltas so the reviewer sees overlapping changes and exactly which source to rebase.
- All stock paths already covered by reviewed baseline manifests, with source-path mapping and missing-path reporting. Candidate source hashes are not installed-binary provenance; carry existing executable provenance separately and never manufacture `verifiedEmbeddedStock`.

Reuse the complete tree-inventory audit as a secondary conservative signal: counts, changed dependency/mode/submodule paths and pinned compare link expose scope gaps, but unrelated full-repository patches do not flood the primary report. Missing baseline blobs or unavailable original provenance block the affected diff. No candidate download is adopted into runtime originals, native registry, `HOST_PROFILES`, reviewed lists or reviewed stock baselines automatically. Mechanical work is already delivered as usable evidence, candidate manifests, migration scaffold and tests, not an unsafe native merge.

### 4. Steps and report contract

Every step records name, status (`passed`, `failed`, `blocked`, `skipped`), prerequisites, command/operation, exit code when applicable, bounded summary and durable detailed evidence path. Failures do not stop unrelated steps. Auth/GitHub write errors must fail publication visibly. Render at least:

1. Feed discovery and review inventory, including per-component gaps.
2. Immutable source resolution and reachability, including rate-limit/missing-tag evidence.
3. Consumed API, command and direct-import checks. Extract pure fact checking from `check-host-api.mjs` without changing installed-host behavior; candidate declarations and safely parsed command source are static evidence, not a live `herdr-app commands` execution.
4. Existing tab-move source audit against the candidate App and Core source review; preserve unknown-release `needs-review` even if sources are unchanged. Run real synthetic adapter/menu regressions; do not relabel them native continuity tests.
5. Per-patch original matching, exact changed hunks, local source paths and expected lost styling/routing. Explicitly mark binary applicability as blocked without actual binary provenance, even when public stock source matches. Summarize #21's possible retained-but-unreviewed old owned feedback state, not just fresh-stock skips.
6. Baseline inventory: present, missing, changed, candidate-only; no older-baseline substitution.
7. Customization build, focused compatibility/regression suites and `CI=true npm run test:ci`; missing prerequisites block only dependent tests. Full logs carry command, exit and selected/excluded suites.
8. Report/scaffold generation and remaining migration actions.

Each action is an unchecked, evidence-linked instruction naming the problem, exact files to touch, desired result and verification command. Categories include facade/aliases/normalizers, document shape/CAS semantics, palette, feedback, baselines/provenance and unavailable native proof. Successful static checks do not delete human review items for behavioral contracts. Native probes require separately authorized disposable hosts, never existing sessions.

### 5. Workflow trust and permissions

Add `.github/workflows/herdr-upstream-sync.yml` with nightly schedule, manual dispatch, finite job/request/download timeouts and pinned third-party actions. Separate trusted-base evaluation from writer publication. The evaluation job uses only `contents: read`, `persist-credentials: false`, and a read token only for fixed GitHub API reads; strip credentials from test children. Never run downloaded upstream scripts, compile native Rust or start release binaries. A manually authorized refresh can evaluate the named agent head in an isolated no-secret/no-write job; writer scripts always come from the trusted default branch.

Only after validated results are available does a separate publisher mint the existing delivery App token using `DELIVERY_BOT_APP_ID` and `DELIVERY_BOT_PRIVATE_KEY`, scoped to this repository's Contents and Pull requests writes. Global workflow token permissions remain read-only; do not add Issues, Actions write, administration, OIDC or external secrets. Use the delivery App identity, not a model identity. Validate artifact paths, sizes and identity metadata; stage only generated evidence/OpenSpec paths, not `git add -A`. Do not execute report-provided code or shell. No write credentials reach candidate/test code.

### 6. Shared delivery and agent/Crew continuation

Generated migration PRs contain ordinary `## Proposal`, unchecked `## Implementation` outcomes and an Automation v3 link to their own OpenSpec change. Reports live in committed files and comments, not extra body sections that invalidate delivery. Generate one tasks.md group per body outcome, same order. Never tick outcomes automatically or record review approval merely because checks pass. Scaffold only absent change artifacts; preserve subsequent edits. A candidate evidence scaffold alone changes no product behavior: use `.openspec.yaml` with `skip_specs: true` for that review-only scaffold rather than inventing runtime requirements. If its actual migration needs behavior changes, the continuing agent must revise the approved plan with the relevant existing capability deltas before implementation; the report explicitly lists this unresolved migration decision. Do not edit the shared instruction files or put delivery rules in repository docs.

The migration report gives this handoff text, with actual identifiers substituted:

> The plan in PR <url> is approved for implementation. Continue its existing branch <branch> and OpenSpec change <change>; read upstream/migrations/<identity>/report.md, resolve its file-specific checklist and rerun the listed checks. Preserve #21 runtime safety and native update behavior. Do not create another PR, mark ready or merge.

A person can paste that into an agent attached to the proposal checkout. For Crew, first start a normal ship task for this project using `crew spawn <task-id> --project herdr-app --kind ship "<instruction above>"`. Crew creates a task branch: the instruction must require continuing the existing proposal PR via supported worktree/task attachment and must **not** push its unrelated task branch onto the migration branch. If attachment cannot be reconciled, report the blocker instead of creating a second PR. A plan-only existing worker is resumed with `crew tell <task-id> "The plan is approved; implement PR <url> on its existing branch."`; no new Crew API, autonomous spawn, agent restart or terminal input injection is introduced.

After maintainer-approved migration implementation, shared delivery owns readiness/OpenSpec finalization and the normal OpenSpec, Windows/Ubuntu suites, `CI required` and `Delivery check` remain authoritative. This automation never merges or arms auto-merge. Proposal checks are diagnostic, not a new required gate or update veto.

## Risks / Trade-offs

- [Source is not installed binary provenance or native semantic proof] → Separate static, fixture and native verdicts; missing binary/UI evidence stays explicit and cannot authorize patch refresh.
- [Review list and baseline versions can disagree] → Report every evidence category independently and require review-specific action; no synthetic universal version pin.
- [Public API rate limits and temporary feed/source outages] → Authenticate fixed GitHub reads with existing read token, bound work, retain independent results and report unavailable evidence without implying compatibility.
- [New upstream dependency outside the scoped map] → Keep whole-tree fingerprint summary, changed dependency warnings and immutable compare link; scope expansion remains explicit review work.
- [Robot proposal collides with the separate 0.1.17 patch task] → Writes are opt-in and this task opens no live migration proposal; seed from the final merged review inventory, not planning-time constants.
- [Local label creation requires permission] → Use the existing delivery App's Pull requests write permission for the repository label endpoint; fail visibly on denial, without broadening permissions or modifying MyWorkflows.
- [Report-only no-push reruns can grow stale in Git] → Dated comments/artifacts bind exact SHAs; agents deliberately commit refreshed evidence. Never imply a stale tracked report is the latest evaluation.

## Migration Plan

1. Obtain approval of this planning PR before code changes.
2. Implement and fixture-test the outcomes below; run the requested supported CI subset. Do not dispatch a publishing run or open a live version migration.
3. Leave this task's PR draft as requested. No ready/merge/variable/label action is authorized here.
4. After an explicitly authorized merge, maintainer runs manual no-write dispatch to verify hosted reachability, reviews existing migration work, then opts in proposal writes; the first publisher creates the local skip label if missing. An explicit manual publishing dispatch may bypass the schedule freeze.
5. Roll back automation by disabling proposal writes or freezing the schedule; runtime behavior has not changed. Removing the workflow/tools is independent of installed customization state. Never delete agent-owned branches or rewrite review evidence as rollback.
