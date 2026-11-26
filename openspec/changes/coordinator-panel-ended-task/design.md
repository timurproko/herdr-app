# Design

## Context

This small fix is split from PR 94 by cherry-picking f7fe990bf65732659b657e6098b0bc4f9e8c042c onto current main. Its original OpenSpec files belong to a broader plan absent on main; conflict resolution replaces those files with this fix-only change, without importing the stage-label, Spaces or rename outcomes.

## Decision

Reported means completed, not necessarily still running. A reported task whose terminal ended or disappeared enters the same freshly owner/status-attested read-only history path as a closed task. It supplies no terminal target, adoption, colour or navigation authority. Working tasks and still-live reported terminals retain exact native membership checks. Existing bounded reads, history age, deduplication, freshness and machine/home identity guards remain unchanged.

## Validation

The sanitized real fleet/full payload-shape regression exercises local and pc2 coordinator publication with live, finished and removed terminals, managed stages and no historical worker targets. The same regression must fail on the main provider before this fix. Existing directly affected fleet tests protect history and membership guards. Previously recorded native proof and the unrelated interrupted-render banner remain documented distinctly; this split does not claim to fix that banner.
