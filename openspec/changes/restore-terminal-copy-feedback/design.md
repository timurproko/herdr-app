# Design

## Context

The approved scope is best-effort mouse copy-on-select feedback inside this checkout, not guaranteed notification of every native copy.

`src/features/copy-toast/main.js` originally permanently set `off` when `window()?.platform` was not `windows` during init. The facade normalizes missing native window facts to `{}`. Native Herdr 0.1.16 synchronously loads initial mods before publishing window facts in its first render. Later renders therefore never observed selections. A scratch VM reproduction of the original controller confirmed `permanentlyDisabled: true` and `selectionReads: 0` after Windows facts arrived.

Native mouse-release copy-on-select and explicit `terminal.copy` share a copy routine which writes the clipboard without notifying. The SDK exposes selection endpoints but no copy-success event. Files/Git copy actions explicitly call standard success `notify`; the original terminal observer instead drew a private popup and sampled the clipboard through PowerShell. Its tests covered only helpers, not controller startup.

In the first investigation, a supported selection command selected the visible word `yes` in an existing local A1 terminal; native Copy put exactly `yes` (length 3) on the clipboard, with no toast in the screenshot. Selection was cleared afterward. That established the explicit native clipboard path, not a mouse-release reproduction. The person subsequently confirmed the missing toast immediately after a machine restart, consistent with the cold-start defect.

## Goals / Non-Goals

**Goals:** dynamic readiness after missing startup data; best-effort feedback for settled mouse selections; standard success-toast appearance; deterministic controller regression coverage.

**Non-Goals:** native changes or new host events; reliable explicit/repeated shortcut-copy detection; modifying clipboard contents, keybindings or selection semantics; creating/restarting terminals or injecting input for verification.

## Decisions

### Observe readiness rather than latch it at initialization

Initialize controller fields without consulting transient platform facts. Each render reads the live window/settings APIs. If Windows facts are unavailable, copy-on-select is off, or native checking is active, cancel pending work and return an empty element. These are current eligibility facts, not permanent disable flags. When published facts make observation eligible, capture a clipboard baseline once and begin tracking selections.

Preserve the existing Windows support boundary; adding other-platform behavior is not part of this fix. Toggling copy-on-select off and back on takes a new baseline. Cancellation and close invalidate timers so an obsolete selection cannot show feedback later.

### Keep bounded inference, use the supported clipboard reader

Keep the existing 300 ms selection-settle delay and bounded 400 ms retries. Use `cx.read_from_clipboard()` in the callback instead of starting PowerShell. This removes process latency and async read races while keeping clipboard access local, read-only and scoped to observed selections.

Changed nonempty clipboard text suggests a completed copy. An unchanged nonempty clipboard after the existing retry delay remains a best-effort recopy assumption. At most one toast is emitted per settled selection; later retries must not create duplicate standard toasts. Clearing/changing selection, disabling observation or switching away from its captured terminal/tab cancels or suppresses feedback. No copied contents are displayed or persisted.

This cannot establish that mouse release happened: a held drag or unrelated clipboard change can still fool inference. Reliable repeated shortcut copies with unchanged selection endpoints remain undetectable. These are accepted and documented limits, not native-copy guarantees.

### Reuse standard notification rendering

Replace private Popup/font/color/fade/slide code with `notify({title: copiedLabel(count), level: 'success', timeout: 3000})`, matching Files/Git's success-notification route and lifetime. Keep the existing layout-owned mod mounted as an empty observer so the feature ID and layout remain stable. No native toast mod edits or new facade API are needed.

## Risks / Trade-offs

- [Selection is not a copy-success event] → Document the best-effort scope, retain bounded checks and never promise every-copy confirmation.
- [Focus, selection or eligibility changes during a timer] → Capture the selection generation and terminal/tab; recheck before reading or notifying; invalidate pending work on cancellation and close.
- [Clipboard missing or unreadable] → Bound retries and show nothing for empty/failed reads; never change clipboard contents to test it.
- [Synthetic selection snapshots do not prove mouse gestures or GPUI pixels] → Verify the real controller under deterministic fixtures and run native rendering checks in a disposable checkout-local app home. Inspect the running app read-only when a live interaction would disturb the person's terminals; state any remaining real-mouse gap explicitly.

## Verification / Rollout

Controller tests load the actual source and real model with synthetic host snapshots, a fake clipboard and deterministic timers; they simulate a mouse press/drag selection followed by the host's release-time clipboard update. Include initially missing window facts, resumption, normal/repeated mouse selection, disabled/checking states, clearing, focus switch and close. Assert the standard success payload and that the observer never writes the clipboard or starts processes.

Run the focused suite, strict OpenSpec validation and customization-only build. For a live-safe native check, use the guarded temporary-mod/test helpers only against a disposable home inside `.artifacts/`; do not deploy to the person's home under the checkout-only restriction. A read-only shot/status of the running app is allowed but is not proof of the new controller being installed. Real mouse-copy validation after deployment remains a handoff step if it cannot be performed without disturbing existing sessions.
