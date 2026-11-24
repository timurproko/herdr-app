# Tasks

## 1. Coordinator Closed rendering remains complete across mixed history rows and section read notices

- [ ] 1.1 Inspect installed provenance/update log and available render diagnostics read-only; document the precise failing path and distinguish JavaScript failure from native interruption in sanitized local evidence.
- [ ] 1.2 Reproduce the failure through the real packaged coordinator renderer with two repositories, the section-level notice, merged and closed-unmerged states, and rows with and without live agents; verify a failing regression before changing source.
- [ ] 1.3 Trace the reproduced path through merged revisions and identify the introducing PR with a before/after reproduction, without touching PR #42 or fleet-attach-broken.
- [ ] 1.4 Repair only the proven source-owned failure and verify the complete packaged render passes strict render-side-effect guards with notices and all eligible rows intact.
- [ ] 1.5 Document the render cause, introducing change and regression command in the relevant testing guidance; run focused renderer/history/geometry fixtures and deliver this outcome with its tests before starting outcome 2.

## 2. Repository-scoped GitHub reads route unambiguously and access refusals identify repository and account context

- [ ] 2.1 Identify the exact inaccessible crew history PR and working herdr-app comparison from validated same-home links; record arguments, executable resolution, machine, cwd and non-secret environment facts, then reproduce the exact invocation read-only through hc exec.
- [ ] 2.2 Classify the refusal as app call-shape routing, genuine inaccessible item or another proven cause; preserve sanitized reproduction evidence and document any precise external wrapper correction without editing MyConfigs.
- [ ] 2.3 Make known-repository PR/API/GraphQL reads explicit in command-supported wrapper-recognized form and prevent empty app-supplied GH_REPO; verify fixtures cover coordinator-home/unrelated cwd, absent/empty/wrong GH_REPO and explicit credential preservation without account switching.
- [ ] 2.4 Add repository and established account or honest unknown/explicit-credential context to access refusals; verify one notice per applicable section/tab, healthy-row retention, historical expiry, partial recovery and no secret exposure.
- [ ] 2.5 Document the exact history-read cause and call-shape regressions alongside focused account/read-notice tests, retaining all live-installation safety restrictions.
- [ ] 2.6 Check that no other suite is running, execute CI=true npm run test:ci once exclusively, and report its actual result plus required-check status on the exact final head without readying or merging the draft PR.
