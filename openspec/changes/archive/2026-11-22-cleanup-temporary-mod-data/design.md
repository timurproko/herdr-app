# Design

## Context

See proposal.md for motivation. `tools/temporary-mod.mjs` currently installs only the canonical host facade; it owns no cleanup. Most preview/native scripts instead copy a packaged mod and remove its directory in `finally`. Some copy before entering `try`; some cleanup blocks query/close overlays before removing files, so a host error can bypass removal. Inspection/enrollment tools also use source-content ownership checks that must remain protective.

## Goals / Non-Goals

**Goals:** One small shared exact-name cleanup primitive; minimal caller edits; disposal on completion, setup failure and existing handled interruption paths; fixture-only evidence.

**Non-Goals:** Historical orphan sweeping, real-home inspection/removal, native UI execution, native/Core changes or restructuring scripts into a new runner.

## Decisions

- Capture a validated direct-child temporary mod name and selected home when an invocation claims its temporary directory. Refuse existing mod directories before claiming ownership; preserve existing ownership/conflict guards. Never infer authorization from a `custom-*` pattern alone.
- Expose idempotent cleanup in the existing helper, removing only that invocation's `mods/name` and `data/name`. Remove data even if the mod directory was already cleaned up; do not touch installed/stock siblings. Keep filesystem cleanup in an inner `finally` so overlay/status failures cannot bypass it. Register narrowly scoped exit/signal cleanup only where needed to cover existing interruption removal, and release handlers after disposal.
- Route hand-rolled feature fixtures and preview/inspect/retry/enrollment tools through that primitive without changing their UI/test logic. Place directory creation/copy inside the protected lifetime to include partial setup failures. Prefer shared cleanup over duplicating paired `rmSync` calls across scripts.
- Extend `tests/temporary-mod.test.mjs` with disposable homes and synthetic mod/data directories. Assert success and thrown-error disposal, already-removed mod disposal, repeated cleanup, refusal/preservation of pre-existing mods and untouched unrelated data. Where signal cleanup is introduced, exercise it in a child process without invoking Herdr.
- The reported `custom-feedback-preview` and `custom-tmp-open-plugins` literal creators are absent from tracked files and the searched history. Follow indirect/generated names in available source during caller conversion; fix any creator found and report unavailable provenance honestly, without creating a cleanup sweep.

## Risks / Trade-offs

- [A status/overlay command fails during cleanup] → Run filesystem disposal independently in nested `finally` blocks.
- [A reused fixed name points at installed state] → Claim only absent temporary mod directories and retain conflict/ownership guards; no pattern-based deletion.
- [Hard termination cannot run JavaScript cleanup] → Do not claim recovery for SIGKILL, power loss or other uncatchable termination; cover handled exits/interruption only.
- [Herdr writes data after removal] → Keep the caller's existing overlay-close ordering before disposal; fixture evidence does not claim live-host timing validation.

## Migration Plan

Source-only tooling fix; no installed-state migration. Historical leftover folders, including the reported feedback preview, remain untouched. Reverting the change restores the previous tooling behavior without runtime migration.
