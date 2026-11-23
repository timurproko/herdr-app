# Design

## Context

See proposal.md for motivation and investigation.md for verified sources. The release change is dynamic palette themes; feedback stock is unchanged. Existing catalog originals have facade-rewritten imports and are not raw originals. A native startup reseeds frames, and native feedback attachment/send APIs require the actual feedback frame identity. There is no documented universal frame replacement hook.

## Goals / Non-Goals

**Goals:** Treat the current source's usable structure and required host capabilities as permission, independently of version/review membership. Retain native additions and native controllers, isolate Custom styling, and make activation/recovery observable and conflict-safe.

**Non-Goals:** Binary/Rust changes, another native exception, patched built-in mods, bypassing feedback permissions, live deployment, feedback submission, remote work, or claiming arbitrary future semantics are compatible. This task restores deployable source behavior against stock extracted from the installed 0.1.17; it does not change the installed app. A later deployment requires separate authorization.

## Decisions

### 1. Guarded transforms on proven current stock, not reviewed-file selection

Use a pinned, locally packaged JavaScript parser (Acorn) to identify import bindings, top-level functions/classes, methods and call-chain shapes. Apply range edits back-to-front; preserve untouched text, comments and native branches rather than printing an entire regenerated stock file. Ship the parser/license offline with runtime workers. No runtime downloads, source-checkout dependency or evaluation of stock code during inspection.

Discovery is separate from compatibility:

- Accept an on-disk stock target only with positive current executable provenance (raw bytes occur uniquely in the selected executable), not because it has no Custom marker or happens to parse. This prevents treating personal edits as stock.
- For an owned main masking stock, first try the saved raw original against the current executable. If it no longer matches, recover the current embedded frame source with bounded, unique file-boundary anchors, strict UTF-8/JavaScript parsing and expected frame identity/export checks. Compare the executable identity again before activation. A future packaged/compressed source without recoverable anchors is a concrete source-discovery incompatibility, not an unknown-version refusal.
- Preserve exact raw originals and digest provenance. CRLF/BOM handling belongs in parsing, never recovery-byte rewriting. Reviewed release fixtures are evidence only, never the runtime allowlist.
- A recognized prior owned main authorizes migration of our output, not native compatibility. Unknown target/helper edits or malformed records fail as ownership conflicts before writes. Do not adopt a live patched main as stock.

Every transform identifies each necessary anchor uniquely by AST role, not comments, line numbers or complete method bytes. Bindings can be resolved despite harmless formatting/local renaming. Missing/ambiguous anchors, incompatible controller shape or unavailable required APIs yield an explicit optional incompatibility advisory; no partial feature injection. These are real unmet contracts, not a prompt to add a version to a table. Preserve unknown additive nodes; an unfamiliar node is not itself incompatibility unless it intersects a necessary edit unsafely.

Self-check before activation: parse output, resolve the complete staged local module graph, assert exactly one default view/bridge, check declared helper/capability contracts, and compare the untouched native AST regions and command/action inventory before/after. The only allowed removals/replacements are named Custom presentation/routing edit sites. Reject any unexplained loss of native actions. Inspection/check/doctor remain read-only; executable identity and cached evidence must not become a stale permission grant.

### 2. Small owned adapters around native controllers

Do not transplant today's full main.js replacements onto newer stock. Factor Custom UI/controller additions into local owned modules and inject only necessary hooks.

**Palette:** retain native `entries`, `NAMED`, `HIDDEN`, layout/theme generation, fuzzy ranking, history IDs, keys and dispatch branches. Extend the entries result with Usage only in Custom and while that plugin is enabled; preserve native IDs and arguments. Decorate existing initialization/search-reset/focus/close lifecycle for Custom's input selection, virtual scrolling, fixed group/results heading and bottom fade. Custom rendering consumes native rows and key/title helpers; non-Custom renders the untouched native path. Wrap only native activation's command-dispatch site with the existing Custom routing adapter and a native fallback. Preserve special branches such as mod.clone prompting and layout.clone arguments, and preserve explicit close arguments rather than replacing them with focus. Keep inline rename and last-tab-aware close delegated to the mounted Custom Tabs receiver.

**Feedback:** retain native message/email state, preview/body creation, attachment APIs, pick/send methods, sending/error lifecycle and unmodified non-Custom rendering. Transform the render chain structurally at recognized field, attachment, JSON, success and footer sites; wrap/redecorate native nodes, rather than replace the entire render method or copy send logic. Where Custom reorders known fields or replaces labels/chrome, carry all untouched/additive native children and handlers through the composition. New sibling actions must survive, including their original callbacks. If a new action occurs inside an edit region, retain it through the node mapping or refuse that region as a concrete incompatible shape; never silently drop it. Preserve native disable predicates and add Custom's character-limit guard conjunctively, not instead of native validation.

Owned hooks supply the compact Add image/helper/thumbnails, three-image count and quiet excess handling, image viewer navigation, collapsible JSON/help and simplified sent title/thank-you view. Guard drops/async attachment completion against sending/sent state and preserve native error paths. Preserve fresh one-use agent draft consumption with compare-before-write and manual sending; no automatic submission. Custom-only presentation changes must not alter other layouts' form behavior.

This retains new 0.1.17 theme actions by construction and native feedback behavior (there are no new feedback source actions in this release). It also admits tested additive future commands/themes/feedback actions instead of freezing a 0.1.17 copy.

### 3. Transactional entrypoint activation, not a claim of multi-file atomicity

Use one per-home native-patch mutation lock shared by explicit CLI, startup, deploy and restore; coordinate with deployment's existing lock/order without recursive acquisition. Inspection must not acquire a writing lock or change timestamps. Validate/sanitize all record paths, reject symlink escapes and bound journal/source sizes.

Stage each patch's full helper graph in an immutable content-addressed generation under its frame directory. Generated main imports that generation, so preparing new helpers cannot mutate the currently active graph. Snapshot raw entrypoint/helper/record bytes in a durable versioned journal before changing anything live. Staging failure leaves active main/state untouched. Preflight all required edits and both optional-patch verdicts before the repair loop; incompatibility of one patch must not prevent an independent compatible patch, but each activation is all-or-nothing.

After source/ownership rechecks, atomically rename the completed main into place as the single activation point. Verify installed graph/digests, then atomically publish a v2 ownership/recovery record and finalize the journal. The record captures source/executable digest, transform revision, original bytes, generation and installed hashes. A second apply on identical evidence is a quiet no-op, with no record/entrypoint timestamp churn.

On any failure, restore only transaction-owned unchanged bytes from the journal, entrypoint first, then record, then newly staged files. On process interruption, the next mutating invocation resolves the journal before any new work; doctor reports interrupted/recovery-required state without repairing it. Never overwrite a concurrent external edit to make rollback appear clean. If rollback itself is blocked, keep the journal/backups and report a hard recovery-required error, not success or an advisory skip. No operation silently certifies a half-applied graph. Restore uses the latest proven raw stock, not a stale release backup; unfamiliar newer stock remains untouched, and helper cleanup removes only verified owned unused generations.

File-set atomicity and native writer coordination are not provided by the filesystem or host API. Immutable dependencies plus single-main atomic activation prevent an entrypoint pointing at half-updated helpers; durable journaling handles record/crash consistency. A native reseed or external editor can race outside our lock, including the final comparison/rename window; immediate readback and conservative recovery expose detected interference, but cannot promise a native CAS lock that does not exist.

### 4. One verdict everywhere, and a safe v1 migration

Registry entries describe transform identity, source discovery, required anchors/capabilities and helper graph instead of selecting a full main payload by reviewed-original equality. Restrict this design to the existing palette/feedback entries. Keep exact-byte stock fixtures outside executable patch source; do not facade-rewrite fixtures to satisfy the direct-import boundary.

Existing v1 opt-ins migrate only after validating every relevant owned/previous/original hash and current stock provenance. Retain their originals until the new transaction commits; overwrite a stale original backup only with proven current native stock. Missing helpers from a native reseed may be recreated, but unfamiliar helpers remain conflicts. Corrupt records and concurrent edits remain hard failures. Automatic paths never create an opt-in; explicit apply remains the only opt-in operation.

Deploy/startup/check/doctor share structured states: compatible active/current, compatible repair-needed, incompatible with exact anchor/API/source reason, ownership conflict, interrupted/recovery-required. Report retained old output separately from active certified output. A truly incompatible patch leaves target/helpers/opt-in/recovery bytes unchanged and does not fail unrelated deployment; unsafe ownership/recovery is not downgraded to an advisory.

### 5. What is and is not version-independent

| Behavior | Independence and remaining dependency |
| --- | --- |
| Custom theme, search header, fixed headings/fade, keyboard navigation and shared UI | Owned helpers need GPUI/base and facade capabilities, not reviewed app versions or whole stock text. Hooking the native palette still needs its structural row/lifecycle contract. |
| Usage, Settings/picker/worktree/machine routing, inline rename and last-tab close | Owned routing uses public commands and Custom receivers; no release list. Native palette activation/entry anchors and mounted receiver remain necessary. |
| Native palette actions, history, dynamic themes | Reuse current native catalog/controller verbatim, including 0.1.17 theme filtering. Future compatible additions survive; a replacement catalog/controller architecture requires a new adapter. |
| Feedback visual chrome, compact attachments/viewer, JSON disclosure, draft and thank-you | Owned presentation/state additions need stable native state and GPUI events. Not tied to whole-file bytes; structural form integration still depends on identifiable sites. |
| Feedback pick/paste/drop/preview/send | Continue using actual frame authority and native functions. Cannot move fully to an ordinary mod with today's APIs. Changed permission, payload or lifecycle semantics can be genuine incompatibility. |
| All entrypoints, future native actions, safety | No reviewed-version gate. Cannot guarantee silent host semantic changes, arbitrary rewritten forms, hidden actions inside unsupported replacements, a compressed/unrecoverable stock container, or OS-level rollback despite external interference. Report actual detected reasons, never universal future compatibility. |

### Alternatives rejected

- **Only correct raw snapshots and rebase full replacements:** fixes the feedback false-negative and today's palette, but repeats the update gate and can erase native additions. Keep raw fixtures for evidence, not runtime permission.
- **Private overlays only:** a palette can serve selected Custom entrypoints, but misses native app.palette entrypoints and forks native catalog logic; feedback cannot attach/send. Not a complete restoration.
- **Blind regex or execute arbitrary native code to probe it:** ambiguous/unsafe edits or real side effects. AST anchors and non-executing structural self-checks are bounded and auditable.
- **Retain exact reviewed permission forever:** strongest familiar-source conservatism, but contradicts the requested update behavior. This is the maintainer's trade-off, not something an agent silently changes.

## Risks / Trade-offs

- [Same names, changed host semantics] → Required capability/shape checks, preservation checks and fixtures reduce risk but cannot prove future semantics or GPUI pixels. Runtime exceptions must remain visible; no blanket certification.
- [A future form inserts a control inside a replacement region] → Retain it structurally or identify that specific incompatible region before writes. Additive future fixtures cover both preserved siblings and safe refusal for unsafe nesting.
- [Host reseeds while worker writes, lock/write/rollback fails] → Rechecks, immutable generations, journal and readback; keep backups and a hard recovery-required diagnostic when safe restoration is impossible.
- [Source extraction changes] → Explicit source-discovery advisory; never infer stock from an owned hash or fetch a potentially different release at runtime.
- [Parser packaging adds maintenance] → Pin the parser, ship license and runtime closure, exercise offline relocated-bundle tests.

## Migration Plan

After approval, implement the four task groups in order. Use disposable copies of verified raw 0.1.16/0.1.17 stock and synthetic binaries/homes only. Exercise v1 migration, stock reset, old-owned-over-new-host, absent helpers, restore, idempotence, formatting/BOM variants, both layouts, added native commands/theme/filter/actions, malformed/duplicate/missing anchors, missing capabilities, personal edits, write/rename/readback/crash/rollback faults and locks. Assert complete preserved bytes on refusal and native actions/callback behavior on success; static string checks alone are insufficient.

Run targeted suites per outcome and `CI=true npm run test:ci` before implementation handoff. Update current documentation/specs to replace the reviewed-byte policy explicitly, with the limited meaning of forward compatibility. No actual deployment, native screenshot/click, startup restart or feedback send is included; the maintainer can authorize those separately after review.

## Maintainer decisions requested at plan approval

1. Accept guarded, best-effort structural compatibility rather than exact reviewed whole-file replacement permission, including the residual semantic and native-writer race limits above. This is not authorization for blind transforms or binary modifications.
2. Keep the two existing opt-in frame exceptions because full public replacement is unavailable; use native stock with a concrete advisory only when discovery, anchors, required capabilities or self-checks actually fail.
3. Accept fixture-only restoration in this PR and no installed-app/deployment action. Real UI validation and rollout remain separately authorized work, not a hidden completion step.
