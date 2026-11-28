# Design

## Context

See `proposal.md` for motivation. `main.js` already marks render attempts, distinguishes caught exceptions from uncatchable QuickJS aborts, and schedules at most one 64ms recovery. This is recovery evidence, not identification of the recurring trigger. `docs/GIT-RENDER-BUDGET.md` records successful four-PR background stress at 100%/130%; its forced infinite-loop fixture proves only recovery. Repeating either alone cannot establish the reported root cause.

Warm activity is currently conditionally mounted by both panel render paths. `loadingLine()` immediately builds a coloured full-size child and `breathe()` applies static 0.35 opacity plus a native 0.25–0.65 loop. Conditional removal has no exit phase. The first native painted frame and loop attachment behavior need explicit observation; source alone does not prove why the line flashes.

Existing shared `reveal()` uses 140ms native opacity transitions, and `status-reveal.js` retains exiting native elements. These are the presentation references, not a reason to introduce new UI. The current loading requirement explicitly says nonzero minimum and no vanishing, so the delta intentionally changes the line only; the cold dot stays unchanged.

## Goals / Non-Goals

**Goals:** Identify a repeatable customization-level interrupted-render trigger; remove that trigger while retaining the host's genuine error reporting. Smooth the line's first frame, breathing and exit using native opacity and existing patterns. Keep coherent publication and all established read/action guards.

**Non-Goals:** Native binary, watchdog, SDK or installed-home changes; hiding banners; unlimited retry; new notices/buttons/options; virtualization; changing list caps, request cadence, authentication or worker focus behavior. No full local suite.

## Decisions

### 1. Require a natural reproduction before selecting the interrupt fix

Extend the existing disposable `git-loading-native.mjs` stress harness around actual `Changes.render()`/`renderPanel()` and the already-present component markers. Exercise routine local-context, verification, webhook and checks transitions with realistic unrelated native terminals/spaces and the revealed row batch. Record exact source/host version, component, native error logs and frames around failure. Use bounded fixture-only timing/phase counters to locate synchronous work, reentrant effects or native builder misuse. Do not log private task inventories or credentials.

The implementation must first obtain a failing pre-fix replay and then patch the responsible customization path. If the trigger is excessive synchronous presentation/controller work, move/reuse only pure derivation or yield side effects outside render; fresh action-time authority remains mandatory. If the evidence instead identifies a different local fault, fix that fault directly and encode the reproducing fixture. Existing row, native-element and measured budgets remain independent guards. Do not choose blanket caching or extra retries in advance. If faithful reproduction requires missing live evidence or points to a native-only defect, report the blocker rather than claim success or patch the host.

### 2. Separate activity admission from native visibility lifetime

Retain one stable, non-layout-affecting line presentation per active context. Initialize opacity at zero, use native ease-in/out opacity for the envelope, and make the line's 2400ms pulse start at zero rather than sharing the cold dot's nonzero minimum. Follow the existing roughly 140ms reveal/retirement timing. An idle mounted transparent track or the existing retained-exit pattern avoids sudden conditional first/last frames; select the smallest supported form after checking the installed public SDK/native reference. No JS frame loop, per-frame notify or recreated animation identity on routine rerenders.

Only finite lifecycle callbacks may retire an exit if required by the existing pattern. Capture context/enable generation so a stale exit cannot remove a new request; overlapping work and work during exit reuse the current presentation smoothly. Hide, disable and identity change retire it immediately. Reduced motion keeps static 0.35 feedback with no pulse or animated envelope. Short work still fades without a full-opacity flash. The line stays full-width, stationary, accent-coloured and 1px below the header; list geometry and cold Loading are untouched.

### 3. Test causes and lifecycle, not just absence of banner text

Add deterministic regression for the actual interrupt replay, plus line initial/pending/complete/failure/overlap/resume/retirement/reduced-motion states. Retain existing recovery tests and frozen row/probe budgets; do not loosen them. Run only implicated tests such as `git-render-recovery`, `git-background-render`, `git-loading-line` and `git-row-render-budget`, adding publication tests only if the diagnosed path touches publication.

Use a disposable checksum-verified supported Herdr executable for native before/after proof at 100%/130%. Sample entrance and exit, not just established pulse phases. Inspect pixels and app logs because `status.errors` omits some last-frame banners. No injected infinite loop is acceptable as the root-cause reproduction. Store proof/scratch exclusively in the crew task folder, stop every owned app/Core/server in finally, and verify cleanup before report. Report whether the two bugs share a cause, only as far as evidence establishes.

## Risks / Trade-offs

- [Reported trigger is absent from synthetic fixtures] → Include real-shaped topology and actual controller transitions; obtain narrowly scoped read-only evidence if needed, and state unresolved limitations instead of treating prior successful stress as proof.
- [Native loop ignores initial opacity or restarts on rerender] → Verify the first painted frame and stable-ID behavior with native captures before committing the animation mechanism; retain a separate envelope if needed.
- [Exit callback races new work or a context switch] → Use captured presentation identity/generation and deterministic overlap/resume/retirement tests.
- [Optimization weakens authority or returns cached callback trees] → Cache only pure presentation facts within existing boundaries and keep action-time identity revalidation and fresh native elements.

## Migration Plan

No preference or data migration. After approval, publish the source fix through the normal draft PR path; installation remains the normal guarded customization deployment after maintainer delivery. Rollback reverts the customization commit without editing native or runtime state. This plan does not authorize production deployment.
