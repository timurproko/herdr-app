# Proposal

## Why

PR #12 fixed terminal copy observation but replaced the person's custom popup with the standard success notification. Restore the rendering from revision `42d2325` without regressing those observation fixes.

## What Changes

- Restore the private centered terminal-font popup, preserving its original colors, geometry, wording and fade/slide timing; do not call standard `notify` for terminal copy feedback.
- Keep PR #12's live startup/platform eligibility, re-enable behavior, stale-work cancellation, one-toast-per-settled-selection policy and direct `cx.read_from_clipboard()` reads.
- Replace standard-notification test expectations with custom-popup rendering/lifecycle assertions, retaining the controller safety coverage.
- Update README, testing documentation and the workspace-experience requirement to describe the custom centered terminal-font popup and retain the best-effort limitations.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: Terminal copy feedback uses the original private centered terminal-font popup rather than the app's standard success toast.

## Impact

- `src/features/copy-toast/main.js`, its existing `gpui-base` Popup and packaged `ui.js` dependencies, and `tests/copy-toast.test.mjs`.
- `README.md`, `docs/TESTING.md`, and an OpenSpec delta for `workspace-experience`.
- Existing layout anchor and feature identity remain unchanged. No native changes, deployment, clipboard subprocesses, terminal input or live-session operations.
