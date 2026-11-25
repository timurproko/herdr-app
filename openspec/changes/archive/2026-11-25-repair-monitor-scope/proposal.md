# Proposal

## Why

The Core companion can report ready while monitoring no repositories: its allowlist incorrectly comes from invalidatable webhook-notice membership rather than the durable confirmed added list. Silent suppression also makes an empty scope, an unselected agent state and a still-running workflow difficult to distinguish from successful monitoring.

## What Changes

- Derive monitor repositories exclusively from the durable added list for the current relay and GitHub account; retain empty scope on missing or mismatched selection, without legacy fallback.
- Propagate that scope through existing startup, Add/Remove, Configure, credential/relay/account changes and restart paths, including the actual worker configuration and explicit management CLI.
- Report enabled empty or wholly skipped monitoring distinctly from healthy-ready, with a small bounded local sent/suppressed diagnostic journal carrying repository, PR, terminal and sanitized reason where known.
- Correct touched CI/webhook documentation to describe independent companion delivery, current messages and ownership, diagnostic meaning and update activation.
- Preserve saved state selection, completed-workflow evidence, current templates, non-forced `hc send`, ownership and receipt semantics; add no toast, panel UI, early per-job alert or coordinator routing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Specify durable account/relay-scoped monitor selection, lifecycle propagation and bounded truthful monitoring diagnostics under the existing explicit automation authority boundary.

## Impact

Git plugin scope/configuration and lifecycle helpers, companion engine/runner/status reporting, and explicit monitor management tooling. Focused synthetic settings, installer and delivery regressions will cover cache invalidation, scope mismatch, last removal, restart, on-disk config and exactly-once unchanged CI/conflict evidence. Update `docs/GIT-CI-FIX.md`, `docs/GIT-WEBHOOKS.md` and relevant companion guidance. No native changes, credentials, live app/settings/monitor-state writes or real agent sends are authorized by this work.
