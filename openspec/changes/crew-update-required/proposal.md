# Proposal

## Why

Crew updates currently appear Optional, hiding compatibility problems on machines with old installations. A confirmed available update must use the existing unmet-requirement attention path instead.

## What Changes

- Classify a confirmed Crew update as non-optional on the selected local or remote machine, retaining the Update action and installed revision.
- Show `Update needed` with the existing unmet-requirement colour and count it in `N to fix`, not `N optional`; propagate that classification through existing unmet-requirement surfaces only.
- Keep coordinator launch and project actions non-blocking for revision age alone; preserve existing installation, connection, ownership and capability refusals.
- Preserve Ready for current installations, avoid claiming outdated when update evidence is unavailable, and leave genuinely optional tools unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Require machine-scoped Crew update attention without adding an outdated-version action gate.

## Impact

Crew's prerequisite check and its pinned tests in `src/plugins/crew/`, the generic Settings requirement row if needed for its status label, and focused renderer regressions. No native change, automatic update, new indicator system or live deployment. Implementation proof will use a stopped disposable native instance at 130%, with the screenshot outside the checkout; hosted required checks must cover the final implementation head.
