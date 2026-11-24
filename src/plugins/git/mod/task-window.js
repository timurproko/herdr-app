// Pure projection/geometry. Native elements and callback registrations never live here.
export class TaskWindow {
  constructor() {
    this.limit = 10;
    this.items = [];
    this.starts = [0];
    this.offset = 0;
    this.viewport = 0;
    this.generation = 0;
    this.noticeHeights = new Map();
  }
  get length() { return Math.min(this.limit, this.items.length); }
  get height() { return this.starts[this.length] ?? 0; }
  get max() { return Math.max(0, this.height + 8 - this.viewport); }
  index(y) {
    let lo = 0, hi = this.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (this.starts[mid + 1] <= y) lo = mid + 1; else hi = mid; }
    return lo;
  }
  project(sections, folded, headerHeight, gap, geometryKey) {
    const items = [];
    for (const section of sections) {
      const group = [{key:`header:${section.repo}`,repo:section.repo,header:true,height:headerHeight}];
      if (!folded.has(section.repo)) {
        for (const row of section.rows) group.push({key:row.key,repo:section.repo,row,height:74});
        if (section.error) {
          const measureKey = `${geometryKey}\0${section.repo}\0${section.error}`;
          group.push({key:`notice:${section.repo}`,repo:section.repo,error:section.error,measureKey,height:this.noticeHeights.get(measureKey) ?? 24.5});
        }
      }
      group.forEach((item,i) => { item.gap = i < group.length - 1 ? gap : 0; items.push(item); });
    }
    const changed = items.length !== this.items.length || items.some((item,i) => {
      const old = this.items[i];return item.key !== old?.key || item.height !== old.height || item.gap !== old.gap || item.error !== old.error;
    });
    const anchorIndex = this.index(Math.max(0,this.offset - 4)), anchor = this.items[anchorIndex];
    const inset = this.offset - (this.starts[anchorIndex] ?? 0);
    this.items = items; // Refresh immutable PR facts even when geometry is unchanged.
    if (!changed) return;
    this.starts = [0];
    for (const item of items) this.starts.push(this.starts.at(-1) + item.height + item.gap);
    if (anchor) {
      const at = items.findIndex(item => item.key === anchor.key);
      if (at >= 0) {
        this.limit = Math.max(this.limit,at + 1);
        const target = Math.max(0,Math.min(this.max,this.starts[at] + inset));
        if (target !== this.offset) { this.correction = {from:this.offset,to:target};this.offset = target; }
      }
    }
    this.offset = Math.min(this.offset,this.max);
    this.generation++;
    this.selection = null;
  }
  range() {
    // Before layout build a small first window, not an inventory-sized tree.
    const start = Math.max(0,this.offset - 4), end = start + (this.viewport || 400);
    const first = this.index(start), last = Math.min(this.length,this.index(end) + 1);
    const from = this.viewport ? this.index(Math.max(0,start - 74)) : 0;
    const to = this.viewport ? Math.min(this.length,this.index(end + 74) + 1) : Math.min(10,this.length);
    const visible = this.viewport ? this.items.slice(first,last).filter((item,i) => item.row && this.starts[first+i] < end).map(item=>item.row) : [];
    const selection = visible.map(row=>row.key).join('\0');
    if (this.selection !== selection) { this.selection = selection;this.generation++; }
    return {from,to,items:this.items.slice(from,to),top:this.starts[from] ?? 0,bottom:this.height-(this.starts[to] ?? this.height),visible};
  }
  move(offset, viewport, preserveAnchor = false) {
    this.viewport = Math.max(0,viewport);
    this.offset = Math.max(0,Math.min(this.max,preserveAnchor && this.correction ? this.offset : offset));
    if (!preserveAnchor) this.correction = null;
    const before = this.limit;
    if (this.max - this.offset <= 120 && this.limit < this.items.length) this.limit = Math.min(this.items.length,this.limit + 10);
    const range = this.range(), key = `${range.from}:${range.to}:${this.limit}`;
    const changed = this.windowKey !== key || before !== this.limit;
    this.windowKey = key;
    return changed;
  }
}
