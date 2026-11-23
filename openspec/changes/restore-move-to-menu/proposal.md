# Proposal

## Why

The installed App is 0.1.16, but its running local Core is now 0.1.22: the tab-move adapter only reviews Cores 0.1.19/0.1.21 and deliberately refuses preflight. The parent Move to row also uses a small trailing text arrow unlike the submenu's leading outline chevrons, and the refusal is ellipsized.

## What Changes

- Review the exact Core 0.1.22 contract against 0.1.21, record immutable evidence, and explicitly support it in the existing adapter with local and remote-routing regressions. Keep exact version, generation, capability, identity, document-shape and CAS gates; report detected versus reviewed versions on refusal.
- Interpret the screenshot description literally: replace the parent Move to row's leading Layers icon with the same right-chevron SVG used under Back, at 14 logical px in the existing centered 16 px left icon slot, theme-muted. Remove its trailing text `›`. Keep Back's left-chevron and destination badges unchanged. This deliberately supersedes the old ADR's Spaces-icon instruction; it does not move every Settings chevron to the left.
- Show submenu refusal/empty explanations as inert, wrapping content with sufficient height inside the bounded scroll area, rather than single-line ellipsized action labels. Preserve compact destination rows, keyboard Back/Left/Escape and no loading text/tooltips.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: reviewed-host tab moving and readable, consistent Move to navigation and refusal presentation.

## Impact

Target source: `src/integration/herdr/documents/tab-move-v1.cjs`, `src/features/menu/main.js`, and only if needed an opt-in presentation helper in `src/ui/ui.js`. Extend `tests/tab-move.test.mjs` and `tests/tab-move-ui.test.mjs`; update the tab-move ADR/compatibility documentation and relevant visual assertions. No new dependency, deployment, native rebuild, live document mutation, terminal input or process restart. This PR starts with planning artifacts only and awaits approval.
