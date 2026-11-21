# Automated tab-move compatibility audit

Run from `~/.config/herdr-app/customizations/`:

```sh
npm run check:tab-move                         # installed App release + upstream evidence + synthetic tests
npm run check:tab-move -- --release 0.1.17      # inspect a candidate before updating
npm run check:tab-move -- --offline            # version gate + fixtures only, no HTTP
```

`check:host-api` (and consequently `deploy`) automatically runs this audit when
it sees an App version unknown to the tab-move profile. Known App versions keep
that ordinary check fast and offline. Run `check:tab-move` explicitly to recheck
upstream evidence for a known release. There is **no updater hook, watcher,
scheduled task or background network check**: these run when the commands run,
not merely when the native desktop updates.

## What is automated

1. Read the installed App's `--version`, or use the explicit `--release` target.
2. Fetch public GitHub release metadata with no credentials. Resolve lightweight
   or annotated tags to an exact commit; reject malformed/missing releases.
3. Compare against the pinned reviewed 0.1.16 commit in
   `tools/contracts/tab-move-0.1.16.json`. The five previously reviewed source
   files are pinned individually. The complete repository blob/submodule/mode
   inventory is also fingerprinted, so new dependencies, removed files, changes
   outside today's known paths and executable/symlink changes are not ignored.
4. Report added/removed/changed paths, highlight layout/model/mirror/window source
   changes, and give an immutable commit-to-commit compare link. Output includes
   total counts and explicitly reports omitted paths after the first 100.
5. Run the synthetic adapter and deferred-menu regression suites, including
   preservation, CAS conflicts, metadata repair, same-machine routing, unknown
   versions and UI acknowledgement. These tests exercise Custom's code, **not**
   downloaded Rust code or a running native client.

Every audit prints JSON to stdout. There is no persisted compatibility approval,
profile rewrite, source adoption, credentials cache or queue. Only the existing
fixture build can regenerate `dist/`; no installed mod, native file, Core document,
terminal, session or selection is changed.

HTTP failures/rate limits, missing tags, truncated trees, fingerprint mismatches
and test failures are explicit failures, never evidence of compatibility. HTTP
responses are bounded to 8 MiB and the source check has a 25-second deadline.
The baseline is retrieved by its immutable commit, not a movable tag. A changed
0.1.16 tag is rejected rather than being silently adopted as reviewed provenance.

## Results and limits

- Exit **0**: App version is already reviewed, the regression suites passed,
  and requested upstream checks completed. `--offline` explicitly reports source
  evidence as `not-checked`.
- Exit **1**: unknown App version, missing/unavailable evidence, or failed tests.
- `needs-review` stays a failure **even if all compared source is unchanged**.
  Source equality does not establish the provenance of the installed binary,
  its Core contract, or native multi-client/session continuity.
- The automatic host/deploy report keeps this private feature's result separate
  from public host-API compatibility. A tab-move-only failure does not disable
  unrelated Custom features. Public API failures retain their existing gate.
- All runtime App/Core exact-version, generation, identity, capability, document
  shape, expiry and CAS checks remain unchanged. The CLI does not connect to a
  Core or confuse the `hc` executable version with the running server version.
  Each real Move preflight still checks the target's running Core.

This removes repetitive source fetching, diff inventory and fixture execution;
it does **not** promise that future updates need no review or automatically enable
unknown releases. The full repository comparison is intentionally conservative:
documentation-only changes can appear, rather than guessing which changed code
could affect layout safety.

## Reviewing an update

Use the report's pinned compare link, review affected layout/reconciliation and
Core contracts, verify installed-release provenance, add sanitized regression
fixtures for changed shapes, and perform disposable native continuity/concurrency
checks where needed. Only then explicitly add the reviewed exact version to
`src/integration/herdr/documents/tab-move-v1.cjs` and, if appropriate, establish a
new pinned baseline with recorded evidence. There is deliberately no `--approve`
flag. Never test document mutations on live sessions.

See [the tab-move ADR](TAB-MOVE-ADR.md) for the native transaction/concurrency limits.
