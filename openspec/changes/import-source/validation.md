# Repository-split validation

## Local targeted checks (before promotion)

- Checkout build passed without preferences/pc.json: 18 modules, 1044 payload files, only dist/ written.
- Original status-reveal fixture (neutral labels only) passed with VM modules.
- Original architecture fixture (moved guidance path only) passed with a disposable HERDR_APP_HOME and unavailable HERDR_APP_BIN.
- Original packaged pull-request facts fixture passed; synthetic tab-move compatibility fixture passed 70 assertions with no network/Core.
- Clipboard smoke script parsed successfully using PowerShell's parser without executing the script or touching clipboard/host sessions.
- Scaffold/required-aggregator checks passed: six node:test cases, including failure/cancellation/skip/missing-dependency behavior.
- CI-only discovery checks passed: 124 candidate entries, initially 122 selected on Windows and 121 on Ubuntu, with whole-suite exclusions listed in docs/TESTING.md.
- Source comparison passed: all imported files outside the narrow content/root/scaffold exceptions match original bytes; 41 original SVGs and 94 provenance records accounted for; original Material/Paseo notices intact; personal snapshot absent. No synthetic preference example was needed.
- Protected scaffold files remain unchanged: root shared instructions, LICENSE, Delivery workflow, bootstrap and required-check scripts. The existing CI workflow changes only its test invocation.

## Current pre-promotion GitHub snapshot

Readiness, OpenSpec and Delivery reconciliation passed; the application suites,
Delivery check and CI required are skipped while draft. This is not final app CI.
The final ready-head result and exact actually executed/excluded entries will be
recorded in the task report after bot promotion, without foreground CI watching.

## Not run

No unchanged broad npm test, installed-host integration/native checks, native/live
feature scripts, real clipboard/permission/profile smoke, deploy/enable/disable/
remove/rollback/preference-import command, relay/Cloudflare/provider mutation or
private dotfiles write was performed. Hosted CI runs the documented original
fixture subset, not those operational tools. Historical theme-selection and
private-shell/A1 release compatibility claims were not revalidated.

## Known limits

41 artwork sources remain unrecorded, retained exactly by maintainer direction,
not silently relicensed. Private external shell wiring is not installed by the
standalone split. Preference relocation, relay hardening, old-subtree removal and
second-workstation setup remain follow-ups.
