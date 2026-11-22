# Tasks

## 1. Safe published-main desktop deployment

- [ ] 1.1 Add the deploy:all entrypoint and source gate; disposable bare-origin fixtures prove dirty/non-main/wrong-origin/ahead/diverged or unverifiable source refuses before any deployment or hc call.
- [ ] 1.2 Fast-forward eligible selected local main and invoke the existing full deploy; fixtures prove the existing pipeline runs even at equal HEAD and preserves home selection, source SHA and installer result.
- [ ] 1.3 Add README command/local requirements alongside the script; command-contract assertions confirm the documented clean-main rule and unchanged deploy pipeline.

## 2. Bounded existing-peer shell updates

- [ ] 2.1 List peers with hc machine ls --json and implement the design's exact hc exec argv with a self-contained worker; fake hc fixtures verify inventory use, Base64 results, deadlines and absence of hc run or terminal creation.
- [ ] 2.2 Validate peer home/checkout/tools/history/installation type and run npm run deploy:shell only for eligible peers; temporary-home/bare-origin fixtures cover fast-forward and every stated skip, including full-desktop exclusion and fixed default remote home.
- [ ] 2.3 Keep attempting peers after local/remote deploy, fetch or transport failure; mock failures and deadlines prove continuation, no retries and no clone/install/repair or real machine access.
- [ ] 2.4 Document peer eligibility and full-desktop exclusion in docs/COMMANDS.md; fixture assertions check the documented transport and shell-only boundary.

## 3. Selection preview and per-machine results

- [ ] 3.1 Add --only, --skip-local and --dry-run with pre-deployment selector validation; fixtures prove selection never bypasses the source gate and dry-run changes only fetched Git data/refs, not HEAD/files/dist/homes/backups.
- [ ] 3.2 Print per-machine deployed/current/skipped/failed results with actual source commit and existing printed backup IDs; fixtures cover no-change installation, missing values, failed attempted SHA, dry-run rows and zero/non-zero aggregate exit codes.
- [ ] 3.3 Document options, dry-run fetch exception and summary semantics in README/docs/COMMANDS.md; command-contract tests cover the examples without running operational commands.

## 4. Explicit manual remote bootstrap guidance

- [ ] 4.1 Document Git/Node 20+/npm on the remote Core PATH, HTTPS clone to ~/.local/share/herdr-app and the explicit first npm run deploy:shell into the default home; inspect examples and static assertions for agreement with worker paths and prerequisites.
- [ ] 4.2 Reconcile README's old no-remote-deploy-side-effect wording with explicit deploy:all authorization, link existing profile wiring/rollback guidance and state no automatic clone/repair/restart; static documentation checks confirm the new command neither claims installed provenance nor live-shell restart.
