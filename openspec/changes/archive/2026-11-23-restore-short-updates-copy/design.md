# Design

## Context

See `proposal.md` for motivation and the delta specification for the exact paragraph. Git history at `5f40e05^:src/features/settings/main.js`, line 912, supplies its wording and punctuation. Although the design was initially omitted as optional for this literal-copy restoration, Delivery automation requires a complete artifact set before finalization.

## Goals / Non-Goals

**Goals:** Restore only the explanatory string and protect its complete text with an equality assertion.

**Non-Goals:** Change row titles, controls, timing, relay behavior, deployment or native files.

## Decisions

- Restore the historic string in place, rather than introduce a new copy helper or alter layout; this keeps the change limited to presentation text.
- Assert complete string equality instead of individual phrases, so punctuation changes and appended cadence/relay details fail the regression.
- Correct maintained documentation's description of the paragraph while preserving detailed cadence guidance. Keep archived changes as historical records and synchronize the current requirement through the delta during automated finalization.

## Risks / Trade-offs

- [The restored short paragraph omits Custom's distinct cadence] → Preserve detailed cadence documentation and leave all updater scheduling untouched, as requested.
- [Copy-only fixtures do not prove native pixels] → Report source/fixture coverage accurately; no deployment or live UI validation is performed.
