# Tasks

## 1. Strict discovery facts through unchanged fleet bindings

- [x] 1.1 Extend the bounded Crew source adapter for top-level discovery version 1 and the complete known/none/unavailable field combinations; cover missing/unknown versions, malformed fields, canonical URLs, private-field exclusion and existing size/task limits in adapter fixtures.
- [x] 1.2 Carry sanitized per-task discovery through binding and generic pull context, including eligible closed no-link diagnostics; assert none differs from unavailable and partial budget results retain known links without inventing rows or worker targets.
- [x] 1.3 Preserve all home/owner/task-terminal/adoption checks and binding/pullScope/membership identity; compare discovery-only transitions in local and remote fixtures, including historical-only records and unchanged worker navigation authority.
- [x] 1.4 Update architecture source-adapter and generic-context guidance for v1 and legacy compatibility; check it agrees with the fixtures and retains the no-generic-notice contract.

## 2. Bounded discovery transport and capability compatibility

- [x] 2.1 Request status with --all, --json and --discover-prs through the existing installed-tool machine transport; fixture the exact quoted command, machine routing and absence of setup or mutation commands.
- [x] 2.2 Add at most one recorded-only fallback for an explicit unsupported discovery-flag response, with enable/generation checks before follow-up; fixtures cover ignored flags, unknown versions, fallback success/failure, and no fallback for timeout, authentication, malformed success or ordinary transport failures.
- [x] 2.3 Set the discovery timeout to 25 seconds, plain fallback timeout to 15 seconds and coalescing lease to 45 seconds while retaining ten-second TTL and 30-second action freshness; use fake-clock fixtures for slow discovery, duplicate readers, failure backoff and expired leases.
- [x] 2.4 Retain obsolete-result rejection across owner, plugin, preference and read generations; delayed transport fixtures must show no late publication, fallback after disablement, binding restoration or renewed freshness on error.
- [x] 2.5 Update architecture timing guidance with the ten-second Crew budget, finite fallback allowance and unchanged refresh cadence; compare documented constants against the implementation fixtures.

## 3. Pre-report coordinator behavior and compatibility integration

- [x] 3.1 Add an end-to-end fixture from a working task with recorded pr null and known discovery URL through the registry context into the coordinator aggregate; assert the first draft appears once with the exact live worker and no report, footer or branch inference.
- [x] 3.2 Protect mixed known/none/unavailable budget partials, recorded-only old/unknown-version compatibility, shared live/history deduplication, last-worker exit and closed-history aging in integration fixtures; unchanged PR facts must not gain periodic GitHub reads.
- [x] 3.3 Retain normal Git title, folds, counts and removed-notice assertions without editing the enrollment banner or label pill renderer; update README's coordinator source/compatibility description to match the exercised integration.
- [x] 3.4 Run the required CI=true npm run test:ci once for implementation handoff, recording its real outcome and any remaining native-validation gaps without deployment.

## Workflow follow-up

- Stop after the draft plan PR and await explicit implementation approval; all tasks above remain unchecked in the planning handoff.
- Keep this task's PR draft and never merge it. Record the report and notify crew done fleet-discover-prs at the handoff boundary.
