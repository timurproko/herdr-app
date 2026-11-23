// One reorder interaction for strips, lists and icon bars. Domain writes stay
// with the caller; variants own geometry/presentation, not feature-specific IDs.
import { div } from 'gpui-kit';
import { h_flex, v_flex, Popup } from 'gpui-base';
import { U } from './ui.js';

export const REORDER_VARIANTS = Object.freeze({
  strip: { axis: 'x', preview: 'label', offset: {x: 10, y: 14}, markerInset: 3 },
  list: { axis: 'y', preview: 'label', offset: {x: 10, y: 14}, markerInset: 0, returnInset: {top: U.section, bottom: U.control}, sourceOpacity: 0.5 },
  icons: { axis: 'x', preview: 'icon', offset: {x: 10, y: -U.control - 10}, markerInset: 5 },
});
const ARM = 16, RETURN = 220, FADE = 140;
const ease = duration => ({duration, easing: 'ease-out'});

// Convert a pre-removal insertion slot to a one-based final index.
export function insertionIndex(from, slot, count) {
  if (from < 0 || from >= count || slot == null) return null;
  const at = Math.max(0, Math.min(count, slot));
  const target = at > from ? at - 1 : at;
  return target === from ? null : target + 1;
}
export function insertionSlot(event, index, axis = 'x') {
  const extent = axis === 'x' ? event.bounds?.width : event.bounds?.height;
  return index + ((event.local_position?.[axis] ?? 0) >= (extent ?? 1) / 2 ? 1 : 0);
}
// A dragged item's new place among `keys`: before the target when moved up, after it when
// moved down (where the drop line is drawn). Null when nothing moves.
export function movedOrder(keys, source, target) {
  const from = keys.indexOf(source), to = keys.indexOf(target);
  if (from < 0 || to < 0 || from === to) return null;
  const next = [...keys]; next.splice(from, 1); next.splice(to, 0, source);
  return next;
}
// Two edge-anchored groups, including an empty side. Coordinates are window px.
export function groupedInsertion(event, {groups, unit, scale = 1, padding = 8, source}) {
  const x = event.local_position?.x, width = event.bounds?.width;
  if (!Number.isFinite(x) || !Number.isFinite(width)) return null;
  const pitch = unit * scale, pad = padding * scale;
  const side = x <= pad + groups.left.length * pitch ? 'left'
    : x >= width - pad - groups.right.length * pitch ? 'right' : x < width / 2 ? 'left' : 'right';
  const start = side === 'left' ? pad : width - pad - groups.right.length * pitch;
  return {side, before: groups[side].find((item, i) => item.id !== source && x < start + (i + 0.5) * pitch)?.id ?? null};
}

export class ReorderDrag {
  constructor({variant = 'strip', ...options} = {}) {
    if (!Object.hasOwn(REORDER_VARIANTS, variant)) throw Error(`Unknown reorder variant: ${variant}`);
    this.options = {threshold: 5, sourceOpacity: 0.45, cancel: 'return', ...REORDER_VARIANTS[variant], ...options};
    this.current = null;
    this.leaving = null;
  }
  get active() { return Boolean(this.current?.active); }
  get view() { return this.active ? this.current : this.leaving; }
  get target() { return this.current?.target; }
  begin(id, event, cx, {meta, target = id, scale = 1, scrollOffset = 0} = {}) {
    this.leaving = null; // All older return callbacks become inert.
    this.suppressClickUntil = 0;
    this.current = {id, meta, target, start: event?.position, source: event?.bounds,
      scale: Number.isFinite(scale) && scale > 0 ? scale : 1, scrollOffset, active: false};
    cx?.notify();
  }
  activate(event) {
    const d = this.current;
    if (!d || !event?.position) return false;
    if (!d.active && d.start && Math.hypot(event.position.x - d.start.x, event.position.y - d.start.y) < this.options.threshold) return false;
    d.active = true;
    return true;
  }
  over(event, target, cx) {
    if (!this.activate(event)) return;
    this.current.target = target;
    cx.notify();
  }
  track(event, cx, {scrollOffset = 0, target} = {}) {
    if (!this.activate(event)) return;
    const d = this.current;
    if (target !== undefined) d.target = target;
    if (event.local_position) {
      const {scale} = d, offset = this.options.offset;
      d.point = {x: event.local_position.x / scale + offset.x, y: event.local_position.y / scale + offset.y};
      d.frame = {x: event.position.x - event.local_position.x, y: event.position.y - event.local_position.y, height: event.bounds?.height};
      d.home = this.home(d, scrollOffset);
    }
    cx.notify();
  }
  home(d, scrollOffset = 0) {
    if (!d.source || !d.frame) return null;
    const {scale, frame} = d, inset = this.options.returnInset;
    const y = (d.source.y - frame.y - (scrollOffset - d.scrollOffset)) / scale;
    return {x: (d.source.x - frame.x) / scale,
      y: inset ? Math.max(inset.top, Math.min((frame.height ?? Infinity) / scale - inset.bottom, y)) : y};
  }
  reset(cx) { this.current = null; this.leaving = null; cx?.notify(); }
  take(clicked, cx) {
    const d = this.current;
    if (!d) return null;
    const result = d.active ? {kind: 'drop', ...d} : d.id === clicked ? {kind: 'click', ...d} : null;
    if (d.active) this.suppressClickUntil = Date.now() + 100;
    this.reset(cx);
    return result;
  }
  cancel(cx) {
    const d = this.current;
    if (!d) return;
    this.current = null;
    if (d.active && this.options.cancel === 'return' && cx) {
      const leaving = this.leaving = {...d, home: this.home(d, this.scrollOffset?.() ?? d.scrollOffset), phase: 'arm'};
      const step = (delay, phase) => cx.timer.after(delay, cx => {
        if (this.leaving !== leaving) return;
        if (phase) leaving.phase = phase; else this.leaving = null;
        cx.notify();
      });
      step(ARM, 'return'); step(ARM + RETURN, 'fade'); step(ARM + RETURN + FADE + 40, null);
    }
    cx?.notify();
  }
  // Guard callbacks as well as styles: handlers from the preceding render may
  // still receive the event that crossed the drag threshold or ended a drop.
  guard(action) {
    return (...args) => { if (!this.active && !(Date.now() < this.suppressClickUntil)) return action(...args); };
  }
  control(element, {hover, tooltip, cursor = false} = {}) {
    return element.when(!this.active, el => el
      .when(Boolean(hover), el => el.hover(hover))
      .when(Boolean(tooltip), el => el.tooltip(tooltip))
      .when(cursor, el => el.cursor_pointer()));
  }
  dimmed(id) { const d = this.view; return Boolean(d && (d.id === id || d.meta?.sources?.includes(id)) && d.phase !== 'fade'); }
  item(element, id, options) {
    return this.control(element, options)
      .when(!this.active, el => el.transition('opacity', ease(FADE)))
      .opacity(this.dimmed(id) ? this.options.sourceOpacity : 1);
  }
  sourceLayer(element, id) {
    return element.transition('opacity', ease(FADE)).opacity(this.dimmed(id) ? 1 : 0);
  }
  surface(element, {release, target, scrollOffset = () => 0, enabled = () => true} = {}) {
    this.scrollOffset = scrollOffset;
    return element.on_mouse_move((event, cx) => {
      if (enabled()) this.track(event, cx, {scrollOffset: scrollOffset(), target: target?.(event)});
    })
      .on_mouse_up('left', (_event, cx) => { if (this.current) release?.(null, cx); })
      .on_hover((hovered, cx) => { if (!hovered) this.cancel(cx); })
      .on_mouse_down_out((_event, cx) => this.cancel(cx));
  }
  // Vertical lists may draw the line outside the item (`offset`, px: negative is into the gap
  // before/after it) and in from its sides (`inset`), so it never sits on a card's rounded edge.
  marker(id, color, {edge = 'before', offset, inset: sideInset} = {}) {
    const el = div().id(id).absolute().bg(color), inset = this.options.markerInset;
    if (this.options.axis === 'y') el.left(sideInset ?? 0).right(sideInset ?? 0).h(2).when(sideInset !== undefined, el => el.rounded(1))
      .when(edge === 'before', el => el.top(offset ?? 0)).when(edge === 'after', el => el.bottom(offset ?? 0));
    else el.top(inset).bottom(inset).w(2).rounded(1)
      .when(offset !== undefined, el => el.left(offset))
      .when(offset === undefined && edge === 'before', el => el.left(0))
      .when(offset === undefined && edge === 'after', el => el.right(0));
    return el.transition('opacity', ease(FADE)).opacity(this.view?.phase ? 0 : 1);
  }
  // A card in a vertical list of cards (Usage's providers, Settings' plugins), one interaction
  // for all of them: press anywhere on the card and drag; a line in the gap shows where it
  // lands. `keys` are the cards' keys in shown order; `id` prefixes the line's element ids.
  card(element, key, keys, t, {id, scale = 1, offset = -8, inset = 12} = {}) {
    const d = this.view, from = d ? keys.indexOf(d.id) : -1, at = keys.indexOf(key);
    return this.item(element.relative(), key)
      .when(Boolean(d) && d.target === key && d.id !== key, el => el.child(this.marker(`${id}-drop-line-${key}`, t.accent, {edge: from < at ? 'after' : 'before', offset, inset})))
      .on_mouse_down('left', (e, cx) => this.begin(key, e, cx, {scale}))
      .on_mouse_move((e, cx) => { if (this.current) this.over(e, key, cx); });
  }
  // On release: the cards' new order, or null when it was a click or nothing moved.
  dropOrder(keys, cx) {
    const result = this.take(null, cx);
    return result?.kind === 'drop' ? movedOrder(keys, result.id, result.target) : null;
  }
  preview(id, t, {icon, label, rows}) {
    const d = this.view;
    if (!d) return null;
    const iconOnly = this.options.preview === 'icon';
    const row = (icon, label) => h_flex().h(U.control).items_center().justify_center().rounded(U.radius)
      .border_1().border_color(t.border).bg(t.popover).shadow_md().text_size(U.font).text_color(t.foreground)
      .when(iconOnly, el => el.w(U.control))
      .when(!iconOnly, el => el.px(8).gap(U.gap))
      .child(icon).when(!iconOnly && Boolean(label), el => el.child(div().max_w(200).truncate().child(label)));
    const chip = rows?.length ? v_flex().children(rows.map(r=>row(r.icon,r.label))) : row(icon,label);
    if (this.active) return Popup.new(`${id}-preview`, div().size(1)).absolute()
      .left(d.point?.x ?? 8).top(d.point?.y ?? this.options.offset.y).anchor('top_left').content(chip);
    const at = d.phase === 'arm' || !d.home ? d.point : d.home;
    return chip.id(`${id}-return`).absolute().left(at?.x ?? 8).top(at?.y ?? this.options.offset.y)
      .transition('left', ease(RETURN)).transition('top', ease(RETURN)).transition('opacity', ease(FADE))
      .opacity(d.phase === 'fade' || !d.home ? 0 : 1);
  }
}

// View-local, lazy construction also works for deferred row builders/fixtures.
export function reorder(owner, variant, options) {
  return owner.reorderDrag ??= new ReorderDrag({variant, ...options});
}
