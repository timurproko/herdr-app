# Tasks

## 1. Local update sentence identifies this machine

- [ ] 1.1 Change only the known-target local update sentence in `src/shared/customization-update-model.js` to `Updating this machine to <revision>.` and update the pinned assertions in `tests/update-row.test.mjs`, `tests/update-check.test.mjs` and `tests/update-runner.test.mjs`; verify these three Node test files pass, including no-peer local updates, while other phase strings, seven-character revisions, punctuation, layout, timing and update logic stay unchanged.
