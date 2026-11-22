# Tasks

Planning only. Every checkbox stays open until the maintainer approves implementation. Groups correspond one-for-one, in order, to the draft PR's Implementation outcomes.

## 1. Installed desktop and shell revisions are recorded and recoverable without weakening scoped deployment or shell rollback safeguards

- [ ] 1.1 Add optional build-source provenance to bundle/ownership records and validate legacy, absent-Git, clean, dirty and untracked-source cases with disposable checkout tests.
- [ ] 1.2 Implement full/shell/scoped component stamping and mixed-state rules; cover desktop/shell independence, unchanged idempotency and no source-path leakage with deploy fixtures.
- [ ] 1.3 Journal metadata-only changes and extend shell-only journal validation narrowly; cover provenance recovery, forged non-shell changes, newer deployment refusal and later personal edits in rollback fixtures.
- [ ] 1.4 Expose journal identity and phase/failure results before payload writes without weakening locking/CAS; inject write and patch-refresh failures and assert the backup ID remains actionable.
- [ ] 1.5 Document provenance semantics, partial deployment and recovery guarantees in lifecycle/development docs; check documented behavior against the new fixtures and keep existing manifest consumers compatible.

## 2. Desktop updates run from an isolated published-main checkout with durable bounded jobs, conflict refusal and actionable recovery details

- [ ] 2.1 Add the updates service's fixed-source/default-path management and immutable-target validation; use local bare Git fixtures for clone/adoption, main advancement/rewind, dirty/ahead/diverged/wrong-origin/shared-worktree and redirected-path refusals, including explicit exclusion of developer paths.
- [ ] 2.2 Orchestrate the existing Node compatibility/build/full-deploy sequence with explicit captured home and target; fake child processes to assert no npm install, native gate bypass, layout switch, terminal creation or restart occurs.
- [ ] 2.3 Add the self-contained snapshotted job launcher, updater lock, atomic durable status, bounded logs and deadlines; disposable process fixtures cover duplicate launches, UI disappearance, crash, timeout, lock ambiguity and result reattachment.
- [ ] 2.4 Require deployment/patch and ownership/provenance verification before Success; inject partial-write/verification failures and ensure unknown outcomes cannot replay and recovery tools remain available without runtime/source access.
- [ ] 2.5 Package the worker/helper dependencies and document exact update/recovery behavior, trust boundary, managed-source consent and one-time bootstrap; use packaging/architecture fixtures to verify import closure and preference-export exclusion.

## 3. Custom Settings shows revision, change summaries, checks and Update, with hourly discovery and matching expanded and compact availability dots

- [ ] 3.1 Add public main/compare metadata reads, bounded summary/cache and hourly active-Custom scheduling guarded by native checking; fake clocks/HTTP cover ETag, rate limits, deduplication, stale failures, no background updates and no eager-check side effects.
- [ ] 3.2 Compose the local Custom Updates row, Check now/Update, What's new disclosure, legacy replacement consent and durable operation details; VM/pure-state tests cover every status, captured target guards, disabled duplicate clicks and no Success from manifest SHA alone.
- [ ] 3.3 Add one shared Custom availability predicate to Settings nav, expanded/compact footer and compact Settings menu indication; test native App/Core predicates remain intact, opening does not dismiss and independent availability is not lost.
- [ ] 3.4 Reconcile active jobs after mod reload and only poll while Updates is shown; simulate closing/reopening/obsolete replies and verify the same job is observed rather than relaunched.
- [ ] 3.5 Update README/Commands with the local UI workflow, network cadence, development/unknown-build states, recovery limits and explicit native validation checklist; add focused UI/catalog/packaging coverage without creating another Settings section.

## 4. Existing remote shell installations have machine-qualified update rows and safe shell-only updates over the existing Core transport

- [ ] 4.1 Add bounded read-only probes of configured connected machines and existing shell ownership/default checkout through the Core transport; fake Windows/Linux targets cover their own home/environment, legacy/unknown/absent installation and source, wrong origin, offline/login and removed/replaced-machine states.
- [ ] 4.2 Route the captured remote shell job through the same durable worker with only Node build and deploy-shell; transport/deploy fixtures prove no App dependency, non-shell/provenance/preference mutation, first install, profile wiring, terminal input or full deploy.
- [ ] 4.3 Compose machine-qualified shell rows and aggregate their availability, preserving separate jobs/results; mock disconnect/reconnect, partial per-machine failures and local-success/remote-still-available behavior without replay.
- [ ] 4.4 Document pc2/existing-checkout adoption, explicit shell-only recovery, no-checkout/new-machine limitations and live-shell reload caveats; verify shell-only journal fixtures still reject mixed changes.
- [ ] 4.5 Integrate this group's and prior groups' fixtures into the existing Windows/Ubuntu hosted selection and record remaining authorized native checks as delivered validation documentation; do not run live home/pc2/deploy tests without separate permission.
