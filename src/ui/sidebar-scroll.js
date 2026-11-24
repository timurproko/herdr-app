import { div } from 'gpui-kit';
import { bottomFade, topFade } from './scroll-fade.js';
import { v_flex } from 'gpui-base';
import { U } from './ui.js';

// Dragging a row near the list's top or bottom edge scrolls it, faster deeper in.
const EDGE = 32;
const MAX_STEP = 14;
const TICK_MS = 16;

// One pure geometry projection, shared by every mutation path. Derived edges
// cannot drift from their inputs or rely on another native size callback.
export function scrollMetrics({offset = 0, viewport = 0, content = 0, bottomPadding = 0} = {}) {
  const nonnegative = value => Number.isFinite(value) ? Math.max(0, value) : 0;
  viewport = nonnegative(viewport); content = nonnegative(content); bottomPadding = nonnegative(bottomPadding);
  const max = Math.max(0, content + bottomPadding - viewport);
  offset = Math.min(max, nonnegative(offset));
  return Object.freeze({offset, viewport, content, bottomPadding, max,
    moreAbove: viewport > 0 && offset > 1,
    moreBelow: viewport > 0 && max - offset > 1});
}

// Presentation-only, event driven. Never poll or take over GPUI's retained scrolling.
export class SidebarScrollState {
  #metrics;
  #notifiedAbove = false;
  #notifiedBelow = false;
  constructor(bottomPadding = 0) {
    this.setMetrics({bottomPadding});
    this.edge = 0;
    this.step = 0;
    this.target = null;
    this.ticking = false;
  }
  get offset() { return this.#metrics.offset; }
  get viewport() { return this.#metrics.viewport; }
  get content() { return this.#metrics.content; }
  get bottomPadding() { return this.#metrics.bottomPadding; }
  get max() { return this.#metrics.max; }
  get moreAbove() { return this.#metrics.moreAbove; }
  get moreBelow() { return this.#metrics.moreBelow; }
  setMetrics(values, cx) {
    this.#metrics = scrollMetrics({...this.#metrics, ...values});
    if (cx) this.update(cx);
  }
  // Offsets auto-scroll may reach: `range()` names the first and last rows a
  // drag can drop on, and scrolling stops once they (plus the row above the
  // first, e.g. its group header) are in view. Rows are equal height (U.row).
  limits() {
    const span = this.range?.();
    const max = this.max;
    if (!span || !this.count || !this.content) return [0, max];
    const pitch = this.content * (U.row + U.rowGap) / (this.count * (U.row + U.rowGap) - U.rowGap);
    if (!(pitch > 0) || !Number.isFinite(pitch)) return [0, max];
    const row = pitch * U.row / (U.row + U.rowGap);
    const lo = Math.max(0, Math.min(max, (span[0] - 1) * pitch));
    const hi = Math.max(lo, Math.min(max, span[1] * pitch + row - this.viewport + (pitch - row)));
    return [lo, hi];
  }
  update(cx) {
    if (this.moreAbove !== this.#notifiedAbove || this.moreBelow !== this.#notifiedBelow) {
      this.#notifiedAbove = this.moreAbove;
      this.#notifiedBelow = this.moreBelow;
      cx.notify();
    }
  }
  measure(which, size, cx) {
    if (!Number.isFinite(size?.height)) return;
    if (which !== 'viewport' && which !== 'content') throw Error(`Unknown scroll measurement: ${which}`);
    this.setMetrics({[which]: size.height}, cx);
  }
  contentMotion(event, kind) {
    if (!event.bounds || !event.position) return;
    this.motion = {kind, x: event.position.x, y: event.position.y, top: event.bounds.y, delta: event.delta?.y ?? 0};
  }
  viewportMotion(event, kind, cx) {
    const motion = this.motion;
    if (!event.bounds || !event.position || !motion || motion === this.usedMotion || motion.kind !== kind || motion.x !== event.position.x || motion.y !== event.position.y) return;
    this.usedMotion = motion;
    // Both event bounds use window pixels, as does the normalized wheel delta.
    // Rebase on actual geometry, rather than accumulating guessed wheel offsets.
    this.setMetrics({viewport: event.bounds.height,
      offset: event.bounds.y - motion.top - (kind === 'wheel' ? motion.delta : 0)}, cx);
  }
  // While a row is held, the pointer's depth into the top/bottom edge band sets
  // the auto-scroll direction and speed. Leaving the frame keeps the last edge,
  // so dragging past the top keeps scrolling until release or the end.
  dragMotion(event, dragging, scroll, cx) {
    if (!event.bounds || !event.position || !dragging()) { this.edge = 0; return; }
    const y = event.position.y - event.bounds.y;
    const band = Math.min(EDGE, event.bounds.height / 4);
    const depth = y < band ? band - y : y > event.bounds.height - band ? y - (event.bounds.height - band) : 0;
    this.edge = depth <= 0 ? 0 : y < band ? -1 : 1;
    this.step = Math.max(2, Math.round(MAX_STEP * Math.min(1, depth / band)));
    if (this.edge) this.autoScroll(dragging, scroll, cx);
  }
  autoScroll(dragging, scroll, cx) {
    if (this.ticking) return;
    this.ticking = true;
    const tick = cx => {
      const [lo, hi] = this.limits();
      let next = this.offset + this.edge * this.step;
      // Never past the droppable rows, but never jump back if already beyond.
      next = this.edge < 0 ? Math.max(next, Math.min(this.offset, lo)) : Math.min(next, Math.max(this.offset, hi));
      next = Math.max(0, Math.min(this.max, next));
      if (!Number.isFinite(next)) next = this.offset;
      if (!this.edge || !dragging() || next === this.offset) {
        this.ticking = false;
        if (!dragging()) this.edge = 0;
        if (this.target !== null) { this.target = null; cx.notify(); }
        return;
      }
      this.setMetrics({offset: next});
      // The marker (the list's second child) sits where the new view begins or
      // ends; revealing it with the smallest scroll lands exactly on `next`.
      this.target = this.edge < 0 ? next : next + this.viewport - 1;
      scroll.scroll_to_item(1);
      this.update(cx);
      cx.notify();
      cx.timer.after(TICK_MS, tick);
    };
    tick(cx);
  }
}

export function sidebarScroll(owner, id, t, rows, { bottomPadding = 0, onMouseUp, dragging, scroll, range } = {}) {
  const state = owner.sidebarScroll ??= new SidebarScrollState(bottomPadding);
  state.range = range;
  state.count = rows.length;
  const drags = Boolean(dragging && scroll);
  const content = v_flex().id(`${id}-content`).w_full().flex_none().gap(U.rowGap)
    .on_size_change((size, cx) => state.measure('content', size, cx))
    .on_scroll_wheel(event => state.contentMotion(event, 'wheel'))
    .on_mouse_move(event => state.contentMotion(event, 'move'))
    .children(rows);
  const list = v_flex().id(id).size_full().min_h(0).px(8).gap(U.rowGap)
    .when(bottomPadding > 0, el => el.pb(bottomPadding))
    .overflow_y_scrollbar().mode('scrolling')
    .when(drags, el => el.track_scroll(scroll))
    .when(Boolean(onMouseUp), el => el.on_mouse_up('left', onMouseUp))
    .child(content)
    .when(drags && state.target !== null, el => el.child(
      div().id(`${id}-autoscroll`).absolute().left(0).w(1).h(1).top(state.target)));
  return div().id(`${id}-frame`).relative().flex_1().min_h(0).flex().flex_col().overflow_hidden()
    .on_size_change((size, cx) => state.measure('viewport', size, cx))
    .on_scroll_wheel((event, cx) => state.viewportMotion(event, 'wheel', cx))
    .on_mouse_move((event, cx) => {
      state.viewportMotion(event, 'move', cx);
      if (drags) state.dragMotion(event, dragging, scroll, cx);
    })
    .child(list)
    .when(state.moreAbove, el => el.child(topFade(state, id, t.chrome)))
    .when(state.moreBelow, el => el.child(bottomFade(state, id, t.chrome)));
}
