# Design

## Context

See proposal.md for motivation. The existing customization-lifecycle contract explicitly requires the placeholder both in the row requirement and in the changed-evidence scenario; both need delta updates. `customizationRowState` computes one title before choosing checking/running/failure/current branches, and `customizationUpdateRow` passes that title through unchanged. A source search found the runtime placeholder only in that shared model, not in separate footer/menu/tooltip text. Existing chrome/menu surfaces consume availability indicators rather than independently formatting a revision.

`src/features/settings/main.js` still says "Herdr looks for both every hour", although Custom now checks on a healthy 120–180 second cadence with persisted failure backoff and optional merge hints. README.md and docs/COMMANDS.md also describe the placeholder. `tests/update-check.test.mjs` expects it after ownership evidence changes. `tests/update-row.test.mjs` already exposes the real model and renderer through a VM fixture.

## Goals / Non-Goals

**Goals:** Keep title presentation centralized, preserve all update semantics, cover known/missing provenance across row states, and distinguish native cadence from Custom cadence in maintained copy.

**Non-Goals:** Do not infer missing revisions, alter worker/projection/detection policy, change scheduling, remove meaningful "Update outcome unknown" diagnostics, change host review lists, deploy, or modify archived specs.

## Decisions

1. **Conditionally append the existing seven-character revision in the shared model.** A missing revision produces the bare label with no trailing space. Fixing only the renderer or stripping words from rendered text would leave model consumers inconsistent; fabricating a revision would violate provenance safety.
2. **Use a state matrix in the real row fixture.** Exercise known and missing revisions while idle, checking, available, launching/running, failed, partial and unknown-outcome; include a known current result and a missing-revision snapshot with cached `available: false`. The latter must stay non-current. Assert existing labels/actions/enabled flags and diagnostics as well as exact titles. Keep the check fixture's real missing-evidence Update assertion, replacing only its obsolete title expectation.
3. **Correct explanatory text, not timers.** Identify native Herdr/herdr-core as hourly, Custom as normally checking every 2–3 minutes while mounted, and faster merge checks as conditional on the enabled/configured relay. Preserve corner-notification and herdr-core terminal-continuity information. Add a focused assertion that the Settings copy no longer groups all rows as hourly, and update README.md, docs/COMMANDS.md and docs/TESTING.md together.
4. **Leave 0.1.17 support outside this change.** `tools/check-host-api.mjs` requires `Boolean(HOST_PROFILES[version])` for `ok`. Profiles currently cover 0.1.13–0.1.16 only; 0.1.17 therefore returns unreviewed/not-ok even if APIs and commands match. Its CLI exits nonzero, blocking the ordinary `npm run deploy` pipeline before build/install. The advisory tab-move audit cannot turn a failed public host review into approval. Report this from source inspection without invoking deployment or changing profiles.

## Risks / Trade-offs

- [Overbroad text removal hides meaningful failures] → Change only the title fallback and obsolete explanatory/docs wording; retain unknown-outcome/error descriptions.
- [Presentation work accidentally changes unknown-revision eligibility] → Keep projection/check/worker logic unchanged and assert Update availability from missing installed evidence.
- [Cadence text becomes an unconditional timing guarantee] → Describe healthy/normal cadence while mounted and optional configured hints; retain documented failure backoff.
- [Fixture coverage mistaken for native UI evidence] → Report VM/source assertions honestly; no deployment or live visual validation is authorized.

## Migration Plan

No stored-data migration or schema change. After approval, implement the two outcomes in order, with focused row/check tests per outcome and the requested `CI=true npm run test:ci` before handoff. Installation remains a separate action and is not part of this task. Reverting the presentation changes restores old wording without touching provenance or update jobs.
