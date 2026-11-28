# Tasks

## 1. Persistent global disclosure with individual repository exceptions

- [ ] 1.1 Add a Git-local versioned disclosure-state helper with an expanded initial default, canonical per-repository exceptions, effective lookup, individual toggle and bulk inversion that clears all overrides; cover these transitions in a focused `tests/git-header-disclosure.test.mjs` fixture.
- [ ] 1.2 Preserve the existing `custom.git.task-repositories.folded` memory as collapsed exceptions until new-format state becomes authoritative; cover legacy migration, malformed/unknown-version data, storage refusal, reload and restart using isolated fake localStorage in the same targeted fixture.
- [ ] 1.3 Document the helper's local persistence, migration and nonportable boundary in `docs/ARCHITECTURE.md`; check that the documented default/override rules match the tested transition matrix.

## 2. One strip button controls ordinary and coordinator repository sections

- [ ] 2.1 Integrate the final available PR #104 render fix before publishing implementation, keeping only narrow fold-policy and button call-site edits in `src/plugins/git/mod/main.js`; inspect the integrated diff to ensure its render/lifecycle protections are preserved.
- [ ] 2.2 Add one shared icon-only 24px button builder at the far right of both existing Open/Closed strips, package any needed Git-owned glyphs, and cover icon/default state, opposite accessible action, pointer/keyboard activation and unchanged tab-label geometry in the targeted disclosure fixture.
- [ ] 2.3 Route ordinary, coordinator and preview disclosure through the helper and restore current saved policy before target section publication; cover unseen repositories, both tabs, different agents/spaces, retained/recreated views, disable/re-enable, individual exceptions and clearing hidden overrides in the targeted fixture.
- [ ] 2.4 Preserve selected-agent pins, remaining counts, headerless failures, cold/warm loading, cursors and coordinator reveal bounds while advancing existing fold-selection invalidation and retiring incompatible motion; run `node --experimental-vm-modules tests/git-header-disclosure.test.mjs`, `tests/git-closed-folds.test.mjs`, `tests/git-section-reveal.test.mjs`, `tests/git-count-badges.test.mjs` and `tests/git-entry-cache.test.mjs` with the same Node flag, using fake transport and no full suite.
- [ ] 2.5 Update `README.md` and `docs/TESTING.md` with the new button, default-versus-individual rules, restart persistence and targeted fixture scope; review wording against the spec and inspect the strip at 100%/130% in an isolated fixture if authorized, keeping proof outside the checkout and stopping any disposable process before reporting.
