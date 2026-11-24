# Design

## Context

See proposal.md for motivation. `src/shared/customization-update-model.js` builds every Custom description. Running text lacks a final stop; local error text is passed through; failed, partial and unknown outcomes can append an unterminated log/details path. Failed and unknown error causes can already end in a stop before another stop is added. `src/features/settings/main.js` builds the Herdr and herdr-core siblings; their static descriptions are terminated, but the interpolated Core failure is not consistently terminated.

## Goals / Non-Goals

**Goals:** Change only sentence punctuation, preserving diagnostic content and native-style row presentation.

**Non-Goals:** No update lifecycle, target selection, action guards, timers, native patches, deployment or button-label changes. Historical archived OpenSpec records are not rewritten.

## Decisions

- Apply sentence termination at the update-description construction boundary, not in the generic Settings row renderer. A global renderer change would alter unrelated settings captions and paths.
- Explicitly terminate both target-aware and both targetless running branches. Retain the existing scope and target calculations and the disabled `Updating…` button.
- Normalize sentence endings at interpolated error boundaries as well as at the end of diagnostic suffixes. Appending a final dot alone would leave double stops before recovery/inspection sentences. Do not strip or rewrite internal path punctuation or file extensions.
- Audit all branches in both builders. Retain already-correct static text, including current timestamps, available/check-failure text, ready-to-restart guidance and Core's existing inline updating ellipsis; the latter already ends with a full stop.
- Update exact expectations in `tests/update-{row,check,runner}.test.mjs`; extend the model state matrix and Settings controller harness (`tests/update-markers.test.mjs`) with punctuation checks, dynamic errors with/without a trailing stop, and diagnostic suffixes. Continue checking unchanged button ellipses and guards.
- Update current README/testing examples and the relevant current specification examples through this delta. Any other current quoted descriptions found during the audit receive the same correction.

## Risks / Trade-offs

- Error strings can already contain punctuation → exercise both terminated and unterminated causes and prevent duplicate sentence-boundary stops.
- Diagnostic paths contain dots → preserve path bytes and assert the displayed path followed by exactly one sentence terminator.
- Broad text normalization could affect controls → keep formatting limited to descriptions and preserve exact button expectations.

## Validation

After approval, run quick focused updater tests before pushing implementation. Once no other suite is running, run `CI=true npm run test:ci` once and record its actual result. Read required checks on the final head without marking the PR ready or merging; report any checks unavailable while it remains a draft rather than claiming they passed.
