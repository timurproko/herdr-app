# Tasks

## 1. Custom current-check confirmation matches native rows

- [ ] 1.1 Reuse native recently-requested state maintenance and slot/button rendering for native and custom rows, preserving the 300 ms refresh cadence and 3000 ms age condition; verify with controlled-clock row VM assertions and native/custom markup equality.
- [ ] 1.2 Arm custom feedback only for a requested successful current check and retain Update, busy, failure, unknown and stale-click behavior; extend tests/update-row.test.mjs for these states and expiry back to Check now, and verify package closure for any shared helper.

## 2. Custom availability reaches every native-equivalent marker

- [ ] 2.1 Reproduce the reported expanded-footer failure using the real controller/helper in separate Settings/header/footer VM contexts and host-like shared-store refresh dispatch, without manually forcing render or stubbing availability; record the demonstrated cause in design.md and retain a regression that fails on the original source. If the VM path passes, stop and request disposable native-render authorization rather than inventing a cause or a second mechanism.
- [ ] 2.2 Repair the demonstrated existing-path indicator defect, preserving native marker markup and state delivery; assert that a manual check updates the already-mounted expanded Settings icon, compact More trigger and Settings Updates sidebar without remounting or an hourly tick.
- [ ] 2.3 Add the missing Settings-entry accent marker in Custom's compact More popup using the same native/custom availability condition and six-pixel native circle, register any shared packaging dependencies, and verify rendered VM coverage.
- [ ] 2.4 Extend rendered marker VM coverage for all native-App-ready/custom-available on/off combinations, exact native-only/custom-only marker equality, current-state clearing, Core-only readiness and managed-Core exclusion in Settings navigation; verify with focused VM checks only and keep tooltips/badges unchanged.
