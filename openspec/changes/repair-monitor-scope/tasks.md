# Tasks

## 1. Durable scoped repositories reach managed worker configurations

- [x] 1.1 Replace notice-cache and legacy fallback scope inputs with the current relay/account durable added selection in runtime and explicit management configuration; cover canonical names, empty/missing selection, wrong relay/account and runtime/CLI parity with synthetic fixtures.
- [x] 1.2 Connect relay/account changes and durable Add/Remove updates to existing coalesced synchronization without adding a timer or replay job; extend settings/action fixtures to exercise actual Add, Remove, Configure and credential invalidation while preserving the correct scope.
- [x] 1.3 Exercise startup/code replacement and companion restart with retained public settings, confirmed selection and receipts; use the real installer with a disposable state root and fake transports to assert actual config.json repositories, including last-repository removal to an empty array.
- [x] 1.4 Add repaired-scope engine regressions for an idle agent receiving exactly one completed-failure CI message and one independently persistent-conflict message over repeated cycles and restart; retain unselected Working, running-workflow, non-forced transport and duplicate receipt assertions.
- [x] 1.5 Document durable relay/account selection and activation in GIT-CI-FIX.md, GIT-WEBHOOKS.md and relevant companion guidance; compare documented startup, empty-selection and offline-host behavior against the focused fixtures without touching the live installation.

## 2. Bounded diagnostics explain sent and suppressed monitoring

- [x] 2.1 Emit sanitized suppression reasons at existing engine gates and return truthful cycle summaries; add fixtures for no repositories, no verified targets, all states excluded, workflow still running, already-recorded evidence and verification failure without changing delivery decisions.
- [x] 2.2 Preserve non-ready waiting/suppressed summaries in runner and management status; fixture status output must not claim healthy-ready for empty scope or wholly skipped candidates and must distinguish actual infrastructure unavailability.
- [x] 2.3 Persist a separate best-effort atomic diagnostics journal capped at 128 records and 64 KiB, coalescing unchanged episodes and recording reason/time plus known repository, PR, terminal and existing delivery outcome; test bounds, restart, malformed/linked state preservation, write failures, privacy and probe non-persistence with disposable files.
- [x] 2.4 Update GIT-CI-FIX.md and GIT-WEBHOOKS.md contradictions about the shown-panel sender, templates, conflicts/merge messages, workflow completion and remembered ownership; document diagnostics and acknowledgement-versus-unknown semantics by comparing every touched claim with current source and targeted tests.
