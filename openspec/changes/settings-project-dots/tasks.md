# Tasks

## 1. Crew project names preserve dots across add, list and removal

- [x] 1.1 Update the shared naming policy, basename derivation and naming hint in `src/plugins/crew/plugin.js`; cover safe dots, mixed case, invalid punctuation, repeated/leading/trailing dots, 1/40/41-character boundaries and truncation with `node --experimental-vm-modules src/plugins/crew/plugin.test.mjs`.
- [x] 1.2 Extend mocked project CLI fixtures to show dotted rows and register/remove exact dotted IDs, and to preserve older Crew name refusals and home-ownership refusals without retry or false success; verify using the same plugin test.

## 2. Folder-change failures identify Crew as the refusal source

- [ ] 2.1 Replace ambiguous folder-prefix formatting in the generic folder-list action handler with explicit operation context and plugin-name attribution; cover older-Crew and home-lock add refusals, remove refusals, successful siblings and list refresh in `node tests/crew-projects-ui.test.mjs`.
- [ ] 2.2 Document the generic refusal presentation in `docs/PLUGIN-UI.md` and keep plugin-specific wording out of the renderer; verify `node tests/plugin-ui-contract.test.mjs` and inspect the changed documentation against the fixture expectations.
