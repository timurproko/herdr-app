# Proposal

## Why

Crew Projects' delivery-kind control has inconsistent alignment, a truncated label and sticky reveal after dismissal, while Plugins checks can overwhelm execution capacity and present transient contention as broken setup. People need a calm, understandable control that reflects Crew's stored value, including when a coordinator owns the home.

## What Changes

- Align all quiet kind labels and their revealed dropdown text to one fixed left edge; use **Plain**, **Delivery**, **Gate** in that option order without truncating any kind label. Keep the existing separate Remove rail and omit a Projects column header.
- Correct pointer-versus-keyboard dismissal so selecting, Escape and outside dismissal release obsolete menu reveal; cover open-close-move between rows.
- Append non-clickable **Delivery kinds** after the Projects description using Trello's inline accent placement but a dashed underline. Hover/focus explains all three kinds in an aligned four-column table using the sidebar Usage tooltip's visual treatment, or that tooltip's dotted-row fallback if columns are unsupported. Dropdown options gain no tooltips.
- Queue Settings execution, retry proven pre-start concurrency refusals and reduce Plugins-page fan-out with batched read-only tool checks. Preserve last-good Projects rows and confirmed badges while waiting; contention must never become Error or an invented to-fix count.
- Keep project-kinds capability gating, captured identity and stored-value acknowledgement. Accept supported coordinator-owned set-kind success normally; translate an older Crew's ownership refusal into a short neutral inline message rather than redirecting the person to another session.
- Report existing Settings hover-only text with solid link underlines without changing it. Update current docs and specs, not historical archives.
- Give Git stage and verdict controls one measured minimum width covering every fixed caption and two-digit Build round, equal height/padding and centred text. Longer round captions grow only their own box. Preserve the right rail, title truncation and tooltip-free targets; add geometry regressions and before/after pictures at 100% and 130% zoom.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: authoritative Crew kind captions, shared row geometry/reveal, explanatory inline help, concurrency-safe Settings checks neutral legacy setter refusals, and consistent Git stage/verdict geometry.

## Impact

- Shared Settings renderer/kit (`src/features/settings/plugins-ui.js`, `src/ui/settings-kit.js`), plugin execution boundary/API and registry as needed, and Crew's provider, kind labels and setter.
- Targeted fake-only regressions for row lifecycle, declarations, transport scheduling, batched checks and supported/legacy set-kind replies; README and plugin UI documentation.
- No native binary/source changes, cap increase, deployment, real Crew home access, coordinator interaction, SSH execution, portable kind preference or automatic write replay. Native cap provenance is to be documented from read-only source evidence, not reproduced against the running app.
- Git row stage/verdict builders and their shared measurements, probes and geometry fixtures. The coordinator explicitly grouped this small cross-panel polish into the same PR and approved all five outcomes for implementation.
