# Tasks

## 1. Assigned GitHub labels arrive with existing PR reads and refresh on label events

- [ ] 1.1 Extend the paginated GraphQL selection and targeted PR_FIELDS selection with labels; add facts tests demonstrating names and colours are returned by the existing list, older active-PR and coordinator requests without extra per-row requests.
- [ ] 1.2 Normalize connection/array label payloads into shared row facts, preserving exact emoji names and order, handling empty/null data and invalid colours; cover each case in pull facts regressions.
- [ ] 1.3 Add labeled/unlabeled relay and repository/coordinator refresh fixtures showing label addition/removal, burst coalescing and stale-context rejection through existing invalidation paths, including Open/Closed and older active PRs.
- [ ] 1.4 Document label refresh behavior and unchanged request/transport boundaries in docs/GIT-WEBHOOKS.md and fixture coverage in docs/TESTING.md; check the focused facts, pagination, fleet and webhook suites.

## 2. Shared PR rows omit Owner and show bounded coloured label pills after tasks and checks

- [ ] 2.1 Remove the Owner pill in the shared row and make byline/status lines explicit; add renderer assertions for tasks/checks/labels order, missing groups and retained review indicators across ordinary/coordinator Open/Closed rows.
- [ ] 2.2 Render exact label names in compact GitHub-coloured pills with contrasting foreground, bounded single-height layout and per-pill/complete-strip tooltips; add multiple-label, long-name, label-only, unlabeled and narrow-layout constraint assertions.
- [ ] 2.3 Cover pinned, scrolling and pin-motion ghost rows with the same renderer and preserve measured-row callbacks, PR menus and related-agent navigation in the corresponding existing regressions.
- [ ] 2.4 Document Owner removal, label order, colour and truncation/tooltip behavior in README.md and relevant testing docs; check focused renderer and pin-motion/fleet regressions.

## 3. All PR metadata separators share a visible centred muted dot with balanced spacing

- [ ] 3.1 Add one metadata separator primitive and use it between every present status/review/label group and between PR number and author/time; assert a common muted size, vertical centring and equal spacing in renderer fixtures.
- [ ] 3.2 Cover missing-item combinations and narrow rows so separators neither lead/trail empty groups nor become orphaned; demonstrate identical treatment in ordinary/coordinator Open/Closed and ghost rows.
- [ ] 3.3 Update README.md and docs/TESTING.md with the separator contract and fixture/native-pixel limits; check focused separator and existing metadata regressions.
- [ ] 3.4 Reconcile with latest main while preserving PR #18 coordinator presentation and PR #17 relay transport work, validate this OpenSpec change and run CI=true npm run test:ci; record actual results and any remaining native-visual gap without deployment.
