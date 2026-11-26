# Proposal

## Why

The person wants one worker-space policy for all coordinator homes, not a machine-specific copy of Crew's setting. Crew's merged command currently permits reads but refuses desktop writes, so the UI must distinguish global intent, observed per-home state and unavailable authority without bypassing ownership.

## What Changes

- Add one Crew-contributed standard row immediately below Connect fleet space to coordinator on Settings → Spaces, without touching Trello or the shared Plugins card renderer.
- Title: **Separate space per project**. Description: **Give each project its own space under the coordinator for new work; running agents stay where they are.** No per-machine wording.
- Store one global Herdr boolean intent: off means combined by default, on means per-project. Each known machine/home's real Crew mode is observed separately and brought into line only through a documented, authorized Crew interface.
- Keep offline targets pending; discover later homes and resume when machines become reachable using existing Crew transport/lifecycle, not a new service. Display concise existing-style machine badges for pending, unsupported, refused or failed targets; never imply global success from a subset.
- **Current-Crew fallback for approval:** show the row read-only with a short Crew-support/ownership reason. The current setter refuses the app even when no coordinator owns the home. Do not pretend active global synchronization is deliverable with that contract.
- Hand Crew an explicit dependency: a narrowly authorized, non-terminal desktop setter for worker-space mode that works with a live coordinator or an unowned home, preserves registry transactions and grants no orchestration authority. No identity spoofing, direct registry editing, start/end, terminal input or lock manipulation.
- Preserve the five delivered UX outcomes and both review repairs already implemented on this PR; their prior OpenSpec archive remains immutable.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: one Crew-contributed global Spaces row with existing toggle/badge style and honest read-only fallback.
- `plugin-integrations`: global worker-space intent, bounded known-home reconciliation and strict Crew authorization/availability semantics.

## Impact

Future implementation touches the Crew plugin's declaration/owned policy helper, a small generic registry contribution seam, the Spaces settings page and existing preference allowlists/lifecycle tests. It reuses the current hc/PowerShell machine transport and existing row/toggle/status components; no shared Plugins-card/Trello UI, native patch, installation or new transport.

This is a follow-up plan on PR 88 because the original change was already finalized. This plan does not reopen or modify that archive. Read-only inspection and fake-home ownership evidence are complete; no real Crew setting, owner or running terminal was changed. New setting implementation and off/on native screenshots wait for plan approval, with active writes additionally blocked on an explicit Crew authorization contract.
