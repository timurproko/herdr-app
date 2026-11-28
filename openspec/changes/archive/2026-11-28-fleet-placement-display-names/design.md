# Design

## Context

See proposal.md for motivation. Read-only evidence was captured outside the checkout in the Crew task folder. Installed Crew is 6c415ab3 (PR 28). Fleet status identifies a live coordinator and an internal repair with project crew:self. Its live labels supply version 1, per-project mode, project crew:self, name core and the canonical home-qualified internal self space ID. Crew's worker-spaces contract expressly separates this display name from identity.

The exact fleet provider source at both 340fe83 and bc8d989 rejects this snapshot. Replaying observed status/labels against a synthetic native membership model reproduces locally and with pc2 qualification. Omitting the repair or changing only its in-memory name to crew restores binding; nothing live was changed. The provider was unchanged between those app versions. PR 28 changed fresh internal repair naming from literal crew to the source repository basename. The existence of two project children is already supported; their new name exposes the compatibility gap.

Current placement() requires name===project for registered children and name===crew for internal children. bindFleet() returns null for any invalid live worker, so one valid-but-unrecognized caption invalidates the entire home. pullContext() treats that witnessed null binding as a completed negative and permits ordinary folder Git. The coordinator's directory is not a repository. PR 103's blank controls merely render the resulting independent rows; plugin context capture and PRs 105–108 did not change this matcher.

## Goals / Non-Goals

**Goals:** Correct the producer/consumer compatibility gap at the existing Crew boundary, cover the binding-to-presentation route and preserve fail-closed operational identity.

**Non-Goals:** Do not change Crew, ignore a genuinely contradictory worker, special-case the literal core caption, alter native documents or labels, probe coordinator Git as a fallback, change scheduling, or mask worker root errors.

## Decisions

1. Validate placement identity using supported version/mode, authoritative status task project, home/task labels, canonical automatic ID and exact live same-machine native membership. Validate the saved name independently as a nonempty basename of at most 4096 characters, excluding dot/dot-dot, control characters, slash and backslash, matching Crew's documented predicate. Continue requiring consistent metadata for one child. Retain legacy captions, dotted/cased names and the existing crew:self-to-crew shared-placement exception. Rejecting safe display spelling as ownership evidence is the bug; accepting arbitrary labels without membership is not an alternative.
2. Apply the same name predicate in live placement and durable identity restoration, retaining existing record bounds, schema and current-runtime witnessed authority. Ensure dependency and display restoration paths do not reintroduce name===project assumptions. Projected headings already consume verified child names and preserve explicit native user renames; reuse that path rather than adding a renderer special case.
3. Extend existing project-space/provider/Git fixtures with sanitized equivalents of the observed mixed home. Cover ordinary project plus self/core, shared crew placement with a differing safe name, alias/case/dot names, legacy combined and old crew captions, local/pc2 qualification, reload and toggles. Assert two registry children and coordinator task-PR context without a coordinator root probe. Keep wrong project/home/task/ID, unsafe/conflicting name, duplicate pane and cross-machine refusals.
4. Recheck the reported worker root error separately through the existing git rev-parse execution path and its exit/timeout facts. A direct local Core call in the task checkout succeeded (exit 0, 480 ms); this does not reproduce the person's app-to-pc2 route or prove that its intermittent failure is fixed. No Git error behavior changes are authorized by that success. If the failure persists independently after binding repair, report the captured transport failure and request a separate scoped fix rather than broadening this compatibility patch speculatively.

## Risks / Trade-offs

- Safe captions are not ownership proof → leave all authoritative identity and native membership checks intact.
- A live-only fix could fail again on reload → exercise durable decoding and first-frame remembered projection with the same names.
- Raw home/status inventories are private → commit only sanitized minimal fixtures; keep observed evidence in the allowed task folder.
- The worker notice may be an independent transport issue → report it unresolved unless its exact failure is reproduced; never equate successful local Git with remote app validation.

## Migration Plan

No data migration, setting reset, worker relaunch or label repair. After approval, publish through the normal branch/draft-PR path with targeted tests only. Do not deploy or restart the person's app. Rollback is a source revert; it restores the known limitation for repository-named per-project children.
