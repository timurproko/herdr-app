# Proposal

## Why

Three existing UI details waste space or break alignment: Git stage controls inherit the widest verdict's width, Spaces moves the crew label when child controls disappear, and the Delivery kinds tooltip lacks aligned description wrapping. The requested presentation intentionally replaces the current common-width and bold prose-tooltip contracts.

## What Changes

- Size Git stage and verdict controls to their own captions with the existing 6px side padding, retaining height, right alignment and guarded actions.
- Keep lowercase crew on the same Spaces metadata column whether children exist, are folded, or combined view is off; reserve empty control slots without adding visible controls.
- Render Delivery kinds explanations in two columns: regular foreground kind names and muted descriptions with one shared wrapping edge, without separating dashes.
- Preserve existing components and tooltip activation; add no messages, buttons, options, native patches or operational behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Replace the common minimum stage/verdict width and bold prose delivery-kind explanation with caption-sized controls and aligned two-column tooltip entries.
- `workspace-experience`: Explicitly retain the crew label column when child count/disclosure controls are absent or combined view is off.

## Impact

Targets `src/plugins/git/mod/main.js`, `src/features/spaces/main.js` and `src/ui/settings-kit.js`, with Crew's existing hint data unchanged unless needed. Update the focused Git stage geometry, Spaces worktree layout and description-hint tests and the affected README/architecture descriptions. No dependencies, host APIs, durable state or command behavior change. Implementation and targeted validation wait for plan approval.
