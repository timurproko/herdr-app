# Design

## Context

See `proposal.md` for motivation. `Main.labelPill()` in `src/plugins/git/mod/main.js` is already shared by ordinary and coordinator PR rows, both tabs, pins and motion ghosts. It currently applies an opaque label colour and a WCAG-relative-luminance black/white choice. Its 18px outer height, full rounding, 5px horizontal padding and nested truncated text must remain intact. The panel receives a live palette from `theme()`; colours, rather than an appearance preference, determine the actual panel background.

The existing `tests/git-row-labels.test.mjs` exercises this renderer over states, coordinator keys, ghosts and zoom levels, but explicitly requires opaque backgrounds. It also guards unrelated metadata/separator geometry and must keep doing so.

## Goals / Non-Goals

**Goals:** Use GitHub's formula, not colour-specific guesses; keep derivation pure and deterministic, without adding requests or state. Cover dark and light effective palettes and invalid inputs.

**Non-Goals:** No changes to fleet grouping/link styling in PR #18, label data acquisition, GitHub/relay activity, row interaction, metadata order, separator paint, preferences, system appearance or native binaries. Do not reproduce GitHub's larger web label height, selected-state outlines or interactive label hover; these pills remain passive metadata inside the existing clickable PR row.

## Decisions

### 1. Port Primer's equations, including its input rounding

Author a focused Git-local `src/plugins/git/mod/label-colors.js` helper and call it only from the shared pill renderer. Use no new runtime package. The panel build already includes local panel helpers; keep normal package dependency closure.

Pinned upstream sources (MIT-licensed Primer React):

- [IssueLabelToken.module.css at 2128032](https://github.com/primer/react/blob/2128032dca65a1bd565fe382c2e91c638c6473a4/packages/react/src/Token/IssueLabelToken.module.css): `darkThemeIssueLabel`, `lightThemeIssueLabel`, `--perceived-lightness` and `--lightness-switch`.
- [IssueLabelToken.tsx at the same revision](https://github.com/primer/react/blob/2128032dca65a1bd565fe382c2e91c638c6473a4/packages/react/src/Token/IssueLabelToken.tsx): RGB channels plus rounded HSL degrees and integer percentages passed as CSS variables.
- [Primer React license](https://github.com/primer/react/blob/2128032dca65a1bd565fe382c2e91c638c6473a4/LICENSE): preserve required attribution for any adapted source.

The equations were also cross-checked against the public GitHub Labels page's loaded `prc-Token-IssueLabel` CSS, not inferred from the screenshot. Current Primer CSS's older `.IssueLabel` mixin only supplies geometry; it is not the colour-formula source.

For original RGB channels `r,g,b` in 0..255, define perceived lightness `p = (0.2126*r + 0.7152*g + 0.0722*b)/255`. This deliberately uses unlinearized RGB, **not** the existing WCAG luminance calculation. Convert RGB to HSL and round `h`, `s*100`, `l*100` as upstream does; below `s` and `l` are percentage values. Define `switch(T,p) = clamp(1/(T-p), 0, 1)` with the positive-infinity boundary handled explicitly. Clamp final CSS lightness into 0..100 and quantize only when emitting native RGB/alpha colours.

- **Dark:** `T=0.6`; `delta=(0.6-p)*100*switch(0.6,p)`; text is `hsl(h,s%,(l+delta)%)`; background is original RGB at alpha `0.18`; 1px border is the text colour at alpha `0.3`.
- **Light:** `T=0.453`; background is original opaque RGB; text is `hsl(0,0%,switch(0.453,p)*100%)` (black or white). Border uses `hsl(h,s%,(l-25)%)` with alpha `clamp((p-0.96)*100,0,1)`, making near-white labels visible without inventing an all-colours outline.

Emit GPUI-supported native hex colours with alpha, not CSS custom properties or browser-only expressions. Prefer actual transparency over preblending against one background, so ordinary row hover and pin-motion surfaces remain correct. Reject anything except normalized six-digit hex; retain `t.raised`/`t.foreground` for invalid or missing label colours and a neutral theme border if needed.

Alternative rejected: fixed pastel swatches, a flat white overlay, or reusing the existing gamma-corrected contrast switch for dark text. None reproduces GitHub's arbitrary-colour formula.

### 2. Classify the effective panel background, not system settings

Use the live `t.background` six-digit palette colour: dark when its weighted RGB perceived lightness is below `0.5`, light otherwise. Document this local classification independently from Primer's label thresholds. With an unavailable/unparseable background, default to dark (the shipped Custom palette). This follows the actual dark Custom palette even if a system preference says light, and responds immediately when a light palette is applied. It does not add a new theme setting or presume that every app theme is dark.

Alternative rejected: unconditional dark rendering, or consulting only `settings().appearance`; either can disagree with the effective palette used to paint the Git panel.

### 3. Paint the border inside the existing compact geometry

Apply the helper's fill, foreground and 1px border only in `labelPill()`. Preserve its 18px outer height, rounded ends, existing name/tooltip and truncation nodes, strip bounds and metadata line height. Keep the current content inset/total footprint when adding the border; compensate padding if GPUI includes the border in layout. Do not add another text line or a special hover effect.

### 4. Replace colour expectations, retain structural regressions

Replace solid-fill assertions with independently derived expected outputs for green `1a7f37`, amber `9a6700`, purple `840479`, red, blue, black/near-black, white/near-white, plus colours on both sides of the dark/light label thresholds. Cover the rounded HSL input behaviour, unchanged light labels, light-mode border threshold, invalid input and live palette transitions. Allow only RGB/alpha encoding rounding tolerance; do not compute expected values by calling the production helper.

Retain existing name/emoji, tooltip, strip bounds, missing-label, zoom, metadata order, row actions, pin/ghost/coordinator and separator geometry assertions. Assert a thin rounded border without any row-height increase. Update README's solid-colour description and `docs/TESTING.md` with coverage and its limits. The OpenSpec delta modifies only `GitHub label presentation`.

## Risks / Trade-offs

- [Native alpha or border geometry differs from web CSS] → Check native colour support and render-tree constraints during implementation; encode alpha as native-supported hex, keep the 18px outer height and unchanged row constraints. No deployment or live-app pixel claim is authorized.
- [A custom mid-tone palette has no explicit light/dark flag] → Document and test the effective-background `0.5` classification rather than hiding an assumption. Shipped dark and conventional light palettes are unambiguous.
- [Exact Primer readability is not a universal WCAG guarantee for arbitrary custom surfaces] → Match the requested upstream formula faithfully, include extreme-colour cases, and do not claim a stronger contrast guarantee than upstream.
- [Rounding or threshold mistakes] → Use upstream rounded HSL inputs and independent expected samples near thresholds, including black and white and fractional alpha.
- [Fixtures cannot prove GPUI pixel placement] → State that limitation in the testing documentation/report; compare both supplied images for intent, but do not deploy to manufacture native evidence.

## Migration Plan

No stored-state or API migration. After plan approval, implement in the shared renderer, update regressions/docs, and run `CI=true npm run test:ci` before the implementation report. No deployment. Reverting the focused code change restores the former solid pills without changing label data, user preferences or Git behaviour.
