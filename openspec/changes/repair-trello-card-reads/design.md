# Design

## Context

See `proposal.md` for motivation and the investigation limitation. This is a source-present, planning-only change; the installed runtime and credentials named in the brief are absent from this environment's default locations.

`operations.cjs` first proves card membership through board-scoped card pages, then requests card facts, comments, checklists and attachments. `attachments.cjs` uses `fields=all&filter=all`; the public Cards schema documents attachment filter default `false` and special value `cover`. `download.cjs` instead reads singular attachment metadata and downloads the validated Trello URL with an OAuth header. Fixing the listing query alone cannot be assumed to repair that separate path.

`client.cjs` already has 20-second per-request and 60-second client budgets, sequential reads and no retries. Its error path cancels the response body and maps status to a code, discarding the status/reason. Its request timer is created after synchronous authority checks begin. `policy.cjs` re-reads protected files for each check, and Windows ACL checks spawn synchronous subprocesses with individual 10-second limits. These are plausible contributors to elapsed time, not reproduced causes of the reported hang.

## Goals / Non-Goals

**Goals:** Keep membership proofs, authority rechecks, image protections, cooldown and stable JSON error codes intact while making remote failures actionable and actually bounded. Separate confirmed observations from hypotheses throughout the handoff.

**Non-Goals:** New read commands, relaxed allowlists, write permissions, token rotation, arbitrary URL access, redirects, retries, native changes, production installation or credential discovery/copying. Tests remain offline with fake credentials. The already-authorized live card check is a separate manual diagnostic, not a test-suite dependency.

## Decisions

### 1. Diagnose the existing execution host before changing authorization

After plan approval, obtain the intended machine or explicit installed home from the coordinator because default locations are absent. Reproduce only the board/card from the brief using existing protected setup. Capture method, typed route and non-auth query keys separately from authentication; never print request URLs or secrets. Record the first failing HTTP status and recognized short reason for card detail, attachment collection and singular/download paths. Compare a minimal documented card request against the current nested options only when needed to isolate a rejection.

Use strict fake-provider fixtures to pin the observed accepted query contract. Prefer omitting unnecessary nested options and the collection attachment filter rather than guessing alternate values. Preserve `fields`, returned identities, parent proof and structured result shapes. Do not request write/account scope merely because a read failed. A real permission refusal remains a refusal, with owner guidance rather than automatic reauthorization.

**Alternative rejected:** Assume every REMOTE means insufficient scope, or apply the attachment-list suspicion to all three failures without evidence.

### 2. Centralize safe HTTP diagnostics at the transport/public-error boundary

Extend `TrelloError` and `publicError` with validated `httpStatus` and `httpReason` for HTTP rejections. Populate the reason from fixed HTTP status phrases, optionally refined by a finite mapping of recognized Trello error strings/categories such as invalid filter/field, invalid token, or access denied. Unknown text uses the fixed status phrase. Never trust `statusText` or pass a raw body fragment through redaction.

Read at most a small fixed error prefix (target 4 KiB) under the same request deadline; do not let diagnostic parsing replace an already-observed HTTP rejection with an opaque parse error. Oversized, binary, malformed, secret-bearing or unrecognized bodies retain the status and safe fallback. The error's human-readable message also identifies the HTTP status/reason. Keep RATE_LIMIT/retryAt behavior, AUTH/FORBIDDEN/NOT_FOUND classification and uncertain-write outcomes; adding diagnostics does not reinterpret write acceptance.

**Alternative rejected:** Truncate and echo provider text. Even a short body can contain the complete token or an authenticated URL; a denylist-only redactor is insufficient.

### 3. Establish deadlines before blocking preflight and keep all remote phases inside them

Use one monotonic data-command deadline beginning before initial authority acquisition, and request deadlines bounded by the lesser of 20 seconds or remaining command time. Arm the remote race before dispatch work and include error-body consumption and cancellation. Abort on expiry, stop follow-ups and preserve failed-download cleanup. A rejection body that cannot be read promptly must still yield the known HTTP status with a fixed safe reason.

Measure slow private-store checks with injected timing/permission adapters. Propagate remaining deadlines to blocking ACL subprocesses if needed, checking the budget before and after each check; cap their timeout by remaining budget rather than allowing repeated fresh 10-second windows. Do not bypass ownership checks or cache stale authority to meet timing. Scope this propagation to the Trello data-command path, preserving standalone setup behavior. Account for event-loop scheduling tolerance in elapsed-time assertions and report the actual tested boundary.

**Alternative rejected:** Merely shorten fetch's timer. It cannot bound synchronous work that runs before the timer exists or repeated checks outside the remote race.

### 4. Test only the affected seams

Use existing fake-store/transport facilities and loopback provider fixtures with `TRELLO_TEST_ROOT` set to the crew task folder. Cover accepted card/attachment queries, original-image retrieval, 400/401/403/404/429/5xx details, hostile reason/body material, stalled headers and bodies, never-finishing cancellation, shared command-budget exhaustion and slow permission checks. Exercise CLI JSON serialization as well as the client, and retain read-only scope, signature, origin and no-partial-output checks. Update installed help and `docs/TRELLO.md` for safe fields and timeout behavior.

Only targeted files run locally; no broad suite or CI polling. The brief's manual card/image proof can run only once the intended installed host is available, without modifying its credential/policy stores or installing outside the allowed checkout.

## Risks / Trade-offs

- [Live environment absent] → Report the explicit blocker; no claim that live root cause or token scope is proved. Obtain the intended execution host/home instead of searching for credentials.
- [Public schema lacks strict attachment-filter enum] → Treat `filter=all` as a suspect until a real rejection or accepted minimal comparison confirms it.
- [Provider error formats evolve] → Unknown reasons retain numeric status and a standard phrase; never widen the raw-text surface.
- [Synchronous ACL work delays timers] → Bound each subprocess by remaining budget and check the clock at each boundary, without relaxing fail-closed permission requirements.
- [Shared error transport affects owner/write callers] → Keep existing codes/outcomes and run only relevant diagnostic/write tests if those shared paths change.
- [Local output/transport race] → Abort remote work on timeout, preserve authority rechecks and publish no file from expired work.

## Migration Plan

No private-store schema migration or credential changes. Implementation will use the existing build/publication path and a draft PR; installed runtime replacement remains a normal guarded deployment after approval outside this task's plan-only phase. Roll back code through the same source/deployment mechanism, preserving all credentials, policy and unrelated installed files.
