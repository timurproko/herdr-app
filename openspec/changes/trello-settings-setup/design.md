# Design

## Context

See `proposal.md` for motivation. `trello/plugin.js` currently declares only portable `access` and one local requirement. `actions.js` always invokes local `status`, ignoring the Settings machine. `setup.cjs` writes protected credentials without a network identity check; `credentials.cjs` strictly validates version-1 credential/policy files with permissions, link/checkout rejection, a lock and expected-value writes. `client.cjs` permits typed board/card routes only. Agent `boards list` deliberately never enumerates account boards.

`docs/PLUGIN-UI.md`, `plugins-ui.js` and `settings-kit.js` provide persistent text fields, live toggles and generic item lists, but no transient secret form. Existing text input commits on blur/Enter and is unsuitable. The reviewed public `exec` signature in `tests/fixtures/palette/herdr-0.1.18.d.ts` has no stdin option. Plugin API already exposes native WebSocket connect/read/write through Git's relay integration. Do not invent `exec({stdin})` or pass encoded credentials in argv.

## Goals / Non-Goals

**Goals:** One declared card, existing private stores, no secret persistence outside the Node credential writer, explicit owner actions and fail-closed machine/authority changes.

**Non-Goals:** Native API changes, remote credential transport, OAuth, encrypted vaults, a permanent local service, agent account inventory, real Trello validation, automatic credential rotation or general process-execution endpoints. Same-OS-user shell access remains outside the client-policy security boundary.

## Decisions

### 1. Extend declarations, not persistent setting types

Add a prerequisite action-form declaration with bounded transient fields (`text` or masked `secret`), labeled explicit actions and public result/status presentation. Keep inputs in the mounted view only, never `pluginSetting`, `setShared`, localStorage or registry serialization. The common renderer and kit own geometry, input masking, submit/clear/cancel and busy state. Both API key and token use secret handling; masking is mandatory for the token. Neither blur nor Enter auto-submits credentials. Install all cannot invoke credential forms or destructive actions.

Actions receive a frozen machine/view generation, `isCurrent` and transient values directly, not a saved setting. Allocate native state/focus outside render. Clear controls on success, failure, cancel, close, machine switch and disable; reject duplicate pre-paint presses and stale callbacks. Existing generic persistent text behavior is unchanged. Extend the reusable live-control declaration only as necessary for the public Access/private-policy combination; do not add a Trello-specific renderer branch.

**Alternative rejected:** A `secret` preference type or hidden plugin setting still persists through shared state and export machinery.

### 2. Bounded local WebSocket-to-stdin handoff

Use the existing supported native WebSocket interface to reach a short-lived Node loopback bridge, which forwards exactly one validated action payload to the allowlisted Trello setup worker's stdin. A startup `exec` returns only the loopback port, random single-use session capability and expiry; startup argv contains no credential values. Keep rendezvous data in memory, not files or shared state. Bundle a pinned reviewed WebSocket server implementation into the deployed runtime; never hand-roll framing or rely on globally installed packages or checkout `node_modules` at runtime.

Bind only `127.0.0.1` on an OS-assigned port, disable compression, reject browser Origin requests, validate the session in the first frame, bound frames/payload to the setup input limit, and accept one authenticated action only. Unknown sessions and replays never dispatch. Allowlist action/worker identifiers and never accept arbitrary commands, paths or URLs. Cap rendezvous lifetime at 60 seconds, terminate after the result, and provide cancellation plus a hard timeout for abandoned clients. Worker child stdin is a pipe; credentials appear in neither command line nor environment. Drain/discard raw stderr, bound output, and return only sanitized declared public result fields. No request body, authenticated URL, key or token is logged. A crashed view leaves only a short-lived process, never a secret file or replay job.

This bridge is used only for explicit setup actions, not normal status checks or agent data commands. If the installed host cannot support the documented native socket/input capabilities, refuse with an actionable explanation; never fall back to argv, files or native patching.

**Alternative rejected:** Protected temporary input files violate the requirement that typed credentials end up only in the existing credential file; shell-encoded values still expose argv. A permanent broker unnecessarily expands lifetime and operational scope.

### 3. Owner worker separate from agent dispatch

Add a narrow Settings-only worker entry, sharing protected-store and sanitized bounded HTTPS machinery with the CLI. Support status, verify supplied credentials, save verified credentials, verify saved credentials, explicit replace/remove, visible-board discovery and private policy edits. Add typed `/members/me` and visible-board endpoints only to the owner setup path; do not add discovery flags or commands to `cli.cjs`. Existing child membership and agent route gates remain unchanged.

Save/replace verifies supplied credentials before any store mutation and returns only bounded account ID/name and saved state. Keep the version-1 credential shape (`version`, `apiKey`, `token`) unchanged: account hints live in the current view's check/action result, not shared state; reopening shows Saved and offers Verify saved. A failed credential verification leaves existing credentials and policy intact. Successful explicit replacement or removal clears board scope and local writes, preventing a new account from inheriting prior authority. Removal deletes this protected credential copy, not the provider authorization, and says so.

Use the existing path/security checks and expected-value/lock discipline for deletion and multi-file policy/credential transitions. Revalidate the captured credential identity under the lock; clear authority before replacing/removing credentials so interruption cannot grant stale authority. Never silently repair malformed stores. Preserve existing headless setup, rotate and policy command behavior and legacy valid stores.

Owner discovery projects bounded board IDs/names into the view only, with response limits, cooldown and sanitized failures; incomplete inventory is explicit. It does not read board contents or alter policy. Generic item selection lists names; committed selections change only canonical IDs in `policy.json`. Respect the existing 100-board bound, retain unseen existing entries and offer removal of saved entries even when discovery cannot see them. Revalidate credential identity and current policy before commits so stale checkboxes cannot grant scope after replacement.

### 4. Local authority and machine scope stay explicit

Pass the Settings header's captured machine through generic action/check context without adding a portable machine preference just for Trello. Local selection invokes the installed local worker and local Herdr home. Any non-null remote selection returns an explanatory unsupported result before process launch or store read. Clear local hints and disable credential, board and access actions there. There is no remote-to-local fallback or automatic peer installation.

The existing portable `access` value remains a public additional gate for agent writes. In the card, an explicit Read-only / Read-write action changes private `policy.allowWrites` and then synchronizes public Access only after acknowledgement. Display the effective private/public combination, never imported Access alone. On partial failure refuse/retain read-only presentation rather than claiming authorization; private read-only always wins. Preference import can update the public gate but must never call the live setter or populate policy. A read-only Trello token still cannot perform server-side writes even if both client gates are on.

The requirement remains local-only: protected credentials plus one saved allowed board means Ready; it does not assert token validity. Network verification and board discovery are explicit owner actions, not background checks. The description and help explain Settings setup, official token generation, private storage, local-only support and headless alternatives.

## Risks / Trade-offs

- [A local handoff adds attack surface] → Single-use random session, loopback-only listener, Origin rejection, fixed action catalog, strict bounds, dependency review and hard cleanup tests; acknowledge same-user limitations.
- [Secrets temporarily exist in native input and JS/Node memory] → Clear controls/references promptly and never persist/echo them; do not promise cryptographic erasure from garbage-collected memory or clipboard protection.
- [Trello token owns more boards than allowed] → Owner-only discovery is a documented exception; agent CLI continues allowlisted reads and the policy is not a sandbox.
- [Multiple windows or headless commands race] → Compare captured credentials/policy at commit, serialize changes under the protected lock and refuse superseded state without retries of remote effects.
- [Large/incomplete board inventory] → Bounded discovery, honest truncation, explicit search/selection and no removal of unseen existing grants.
- [Remote owners must use headless setup] → Clearly refuse in that card and document the per-host command; no misleading local success.
- [Fixture export dependency drift] → Exercise actual installed-export and preference-home fixtures and update every copied dependency list if deployment imports change.
- [Native proof may be unavailable on this machine] → Use the repository's disposable pattern with injected fake IO; report a blocker rather than substitute render-tree assertions for a running-app screenshot.
- [Drafts skip hosted suites] → Planning handoff makes no CI claim. After approval, obtain successful Windows/Ubuntu checks on the implementation head through the established delivery flow before reporting implementation; do not mark ready or merge manually.

## Migration Plan

1. After plan approval, deliver and test each outcome in order. Extend packaging with the handoff runtime/dependency closure; ordinary full deployment installs code only, never credentials or policy.
2. Preserve existing protected stores and headless commands. Merely opening Settings, upgrading or importing preferences changes no private authority. Card replacement/removal requires explicit confirmation.
3. Run targeted fake-data suites and the two named export fixtures. Capture missing/saved/board-selected/access/remote-refusal states in a disposable running app, with proof and scratch outside the checkout under the crew task folder. Stop all started app/Core/bridge processes in finally cleanup and record that cleanup.
4. Record hosted Windows and Ubuntu results on the final implementation head. No implementation report or live-provider success claim before that gate.
5. Roll back owned code through existing deployment safeguards; private credentials/policy remain outside deployment ownership. No background listener survives the bounded handoff lifetime and no setup action is replayed.
