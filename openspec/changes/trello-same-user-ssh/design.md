# Design

## Context

See `proposal.md` for motivation and the spec delta for the product contract. The person selected the narrow form of the scout's option C (called option A in the follow-up): keep executing the fixed setup worker as the direct-SSH login, and permit Windows elevation only for the proven intended Core user. This is explicit acceptance of elevated setup execution, not a privilege drop or credential sandbox.

The current `trello-bootstrap.cjs` refuses the SSH token's administrator status before `hello` and READY. It already checks the owner SID of `%LOCALAPPDATA%/herdr-core/<session>/core.json`; however, that file alone does not prove the running Core token, profile or resolved Herdr home. `permission-launcher.cjs` demonstrates a separate public `hc exec` probe of the actual Core token. The worker must use that idea read-only, not invoke its permission-changing paths.

`credentials.cjs` already sets current-user ownership and a protected DACL before private-file content writes, and rejects wrong owners or ordinary-user grants. Its actual elevated-create behavior needs real-storage verification; string assertions and `{security:()=>{}}` lifecycle fixtures are insufficient. The Trello-only installer and launcher writer currently create many non-secret files through ordinary filesystem operations, so user ownership must also be addressed there, including new directories, locks, records, journals and atomic replacements.

### Prior feasibility result retained

On the installed Core/CLI 0.1.19, a public-marker test held `hc exec -i` stdin open for 1,600 ms: no receiver started/READY arrived until EOF; output arrived at 2,116 ms. A second receiver wrote READY, waited 1,606 ms and exited; both frames arrived together at 2,189 ms. The installed schema and upstream v0.1.19 source show a single base64 input and completed result. Thus Core exec cannot replace the existing bidirectional secret handoff. These tests used no credentials and did not establish pc2 identity/elevation or a no-log guarantee. Evidence remains in the crew task folder, not the repository.

The new approach does not require streaming through Core: Core carries only fixed public identity probes, while SSH retains the existing READY/secret/result framing.

## Goals / Non-Goals

**Goals:** preserve the single fixed bootstrap, current binding format where possible, per-request validation and non-secret UI facts; permit both existing normal-user SSH and the narrowly verified elevated Windows case across every supported operation.

**Non-Goals:** no Core-mediated secret transport; no generic remote command interface; no privilege switch, scheduled task, UAC/SSH change, Core start/restart or added user consent UI; no account copying, auto-retry, blanket ACL repair or deployment to live machines.

## Decisions

### 1. Prove the actual selected execution identity before READY

Keep the captured machine catalog resolution, direct target validation, named session and Core ID checks. On Windows, replace the blanket SSH-administrator refusal with a bounded proof:

1. Resolve and validate the SSH user's SID, OS profile and Herdr home. Verify the selected session metadata is an ordinary safe file at the expected profile location, owned by that SID; reject reparse/ambiguous or unsafe metadata rather than trusting an arbitrary same-name file.
2. Reach only the already-running selected session with a sanitized child environment. Check availability without auto-starting it. Obtain the existing generation-1 hello and verify the pinned Core ID.
3. Run one fixed, credential-free probe through that selected session's Core execution API. Return bounded public facts only: actual user SID, profile/home, resolved `HERDR_APP_HOME`/default home and elevation. Decode the documented result format explicitly; do not infer the Core token from the SSH token or file ownership alone. Unix retains non-root execution/ownership checks and must not acquire a root exception.
4. Require matching identity/profile/resolved home and a normal-user Core. Resolve launcher bin against this same verified profile, and retain existing PATH/ownership checks. A different SSH/Core environment must not silently select another store or bin. Pin the session and check Core identity before and after public proof to reject a restart/change during inspection.
5. Emit READY with the captured principal/home binding only after the proof, path/runtime probing and deadline checks pass. Keep local catalog revalidation before stdin payload dispatch and final result publication. Revalidate the captured destination/proof before processing the received action and at existing commit guards; a detected post-dispatch change yields stale/unknown semantics, never a retargeted write.

Public `hc exec` probes do not contain keys/tokens. No secret moves through Core RPC input, a probe argument/environment value or an intermediate file. If the selected Core cannot be proved without implicitly starting it, refuse; do not work around this with another session or a permissive fallback.

This cannot provide an atomic OS identity lock against an administrator or every concurrent Core lifecycle change. It preserves pinned checks and fails on detected changes; the trusted host administrator remains able to inspect/control the process.

### 2. Preserve the SSH secret boundary for all actions

Reuse `trello-transport.cjs` and its strict SSH options, fixed compressed public bootstrap, command-size cap, single-request frames, finite lifetime and result redaction. Do not merely delete the exit-31 branch. Distinguish root/unsafe execution, different user, unverifiable Core/home, unavailable session and changed identity with sanitized allowlisted categories. Keep refusal before secret dispatch where proof fails, and unknown-outcome reconciliation after a potentially committed write.

Exercise runtime probe/install/update, saved status, save, verify, remove, discover, board add/remove and `control` via the same proven route. Global Access fan-out must use this route too; each host retains explicit acknowledgement and Pending/Retry, never durable replay of a grant. Normal opening still reads stored names only; explicit Check performs provider verification.

### 3. Make elevated output deliberately user-owned

Reuse the canonical Windows security logic rather than maintaining independent ACL scripts. Any necessary extraction must keep bootstrap packaging self-contained and the public command within its limit. Derive ownership from the verified current SID, never Administrators, a name string supplied by the UI or an arbitrary target SID.

For private files/directories, apply and verify the owner and protected DACL before writing content, including locks and `.write-*`, and verify again after rename. Check inheritance protection explicitly for newly created output; preserve the PS7 environment sanitation and existing SYSTEM/Administrators trust limitation. Existing wrong-owner, overbroad, linked or unverifiable storage is still a refusal, not an invitation to repair it automatically.

For Trello-owned installer/runtime/launcher output, handle newly created directories, staging/replacement files, installation/ownership records, backups and locks as well as final scripts. Preserve exact-byte content hashes, conflict detection and rollback. Set verified user ownership and protected access for newly written Trello output; do not recursively change shared runtime/bin ancestors, adopt unknown files, alter unrelated deployment output or broaden private ACLs to make a test pass. Where a safe owned update is impossible, refuse with the existing conflict/permission pattern.

### 4. Keep the card minimal

Existing Requirements prerequisites supply Install/Update, masked API key/token and Save or the account row; existing Boards and Access remain unchanged. There is no elevated-specific confirmation, badge, help button, setting or informational success message. Reuse the renderer's single unsupported-host explanation for real refusals and hide unusable dependent controls.

Copy names Herdr's actual check and next action, for example: connect as the user running the selected Core; use a normal-user Core through the existing Core settings workflow if supported; reconnect/recheck a changed/unavailable session; or correct unsafe setup permissions/paths. Do not claim a Trello-provider refusal or offer Install/credential entry as a repair for an unsafe identity. Do not automatically relaunch Core.

### 5. Prove permissions on real disposable storage

Add a focused Windows fixture with real filesystem ACL calls (no injected security success). It must record the writer/reader SIDs and token elevation and cover elevated same-SID writes followed by non-elevated installed CLI/owner reads on the same disposable home/bin. Use only fake credentials and injected provider data; pass no fake or real credentials in argv/env or handoff input files.

The fixture checks SID ownership (explicitly not Administrators), inheritance protection and allowed ACEs on private directories/final files and instrumented transaction paths; it also checks installed runtime, launchers and owned metadata after Install and Update. Run account/board/access changes and removal, not just a one-off file write. Include ACL tampering, wrong-owner/reparse and failed-tooling refusals. Use already available explicitly authorized Windows test contexts or explicit two-context fixture invocations; do not auto-elevate the agent, register a scheduled task or start/reconfigure a live Core to obtain tokens. If actual elevated/filtered contexts cannot be obtained safely, report missing proof as a blocker rather than count a mocked or skipped run as success.

Only targeted suites are needed: bootstrap/remote/shell, credentials/installed setup, remote Settings, unavailable handling and global access. Native card evidence, if needed, uses fake fixtures and disposable instances with output in the crew task folder and shutdown receipts. No full suite or real SSH/Trello calls.

## Risks / Trade-offs

- Elevated setup has more OS authority than necessary → explicitly accepted for the same-user Windows case only; retain all remaining guards and document that administrators can bypass filesystem privacy.
- Metadata ownership alone can misidentify actual execution → independent normal-Core SID/profile/home/token proof, same-session hello and fail-closed parsing/deadlines.
- Slow probes or races can consume the existing lifetime → one bounded public proof, shared hard deadline and revalidation; no extended unbounded sessions or automatic retries.
- ACL edits can affect unrelated files or break non-elevated readers → scope to safely owned Trello output, preserve conflict rules, real elevated-write/non-elevated-read evidence.
- Additional bootstrap/security code can exceed CMD limits → retain the existing command-size regression and deterministic packaging; do not trade away proof to fit.

## Migration Plan

No credential/control schema migration or automatic reconfiguration is planned. Existing valid normal-user setups remain valid; unknown or unsafe old files stay refused. Build/package normally only after approval; do not deploy during planning. Update README/Trello/transport guidance and the spec in the same PR. Rollback restores the previous customization through existing owned-file rollback; private stores/grants are preserved. Reverting code restores the earlier elevated-SSH refusal, not a Core or OS permission change.
