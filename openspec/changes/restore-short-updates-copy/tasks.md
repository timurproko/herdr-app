# Tasks

Design is intentionally omitted: this is a literal-copy restoration with no architectural, dependency, data-model or migration decisions. Exact wording was verified in `5f40e05^:src/features/settings/main.js`, line 912.

## 1. Settings Updates restores the exact short paragraph without changing update behavior

- [ ] 1.1 Replace only the explanation string in `src/features/settings/main.js` with the exact pre-20 text recorded in the delta; compare wording and punctuation with `git show 5f40e05^:src/features/settings/main.js` and ensure the title/model/worker code remains unchanged.
- [ ] 1.2 Replace the long-copy assertions in `tests/update-row.test.mjs` with full-string equality for the historic paragraph; run `node --experimental-vm-modules tests/update-row.test.mjs` to protect the existing unknown-revision title matrix and update controls too.
- [ ] 1.3 Update `docs/COMMANDS.md` to stop saying the Settings paragraph distinguishes Custom cadence, and `docs/TESTING.md` to describe the exact short-copy assertion; inspect the diff to retain detailed cadence documentation and leave archived OpenSpec records unchanged.
- [ ] 1.4 Run `CI=true npm run test:ci` before the implementation report and record its actual result; do not deploy, mark ready or merge.
