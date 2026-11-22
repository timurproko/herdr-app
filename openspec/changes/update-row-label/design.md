# Design

## Context

See proposal.md. Delivery automation requires a complete artifact set even for this display-only rename.

## Goals / Non-Goals

Change only the displayed name and its quotations; no behavior, layout, identity, other wording or live-installation changes.

## Decisions

Keep `CUSTOMIZATION_LABEL` as the sole runtime label definition and replace its value with `herdr-app-custom`, rather than renaming native identifiers. Its only consumer constructs the displayed title; native Herdr/herdr-core updates use separate state and commands, with no label comparisons or parsing. Update matching fixtures and documentation quotations, including archived update-row text; let the delivery bot synchronize the canonical spec from the delta.

## Risks / Trade-offs

The longer label has no routing impact. Targeted row/model fixtures cover title and unchanged actions; actual native rendering remains a maintainer-only check without deployment here.
