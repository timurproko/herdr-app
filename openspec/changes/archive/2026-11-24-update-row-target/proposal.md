# Proposal

## Why

The Custom update row repeats Updating… in both its description and disabled action. Its description should instead identify the published revision being installed without implying that an already-current desktop is outdated.

## What Changes

- Show Updating to followed by the seven-character published target during launch, pending receipt and running work; use Updating without an ellipsis only until a trustworthy target is known.
- Say Updating other machines to followed by the same target when only peers need updating and this computer is already current; omit the target suffix while unknown.
- Preserve the disabled Updating… button, row layout, installed-revision title and every non-running state's wording and safety guards.
- Update focused model/controller fixtures and current documentation/specification statements that prescribe the old running description, leaving archived change records intact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: Target-aware running description and truthful peer-only feedback, including recovery after Settings replacement.

## Impact

Presentation logic in `src/shared/customization-update-model.js`, existing shared launch/status handling in `src/shared/customization-updates.js` only if needed to retain target context, and associated update fixtures and documentation. Existing check.target is the initial published-main source; a same-run worker target receipt, if available, takes precedence. No deployment policy, native behavior, network read, timer, dependency or layout change is proposed.
