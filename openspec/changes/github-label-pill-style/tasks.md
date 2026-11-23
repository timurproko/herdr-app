# Tasks

## 1. Shared theme-aware Git label pills

- [ ] 1.1 Add the Git-local pure colour helper using the pinned Primer RGB/HSL rounding, perceived-lightness switch and dark/light equations; verify independent expected samples for green, amber, purple, red, blue, black/near-black and white/near-white, plus threshold boundaries and invalid inputs.
- [ ] 1.2 Apply its native fill, text and 1px border colours only in the shared pill renderer, classifying the live effective panel background; verify the existing 18px outer geometry, full rounding, content inset, exact emoji/name strings and complete truncation tooltips remain unchanged.
- [ ] 1.3 Replace solid-colour expectations and extend the row regression across dark/light palettes and palette transitions; verify ordinary/coordinator Open/Closed, pinned-compatible and ghost rows, zoom levels, bounded single-line strips, absent labels, actions and unrelated metadata/separator geometry with the focused test.
- [ ] 1.4 Update README's label presentation and docs/TESTING.md's formula/geometry coverage and native-pixel limitations; verify documentation agrees with the OpenSpec delta and links the pinned upstream formula source and any required attribution.
- [ ] 1.5 Run the focused row regression and CI=true npm run test:ci after implementation; record actual results and remaining native-visual limitations without deployment, native session interaction or changes to PR #18's fleet-link presentation.
