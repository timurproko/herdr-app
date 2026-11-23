# Tasks

## 1. Terminal copy-on-select feedback recovers after cold startup and uses standard success toasts

- [ ] 1.1 Replace initialization-time platform disabling with live readiness observation and cancellable bounded clipboard checks; verify cold-start recovery, eligibility changes and mouse selection/copy in controller regressions against the actual source.
- [ ] 1.2 Replace private popup rendering with standard success notifications and direct read-only GPUI clipboard access; verify one notification per settled selection, character counts, empty/failed reads and stale/cleared/focus-switched work in the focused suite.
- [ ] 1.3 Document best-effort mouse-only scope and unreliable explicit/repeated shortcut detection; verify public docs and the spec agree, strict OpenSpec validation passes and the customization-only build preserves the observer's layout/manifest mounting.
- [ ] 1.4 Run a checkout-local native rendering check and inspect running-app status/screenshots without changing installed files or disturbing terminals; record exactly which live mouse behavior remains unverified.
