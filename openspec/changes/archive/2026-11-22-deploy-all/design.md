# Design

## Context

See proposal.md for motivation. Read closed PR 5's `update-from-settings/design.md` at commit `89a700f10c8d9b332f8aba0231b0a372bc68ebb6` for transport/deployment findings, not its proposed scope. Current scripts are full deploy = host check → build → guarded deploy, shell deploy = build → guarded shell deploy. Deploy already returns JSON with changed/removed counts and backup ID; ownership records contain hashes, not installed Git commits.

`hc --help`, `hc machine ls --help` and `hc exec --help` confirm machine inventory and terminal-free argv execution. `src/plugins/crew/plugin.js` demonstrates `.machines`, connected state, Base64 stdout/stderr and `spawn_failed`/`timed_out` envelopes. Windows npm shims need a command shell, unlike node/git executables. Planning used help and source only, not a live machine listing/probe.

## Goals / Non-Goals

**Goals:** one small synchronous command watched by a person; clear refusals, independent machine results and existing installer safety.

**Non-goals:** all PR 5 UI/dot/hourly-check machinery, provenance schemas, clone adoption records, managed desktop sources, detached jobs, scheduling, remote clone/install/repair, dependency installation, native modifications or automatic recovery.

## Decisions

### 1. Source gate before any deployment or remote call

Add `tools/deploy-all.mjs`, a small built-ins-only CommonJS remote worker and `deploy:all` in package.json. Resolve the source from this repository entrypoint, not an arbitrary caller cwd. Parse options before work. Always validate the source, including with `--skip-local` or remote-only selection: tracked/untracked cleanliness, main branch, origin identity, fetch origin, then require HEAD to be equal to or an ancestor of origin/main. Refuse ahead as well as diverged history; `merge --ff-only` alone accepts ahead HEAD and is insufficient. A refusal or inability to establish source safety exits non-zero before listing/contacting peers or deploying locally. Never stash, reset, clean, switch branches or rewrite origin.

Recognize GitHub HTTPS and SSH origins naming `timurproko/herdr-app`, including the maintainer's existing `git@github-timurproko:timurproko/herdr-app.git` alias; remote plain HTTPS clones work without adoption. Read the configured origin URL rather than requiring the desktop's SSH spelling on peers. Do not log credential-bearing URLs. Fixtures use an explicitly injected local bare origin, not a production URL escape hatch.

For selected local deployment, fast-forward to the fetched main commit and run `npm run deploy`, preserving HERDR_APP_HOME/default behavior. Still run deployment when HEAD already equals origin/main: checkout equality does not establish installed currency. A local pipeline failure is a machine failure, not a global abort; attempt peers afterward.

### 2. Exact machine discovery and remote invocation

After the source gate, list configured peers once using argv `['hc','machine','ls','--json']`, i.e. `hc machine ls --json`. This lists other machines, not terminal membership. Use `.machines[].name`/`.state`; offline peers get a skip line and no exec call. Use `local` as a documented selector alias for the desktop, also accepting its hostname. `--only a,b` selects named peers/local; `--skip-local` overrides local selection. Unknown names are usage errors, reported before deployments. Excluded inventory rows get `skipped: not selected` or `skipped: --skip-local` in the summary.

For each connected selected peer, the exact parameterized command line is:

```text
hc exec --on <machine> --timeout 600 --json -- node -e "eval(Buffer.from('<base64-worker>','base64').toString('utf8'))"
```

Pass every argument separately to spawn (no local shell). `<machine>` is the captured inventory name; `<base64-worker>` is the Base64 UTF-8 text of our small self-contained worker plus a serialized dry-run flag and expected repository identity. No remote script file, installation or background process is created. The worker is supplied by the desktop so an older peer checkout need not contain deploy:all. Never use `hc run`.

The worker resolves `os.homedir()/.local/share/herdr-app` on the peer and the fixed default `os.homedir()/.config/herdr-app`. Set HERDR_APP_HOME to that remote default for the shell deploy; do not forward the desktop environment or accidentally use a peer's nondefault override. Check for the checkout, Git, Node 20+ and npm, recognized origin, clean main and existing installation type. A manifest with layoutBase or non-shell ownership indicates a full desktop deployment: skip with `needs its own full deploy`, before fetching/fast-forwarding. Unreadable/unrecognized ownership is skipped with its reason, never repaired. A checkout without a prior manifest can use the normal shell-only installer; docs still recommend the explicit first shell deployment during setup.

Fetch origin, reject ahead/diverged peers, then fast-forward only eligible checkouts. Invoke `npm run deploy:shell` from that checkout, using `cmd.exe /d /s /c "npm run deploy:shell"` on Windows and `npm` with argv `['run','deploy:shell']` on POSIX. Local npm uses the corresponding fixed-command platform handling. No npm install/ci/prepare. Only existing shell deployment chooses payload and ownership; do not reimplement its conflict or rollback machinery.

Decode hc's JSON/Base64 output and print each machine's deployment output while its result is handled. Execute peers sequentially for understandable output. Missing remote Node is identified from hc spawn_failed and skipped; missing git/npm or an old Node is reported by the worker. Check/fetch subprocesses have short bounds (15 seconds for tools, 60 for fetch); the remote pipeline is bounded within hc's 600-second maximum, with an outer 615-second transport deadline. Machine listing has a short deadline too. Disable interactive Git prompting. After a reachable machine's fetch or deployment error/timeout, report failure and continue. Offline/missing checkout/tools/wrong origin/non-main/dirty/ahead/diverged/full-desktop states are stated skips. A transport disconnect after dispatch is a failure with outcome unknown, never retried automatically.

### 3. Dry-run, output and exit status

`--dry-run` still performs source and eligible remote fetches for comparisons. Fetch updating Git objects/remote-tracking refs is the sole mutation exception: no branch/working-tree changes, build/dist writes, deployment, backups or installation. Print would-fast-forward/would-deploy with target commits; do not claim successful deployment or current installed files from checkout HEAD. Selection never bypasses the source gate.

Normal output records source SHA immediately before each deploy without adding manifest provenance. Parse the existing final deploy JSON to retain backup IDs, including null as `-`. Finish with a short table: machine, action (`deployed`, `already current`, `skipped: reason`, `failed: reason`), source commit and backup. For skips where no commit can be read, print `-`; a read checkout commit is explicitly not an installed-version claim. Dry-run rows use `would deploy` and no backup.

Only a successful no-change installer result can say `already current`; equal checkout commits still execute the pipeline. Changed payload/patch output says deployed. Keep any backup IDs actually printed before a failure, but do not invent an ID or claim rollback atomicity. A failure reports the attempted SHA, not a successful installed commit. A machine-list failure is an orchestration failure; preserve any available results. Exit 1 for any failed machine, unsafe source or inventory/usage failure; exit 0 for all successful/current/stated-skip results.

### 4. Safeguards kept small

Keep ancestry, cleanliness, repository identity, fixed remote paths, full-desktop exclusion, existing deployment conflicts/locks/journals and bounded calls: a person needs these to avoid discarding work or hanging on a dead peer. Omit extra updater locks, symlink/worktree bans, private management records, immutable approval jobs, durable status/log stores, installed provenance, automatic verification/retry/rollback and remote environment repair. They serve unattended/UI operation, not this watched command; existing installer safeguards remain authoritative. No cross-machine transaction or global target snapshot is promised: main may advance during the run, and the summary states each actual source SHA.

## Risks / Trade-offs

- Partial sequential deployment or timeout → retain printed backup IDs and phase/reason, use existing manual rollback instructions; no automatic replay or all-or-nothing promise.
- Existing development output is not identifiable by installed SHA → deliberately retain existing ownership/conflict checks; this command requires explicit invocation from published main and records only attempted/deployed source commits.
- Main may advance between machine fetches → show the actual SHA per machine rather than adding pinning/provenance orchestration.
- Core PATH differs from an interactive login → state missing tools; never change PATH, profiles or install tools.
- Real SSH/Windows behavior is not proven by fixtures → no real home deployment or pc2 contact during development; first real run belongs to the maintainer after merge.

## Migration Plan

After approval, implement four outcome groups with matching fixtures. README and docs/COMMANDS.md will describe command/options/output, local clean-main gate, remote default home, Core PATH prerequisites, full-desktop exclusion and one-time manual setup: clone `https://github.com/timurproko/herdr-app.git` to `~/.local/share/herdr-app`, run `npm run deploy:shell` there, then explicitly wire shell profiles as already documented. New-machine setup is never performed by deploy:all. Existing backup-ID rollback remains unchanged.

Tests use only .artifacts temporary homes/checkouts, local bare origins and injected/mock hc transport. Cover clean-main fast-forward, same-HEAD installer invocation, all-source refusal including skipped local, individual eligibility/transport failures, continued peers after local/remote failure, selector validation, dry-run filesystem/HEAD invariance except fetched refs, backup/commit summary and exit codes on Windows/POSIX invocation paths. No real deploy, deploy:shell, deploy:all or pc2 probe will run during implementation.
