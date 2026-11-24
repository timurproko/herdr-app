# Tasks

## 1. Reviewed 0.1.18 originals and safe release-specific replacement

- [x] 1.1 Add pinned LF and independently verified Windows CRLF 0.1.18 originals, native imports, complete provenance and packaging mappings; assert exact source/build byte lengths and SHA-256 values in the real-stock fixture and document the installed executable evidence in the 0.1.18 review note.
- [x] 1.2 Add a dedicated 0.1.18 replacement and registry selectors while retaining every earlier original, unchanged 0.1.17 payload, feedback and capability-based host gate; check per-original selection and package dependency closure through focused build/frame tests.
- [x] 1.3 Extend isolated real-stock coverage for both releases, opt-in absence, apply/check/no-op/restore, reset and old-owned-mask upgrades, previous raw backups and current-original restoration; assert unknown/ambiguous bytes skip loudly without changing target, helpers or opt-in and retain conflict/corrupt/concurrent-write regressions.

## 2. Native 0.1.18 catalog parity and complete Custom behavior

- [x] 2.1 Retain native manifest discovery, Mod grouping, validation, canonical deduplication, dynamic themes and object/index hotkey matching; compare actual native and Custom catalogs with malformed, unreadable, duplicate, missing-target and argument-order fixtures in `tests/palette-native-stock.test.mjs`.
- [x] 2.2 Preserve explicit clone and targeted rename/close arguments while retaining built-in Custom Settings/picker/machine/worktree routing, inline rename and last-tab-aware close; exercise actual activation and native fallback dispatch for both releases and non-Custom layouts, with Usage enabled/disabled/default cases for 0.1.18.
- [x] 2.3 Retain shared live-theme/selection/search/clear/empty presentation, fixed 408px surface and 57px header, pinned group/count headings, overflow fade and keyboard/scroll navigation; run the new variant through the existing palette UI VM suite with reset, empty, stale-click, paging and scrollbar-range assertions.
- [ ] 2.4 Complete the focused 0.1.18 review note and relevant native-patch documentation, including normal Update delivery, clean retirement boundary, preserved 0.1.17 behavior and absent live UI proof; run focused fixtures/build before pushing, then the requested `CI=true npm run test:ci` when no other suite is running and report the final-head required checks without deploying, restarting, promoting or merging the PR manually.
