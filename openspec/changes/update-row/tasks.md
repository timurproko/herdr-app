# Tasks

## 1. Durable deploy:all desktop revision and machine outcomes

- [x] 1.1 Add atomic latest-result reporting after local/peer outcomes and refusals, preserving successful desktop SHA/manifest digest and backup IDs; extend deploy-all fixtures for success, local failure, mixed peer results and missing evidence.
- [x] 1.2 Keep existing source gates, deploy commands, peer selection and dry-run byte preservation unchanged; run the four targeted deploy-all fixture suites and document the sidecar/unknown-revision contract in docs/COMMANDS.md.

## 2. Independent managed-clone update survives Settings replacement

- [ ] 2.1 Add/package the self-contained detached launcher/runner using only the fixed managed desktop path and existing deploy-all CLI; temporary-home/mocked-exec fixtures cover clone-on-Update, redirected/linked/unsafe source refusal and captured home routing without development-checkout access.
- [ ] 2.2 Add one latest status/log and exclusive launch lock, startup acknowledgement, run-token correlation and 30-minute supervision; fixtures cover duplicate dispatch, page disappearance, reload reattachment, launch failure, deadline/crash/missing/late results and mixed outcomes.
- [ ] 2.3 Document the runner deadline, unresolved-lock inspection, partial outcome log and existing manual disable/rollback recovery; fixtures assert no automatic retry, rollback, daemon, scheduler, job history or live machine access.

## 3. One Settings row with shared dots and hourly checks

- [ ] 3.1 Add the Customizations row with its label in one constant using existing typography/button layout and verified revision/short status logic; VM/pure fixtures cover current/available/checking/updating/failure/partial/unknown states and unchanged native actions.
- [ ] 3.2 Add bounded published-main checks, persisted check cache and shared availability projection; fake-clock/transport fixtures cover hourly/due-on-mount/manual checks, coalescing, failure retention, eager-check guards and zero peer/deploy activity during checks.
- [ ] 3.3 Extend existing Settings navigation and expanded/compact chrome dots; packaging/state fixtures verify import closure, preserved native predicates and no update sidecars/runtime state in preference exports.
- [ ] 3.4 Update README and command/testing documentation with bootstrap, one-button all-machine behavior, log paths, manual recovery and maintainer-only UI/self-replacement/real-peer checks; run only targeted fixture/plan validation and report live validation as not performed.
