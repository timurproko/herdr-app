# Design

## Context

See proposal.md for motivation. `src/plugins/crew/plugin.js` currently returns `recommended` with `UPDATE_CREW` when both installed and latest revisions exist and differ. `plugins-ui.js` counts non-recommended failures as `N to fix`; `settings-kit.js` colours those with `t.blocked`. Requirement rows currently use the status's default label, whereas section rows already support `statusLabel`. Coordinator preparation probes without an update lookup and has explicit availability/ownership guards, not a general checklist gate.

## Goals / Non-Goals

**Goals:** Reuse the machine-scoped requirement result, shared badge and summary; distinguish an installed-but-outdated tool from a missing installation.

**Non-Goals:** No new visual style, new navigation notification infrastructure, background updater, extra action-time update probe or outdated-version launch/project gate.

## Decisions

- Use the existing `missing` attention classification with `statusLabel: 'Update needed'`. Unlike the default `Missing`, this wording truthfully describes an installed tool. Honour the label through the generic row renderer, not a Crew-specific renderer branch; keep ordinary rows' existing defaults and ensure the label fits at 130% without widening the shared status rail.
- Retain the existing Update action and installed version/revision detail. Reuse the existing update-evidence predicate; absent latest or installed revision is not evidence of outdatedness.
- Let existing non-optional summary/indicator consumers use the changed classification. Check card and navigation consumers, and change only existing unmet-requirement surfaces; do not invent an indicator where none exists.
- Choose a clear requirement notice, not an action block. Coordinator launch does not currently gate on update revision, and project actions rely on Crew's own refusals. Preserve both policies and existing guard messages, rather than treating every `missing` checklist result as a new launch refusal.
- Cover local/remote evidence, unchanged optional tools and current/unknown/failed update checks in focused tests; update the assertion that pins `recommended` for an available update.

## Risks / Trade-offs

- A person can still proceed with an older tool → the prominent unmet notice addresses visibility, while Crew retains authority over incompatible operations.
- The custom label must fit the fixed badge column → inspect the actual native disposable UI at 130% and keep shared geometry intact.
- A simulated outdated installation does not prove real remote update transport → pair native presentation evidence with machine-routed unit regressions; do not update real installations.

## Validation and delivery

After approval, implement one outcome and run quick targeted checks. Capture one 130% screenshot from a disposable instance with simulated outdated Crew to `C:/Users/tprokopiev/.crew/tasks/crew-update-required/`, then stop that instance before reporting. Read hosted required-check results on the final implementation head; never mark the PR ready or merge it. No screenshot or implementation check is claimed at this planning handoff.
