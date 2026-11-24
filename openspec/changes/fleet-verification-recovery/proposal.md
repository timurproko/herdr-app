# Proposal

## Why

A reported fleet-detachment incident recovered before inspection, and verification failures currently lose their reason. Make future failures diagnosable and transient first-read failures recover without user interaction, without claiming that the original incident's cause is known.

## What Changes

- Record sanitized verification outcomes, including discarded replies, with time and generation in bounded runtime-only provider diagnostics and a deduplicated bounded customization log.
- Reuse the existing Git verification presentation/tooltip to expose the last relevant failure, without adding a new control, panel or notification.
- Add coalesced one-shot recovery retries after 2 seconds, 5 seconds, 15 seconds and then 60 seconds between failed attempts, independent of another lifecycle event. Stop the recovery chain on success, disablement or authoritative absence.
- Cover startup, update/mod replacement, timeouts, obsolete replies and automatic recovery through the actual packaged Settings/Spaces/Crew instances.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: amend fleet refresh/discovery contracts to permit bounded failure recovery, retain sanitized diagnostic facts, and expose failures through existing verification feedback without granting action authority.

## Impact

Crew's provider and status transport, the generic task-context diagnostic projection, the existing Git verification tooltip, a narrow supported file-write API export for a customization-owned log, packaged regression fixtures, and relevant README/architecture/testing documentation. No dependency, native binary, Crew record, credential, running installation or portable-preference changes. The existing healthy refresh cadence, read timeouts, shared lease and exact identity guards remain intact.
