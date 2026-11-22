# Proposal

## Why

After a successful current-version check, herdr-app-custom still offers Check now while the native rows briefly show a quiet disabled ✓ Up to date. Match that existing feedback and make custom update availability use the same visible indicators as native availability, without changing other update behavior.

## What Changes

- Reuse the native recently-requested confirmation mechanism and button-slot markup for the custom row, including its three-second window and existing styling.
- Preserve Update, Checking…, Updating…, idle, failed and unknown states; extend row VM coverage for confirmation and expiry.
- Audit stock and Custom marker surfaces, retain the already-wired footer/More-trigger and Settings navigation dots, and fill the missing Settings-entry marker in the compact More popup for both native and custom availability. Add rendered VM assertions for every native/custom availability combination.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: the single customization update row briefly confirms a successful current check before returning to Check now, and custom availability uses native-equivalent markers throughout Custom's footer and Settings navigation.

## Impact

Settings update rendering, its existing request/timer feedback, custom row/controller integration, workspace footer/compact More popup and focused VM tests; any extracted helper must be packaged for its consumers. Installed stock Settings and workspace-chrome are inspected read-only as specifically authorized for the marker audit. No deployment, live-home writes, update-worker changes or unrelated changes.
