# Design

## Context

See proposal.md for motivation. `owner.cjs` already merges validated discovery labels into display metadata by ID while preserving unseen hints. However, `verify` calls inventory only when `namesMissing` is true. `actions.js` runs explicit verification on manual checks; `boardCheck` otherwise reads only local status. The spec currently promises no provider requests on card opening, so event-driven Boards refresh requires an approved contract change.

## Goals / Non-Goals

**Goals:** Reuse protected display metadata, current owner discovery transport and the existing Settings lifecycle; refresh names without making names authoritative or expanding scope.

**Non-Goals:** Provider writes, grant changes, continuous polling, automatic account verification on opening, new UI controls/messages, credential migration or production deployment.

## Decisions

1. **Reuse ID-keyed owner discovery and display merging.** Remove the missing-hints-only inventory condition from explicit verification when grants exist. For Boards opening/Check, reuse the owner discovery action to refresh hints for granted IDs. Do not identify boards by name, remove/re-add grants or add agent inventory access. Discovery remains bounded, including inactive boards, and never erases unseen hints.
2. **Refresh from lifecycle events, not render or polling.** Wire closed-to-open Boards disclosure into the existing group check machinery using a minimal generic opt-in hook only if the current renderer lacks one. Already-open Boards on Settings entry/machine change must also refresh once. Keep closed card/account checks local. Board-only refresh must not silently become account verification; explicit Requirements Check retains its account verification and updates board hints. Coalesce compatible same-round reads to avoid duplicate discovery or revision conflicts.
3. **Retain last-good names.** Read local status before refresh and retain cached rows during pending/failed network work. Use the existing display merge for partial inventories; missing boards retain their hints. Keep existing applicable error handling, but introduce no new notices. Do not treat failure as an empty list or rewrite private authority.
4. **Preserve current target and concurrency guards.** Use captured machine/session, destination identity, `isCurrent`, plugin enablement and private revision CAS checks. Metadata refresh must return the new revision so subsequent Remove/Add actions use current state. Superseded work cannot publish or commit after a known invalidation.
5. **Prove behavior with focused injected fixtures.** Extend `src/plugins/trello/names.test.mjs` and `tests/trello-saved-names.test.mjs` for two fake IDs renamed from ai-factory/xrbuild to ai/xr, reopen and both Check paths, offline fallback, partial results, Unicode, unchanged grants/writes and stale contexts. If the shared disclosure hook changes, cover its opt-in behavior without altering unrelated plugins.

## Risks / Trade-offs

- Opening Boards adds a bounded provider read → Only run for enabled, configured, usable captured targets; no timers or automatic retries; retain saved names on refusal/cooldown.
- Concurrent checks can race on display revision → Join compatible work and re-read current status before later explicit actions; never replay grants or overwrite CAS conflicts.
- Discovery can omit a permitted board → Retain its last-known label and grant; absence is not deletion proof.
- Generic renderer coupling → Keep any hook declarative and plugin-neutral; reuse the existing Herdr section and Check UI unchanged.

## Migration Plan

No storage schema migration or new dependencies. After approval, implement on this branch and update README/`docs/TRELLO.md` to distinguish local account status from opened-board refresh. Existing display hints remain valid fallback data. Rolling back code returns to cached names without changing credentials, grants or write policy. Only targeted tests run locally; no real Trello access or app/server instances are needed for this plan.
