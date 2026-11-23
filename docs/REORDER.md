# Reorder component

`src/ui/reorder.js` owns the shared interaction for Tabs, Spaces and sidebar footer
icons. It imports only GPUI/UI primitives, has no host/storage/process dependency,
and never commits domain changes itself. Package it through `customization.json`;
never copy its implementation into a feature.

## Variants and options

```js
get drag() { return reorder(this, 'strip'); }
// Or: reorder(this, 'list'), reorder(this, 'icons')
```

- `strip`: horizontal slots, icon + label preview below the pointer, 3px marker inset.
- `list`: vertical row targets, icon + label preview, 50% source opacity and return
  bounds leaving room for the list header/last row. The list still owns auto-scroll.
- `icons`: horizontal grouped targets, icon-only preview above the pointer, 5px marker inset.

`reorder(owner, variant, options)` lazily creates one view-local `ReorderDrag`.
Options override `axis`, `preview` (`label`/`icon`), `offset: {x,y}` (logical px),
`markerInset`, `returnInset: {top,bottom}`, `sourceOpacity`, `threshold` (window px,
default 5) and `cancel` (`return`/`clear`). These are component policies, not new
feature-local drag implementations. Keep one fixed configuration per instance.

## Wiring a surface

1. `begin(id, event, cx, {meta, target, scale, scrollOffset})` captures a press,
   source bounds and domain identity. A new press invalidates older return callbacks.
2. `over(event, target, cx)` activates after the threshold and records the target.
   Use `insertionSlot(event, index, axis)` for midpoint insertion and
   `insertionIndex(from, slot, count)` for a one-based destination. `groupedInsertion`
   handles two edge-anchored icon groups, including empty groups and zoom.
3. `surface(element, {release, target?, scrollOffset?, enabled?})` wires pointer
   tracking, release, leave and outside-press cancellation. `target(event)` is an
   optional geometry adapter; `scrollOffset()` reports the current window-pixel
   offset, including auto-scroll. Source/preview positions are normalized by `scale`.
4. `item(element, id, {hover, tooltip, cursor})` adds source dimming and shared
   interaction policy. `control(element, {hover, tooltip, cursor})` applies the same
   suppression to adjacent controls without dimming them. Do not add another
   unconditional `.hover()`/`.tooltip()` after these wrappers.
5. Wrap action callbacks with `guard(callback)`. It also blocks stale pre-drag
   handlers and accidental control activation from the drop release (100ms).
   A fresh press starts a fresh gesture. Normal hover returns immediately on drop.
6. `take(clickedId, cx)` clears the gesture and returns `null`, a `kind: 'click'`
   result, or `kind: 'drop'` with `{id, meta, target}`. Validate fresh domain facts
   and commit at most one action in the adapter. `reset(cx?)` clears immediately.
7. `marker(id, color, {edge: 'before'|'after', offset?})` draws the variant's line.
   `preview(idPrefix, theme, {icon, label})` renders a native pointer popup or its
   returning retained child. `sourceLayer(element, id)` optionally fades a source
   highlight in sync with the source; it is not a destination hover effect.

A domain block can pass `meta: {sources: [id, ...], ...binding}` to `begin`.
All captured sources share dimming/return cleanup; ordinary clicks retain the
original pressed ID. A block still uses `preview(..., {icon,label})` to draw one
ordinary chip with the same pointer/return motion. Spaces represents the grabbed
row's own numbered badge and name: `2 crew` from the fleet or `1 coordinator` from
the coordinator. Attached badges share the coordinator's resolved colour without
overwriting the fleet's saved colour. No chain or second row appears in the chip;
the coordinator's small trailing chain stays in the expanded sidebar metadata. Domain adapters still validate
bindings and destination block edges. Spaces commits its finite public ordering
sequence only after each prior move is acknowledged; no native transaction is
claimed and an uncertain result is not replayed. The compact Spaces rail retains
its existing selection-only behavior, with a link icon for the attached fleet.

Read-only state: `current`, `active`, `target`, `view` (active or returning), and
`leaving`. Do not seed these in feature code; fixtures may do so to render phases.

## Ownership and safety

Feature adapters retain business rules: tabs validate their source space and
exclude Start tabs; Spaces clamps to the same machine and preserves worktree
ordering; footer icons preserve preferences and may cross the center gap. These
are domain constraints, not separate thresholds, timers, hover rules or preview
implementations. Settings' existing profile/terminal snapshot-validation adapters
remain separate; use this component when extending their interaction UI rather
than adding another interaction engine.

Cancellation never commits a reorder. A returning chip uses three one-shot
callbacks (16ms arm, 220ms return, 140ms fade plus cleanup margin); native transitions
draw the animation. New gestures make old callbacks inert. No shared/persisted
mutation jobs, terminal input, native patches or session restarts are involved.

Coverage: `tests/reorder.test.mjs`, `tests/sidebar-footer.test.mjs`, focused deferred
integration checks for the three mods, and disposable native render fixtures.
