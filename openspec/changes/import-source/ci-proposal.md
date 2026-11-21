# Host-free CI proposal

## Findings from read-only inspection

The existing scaffold workflow `.github/workflows/tests.yml` already has `windows-latest` and `ubuntu-latest`, Node 20, a draft-readiness gate, an OpenSpec job, and an aggregator named **CI required**. Keep those boundaries and the pinned actions; extend the real test job, not a second competing workflow. The separate Delivery workflow remains untouched.

The source uses built-in Node modules, not a dependency-installed application bundle. `npm test` currently invokes `tools/test.mjs` (default `unit`), which builds `dist/`, runs **44 packaged regression tests**, **2 packaged new-menu tests**, **72 top-level tests**, and **4 plugin tests**: **122 test entry files**. One of the 72 is optional A1-candidate coverage and currently reports SKIP without an external checkout. Several files contain many individual assertions. `tests/regression/test.mjs` is a separate installed-host integration entrypoint, not one of those 44 unit files. There are another **20 native/preview feature scripts** outside the two new-menu tests.

These counts identify the inspected baseline, not a claim that tests passed. No app build or test has been run during planning.

## Proposed runner coverage

| Entry / suite | Ubuntu | Windows | Dependencies / preparation |
|---|---|---|---|
| Build/import/packaging and scaffold contract tests | Required | Required | Node 20; merge scaffold package identity/license checks and existing `scripts/ci-required.test.mjs` into the app test entrypoint. Build only in checkout. |
| All synthetic/fixture portions of the 122 app test entries | Required | Required | Preserve assertions and VM flags; only the optional A1-candidate body is excluded by default. No Herdr/Core installation, private snapshots or real credentials. |
| `tests/regression/directory.test.mjs` pure directory/routing and fake-hc Bash checks | Required after split/portability fix | Required after split | Move installed Core schema and real `.bashrc` assertions out of unit execution. Use explicit fixture schema/profile and retain independent installed-host assertions as optional integration checks. |
| `tests/regression/directory-loader.test.mjs` fake-home prompt/reload checks | Required after portability fix | Required | Select `/bin/bash` on Linux and Git Bash on Windows. Gate `cygpath` conversion by platform, not by skipping the suite. Real profiles remain unsourced; fake hc first on PATH. |
| `tests/regression/profile-launch.test.mjs` actual quoting subprocess | Required | Required | `/bin/bash` or Git Bash, with `--noprofile`/`--norc` where appropriate; it executes Node against literal test arguments, never an agent. Preserve adversarial quoting assertions. |
| `tests/folder-content.test.mjs` OS directory-listing fixtures | Required POSIX branch | Required PowerShell and Git-sh branches | Creates and lists only disposable directories. Its remote labels are mock routing arguments, not SSH connections. Ensure shell prerequisites exist rather than silently losing coverage. |
| `tests/file-delete.test.mjs` fake-trash selection, errors, and UI checks | Required | Required | Keep fake utilities and captured RPC; split real Windows recycling into explicit OS-fixture entrypoint. No real trash use in default local suite. |
| Real Windows Recycle Bin fixture extracted from `file-delete.test.mjs` | Not applicable | Required hosted-runner OS-fixture step | No Herdr; tests only its own temporary files/junctions and exact created recycle pairs. Hosted runner only, not run on this workstation. Fail/report unsupported recycle semantics; never empty a bin or skip a failing assertion. |
| `tests/git-repository-cli.test.mjs` real gh/JQ/pagination | Required | Required | Assert `gh` exists on runners (the source currently skips if absent). Dummy auth, isolated config, localhost HTTP server, GET-only requests. No GitHub API calls. |
| `tests/git-webhooks.test.mjs`, Git/Cloudflare setup/account/monitor tests | Required | Required | Mock transport and in-memory Worker requests; no relay/Cloudflare/GitHub writes. Test names mentioning a provider are not evidence that live credentials are required. |
| Usage, Claude account/refresh/isolation and A1 client/color fixtures | Required | Required | Explicit fake account homes and mocked transport; packed-worker subprocesses get isolated env. No provider queries, credential refreshes or installed-agent discovery. |
| Permission-launcher and Crew generated PowerShell parsing/probes | Mock policy checks required | Mock policy plus existing parser/temp-profile branches required | Windows PowerShell `-NoProfile`, parser-only generated scripts and temp USERPROFILE probes; no scheduled-task registration, UAC prompt, downloads, PATH installation or core actions. |

The main safe unit command will cover all remaining synthetic entries automatically, including deployment, rollback and preferences **library fixtures** that explicitly receive temporary roots. Calling those library functions in a sandbox is not permission to run their operational npm commands. Keep regression discovery deterministic/sequential where builds share `dist/`, and print entry names/counts so exclusions are visible. CI failures require fixes in the same change, not broad skip patterns or weakened assertions.

## Home and external-effect isolation

Before any local app test, inspect its code and reachable subprocesses. Add a runner-created sandbox beneath ignored `.artifacts/` (or a dedicated runner temporary directory on GitHub), set `HERDR_APP_HOME` explicitly, and pass it to every child. Also redirect HOME/USERPROFILE and application/config directories for tests that derive paths outside Herdr; retain necessary executable/system environment values. Clear inherited Herdr session markers, provider credentials, optional-candidate selection and GH auth for unit children. The localhost-gh fixture provides its own dummy token. Do not give the test job GitHub write permissions or persisted checkout credentials.

Set `HERDR_APP_BIN` to an intentionally unavailable sandbox path for host-free tests (or inject a fake executable where an assertion needs a result). This matters because fixture calls to `doctor(home)` currently try the installed app's `--version` even with a fake app home. Ensure Core/process adapters likewise cannot fall through to an installed hc. Keep user startup files unsourced. Unit transport mocks must reject unexpected operations; localhost HTTP is the only planned non-mocked network, confined to the gh parser fixture.

New public-import regressions will check: no personal host snapshot; a build and fixture suite with no snapshot file; generic labels/diagnostic arguments; guidance present under docs rather than shared AGENTS; complete provenance/notice packaging; safe clipboard target parsing without running the smoke tool; and failure propagation for the CI matrix/required aggregator. Do not copy secret values into negative-test fixtures or logs: use shape checks and made-up examples.

The source's `.gitignore` and scaffold ignores are merged, preserving `.artifacts/`. No deployment output is committed. Native-free behavior is a test-runner contract, not proof that deployed optional plugins never use networks or credentials.

## Explicit exclusions from required CI

| Entry / action | Why excluded / retained alternative |
|---|---|
| `npm run test:integration` / packaged `scripts/test.mjs` | Executes the installed Herdr binary, reads the real SDK/baseline/layout and app home. Keep it opt-in. Extract its host-independent mock UI portion into host-free coverage where practical; do not delete stock-baseline assertions or claim the historic theme-selection assertion was revalidated. |
| Installed-Core schema and external shell-profile assertions split from directory regression | Require a real reviewed Core and private/external shell wiring. Keep as explicit read-only integration checks; the independent fixture behavior runs in both required lanes. |
| `npm run test:native` / `tools/validate-native.mjs` | Disposable-home but still invokes native Herdr checks, so a GitHub runner without Herdr cannot execute it. This task forbids running it locally as well. |
| `tests/features/*-native.mjs`, `*-preview.mjs`, `claude-account-click.mjs` (20 scripts) | Require native checking/rendering, live UI overlays, screenshots or native event handling. Preserve them as opt-in documentation, not default discovery. The two `new-menu/*.test.mjs` files are host-free and stay required. |
| `tests/a1-api-candidate.test.mjs` actual candidate body | Needs a separately built A1 checkout with tsx and dedicated session host fixtures. Keep its explicit optional mode, document the skip, and do not point it at installed sessions. Normal A1 client/color fixtures stay required. |
| `check:host-api`, native/deploy compatibility checks, live tab-move audit | Installed SDK/command catalog or public upstream release reads; no install is provisioned. The synthetic tab-move compatibility suite stays required. |
| Clipboard/profile/permission smoke tools, live inspection/recording/preview/retry/enrollment/Core-monitor tools | Can create tabs, modify clipboard/tasks/live home, type input, send agent messages or manage cores. No runner or local invocation in this task. The misleadingly titled read-only PR-link inspector actually writes a temporary mod/receipt into the live home; do not run it. |
| Deploy/enable/disable/remove/rollback/preference-import npm commands; relay deployment and live provider/setup actions | Explicitly forbidden operational effects. Only audited temporary-root library fixtures are eligible. |

README and docs will distinguish **required host-free coverage**, **Windows hosted OS fixtures**, **optional native/live checks not performed**, and **pending external A1/shell compatibility**. Exact command results will be recorded only after implementation; planning is not evidence of a green imported suite.

## Workflow changes

Keep the current Readiness and OpenSpec jobs, matrix names, read-only permissions and required-check aggregator. Add the sandbox setup/prerequisite assertions, invoke the merged app `npm test` in both matrix lanes, and run the explicit Windows OS fixture only in that lane. Keep `scripts/ci-required.mjs` and its tests so `CI required` fails on failed/cancelled/missing required dependencies; draft suite skipping remains as currently designed. No dependency installation is needed for the built-ins-only app; official replacement SVGs will be vendored with provenance, not fetched during tests. If implementation introduces dependencies, add a lockfile and deterministic install rather than assuming `npm ci` works without one.
