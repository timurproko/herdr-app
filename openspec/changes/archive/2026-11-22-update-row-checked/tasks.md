# Tasks

## 1. Custom current-check confirmation matches native rows

- [x] 1.1 Reuse native recently-requested state maintenance and slot/button rendering for native and custom rows, preserving the 300 ms refresh cadence and 3000 ms age condition; verify with controlled-clock row VM assertions and native/custom markup equality.
- [x] 1.2 Arm custom feedback only for a requested successful current check and retain Update, busy, failure, unknown and stale-click behavior; extend tests/update-row.test.mjs for these states and expiry back to Check now, and verify package closure for any shared helper.

## 2. Custom availability reaches every native-equivalent marker

- [x] 2.1 Document an exact read-only capture for the next real occurrence, covering persisted/shared availability, rendered footer variant/tree, predicate timing and marker geometry/colors; verify supported inspector commands from released CLI source without running a native instance.

- [x] 2.2 Exercise the reported expanded-footer transition using the real controller/helper in separate Settings/header/footer VM contexts and host-like shared-store refresh dispatch, without manually forcing render or stubbing availability; record whether the failure reproduces. If it does not, ship no speculative fix or second mechanism and launch no native app, as approved.
- [x] 2.3 Repair an existing-path defect only if reproduced; otherwise retain its behavior. Assert that a manual check updates the already-mounted expanded Settings icon, compact More trigger and Settings Updates sidebar without remounting or an hourly tick.
- [x] 2.4 Add the missing Settings-entry accent marker in Custom's compact More popup using the same native/custom availability condition and six-pixel native circle, register any shared packaging dependencies, and verify rendered VM coverage.
- [x] 2.5 Extend rendered marker VM coverage for all native-App-ready/custom-available on/off combinations, exact native-only/custom-only marker equality, current-state clearing, Core-only readiness and managed-Core exclusion in Settings navigation; verify with focused VM checks only and keep tooltips/badges unchanged.
