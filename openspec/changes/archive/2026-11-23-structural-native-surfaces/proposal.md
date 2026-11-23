# Proposal

## Why

Custom's palette is inactive on installed Herdr 0.1.17, and its owned feedback patch cannot refresh, because whole-file reviewed-byte gating rejects their current stock evidence. We need the customizations to work whenever the required source structures and host capabilities exist, without losing native additions or weakening ownership and recovery.

## What Changes

- Replace reviewed-whole-file replacement permission for the two existing opted-in frame patches with verified current-stock discovery, narrowly anchored structural transforms and pre-activation self-checks. Keep raw original bytes, immutable helper generations, atomic entrypoint activation and recoverable transaction records.
- Restore all existing Custom palette presentation and activation routing while retaining the native command catalog, history, dispatch branches and 0.1.17's dynamic light/dark/layout-aware theme choices.
- Restore all existing Custom feedback presentation, attachments/viewer, one-use draft and success behavior inside the real feedback frame, retaining native preview, attachment and sending operations and additive native actions.
- Use the same compatibility verdict and recovery path for deploy, startup, explicit apply/check/restore and doctor. Preserve prior opt-ins only; report concrete structural/API incompatibilities rather than demanding another version or whole-file review.
- Add disposable 0.1.16, 0.1.17 and synthetic future fixtures, fault injection, migration coverage and honest compatibility documentation. No installed-app writes, deployment, native binary changes or live feedback submission are authorized by this task.
- Approval explicitly accepts guarded structural compatibility instead of exact reviewed whole-file compatibility. This improves forward compatibility, not a guarantee against every future semantic host change; see design.md for the decisions and limits.

## Capabilities

### New Capabilities

None; reuse the existing lifecycle and workspace boundaries.

### Modified Capabilities

- `customization-lifecycle`: Native compatibility becomes current-stock-provenance plus structural/capability checks, with transactional activation/recovery and diagnostic reasons instead of reviewed-byte permission.
- `workspace-experience`: Specify Custom palette/feedback behavior and native-action preservation, with Custom-only scope and frame-only feedback authority.

## Impact

`tools/runtime/frame-patch.mjs`, `frame-registry.mjs`, `startup-frames.mjs`, deployment/doctor integration, build mappings, both `src/integration/native-patches/` implementations, facade capability contracts, disposable regression fixtures, README and native-patch/development/architecture/testing guidance. A pinned parser and its license must be packaged for offline runtime transforms. Existing local v1 records need ownership-checked migration; no personal record or installed patched source becomes a reviewed stock fixture. Investigation and pinned release/binary evidence are recorded in investigation.md.
