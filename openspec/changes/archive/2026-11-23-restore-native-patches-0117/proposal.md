# Proposal

## Why

Custom's feedback patch falsely rejects Herdr 0.1.17 because its canonical original is not byte-faithful stock. The 0.1.17 palette also needs a reviewed per-version replacement that retains its new dynamic theme choices rather than freezing the older hardcoded list.

## What Changes

- Correct feedback stock originals for 0.1.16/0.1.17, including real native imports and byte formats, and record pinned release commits and SHA-256 provenance.
- Add the reviewed 0.1.17 palette original and corresponding Custom replacement, preserving dynamic light/dark/layout-filtered themes and all existing Custom interactions; retain 0.1.16 support.
- Keep the registry, guarded patch engine and prior-opt-in startup/deploy refresh mechanism. Unknown stock remains a nonfatal advisory with files and backups unchanged; ownership conflicts remain errors.
- Add real-stock fixture regressions and update compatibility documentation to describe exactly what installation restores.
- Start from main, not PR 23. Its investigation is evidence only; no structural any-version transforms, installed-app writes or deployment are included.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: Specify byte-faithful reviewed-original provenance and per-original selection for supported feedback/palette refresh, including 0.1.17 dynamic themes and continued 0.1.16 behavior.

## Impact

Focused changes under `src/integration/native-patches/`, the existing runtime registry/patch selection and build mappings as needed, regression fixtures, and native-patch documentation. No new dependency, public host version permission, native binary change, additional opt-in or changes to unrelated customization features. Implementation will compare installed 0.1.17 embedded stock read-only; live UI validation and deployment are outside this task.
