# Proposal

## Why

Crew Projects currently shows only folder paths, so people cannot see or change how a registered project delivers work. Settings needs a quiet, machine-scoped kind editor without re-registering projects or guessing Crew's delivery rules.

## What Changes

- Show Crew's authoritative project kind at the right of each supported project row: `workflow` → **Delivery workflow**, `plain` → **Plain**, `gate` → **Gate**.
- Reveal the existing Settings dropdown on row hover or keyboard focus, keeping Remove in its separate trailing action slot without overlap.
- Apply explicit selections through Crew on the captured Settings machine using the existing local/SSH transport; retain the confirmed label until acknowledgement and show a short inline refusal on failure.
- Add a generic declarative list-row choice capability to the shared Settings renderer/kit, not Crew-specific drawing code.
- Require an explicitly advertised, versioned Crew JSON listing and kind-only setter. Crew 0.12.1 lacks both: the exact proposed upstream API is in `design.md`; the coordinator must arrange that separate Crew change. Older Crew keeps its existing path/Add/Remove behavior with no kind label or editor.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Capability-gated project-kind presentation and safe, acknowledged machine-scoped editing through the shared declarative Settings list UI.

## Impact

- `src/plugins/crew/plugin.js` and focused Crew helpers/tests: capability probing, strict JSON decoding, captured target commands and authoritative results.
- `src/features/settings/plugins-ui.js` and `src/ui/settings-kit.js`: generic optional list-row choice, hover/focus reveal, stable action geometry and inline failure state.
- `tests/` fixture harnesses: generic renderer, Crew provider and local/remote lifecycle regressions; fakes only.
- `docs/PLUGIN-UI.md` and README: declaration contract, labels and compatibility boundary.
- External dependency: a separately delivered Crew project-kinds v1 API, including preservation of project metadata and Crew-owned delivery selection. No Crew source edits, native patch, deployment, real-home mutation or live SSH testing in this change.
