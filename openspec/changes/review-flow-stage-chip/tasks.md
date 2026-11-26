# Tasks

## 1. Pull request facts expose the three managed stages with current and previous label names

- [ ] 1.1 Add the pure stable-role/current-name/previous-name stage contract and derive stage from normalized labels in pulls.js; verify array/connection, plain/robot-prefixed Build, Review, Approved, Rework, Changes needed and Under review cases with parsing fixtures.
- [ ] 1.2 Preserve stage across narrow state/check updates and replace or remove it on authoritative label refresh; verify list, older-active and coordinator reads reuse existing labels queries without extra requests and cover empty/null/unknown labels and transient conflicts.
- [ ] 1.3 Document the alias snapshot, source keys and approval-versus-checks independence in the relevant README Git section and docs/TESTING.md; verify documented aliases match the table-driven parsing expectations.

## 2. Build and Review resolve role-specific terminals with safe availability and optional review metadata

- [ ] 2.1 Read crew.kind, crew.pr, crew.round, crew.finding and crew.approved from exact terminal records and implement role-specific matching without changing legacy no-role callers; verify ship/fix PR-or-branch matching, base-branch reviewer PR-only matching, repository isolation, exact-match priority and optional metadata in pr-agent-links fixtures.
- [ ] 2.2 Model connected/live, ended, disconnected and unknown targets with bounded runtime-only explanatory metadata and fresh captured-action guards; verify disconnect/reconnect, role/PR changes, removed/moved terminals, stale clicks and no hidden/offline discovery reads with synthetic host fixtures.
- [ ] 2.3 Route coordinator role targets through existing verified same-home membership and aggregate target/focus checks; verify reviewer and builder choices, historical/stale refusals and unchanged PR admission/deduplication in fleet fixtures.
- [ ] 2.4 Document role matching, optional completed-round semantics and unavailable-target explanations in README and docs/TESTING.md; verify the documented cases have deterministic fixture assertions.

## 3. Git rows show themed stage chips with correct clicks, stable geometry and robot compatibility

- [ ] 3.1 Replace the managed-label agent button with Build, Review and Approved chips using ansi3, ansi5 and ansi2, with Build n+1/finding enrichment only for valid supplied metadata; verify every caption, tooltip and click target plus Approved under pending/failed/passed checks in actual row fixtures.
- [ ] 3.2 Add dimmed inert unavailable chips and retain the no-managed-label live robot fallback; verify event propagation, no accidental row activation, row PR action for Approved, ghost noninteraction, known-agent robot tooltips and ordinary immediate-focus pin motion.
- [ ] 3.3 Use a bounded common title-line reservation sufficient for the text chips while preserving the trailing anchor, 74px height, lower metadata and 24px robot target; verify ordinary/pinned/scrolling/coordinator/Closed/ghost rows across narrow widths and supported zooms with geometry and render-budget guards, without new probes or relaxed mounted caps.
- [ ] 3.4 Finish the user/testing documentation for chip presentation and scope limits, including no approved-CI-running state; verify documentation and the OpenSpec delta agree with the production-renderer assertions.
- [ ] 3.5 Build and run the full local npm test suite once on the implementation handoff head in a disposable isolated environment, then record exact commands/results and any blockers; verify source isolation and stop every disposable app/server before handoff. Keep scratch and proof outside the checkout in the designated task folder.
