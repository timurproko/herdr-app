# Proposal

## Why

The person has replaced the empty-section fix in PR 115 with a single plugin-update row matching the existing Herdr update list. Keeping a separate Plugins heading or per-machine block would no longer match that design.

## What Changes

- Replace the Plugins section with one always-present `herdr-app-plugins` row immediately after `herdr-app-custom`, before the unchanged Herdr explanation.
- Use the existing row and action-slot presentation: verified current status with local check time and Check now, concise named plugin/machine availability with Update, and progress, failures and results in the same status line.
- Keep the existing explicit local-first sequential batch, action safety and notification-dot predicates.
- Retain the scan-expiry fix and owner-retirement coverage; expired discovery metadata cannot keep either row action disabled.
- Update README, plugin UI/testing guidance and targeted row/controller/marker fixtures alongside implementation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: replace the connected-machine Plugins section presentation with a single sibling update row; describe truthful check feedback and inline batch outcomes while preserving execution and notification behavior.

## Impact

Settings composition and its plugin update renderer, the shared plugin-update check/result metadata and pure row presentation, output mappings if the renderer is renamed, and targeted plugin-update/marker fixtures. Existing `owner.row`, `updateCheckSlot` and local-time formatting provide the visual pattern. No native patch, deployment, new scheduler, plugin provisioning, portable preference change or notification redesign is included.
