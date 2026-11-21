# Herdr 0.1.16 customization compatibility review

## Reviewed host

- Installed Windows Herdr App: **0.1.16**.
- Executable SHA-256:
  `c78e454556f33c2240a0be366fd4e5b183f092286500acd9ac861c29bffa058e`.
- Public `herdr.d.ts`, `gpui-kit.d.ts`, host authoring contract and live command
  catalog were inspected read-only. Required functions/commands are present;
  no API aliases or additional collection/object normalization were needed.
- The new native `checking()` facade preserves the boolean eager-check guard.
  The Git subscriber uses the declared native `websocket.WebSocket.connect`,
  `read`, `write` and `close` APIs; token authentication is in the first frame,
  not a forbidden credential header. Native checks do not connect to the relay.

The public facade profile explicitly adds `0.1.16`; unknown versions remain
unreviewed. This is a public-customization API review, not permission to modify
Herdr binaries or to widen private Core-document compatibility gates.

## Stock provenance

`record-stock-baseline.mjs 0.1.16 0.1.15` verified each changed stock file's exact
bytes against the installed executable's embedded source before creating the new
baseline. Five changed stock entrypoints were verified: Spaces, Agents, Tabs,
Machine Add and Worktree. Other stock baseline hashes remained unchanged.

The generated baseline and executable provenance are retained under
`upstream/baselines/0.1.16*` and packaged for read-only integration checks. No
personal settings/keys or unknown edited output was adopted as a new baseline.
No host-owned source file was edited.

## Validation performed

- `check:host-api`: reviewed profile, zero missing APIs/commands/direct imports.
- `npm test`: full fixture/unit/deployment suite passed.
- `test:integration`: stock baseline checks and **686** deferred render/hover
  assertions passed, across priority/grouped/rail/empty scenarios. Historical
  fixture expectations were reconciled with already-existing folder grouping,
  panel pins, plugin settings, scrollbar insets and captured header menus;
  no corresponding unrelated runtime behavior was changed.
- `test:native`: all **17** private mods, two existing frame compatibility
  fixtures and the deferred feature fixtures passed in a disposable home,
  including nine Git states with the conflict icon/header sweep.
- After deployment, `doctor` reported reviewed **0.1.16**, no ownership issues,
  and both existing native patch opt-ins intact. `check:native` passed for all
  **17** installed mods. The native Usage Toggle tooltip/ID warnings remain
  unrelated existing limitations, not errors introduced by this update.

## Deployment and live inspection

The Git plugin and public facade files were deployed with explicit source
selectors, rather than rolling back the separate Firstmate branch already
installed. **567** unselected owned files were verified unchanged against their
original hashes; layout and preference files stayed byte-for-byte intact. No
terminal input, Core/desktop restart, branch merge or new native patch opt-in was
used. Only private customization mods were hot-reloaded through deployment.

A read-only live screenshot confirmed the Git panel renders, shows the red
circle/cross for a conflicting PR (subsequently changed to an outlined circle and X), and displays the webhook setup notice. A follow-up moves that notice into a
bottom info card and shortens the prerequisite buttons to Create and Setup.
The card now uses PR-row icon sizing, spacing and bold title typography, with
**Keep test results up to date** and a **Settings** link directly to Git's expanded
configuration. Targeted and unknown-plugin routes are covered by fixture tests.
The running app reported no errors. Live hover behavior and end-to-end GitHub
webhook delivery still require manual verification with the configured relay.

## Deliberate boundaries

- The public profile alone does **not** authorize Move to/Core-document access.
  A subsequent [private-contract review](TAB-MOVE-ADR.md#app-0116-document-contract-review)
  explicitly permits App 0.1.16 alongside 0.1.15, retaining exact Core versions,
  identity/shape checks and unknown-version refusal.
- Existing frame opt-ins remain narrow and hash-guarded; no unknown stock was
  patched and no additional compatibility patch was enabled.
- No Cloudflare account/service, GitHub webhook or credentials were provisioned
  during this review/deployment. Finish **Settings → Plugins → Git** setup before
  expecting live CI notifications; manual Refresh remains available meanwhile.
- This evidence covers the installed 0.1.16 build and exercised states, not every
  interaction or future Herdr/Core update.
