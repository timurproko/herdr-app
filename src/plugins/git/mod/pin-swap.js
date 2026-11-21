// Retained presentation: navigation is immediate, but rows stay in their old
// slots until the destination selection resolves. Only then does native motion
// run; the final layout is committed after it finishes. No JS frame loop.
export const PIN_SWAP_MS = 320;
const logicalSize = (size,zoom) => ({width:size.width / zoom,height:size.height / zoom});
const inside = (point,bounds) => point && bounds && point.x >= bounds.x && point.x <= bounds.x + bounds.width
  && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
export class PinSwap {
  constructor() { this.sizes = new Map(); this.serial = 0; }
  measureBody(size,zoom = 1) { this.bodySize = logicalSize(size,zoom > 0 ? zoom : 1); }
  measureRow(number,size,zoom = 1) { this.sizes.set(number,logicalSize(size,zoom > 0 ? zoom : 1)); }
  rowPointer(number,event) { this.pointer = {number,bounds:event.bounds,position:event.position}; }
  bodyPointer(event) { this.bodyBounds = event.bounds; }
  cancel() {
    this.waitTimer?.cancel(); this.armTimer?.cancel(); this.endTimer?.cancel();
    this.waitTimer = null; this.armTimer = null; this.endTimer = null; this.current = null;
  }
  start(snapshot,clicked,event,binding = {},cx = null) {
    this.cancel();
    const {pinned,rows,context,state} = snapshot ?? {};
    const pointer = this.pointer, bounds = this.bodyBounds, size = this.bodySize;
    if (!pinned || pinned.number === clicked.number || !rows?.some(pr=>pr.number === clicked.number)
      || !bounds || !(size?.width > 0) || !(bounds.width > 0)) return false;
    const hoveredRow = pointer?.number === clicked.number && inside(event?.position,pointer.bounds);
    if (!event?.bounds && !hoveredRow) return false;
    const scale = bounds.width / size.width;
    // Robot top = row top + 6px padding - 2px inset.
    const from = event?.bounds ? (event.bounds.y - bounds.y) / scale - 4
      : (pointer.bounds.y - bounds.y) / scale;
    const oldHeight = this.sizes.get(pinned.number)?.height, newHeight = this.sizes.get(clicked.number)?.height;
    const before = rows.filter(pr=>pr.number !== pinned.number), after = rows.filter(pr=>pr.number !== clicked.number);
    const prefix = (list,number) => {
      let y = 0;
      for (const pr of list) {
        if (pr.number === number) return y;
        const h = this.sizes.get(pr.number)?.height;
        if (!(h > 0)) return NaN;
        y += h + 2;
      }
      return NaN;
    };
    const scroll = oldHeight + 13 + prefix(before,clicked.number) - from;
    const returned = newHeight + 13 + prefix(after,pinned.number) - scroll;
    if (!(oldHeight > 0) || !(newHeight > 0) || !Number.isFinite(returned) || !Number.isFinite(from)) return false;
    const cards = [{pr:clicked,from,to:4},{pr:pinned,from:4,to:returned}];
    // Intermediate rows retain their identities too; deep-list clicks or
    // unequal card heights must not leave them jumping at the final commit.
    for (const pr of before) {
      if (pr.number === clicked.number) continue;
      const y = oldHeight + 13 + prefix(before,pr.number) - scroll;
      const to = newHeight + 13 + prefix(after,pr.number) - scroll;
      if (Number.isFinite(y) && Number.isFinite(to) && Math.abs(y-to) > 0.5) cards.push({pr,from:y,to});
    }
    const swap = this.current = {id:++this.serial,context,state,number:clicked.number,phase:'waiting',
      snapshot:{...snapshot,rows:[...rows]},...binding,cards};
    if (cx) this.waitTimer = cx.timer.after(3000,cx=>{
      if (this.current !== swap) return;
      this.cancel(); cx.notify();
    });
    return true;
  }
  rebase(context) {
    if (this.current) { this.current.context = context; this.current.snapshot.context = context; }
  }
  active(context,state) {
    const swap = this.current;
    if (swap && (swap.context !== context || swap.state !== state)) this.cancel();
    return this.current;
  }
  resolve(terminal,number,ready) {
    const swap = this.current;
    if (!swap) return;
    // Allow the source snapshot while the native focus command is queued.
    if (terminal !== swap.target) {
      if (terminal !== swap.source || swap.arrived) this.cancel();
      return;
    }
    swap.arrived = true;
    if (!ready) return;
    if (number !== swap.number) { this.cancel(); return; }
    if (swap.phase === 'waiting') {
      this.waitTimer?.cancel(); this.waitTimer = null;
      swap.phase = 'start';
    }
  }
  arm(swap,cx) {
    if (this.current !== swap || swap.phase !== 'start') return;
    swap.phase = 'armed';
    this.armTimer = cx.timer.after(16,cx=>{
      if (this.current !== swap) return;
      swap.phase = 'moving'; cx.notify();
      this.endTimer = cx.timer.after(PIN_SWAP_MS + 32,cx=>{
        if (this.current !== swap) return;
        this.finished = {context:swap.context,state:swap.state,number:swap.number};
        this.cancel(); cx.notify();
      });
    });
  }
  settled(context,state,number) {
    const finished = this.finished; this.finished = null;
    return Boolean(finished && finished.context === context && finished.state === state && finished.number === number);
  }
}
