# Design

## Context

See `proposal.md` for motivation and approval limits. The coordinator's restored A1–A4, B5–B12 and C13–C14 requirements supersede the scout's UI suggestions and optional features.

Observed implementation:

- `credentials.cjs` invokes `powershell.exe` with inherited `PSModulePath`; broad catches collapse missing, unsafe, corrupt and tooling failures into STORE. `setup.cjs` further converts failed reads into unconfigured status.
- `owner.cjs` already has protected lock/CAS transitions and explicit owner discovery. Account/board names currently live only in `actions.js` view hints.
- `plugin.js` declares local-only forms and a live Access setter; `policy.cjs` reads the execution host's `shared.json`, not the desktop's value.
- `privateAction` uses the installed loopback capability bridge because the native exec API has no stdin. The bridge is local-only and already bounds payloads, lifetime and output.
- Crew's Projects declaration and the shared `listSection`, `removableRow`, `scopeRow`, disclosure, badge and picker controls provide the visual model. The shared renderer has no requirement-owned removable account row or item-picker tabs yet.
- Full deploy installs the CLI; shell-only peers do not. `plugins.nodeWorkers` is not a general dependency-closure bundler. CLI help points at an uninstalled source document.
- Hosted `.github/workflows/tests.yml` supports branch `workflow_dispatch` with Windows/Ubuntu tests even while a PR remains draft.

## Goals / Non-Goals

**Goals:** preserve per-host private storage and explicit grants; use one global Access intent with truthful per-host application; add only generic declaration capabilities to the existing UI kit; never infer provider validity from cached names.

**Non-Goals:** new card/page/dialog design, agent discovery/hooks, credential copying/sync, MCP, OAuth, arbitrary remote execution, native changes, real-account testing or production deployment. Runtime installation is explicit, not peer deployment expansion.

## Decisions

### 1. Repair only the permission subprocess and retain typed failures

Construct a fresh ACL child environment, remove every case-insensitive `PSModulePath` key and set the private path only in that child. Use the absolute Windows PowerShell executable beneath the system Windows directory, retaining NoProfile, NonInteractive, hidden window, bounded timeout and ignored raw diagnostics. Do not switch to pwsh, alter execution policy or mutate `process.env`.

The ACL script returns fixed numeric categories for wrong owner/overbroad grants versus inability to perform the check. Launch/module/timeout failures remain fail-closed. POSIX owner/mode checks, symlink/junction/hard-link refusals, checkout exclusion and atomic protected writes stay intact.

Central constant public codes/messages cover `STORE_MISSING`, `STORE_MALFORMED`, `STORE_PERMISSIONS`, `STORE_PERMISSION_CHECK`, `STORE_IN_CHECKOUT`, `STORE_UNSAFE_PATH`, `STORE_BUSY`, `STORE_IO`, `DISABLED`, `PUBLIC_STATE_INVALID` and `INTERNAL`, plus existing provider/input/outcome categories. Resource hints are enums, not filesystem paths. Typed errors survive catches; unknown exceptions become INTERNAL, not false missing setup. Owner invocation JSON failures are INPUT. Preserve `configured` compatibility, add a safe storage/problem condition, and only supply usable form state for genuine unconfigured setup. Do not change UNKNOWN_WRITE/WRITE_CHANGED or STALE semantics.

Alternatives rejected: a global CI environment workaround does not repair installed CLI calls; treating ACL tool failure as safe or absent weakens the boundary.

### 2. Persist display hints separately from authority

Add a bounded versioned private metadata record alongside credentials/policy, with account id/name/username and allowed-board id/name mappings. Bind it to the credential revision and current grant IDs. Include it in owner snapshots/CAS as appropriate; never return keys/tokens or a reversible credential representation. Store names only from validated provider responses, reject secret echoes and control characters, and preserve Unicode.

Save/verify records the account. Committed board addition records verified board names. Explicit discovery may refresh existing allowed-board names but cannot grant or remove scope. Remove/rotate clears credential-bound hints; board removal removes its hint. Interrupted transitions may lose hints/authority, never inherit another account's grants. A malformed metadata record is a distinct local metadata problem, not proof credentials are absent and not permission to silently replace unrelated files.

All ordinary opening and machine-switch checks read saved status only. Shared check context gains a generic invocation reason so explicit Requirements Check can verify the account and hydrate missing allowed-board names through bounded allowed-board reads. Initial/recheck-after-action status is not treated as a click. Verify does not change grants or write authority.

**Legacy limit:** old credentials and IDs do not encode names. They require one explicit Check, after which names persist across openings. Until then show concise Check-needed status, not invented account names or Saved board ID rows. No silent network migration is permitted. Headless setup remains supported and documents the same first-verification path.

Alternatives rejected: shared preference caches are portable/stale across hosts; re-fetching names every opening violates the no-background-request requirement.

### 3. Install complete help, not checkout-relative guidance

Expand `--help` and add offline `help setup|commands|errors|security|docs` topics with executable examples, input handling, scope/access gates, exits, unknown outcomes, revocation and untrusted-content/same-user warnings. Map `docs/TRELLO.md` to installed `lib/trello/TRELLO.txt`; existing runtime `.txt` ownership rules avoid broadening deployment to arbitrary Markdown. Resolve relative to the installed CLI with an embedded useful fallback. Do not add hook setup or agent-context commands.

Alternatives rejected: linking only to source or a web page makes first-use help depend on a checkout/network.

### 4. Route through one local private bridge and a fixed SSH dispatcher

Keep the loopback bridge local with the existing single-use capability, Origin refusal, no compression/replay, bounded IO/lifetime and discarded stderr. Add a fixed Trello route whose non-secret envelope carries captured machine binding; it cannot name arbitrary commands, paths or workers. The local service resolves `hc machine ls` itself and revalidates target identity/session, not just a UI label. Extend the plugin API through this boundary; plugins do not import service internals.

For direct SSH, spawn `ssh -T` with BatchMode, StrictHostKeyChecking and bounded connect timeout using the already configured target and trust. Support the standard Windows OpenSSH shells and POSIX sh execution paths with tested fixed-bootstrap quoting. Public bootstrap/source/version/hash information may be arguments; credentials never are. Resolve home on the execution host, not from the desktop's `appHome()`, and compare expected Core identity/session and intended login user/home before a versioned READY frame. A changed/unknown identity, wrong/elevated user, unexpected home or stale runtime refuses before sending secrets.

Send one bounded versioned action JSON through the same channel's stdin only after READY and current-generation checks. The remote installed owner worker uses its own Store. The fixed public bootstrap must not consume stdin as source (`node -` cannot also be the secret payload consumer). Parse only bounded allowlisted result fields/codes and discard all SSH/Node stderr. Recheck expected private revision before commit; never hold a private lock during network verification. Cancel/deadline kills owned transport children, rejects late commits before dispatch/commit where possible, and never promises to recall a completed commit. Response loss after possible commit is a separate unknown-configuration result, not a replay invitation.

The private store's existing protected `.write-*` atomic replacement remains allowed. There are no temporary credential handoff/input files, shell variables or secret environment values. SSH remains encrypted stdin transport; local transient native fields and the in-memory loopback handoff remain as before. Same-user/administrator memory/credential access is not a new sandbox promise.

**Named refusals:** temporary or removed/replaced machine, custom `via`, invalid SSH target/session, missing Node 20+, unknown host key/noninteractive-auth failure, unsupported remote shell, unprovable Core identity or user/home, mismatched/elevated identity. Use existing prerequisite rows and concise diagnostics, never a local fallback. Missing runtime itself is installable, not an unsupported-machine refusal.

Alternatives rejected: native exec stdin does not exist; base64/environment secrets and a remote listener are not acceptable substitutes. Existing core-control raw-error forwarding must not be copied.

### 5. Explicit Trello-only runtime installation

A Requirements runtime row probes only safe public capabilities/version. A missing or outdated runtime offers Install/Update using existing fix controls, excluded from credential actions. Send only the deterministic fixed runtime closure/help and owned launchers over the public installer channel. Reuse/extract existing launcher ownership, bin lock, home binding, hashes/conflict checks and rollback rather than inventing overwrite rules. Never install the whole app, credentials, activation, boards or write policy. Node/tooling prerequisites get a short named diagnostic rather than silent package/OS installation. Off-PATH bins remain an actionable prerequisite; do not edit PATH/profiles.

The installer must work for Core-only peers without an App installation and must preserve an existing full Custom home. Build the complete dependency closure explicitly; listing `owner.cjs` as a single compressed node worker is insufficient. Normal `deploy:shell` remains its four files. No network download is required for installation because the desktop carries the deterministic runtime payload.

### 6. One global Access intent, protected host-local enforcement

Keep one global Access segmented setting in Settings, independent of the header selection; do not introduce per-machine access selectors. Public registry/preferences can carry the value but are not proof of owner consent. A protected controller record stores the explicitly approved value/revision and identity-qualified host application receipts, with no credentials. Imported Read-write is an unapproved candidate and cannot create or renew private authority; the displayed live value derives from the approved record. A fresh setup is read-only until an explicit Access operation.

An explicit Access operation enumerates configured execution hosts and known account hosts, probes status without provider requests, and applies the approved revision through the fixed owner transport to each account host, not only the selected one. Unknown/offline membership is reported, not treated as no account. Save on a new machine starts read-only; if global Read-write is already selected, a fresh explicit global application is required before that host may write. The standard live-setting refusal/detail and Requirements status show pending/applied host names; no new status panel is added. Partial application is not rolled back by pretending all remote effects were undone.

Add a versioned execution-host control record: explicit authority mode, controller binding, host identity/session/home binding, enabled/access and applied revision, protected and separate from board policy. A managed CLI requires valid control plus the private policy gate; missing/malformed managed control denies. Existing full installations retain their legacy `shared.json`/private policy gate until explicit adoption through an owner action; installing/checking/importing cannot migrate or grant writes. Existing local disabled/invalid public state remains authoritative and cannot be bypassed by stale managed control. Core-only managed hosts have an explicitly declared control authority rather than fabricated desktop `shared.json`. Never rewrite remote shared state wholesale.

Read-only application first clears private writes, then updates control. Read-write is published only after the private and control transitions both succeed for the captured revision. A failed public/controller update must not leave a newly authorized write gate silently open; targeted cleanup removes the newly granted private authority or reports its unknown outcome. Every data follow-up/preflight rechecks the host's actual effective gates. Headless `policy writes off` can always reduce authority; `on` cannot bypass the global gate.

**Offline limitation for approval:** this design uses durable acknowledged per-host mirrors, not a new central online authorization service. It cannot immediately revoke rights on a disconnected host; that host retains its last acknowledged value. Do not say the global update completed when a host failed or is pending. No stored Read-write job runs on reconnect; the owner explicitly retries the existing Access action, even when the requested value is unchanged. Reusing the existing live-setting action affordance for retry is a generic renderer capability. Read-only/disable retries are also explicit and truthful. Automatic silent resends, indefinite queued grants and an unrelated background daemon are rejected. If the owner requires immediate offline revocation instead, this plan must be revised for an online authority/expiring-grant availability contract before implementation; that is not silently claimed here.

A different controller/home cannot adopt or overwrite existing managed authority silently. Conflicting ownership is a named error requiring explicit owner resolution, not last-writer-wins.

### 7. Declarative Crew-pattern card; no plugin-specific renderer branches

Reuse the exact shared kit components and dimensions. Extend declarations only for a requirement's saved removable row, a scope using the captured header machine, linked description text, item-picker tabs, explicit check origin and same-value live-action retry. Exercise synthetic plugins in generic contract tests so the renderer never switches on Trello IDs.

- Description: one short sentence plus the fixed `https://trello.com/apps/admin` link. No help button.
- Requirements: runtime prerequisite/fix, then account requirement. No account: masked fields and Save & verify only when usable. Saved: just the account name and the same hover Remove as Crew Projects, with existing confirmation naming the captured machine. No Verify saved or Replace. Requirements Check explicitly verifies saved credentials. Zero boards uses the existing unmet/status-badge style saying boards need adding, not missing credentials.
- Boards: existing list disclosure, `N added` badge, scope row with selected machine name and Add boards, names and Crew hover Remove. No hard-coded local/this-computer prose in remote contexts. This computer's label comes from the same machine-name helper as other plugin scopes.
- Picker: the existing search/list/footer with existing segmented tabs Active/Inactive, Active default; filter by tab before applying search and reset category on a fresh opening. Keep selected IDs stable across tabs, with explicit Add committing the chosen union, Cancel committing nothing. No Closed board sublabel. Missing names/partial inventory keep concise existing feedback; bounded/incomplete discovery does not erase unseen grants.
- Generic form availability suppresses actions whose form is hidden/unavailable, while ordinary in-flight busy controls retain normal disabled presentation. Machine/view/disable/close transitions retire values/undo, menu selection and callbacks, including selection away and back.

### Requirement coverage and outcome order

| Owner item | Delivery outcome | Main verification |
| --- | --- | --- |
| A1 | 1: storage/ACL diagnostics | Injected child env plus real Windows fake-file ACL regression |
| A2 | 1: storage/ACL diagnostics | Every safe code, status and hostile-error sentinel |
| A3 | 2: durable names | Fresh packaged view/machine reopen with zero provider calls |
| A4 | 3: installed help | Source-unavailable installed Bash/CMD/PowerShell help |
| C13 | 4: safe remote setup/runtime | Injected SSH local/remote isolation, installation and unknown outcomes |
| C14 | 5: global Access | Two-host CLI gates, import refusal, partial/offline acknowledgements |
| B5–B12 | 6: Crew-pattern card | Generic renderer/production-card tests and disposable app states |

All outcomes land their own focused tests and relevant docs, in this order. The final card outcome also composes the previous outcomes for running-app proof and final hosted integration, rather than deferring their unit coverage.

## Risks / Trade-offs

- [Global intent is not an atomic distributed transaction] → Explicit per-host acknowledgement/pending facts; offline grants remain last-known until explicit delivery. This is an approval limitation, not a guarantee hidden in implementation.
- [Legacy setup has no recoverable offline display names] → One explicit Check hydrates hints without granting scope; no silent network migration.
- [SSH can execute as a different user or elevated administrator] → Verify intended identity/home before READY; reject unverifiable arrangements rather than use privileged access implicitly.
- [Remote shell quoting or identity profiles are unsupported] → Test standard Windows/POSIX profiles with injected SSH; reject unknown profiles clearly and do not claim real-machine acceptance from these fixtures.
- [Selection changes cannot recall a commit] → Current-generation/CAS guards, deadlines and explicit unknown-configuration reconciliation; no replay.
- [Hint/control schema changes complicate rollback] → Preserve private files, validate versions and fail closed rather than downgrade/repair silently.
- [Same-user agents can bypass client policy] → Preserve documented limitation; no claim of vault, encrypted persistence or Trello server-side per-board sandboxing.

## Migration Plan

1. Build/install only through owned paths after implementation approval. Plan approval itself authorizes no production deploy, real SSH or real Trello call.
2. Keep legacy credential/policy files readable. Create hints on explicit verified actions. Initial opening neither migrates authority nor contacts Trello.
3. A direct-SSH host's explicit runtime fix installs runtime only. Saving an account or explicitly applying Access adopts the versioned host-control contract with conservative read-only defaults unless the current operation explicitly approves writes.
4. Preserve full-installation local disable precedence and Core-only authority declaration. No credential, grant, receipt or control record is exported as preferences or bundled into deployment.
5. Owned runtime/help/launcher rollback preserves private files and later edits. An incompatible control schema refuses rather than falling back to a legacy enabled state; document that rollback may require explicit owner reconfiguration before data commands resume.

## Verification and Evidence

- Extend real `credentials`, `owner`, `cli`, read/write and Settings suites plus generic form/list/kit contracts. Tests use fake credentials and injected provider/SSH with no live fallback.
- Spy on child argv/environment, public frames, logs, errors, preference exports and installation bytes for fake key/token sentinels. Secret bytes may occur only in transient form/bridge memory, SSH stdin and protected final-store writes. Retain actual real-ACL fake-file tests; capability-gate actual PS7 invocation but always test injected polluted environments/module failures.
- Exercise identity/session/user/home changes, via/temporary/refused targets, changed host keys, missing Node/runtime, malformed READY/results, size/time limits, cancel before/after READY, stale revisions, away-and-back view changes, child cleanup and post-commit response loss. Local and remote fake homes must remain distinct for every owner operation.
- Exercise all global access gates with two independently configured fake hosts: read-only/read-write, imported Read-write, no boards, conflicting controller, invalid control, local disable, partial grant cleanup, offline/pending state and explicit same-value retry. Verify CLI behavior, not only the displayed setting.
- Extend installed/deployment fixtures for isolated bins/homes, source-unavailable help, missing runtime install/update, owned conflicts, locks, rollback, PATH refusal and unchanged shell-only outputs.
- Extend `tests/features/trello-settings-native.mjs` per `docs/TESTING.md`: disposable terminal-free app/Core, fake provider and SSH, screenshots of empty form, masked input, saved account hover Remove, zero-board status, named Boards scope/count, both picker tabs/search, global Access across two selected fake hosts, runtime Install state and safe blocked/error states. Capture geometry/hover states from the running card, not mock HTML. Record native errors and stopped-process receipt.
- Place screenshots, scratch homes, logs and PR body in `C:/Users/tprokopiev/.crew/tasks/trello-card-improvements`, the brief's explicit output exception. Stop every owned app/Core/bridge child even on failure before implementation report/crew completion. Start none during planning.
- Run quick targeted checks per outcome; do not repeatedly run the broad local suite. For final implementation dispatch existing `CI` on this branch without marking the PR ready, and read results without foreground watching. Report implementation only after both hosted Windows/Ubuntu jobs are green on the reported head; inspect existing CI required/OpenSpec results too. Any later commit invalidates that evidence until its corresponding checks succeed.
