# CI subset for an unchanged repository split

This final direction supersedes the earlier runner-refactoring proposal. Keep imported tools/tests unchanged except the architecture test's moved-guidance file path and neutral status labels. No extraction of mock UI/native parts, shell portability fixes, recycle-test splitting or new isolation framework is part of this change.

The baseline has 44 packaged regression files, two packaged new-menu tests, 72 top-level app tests and four plugin tests (122 entries). The scaffold's package/required-check tests are retained separately. A minimal CI entrypoint builds in this checkout and executes eligible existing entries with their original VM flags. It prints an exact list before invocation and propagates failures. CI children receive a disposable HERDR_APP_HOME and unavailable HERDR_APP_BIN; no Herdr installation is provided.

## Known whole-suite exclusions

| Suite | Runner | Reason |
|---|---|---|
| packaged `scripts/directory.test.mjs` | Both | Unmodified code executes installed hc schema and reads the real user .bashrc; private/native installation assumptions. |
| packaged `scripts/directory-loader.test.mjs` | Ubuntu | Unmodified fixture hardcodes Windows Git Bash and cygpath; no portability rewrite. |
| `tests/a1-api-candidate.test.mjs` | Both | Actual candidate body requires a separately built external A1 checkout and tsx; no installed agents substituted. |
| installed-host `scripts/test.mjs` / npm test:integration | Both | Requires native binary, installed stock baseline/layout and real host files. Its mock-UI portion remains in this same original file, not extracted. |
| npm test:native and 20 native/preview feature scripts | Both | Require native checking/rendering or live UI. No tests/tools are rewritten to make these hosted-compatible. |
| live clipboard/profile/permission/inspection/relay/provider/deploy/preference-import tools | Both | Operational effects forbidden in this task; not ordinary fixture suites. |

All other baseline entries are candidates on both runners. Windows-only parsing and OS fixture branches run as originally written; POSIX branches run where supported. If an unmodified suite fails because a runner lacks its native/backend prerequisite, exclude the entire affected suite with its actual reason rather than split/rewrite/weaken it. Genuine import/root/CI-wiring failures are repaired, not classified away. Exact observed additions to exclusions and results belong in docs/TESTING.md and the final report.

Keep `.github/workflows/tests.yml`, Windows/Ubuntu Node 20 lanes, Readiness/OpenSpec jobs, read-only permissions, pinned actions and the exact `CI required` aggregator. Delivery workflow remains unchanged. Drafts skip application suites; only a bot-promoted finalized head supplies required integration results. No foreground CI watch loop.

Locally, inspect reachable effects before running a focused test. Do not run the original broad npm test command on the workstation: it includes native/home assumptions and Windows recycle operations. Checkout-only build is safe; native/live commands are not authorized. Record exact suites executed locally versus on hosted runners and make no claim about excluded native rendering, shell wiring or historical theme-selection failures.
