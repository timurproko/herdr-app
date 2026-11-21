# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. The source inventory is 550 yadm-tracked current files, including a personal host snapshot and an obsolete project AGENTS.md. The destination is a public scaffold with MIT licensing, Node 20+, shared workflow bootstrap, tests, and an OpenSpec root with no capability specs. The source's build is checkout-only; deployment already resolves `HERDR_APP_HOME` or the user's default Herdr home. The main portability problems are documentation/source-location assumptions and several tests, not a need to rewrite the installer.

The full public-readiness audit, including its relay, environment-reference and artwork appendices, was read before planning. The source and real app home remain read-only. Only planning artifacts are written now; artwork and runtime decisions below require approval before implementation.

## Goals / Non-Goals

**Goals:**

- Produce one curated public source tree without inherited private history or transient exposure of excluded files in intermediate commits.
- Retain the app's boundaries and behavior, making only import/privacy/licensing/standalone/test-portability changes.
- Keep host-free validation independently runnable with no installed Herdr, private shell profile or personal snapshot.
- Record legal source evidence separately from inferred visual similarity and from unverified runtime claims.

**Non-Goals:**

- No native binary/installer/Core rebuild, new native opt-in, plugin redesign, public preference-export feature, or new automation policy.
- No live install, account/provider access, relay deployment/security fix, remote setup or edits to the private source.
- No wholesale fixture-string replacement, dotfiles-history transplantation, or private shell-hook installation.

## Decisions

### 1. Allowlisted current-file import with pre-publication curation

Use the home-cwd yadm tracked-file enumeration as the only source allowlist. Resolve each path beneath the customization subtree, reject symlinks/escapes, and copy current file bytes into the corresponding root-relative path in this checkout. Do not recursively copy the source directory, inspect/import installed outputs, import Git metadata or use yadm history. Re-enumerate and compare source inventory/digests immediately before implementation; if source changed, review the delta rather than silently importing a different snapshot.

Never copy `preferences/pc.json` into this checkout or Git's index. Keep the inspected visual-only `preferences/layout.json`, `palette.json`, and `theme.json`; build packaging does not reference the personal snapshot. Add a small `preferences/example.json` only if needed for documentation/tests, with `version: 1`, a few neutral shared settings, no accounts/profiles/pins/relay, and a non-real hostname. Continue hostname-specific explicit import behavior; do not relocate snapshots in this change.

Preserve destination LICENSE, AGENTS.md, CLAUDE.md, `.github/workflows/delivery.yml`, the existing CI structure/aggregator, `scripts/workflow-bootstrap.mjs`, `scripts/ci-required*`, `.gitattributes`, and `openspec/`. Keep `package.json` name `herdr-app`, private flag, MIT and engines; merge source app scripts with bootstrap and scaffold checks. Merge ignore rules, keeping generated `dist/`, dependencies and `.artifacts/` ignored and preventing accidental host snapshots from being added (allowlist the three visual snapshots and any deliberately synthetic example).

Perform privacy edits and legal replacement/notice work **before the first app-source commit**; never commit blocked assets or private settings and remove them later. All app files and imported owner-neutral docs arrive together with their notices in outcome 1. Architecture assertion updates required by the shared guidance move land with outcome 2, and host-free test-runner changes land with outcome 3; do not pretend the intermediate import passes the full suite. Quick per-outcome checks are targeted; integration belongs to the final CI head.

Alternative rejected: bulk copying then scrubbing. It risks irreversible public exposure and imports untracked runtime data. Source digests/curation logs stay in ignored `.artifacts/`; public provenance records contain only distributable paths and public upstream references, not personal configuration values or the private audit report.

### 2. Targeted anonymization, not global text substitution

| Destination | Change before publishing source |
|---|---|
| `tools/runtime/ssh-clipboard-smoke.ps1` | Add mandatory explicit remote-machine argument, validated before any clipboard or host operation. No default real host; preserve the explicit local-plus-selected-remote scenario. Unit-test argument/validation structure without executing the tool. |
| `tests/status-reveal.test.mjs` | Replace both personal-looking account labels and the named-person comment with neutral account-A/account-B fixtures; keep the switch/race scenario. |
| `tests/regression/pulls.test.mjs` | Use consistent generic owner/repository/remote/head values, preserving canonical-repository and fork cases. |
| `tools/inspect-pr-links.mjs` | Require explicit owner/repository and PR-number inputs, validate before any live-home write, use safely serialized values in generated code; remove hardcoded selections. Document it as a live-home-writing inspector despite the old header's read-only claim. Never execute it here. |
| `tests/pr-agent-links.test.mjs` | Genericize the owner-specific SSH alias while preserving alias canonicalization. |
| Non-fixture operational examples | Genericize the optional VS Code URI/path example and permission-launcher smoke usage comment, not functional Windows fallback paths. |

Apply the audit's owner-neutral narrative/machine/path edits in README and these docs: `ARCHITECTURE.md`, `GIT-CI-FIX.md`, `GIT-CORE-MONITOR.md`, `TAB-MOVE-ADR.md`, `VALIDATION.md`, `history/README.md`, `history/VALIDATION.md`, `history/docs/PREVIEW-PERFORMANCE.md`, and `history/docs/CODEQUOTA.md`. Replace real monitored-repository selections and owner validation accounts/paths with generic examples; retain reviewed App/Core version evidence, CodeQuota attribution, and distinguish historical observations from current guarantees.

Retain `@timurproko/a1` resolution and tests, Crew's public Git URL, third-party attribution, A1 protocol provenance, and synthetic machine/path fixtures. No mass replacement of the hundreds of distinct-machine routing cases. Scan the curated tracked tree for secrets/personal infrastructure before staging; use synthetic patterns for regressions rather than copying private values into tests. Use the maintainer's GitHub noreply identity for new commits, not the private email found in local Git configuration; do not import or rewrite source history.

### 3. Legal coverage is a condition of source import

Keep project contributions MIT. Add root `THIRD-PARTY.md`, full license texts under `LICENSES/`, and a machine-readable provenance manifest covering all 89 non-file-icon SVGs and the five derived/snapshot JS files. For each entry record path, public source/version or honest unknown download version, applicable license(s), derivation/modification, and replacement source/hash where applicable. Pin the chosen Lucide replacement source at one immutable release/commit; vendor SVGs instead of adding a network-fetching build step.

Native code records:

| File under `src/integration/native-patches/` | Attribution / modification note |
|---|---|
| `palette/original-0.1.13.js` | Herdr v0.1.13 palette; local facade-import adaptation and checkout newline qualification. |
| `palette/original.js` | Reviewed v0.1.14-era palette, content also matches v0.1.15/v0.1.16 after import reversal/newline normalization. Do not invent initial copy date. |
| `palette/main.js` | Modified Herdr palette from the reviewed originals; Custom UI/routing/scroll changes. |
| `feedback/original.js` | Herdr feedback stock matches reviewed v0.1.13–v0.1.16 after import reversal/newline normalization; initial copy version not distinguishable. |
| `feedback/main.js` | Modified Herdr feedback from that stock; Custom styling/draft/attachment behavior. |

Include Apache-2.0 text, upstream copyright/attribution and modification notices. Preserve retained stock bytes apart from their existing documented facade import; prefer provenance/adjacent notice records over inserting misleading new headers into hash-sensitive stock snapshots. Record applicable Lucide/Feather layers for Herdr-matched SVGs as well as explicitly Lucide-marked assets. Preserve any relevant upstream NOTICE if present at the pinned release; do not fabricate one.

[image-decisions.md](image-decisions.md) is the exhaustive decision ledger for 41 unresolved SVGs: 35 proposed Lucide replacements, 3 functional-gradient authorship holds and 3 provider-brand decisions. Nothing is silently labeled MIT/Apache because of visual similarity. A maintainer's original-artwork declaration must explicitly cover each retained gradient and the project MIT grant. Retaining a third-party brand SVG needs its actual permission trail, not just an assertion of project ownership.

Retain the Material Icon Theme/Paseo notices and their existing packaging. Ensure new general notices/license texts accompany build output and deployed copies where required (including native patches and layout/shared SVGs), extending packaging/deploy path allowances narrowly if necessary. Test notice propagation and ownership; do not broadly allow arbitrary deployment paths. An unavailable authorship/brand decision blocks importing those files and therefore the complete source outcome; it is not a reason to commit unlicensed bytes temporarily.

Alternative rejected: licensing all icons under the project MIT file or assuming Herdr's Apache license covers every provider mark. Neither establishes the missing provenance.

### 4. Standalone setup and retained engineering guidance

Adapt README to a checkout anywhere; installed locations are beneath the resolved Herdr home, never implicitly `../`. Document Node 20+, Windows-first runtime tooling (Herdr App/Core, PowerShell, Node), reviewed App versions 0.1.13–0.1.16 for the general facade and the narrower tab-move App 0.1.15/0.1.16 + Core 0.1.19/0.1.21 gate. Do not broaden those gates on the basis of CI.

Installation documentation describes build, explicit guarded deploy, optional enable and doctor, with conflict/rollback/removal cautions, but none of those operational commands is run for this task. Fix relative deployed-worker examples to use the resolved home. No preference import is necessary for a base installation; snapshots are optional, credential-filtered backups, **not anonymized/public-export-safe** (pins, plugin settings, paths and automation choices can remain personal).

Add a base-versus-optional dependency table for Files/Git/Usage, VS Code Remote, A1 and Crew/Firstmate. Disclose Usage credential-store reads/possible refresh, explicit Git/webhook setup and auto-fix effects, and that auto-fix remains false by default. Keep the existing Crew source URL and document its mutable main/latest dependencies instead of introducing a new pinning project. A1 protocol-1 consumer support remains explicitly optional/pending until a released matching version is established by public evidence; old immutable sessions are not restarted or repaired.

Create `docs/DEVELOPMENT.md` with still-valid host, architecture, source ownership, packaging, preference, conflict and session-safety guidance from the old AGENTS.md. Remove the old requirement to live inside Herdr and old per-project delivery instructions; do not add another AGENTS/CLAUDE file. Update the architecture test's AGENTS-content assertion to the new docs path without weakening the underlying host-boundary assertion. Keep shared AGENTS.md/CLAUDE.md unchanged.

Preserve the shell payloads and explanation, but label external Bash/PowerShell profile wiring, the hardcoded loader source location/yadm revision marker and Claude companion hooks as optional/private integration not installed by standalone deploy. Base features may use native cwd fallback with reduced reporting; do not promise the optional hooks work from an arbitrary checkout or copy unrelated private `.config/AGENTS.md`. A future shell-integration design can remove those assumptions.

### 5. Required host-free validation, opt-in native checks

Implement [ci-proposal.md](ci-proposal.md): preserve the existing CI workflow, Node 20 Windows/Ubuntu matrix and `CI required` dependency contract. Extend the safe test entrypoint to include scaffold/aggregator assertions; split installed-host dependencies out of directory regression, make Bash fixtures portable, and explicitly isolate all app/credential homes and native executable fallbacks. Keep synthetic upstream/API and mock policy tests in both lanes. The optional A1-candidate body and native/live tools do not become implicit dependencies.

Use a separate hosted-Windows-only OS fixture for real recycle-bin behavior, retaining exact-pair restoration assertions without exercising the workstation's bin. Missing runner prerequisites fail clearly rather than silently converting intended required coverage to skips. Changes to suite discovery must keep names/counts visible. No local app test runs until its reachable code has been audited; no test is permission to deploy to the real home or contact live external services.

Alternative rejected: running the source's unit command unchanged or dropping all integration-looking files. The first touches machine-specific dependencies; the second discards many safe, useful mocks. Preserve the separate installed-host/native validation commands with honest exclusions and do not advertise their success.

## Risks / Trade-offs

- [Missing artwork declarations] → Complete import stays blocked until the six held files receive explicit decisions; default 35 replacements also require plan approval.
- [Import source drifts] → Re-enumerate current tracked files and inspect changed digests before copying; no hidden use of stale audit claims.
- [Portability differences] → Windows and Ubuntu required lanes cover shell/path behavior; fix defects rather than broad skip filters. Windows OS recycling is unverified until the hosted runner executes it.
- [Guidance move breaks architecture assertions] → Move the same substantive assertion to docs; do not alter generated shared instructions to satisfy the old test.
- [Native state/host probing hidden behind fixture calls] → Sandbox home/env and block native fallback; keep native/live tooling excluded. Host-free CI does not establish GPUI rendering or live interaction correctness.
- [Old documentation asserts broader privacy/readiness] → Correct exporter and rollout language; retain historical version evidence but label historical/manual results as not revalidated.
- [Relay limitations and mutable companion dependencies] → Disclose, keep automatic fix off, and track follow-ups; do not change their security/release architecture in this import.

## Migration Plan

1. After approval and the held-image decisions, curate the current tracked source in this worktree, complete targeted privacy edits/replacements/notices before the first app-source push, and check build plus focused import/attribution regressions in a sandbox.
2. Complete standalone README/docs and shared-guidance adoption with focused contract checks.
3. Complete the host-free runner/CI split and capability regression coverage. All three capability deltas describe the imported main behaviors, not an exhaustive feature inventory. Record actual targeted results and all native/live gaps; final ready-head CI is the integration gate.
4. No live deployment occurs. Eventual installation is a maintainer action against the chosen Herdr home using the guarded installer. Existing ownership conflicts abort, prior opt-ins stay explicit, and rollback preserves personal edits; no automatic preference import or shell integration is added.

The concrete approval requests are in proposal.md and image-decisions.md. There are no deferred design decisions hidden as implementation discovery tasks.
