# Design

## Context

See proposal.md for motivation, collision findings and the one-PR/four-outcome delivery decision. Current source is the merged #83 baseline: typed `operations.cjs`/`client.cjs`, protected Store and authority checks, installed offline help, declarative Settings with generic saved rows, and identity-bound private-action SSH transport.

Observed causes:

- `cards.get` explicitly requests `attachments: false`; no attachment operations/routes exist.
- `localStatus` requires `allowedBoards` for readiness and emits Add account/Add boards.
- `plugin.js` declares Save & verify; the shared action renderer hardcodes Working for all form actions.
- Requirements renders both the Account heading/status row and its separate saved removable row.
- `scopeRow` always draws its bottom border, including an empty Boards section.
- Board picker tabs currently reuse the bordered field-choice control, whose shape is unchanged since the initial import (`12867b4`). Existing Git Open/Closed tabs use lighter text/semibold/hover treatment. Read that implementation as a visual reference only; never edit or import `src/plugins/git/`.

### Documentation verification

Reviewed the currently served Atlassian documentation, not just the brief:

1. [Cards REST reference](https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-attachments-get) and its [linked OpenAPI](https://dac-static.atlassian.com/cloud/trello/swagger.v3.json?_v=1.1274.0): GET card attachments and GET a specific attachment exist and require read access, not a write operation.
2. [Object definitions, Attachment Object](https://developer.atlassian.com/cloud/trello/guides/rest-api/object-definitions/#attachment-object): uploaded-image example includes integer bytes, fileName, and preview objects containing width, height, scaled, bytes and URL. Original and preview examples use `https://trello.com/1/cards/.../attachments/.../download/...` and `/previews/P/download` respectively. A non-upload link is demonstrated by the REST reference.
3. [Authorization guide](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/#passing-token-and-key-in-api-requests): API key/user-token OAuth header is `Authorization: OAuth oauth_consumer_key="KEY", oauth_token="TOKEN"`; a read-scoped user token is supported. The newer REST page's OAuth 2.0 examples do not require migrating this existing key/token client.
4. [Trello team's authenticated-download announcement](https://community.developer.atlassian.com/t/update-authenticated-access-to-s3/43681): attachment downloads require header auth, not query auth; manually constructed download routes remain recommended; use fileName or the URL basename, never mutable display name. That announcement uses `api.trello.com`, while Object Definitions uses `trello.com`; permit these two exact origins only, not a suffix wildcard.

Documentation discrepancies matter: OpenAPI describes bytes as nullable string, previews as string-array, omits fileName from AttachmentFields, and describes single-attachment success as an array, contrary to the detailed Object Definitions example. Normalize nonnegative integer bytes (including validated decimal strings), optional fileName and validated preview objects; reject malformed values. Accept a matching object or an exact one-element matching array for the singular endpoint, never arbitrary first-item selection. Request documented `fields=all` rather than requesting a fileName enum the schema omits. No live private-attachment conformance is claimed. The header requirement applies to the documented preview download paths as well; no direct S3/other-host authentication is allowed.

## Goals / Non-Goals

**Goals:** preserve the allowlist/parent-proof boundary; make downloads safe and discoverable to shell agents; make account readiness truthful independently of board grants; retain shared declarative UI consistency and the existing safe SSH setup.

**Non-Goals:** upload/delete attachments; arbitrary URL fetching; external-link downloads; automatic file opening; MCP or a Trello panel; credential import/cross-host copy; privilege/SSH account changes; write-policy migration; native application changes; production deployment or real-account testing.

## Decisions

### A1. Metadata stays inside typed operations

Add `attachments.list` with required board/card and `attachments.get` with board/card/attachment/out and optional previewWidth/allowOtherTypes. Validate exact flags and canonical IDs before IO. Use the existing allowed-board membership scan to prove the card before calling its attachment endpoint, then verify attachment identity under that card. Do not accept caller URLs. Recheck current authority before every follow-up and after the final response, retaining the existing cross-request move-race disclosure.

Return at most 100 metadata entries with complete/truncated semantics, no invented cursor. Keep the 2 MiB JSON cap. Card detail gains the same attachment collection, attachment IDs and a count whose exactness is explicit: a complete inventory supplies an exact count; a truncated inventory supplies only returned count/lower bound, never a fabricated total. Avoid embedding file bytes or full previews in every board-card listing; card detail and explicit attachment listing are the discovery surfaces. Request `filter=all` for the attachment collection. Optional metadata is preserved when present, never synthesized from misleading display names.

### A2. Downloads are a distinct bounded binary path

Keep ordinary JSON REST authentication unchanged; do not broaden the generic client into a URL proxy. Add a narrow attachment helper, packaged with the plugin, sharing command deadline, request counter, authority checks, safe errors and persisted cooldown. Downloads consume the same 20-request/60-second command envelope and 20-second per-request deadline, without retries. If validation uses most of the envelope, refuse rather than resetting a separate binary budget.

- Hard ceiling **20 MiB (20,971,520 bytes)** for the selected binary. Check selected metadata bytes when known, Content-Length when supplied, and actual streamed bytes regardless of headers. A small preview may be downloaded even if the original is above the ceiling.
- Default types: PNG, JPEG, GIF, WebP; require matching normalized metadata/response MIME and recognized file signature. Reject HTML/SVG masquerading as images. `--allow-other-types` permits other uploaded types as inert files with sane, consistent MIME metadata/response; it never executes them, bypasses size limits or authorizes external URLs.
- `--preview-width N` is a positive bounded integer (1–16384). Choose among validated `scaled: true` preview objects: smallest width at least N, otherwise largest width; deterministic tie-break by height then identity. No scaled preview means an explicit unavailable-preview refusal; do not silently download an original. Its MIME must still pass image validation.
- Binary URLs must be HTTPS with exact origin `https://trello.com` or `https://api.trello.com`, no userinfo, nondefault port, fragment or authentication query. Validate the path's card and attachment IDs and original/preview download shape. Build originals from the verified fileName, or a validated decoded download-URL basename if fileName is absent; never use mutable `name` as a route filename. Preview URLs come only from that attachment's validated preview metadata.
- OAuth header only, with safely encoded quoted credential values; no download key/token query, argv/env, HTTP error echo or raw header logging. Set `redirect: manual` and refuse every 3xx, including same-host redirects. Never forward the header; never fall back to S3. A future redirect-based provider change needs explicit review, not a permissive workaround.
- `isUpload: false` returns metadata for human/agent context but download refuses before a URL fetch, even for an apparently trusted URL and even with other-type opt-in. Reject javascript/data/file URLs from returned link metadata; safe external HTTP(S) links are labeled untrusted and never followed.

Alternative: enlarge the existing JSON response reader and write its bytes. Rejected because binary streaming/type/partial-file handling and credential URL rules differ materially from metadata.

### A3. Protected, non-overwriting output

`--out DIR` is an explicit local destination, not a remote path. Create a unique owner-only child directory under DIR and use an attachment-ID-prefixed sanitized basename with an exclusive file create. Validate parent/child paths against symlinks/reparse points; refuse unprovable Windows ACLs and unsafe existing paths. Do not chmod or adopt an unrelated directory or overwrite an existing file. Use 0700 folders/0600 files on POSIX and verified current-user Windows ACLs, reusing reviewed permission logic without weakening credential-store rules. Reject checkout-local download storage so private card content is not accidentally committed.

Write only a protected partial file; remove that file on refusal, timeout, malformed MIME, exceeded limit or authority revocation. Publish an absolute final path only after validation and the final authority check. Hostile filenames, traversal, Windows device names/ADS and collisions cannot escape the new folder. JSON output includes board/card/attachment, selected representation, MIME, bytes and path, never credentials or downloaded text. Help explains reading the printed file with an agent's image/file tool and deleting retained private copies intentionally; no automatic opener runs.

### B1. Screenshot-by-screenshot mapping

| Supplied filename/note | Proposed behavior and focused UI assertion |
| --- | --- |
| Add not Add account | Empty Account status is Add; inputs remain protected |
| Save not Save & verify | Trello action label is Save; worker still verifies before saving |
| Saving not Working | Declare `busyLabel: 'Saving'` for this action and let the generic renderer honor it; preserve Working for every undeclared action |
| When account added no fixes needed it changes to Ready | Configured, named, activation-ready account is Ready with zero boards; ready runtime plus account yields All ready; CLI scope is still empty/denied |
| Dont need Account line Show Account Name on Right Ready on hover Remove | Generic opt-in saved-row replacement displays account name once, with Ready replaced by Remove on row hover; captured confirmation/removal remains unchanged |
| I need better description than JSON acess to board can it be user friendly short one sentence | Use “Let agents read and update cards on the boards you choose.” and retain the API key and token link |
| I dont get this senanigan on ssh machine can we provide import from connected machine or what this is not usefull at all | One unsupported-connection explanation, no repeated runtime/account/board failures or numerical fix count; details below |
| Make better stile for tabs we had some before that looked better | Generic picker-tab kit treatment derived from existing lightweight Open/Closed tabs, not the bordered Settings field-choice control; preserve field choice styling |
| Dont_show_line_after_This_computer_when_no_board_added | Conditional scope separator only when added rows exist; zero-board machine/Add row remains |

Keep generic renderer/kit declarations free of Trello ID switches. Add narrow optional capabilities (`busyLabel`, saved-row replacement with resting status, conditional scope separator, picker tab presentation), with synthetic-plugin contract tests and documented defaults. The shared Working label is not generally wrong; **only this Trello save action changes**. Existing unrelated saved rows, choice settings, status rails, dimensions, busy guards and confirmations stay unchanged.

Account readiness does not require board names or board count. Missing account display hints still offer explicit Check; missing board names belong in Boards. Auth/permission/activation failures still prevent a Ready claim. A saved cached Ready is local-configuration readiness, not a claim the token was freshly verified. Check remains the explicit network verifier. Preserve global Access behavior and private host receipts.

### B2. Useful connected-machine behavior without bypassing identity checks

`trello-bootstrap.cjs:windowsUser` inspects the SSH process's Windows token using WindowsPrincipal.IsInRole(Administrator), then compares the selected Core file owner SID to the current SID. Administrator membership in that execution token exits 31 and becomes MACHINE_ELEVATED **before READY and before any credentials are sent**. This is stronger than merely noticing that an account belongs to Administrators. The screenshot is consistent with that guarded elevated SSH execution path; no new live pc2 probe or change was performed. This check does not prove the plugin cannot run for the regular user on that machine.

Options considered:

1. **Recommend: retain the refusal and present one useful explanation.** Reuse safe direct-SSH Install/Update/Save/Boards controls when identity checks pass. For this refusal show: “This SSH connection runs as administrator. Trello setup here must use the regular user running Herdr Core. Connect without administrator rights, or set up Trello locally on that machine as that user.” Label Requirements Unavailable (not All ready or N to fix); collapse duplicate account/Boards diagnostics and omit unusable controls. Keep other failures distinct.
2. Explicit “Use this computer's account” transfer for a *safe* verified target could eventually save entering a token again. It would require separate source/destination consent, protected worker-to-worker reading and SSH stdin delivery, captured identities/revisions, board revalidation, read-only destination defaults and unknown-outcome handling. **Not selected:** it cannot repair elevated SSH identity and materially expands secret access/transfer scope.
3. Allow the elevated login, change SSH/server/UAC settings, or copy into the administrator store. **Rejected:** may target the wrong execution identity, weakens #83's deliberate boundary, and requires separate machine-administration authorization.

Implement the selected UX via generic applicability/unavailability presentation metadata, not a misleading ready status or a new broad registry status. A plugin can identify one setup-unavailable diagnostic and suppress dependent rows/summary counting while retaining the underlying refusal code for retry and tests. Fix counts for other plugins remain unchanged. Bind projection to the current machine/view generation and handle independent Requirements/Boards reads without duplicate messages or old-machine flashes. Never turn generic SSH outages, corrupt stores or unknown outcomes into unsupported-arrangement success.

## Verification design

- Fake Trello HTTP server under the crew scratch root; test-only injected transport maps fixed production URLs to loopback, records request method/path/query/header, and has **no live-fetch fallback**. Production has no endpoint override. A second fake external server confirms zero link/redirect requests and zero credentials. Shut down both in finally.
- Attachment matrices: allowlisted/disallowed boards; forged card/attachment; empty/100+ metadata; object/singleton-array documented singular shape; malformed previews/bytes; uploaded original/preview; no scaled preview; safe and hostile URLs; read-only operation; 401/403/404/429; shared request/time budget; declared/chunked oversize; MIME/signature mismatch; non-image opt-in; links; redirect; cancellation/revocation; partial cleanup; ACL/symlink/reparse/traversal/collision and secret sentinel output checks.
- UI composition with the actual declaration/renderer/actions and fake owner/provider/SSH: all nine rows in the table, async Saving/duplicate guards, one account row, zero-board All ready without CLI grants, hover Remove, non-Trello default preservation, both tab states/search/selections/Cancel, conditional divider, unsupported versus transient error, and stale machine replies.
- Extend existing installed CLI help/runtime fixtures so the new helper is packaged and screenshot instructions work without source. Use the existing disposable native Trello Settings fixture for matched before/after states, including saving, account hover, zero boards, both picker tabs and injected elevated pc2-like refusal. No real account/board in any test.
- Store all pictures and scratch at `C:/Users/tprokopiev/.crew/tasks/trello-plugin-improvements/`; references to the original screenshots stay private there. Compare native pixels and inspect errors; mock trees alone do not prove UI appearance. Stop every started desktop, isolated Core, HTTP/bridge server and worker before the implementation report. At this planning stop, no native instance or fake server is needed and no after screenshot exists.

## Risks / Trade-offs

- Provider documentation is inconsistent → explicit narrow normalization and fake fixtures grounded in Object Definitions; disclose that no real private attachment was tested.
- Provider may redirect a binary route → refuse safely, document it, never leak credentials to preserve convenience.
- Card may move between requests → existing repeated scope/authority checks and documented non-atomic limitation; no stronger security guarantee is claimed.
- MIME/signature checks do not make downloaded files trustworthy → inert private output only, no execution/opener, read untrusted data explicitly.
- Shared UI changes can regress other plugins → generic opt-ins/default preservation and synthetic-plugin tests, no Git/update edits.
- Secure refusal does not make the current elevated connection remotely configurable → truthful local/non-elevated setup alternatives; credential transfer is explicitly deferred, not implied.

## Migration Plan

No credential or policy migration. Implement and tick the four outcomes sequentially after approval. Update docs/offline help and packaging for new helper files through existing plugin discovery. Recheck current PR collisions and default-branch changes before editing; normal guarded build/deploy is a later explicit operation. Existing stored credentials, grants, names and Access receipts remain untouched. Rollback removes attachment commands and UI polish through ordinary owned runtime rollback, leaving private setup and deliberately downloaded private files intact.
