# Design

## Context

See proposal.md for motivation. The shared renderer uses the same local scope string for known and unknown targets. Delivery finalization requires this artifact.

## Goals / Non-Goals

**Goals:** Preserve unknown-target wording while changing only known-target local prose.

**Non-Goals:** Any change to target selection, phase transitions, timing, layout or deployment.

## Decisions

Select the new local scope text only when the existing target is known. Changing the local scope literal unconditionally would also change `Updating.`, contrary to the approved scope. Keep peer-scope selection and sentence formatting intact.

## Risks / Trade-offs

- Accidental wording changes in other phases → Existing assertions retain unknown-target and peer-only text; update only known-target local assertions.

## Migration Plan

No migration or live deployment is needed for this source-only fix. Normal customization installation will distribute the wording.
