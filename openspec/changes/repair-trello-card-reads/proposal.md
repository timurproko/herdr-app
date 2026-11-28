# Proposal

## Why

Agents report that board/card listing works but card detail and attachment reads fail with an opaque REMOTE error, sometimes taking over two minutes. The transport currently discards HTTP status and rejection details, preventing an agent from distinguishing a malformed request from denied token access.

## What Changes

- Restore scoped card detail, attachment metadata and uploaded-image reads using Trello's accepted query parameters and existing read-only credentials, without widening board grants or token scope by assumption.
- Add bounded, secret-free HTTP status and short rejection reasons to remote-read errors while preserving stable error codes and uncertain-write semantics.
- Keep remote reads within the documented 20-second request and 60-second command budgets, covering dispatch, response consumption and cancellation; investigate synchronous private-store checks that may delay those timers.
- Add strict fake-provider regressions for card/image reads, rejected queries, scope/authentication distinctions, stalled responses and hostile error text; update offline guidance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `trello-agent-access`: Clarify actionable remote-read diagnostics and enforce bounded failure of the existing scoped card/attachment read catalog.

## Impact

- Canonical implementation: `src/plugins/trello/{operations,attachments,download,client,errors,help}.cjs`; private-store checks only if needed to honor existing deadlines without weakening ACL verification.
- Targeted regression files under `src/plugins/trello/`, plus CLI contract tests and `docs/TRELLO.md` as applicable. No new dependency, write command, native change, credential provisioning or production deployment is proposed.
- Approval clarification: pc2 has no Trello setup and cannot reach the person's main machine. Implementation uses schema-backed fakes only, without further launcher/credential searches or copies; the person will verify the supplied live card/image after merge.
- A public Trello schema read confirms attachment listing documents `filter=false` by default and `cover`, while current source sends `filter=all`. This is a request-construction suspect, not a confirmed live root cause; singular attachment download follows a different path and must be diagnosed independently.
- Existing fake-provider reads pass, and an injected HTTP 400 reproduces the loss of status/reason. Existing timeout injection returns promptly, so the reported multi-minute delay remains unconfirmed.
