# Native bridge replacement audit

Review-repair audit for the palette/feedback structural bridge. The rule is not
"a descendant anchor exists": replacing its ancestor must not discard surrounding
operations, siblings, callbacks or native argument computation. Unknown overlapping
content is a specific incompatibility, never an invitation to overwrite it.

The cases below run against raw stock in the synthetic VM first, proving added
native actions exist and execute. A transform then either preserves the action in
Custom or refuses with a named `Incompatible` reason. These are structural contracts,
not whole-file byte fingerprints or release allowlists. Unknown controller semantics
can still require a new adapter; fixtures do not certify all future native behavior.

## Replaced and wrapped sites checked

| Site | Preservation or refusal contract |
| --- | --- |
| Palette entry result | Original result expression is evaluated and passed through before Usage is appended. Catalog, theme discovery and history identities remain native. |
| Palette dispatch call | Original name and argument expressions evaluate once, in order, before routing; fallback uses those exact values. Unknown explicit Settings/rename arguments retain native routing instead of being dropped. Extra dispatch arguments refuse. Other dispatch branches remain untouched. |
| Palette complete Custom render | Known root/content/controller slots, factories and event regions are required. Added root/row/list wrappers, helper-produced controls, siblings, unsupported factories/actions or new controller-state effects refuse. Existing native catalog additions remain supported. Native title/key helpers remain in use. |
| Palette init/change/close hooks | Original bodies remain. Native focus/blur subscriptions and collisions with Custom-owned lifecycle fields refuse, so added hooks cannot overwrite native handlers/state. Placeholder replacement requires a literal. |
| Feedback attachment argument | The form child must be the direct native `this.shots_row(theme)` call with one argument. A wrapper, conditional, decorator, sibling subtree or changed arity refuses even when the descendant call still exists. |
| Feedback message/email field arguments | The direct field renderer/control relationship is required. The native input leaf is retained; arbitrary wrappers/factories, siblings, callback-bearing decorators and spreads refuse. The local field renderer must be presentation-only. |
| Feedback removed field captions | The local caption renderer must be a direct presentation-only native div with one literal/parameter child. Added children, computed calls, callbacks, factories or side effects refuse. |
| Feedback header, success, agent and availability captions | Each replaced subtree must be a direct native div with one plain literal child and only supported presentation decorators. Nested `children`, wrappers, callbacks or additional siblings refuse. Sibling operations outside the replaced caption remain native. |
| Feedback JSON | The entire current JSON argument, including wrappers/siblings/callbacks, is passed through the disclosure. Nested action preservation is tested with the disclosure expanded. |
| Feedback body | Unknown child/conditional operations survive; only known layout refinements are removed. Removed refinements require literal arguments, so behavioral expressions cannot disappear with styling. |
| Feedback root and footer | Original node operations are passed through owned chrome rather than reconstructed from known children. Nested footer action wrappers are retained and executed in both layouts. |
| Feedback thumbnail row/image/remove UI | Known row/list/image/remove slots and constructors are required. New wrapper or sibling content, spreads, extra setup statements or controls refuse. The entire native removal callback is retained, including added native side effects. |
| Feedback thumbnail Add control | The known add gate/control/callback shape is required. A new native Add callback action or surrounding wrapper refuses rather than being replaced by an older action. |
| Feedback button helper | Only the known presentation and guarded action-callback shape is replaced. Added setup statements, child/wrapper nodes or callback actions refuse. Bound parameter/default values are passed explicitly to Custom, not lost through the original `arguments` object. |
| Feedback drop handlers | Native callback bodies are retained, not replaced by a copied attachment implementation. Root and attachment-area drops invoke them behind Custom's sending/sent/path guards and error boundary. Added native drop side effects are tested in both entrypoints. |
| Feedback other lifecycle edits | Native pick/send/close bodies remain. Paste/add gain only explicit sending/sent guards; screenshot-limit diagnostics are quieted by policy. Focus/blur subscriptions, Custom state collisions and behavioral email placeholders refuse. |

Regression locations: `tests/native-feedback.test.mjs` and
`tests/native-palette.test.mjs`. `tests/native-integration.test.mjs` additionally
checks the reviewer's wrapped-attachment reproduction through real inspection,
startup and doctor: the advisory identifies the attachment wrapper and complete
frame/helper/record snapshots remain unchanged.

## Transaction and migration repairs

- Dependency-only repair journals/checks expected main, record and every generated
  helper even when main/record are absent from the write list. An external change
  to either unchanged checkpoint fails final validation, preserves the external
  bytes and retains the journal instead of certifying success or cleaning helpers
  behind an unfamiliar entrypoint. Recovery includes these unchanged checkpoints.
- v1 partial-refresh records may recognize a retained helper through
  `previousInstalled` rather than `installed`. v2 keeps that prior ownership evidence
  for retained legacy paths only; replaced main/generated paths do not inherit it.
  Inspection, repeated no-op apply and restore remain valid after migration without
  adopting unfamiliar bytes or losing the original helper backup.

`tests/native-engine.test.mjs` covers both main/record races during dependency-only
repair and partial v1 refresh with absent or nonempty original helper backups.
All tests use disposable homes; no live patch, native binary or user state is written.
