# Tasks

## 1. Independent release discovery and reviewed-evidence inventory

- [x] 1.1 Add injectable, bounded fixed-origin App/Core feed and immutable-tag resolution helpers; fake-feed tests cover current/new independent versions, combined advances, malformed/prerelease input, missing tags, annotated tags, rate limits, partial outages and moved provenance.
- [x] 1.2 Inventory host/document reviewed versions, source pins, stock baselines and registry originals without changing their meaning; fixture tests cover divergent evidence and unavailable baseline/provenance, including the existing Core 0.1.22 record.
- [x] 1.3 Document the observed release sources, GitHub Releases 404, anonymous API rate limit and distinction between local and hosted reachability in docs/HERDR-UPGRADES.md; confirm source fixtures match recorded public schema fields.

## 2. Scoped compatibility evaluation and candidate-only evidence

- [x] 2.1 Reuse or extract pure host API/command/import checks without changing installed-host policy; tests compare candidate SDK signatures and safely parsed command contracts, list consumers, and block unsupported source syntax.
- [x] 2.2 Generate pinned App/Core document-source diffs and run existing tab-move synthetic regressions; fixtures retain needs-review, generation/CAS/routing risks and whole-tree scope warnings independently of runtime eligibility.
- [x] 2.3 Compare every registry original with its candidate frame source and emit exact hunks plus stock-to-custom overlap evidence; fake palette/feedback cases cover identical, changed, missing and multiple originals and retained-but-unreviewed behavior.
- [x] 2.4 Emit candidate-only baseline/API/command manifests and provenance under upstream/migrations identity paths; byte-preservation tests prove no profile, reviewed original, approved baseline, native opt-in or installed file is adopted or changed.
- [x] 2.5 Add an ordered continue-after-failure runner for build, focused regressions and supported CI tests; fake process tests cover pass/fail/block/skip, exit codes, prerequisite isolation, bounded logs and explicit unavailable binary/native checks. Document these limits alongside the checks.

## 3. Agent-ready reports and migration planning artifacts

- [x] 3.1 Render JSON/Markdown reports with exact base/head/candidate SHAs, per-step verdicts, durable hunks and unchecked file-specific migration actions; snapshot tests prove degraded palette/feedback, missing native proof and failing checks cannot read as fully compatible.
- [x] 3.2 Generate absent-only delivery bodies and OpenSpec scaffolds with one task group per outcome; fixture tests validate body format, unchecked migration outcomes, review-only skip_specs and preservation of edited artifacts/checklists on refresh.
- [x] 3.3 Add README discovery guidance, report continuation text and concrete ordinary-agent/Crew instructions in docs/HERDR-UPGRADES.md; fixtures check exact PR/branch/report identifiers, approval boundary and no duplicate task PR or automatic agent spawning.
- [x] 3.4 Integrate fake-feed/fake-GitHub suites into existing hosted test discovery and document coverage in docs/TESTING.md; run focused suites plus CI=true npm run test:ci and record real results without claiming native UI or hosted-network proof.

## 4. Controlled scheduled draft publication

- [ ] 4.1 Add the pinned scheduled/manual workflow with read-only default, explicit publishing activation, freeze and exact-version/refresh inputs, serialized runs and evaluation/writer credential separation; static workflow tests cover minimal permissions, trusted writer source, bounded execution and no downloaded-code execution.
- [ ] 4.2 Implement paginated identity lookup and initial-only branch/PR publication with fake GitHub/Git; cases cover component overlap, open/closed/merged duplicates, interrupted branch creation, unknown branch collisions and agent-owned head preservation.
- [ ] 4.3 Add exact skipped-version recognition, manual same-PR reconsideration and marker-deduplicated supersession/cross-link comments; fake GitHub tests cover combined identities, absent labels, malformed freezes, newer versions and failing/uncertain writes without merging, readiness changes or body rewrites.
- [ ] 4.4 Validate and stage only bounded generated evidence/OpenSpec paths, and publish reports with the existing delivery App token only in the writer; malicious artifact/path/input fixtures demonstrate refusal and no writer secret exposure to evaluation or test children.
- [ ] 4.5 Document activation, read-only hosted reachability probe, freeze/skip/reconsideration and rollback, including publisher-created repository-local 🤖 Skip with neutral colour and closing-to-skip description, without changing MyWorkflows; dry-run fixtures assert zero writes and leave the actual hosted probe explicitly pending if unavailable before merge. Open no live migration proposal in this task.

## Workflow follow-up

- Plan approved by the coordinator with the repository-local 🤖 Skip label amendment; implementation continues in PR #27.
- Keep the task PR draft and never merge or arm auto-merge; readiness/finalization and merge authority remain with the shared workflow and maintainer.
- After an authorized merge, a maintainer runs the no-write hosted probe, reconciles the separate 0.1.17 migration work and explicitly activates proposal writes; the publisher creates the local skip label if missing.
