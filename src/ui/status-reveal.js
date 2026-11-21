// Status bar reveal: one rule, applied to every item, so nothing flashes needlessly.
// An item hides only when what it shows changed or it moved (something to its left
// appeared, vanished, changed or is being read); hidden items then reveal strictly left
// to right, once the bar has stopped changing.
//
// The bar hands its items over in display order; each is an element with an `id`
// (retained, so the native opacity transition can ease it):
//
//   const reveal = this.reveal ??= new StatusReveal();
//   bar.children(reveal.items([
//     { id: "machine", element: machineLabel, value: machine },
//     branchKnown ? branch && { id: "branch", element: branchLabel, value: branch }
//                 : { id: "branch", loading: true },
//     { id: "claude", element: account, value: email },
//   ]));
//   reveal.settle(cx); // after the render that called items()
//
// - value: what the item shows; a change re-reveals it and what it moves. Default null.
// - loading: its value is still being read. It draws nothing (no placeholder value) and
//   the items to its right wait for it, up to `hold` ms, so they reveal once, after it.
// - Falsy entries are skipped, so `cond && {...}` works for optional items.
//
// Example, [pc, branch, claude] → new folder: claude hides (the branch is being read),
// then the branch reveals and claude follows; pc never blinks. In-between states (a
// value that is briefly empty) don't cause a second flash: hidden items reveal `first` ms
// after the last change, in order, `step` ms apart. Hiding is instant (new text never
// flashes); revealing eases natively. Only one-shot redraws run, and only while pending.
// A redraw this soon after hiding arms the eased reveal (about one frame).
const ARM_MS = 16;

export class StatusReveal {
  constructor({ first = 60, step = 90, hold = 2000, duration = 180 } = {}) {
    Object.assign(this, { first, step, hold, duration });
    this.seen = new Map();    // id -> { key, revealed }: what it showed where
    this.loading = new Map(); // id -> since: items whose value is being read
    this.changedAt = -Infinity;
    this.next = Infinity;
  }

  items(list, now = Date.now()) {
    const entries = [], left = [], shown = new Set();
    let changed = false;
    for (const item of list) {
      if (!item) continue;
      shown.add(item.id);
      if (item.loading) {
        if (!this.loading.has(item.id)) this.loading.set(item.id, now);
        left.push([item.id, "…"]);
        entries.push({ item });
        continue;
      }
      this.loading.delete(item.id);
      const value = item.value ?? null;
      // What it shows, and what sits to its left and shows there (its position).
      const key = JSON.stringify([value, left]);
      left.push([item.id, value]);
      let entry = this.seen.get(item.id);
      if (entry?.key !== key) { entry = { key, revealed: false }; this.seen.set(item.id, entry); changed = true; }
      entries.push({ item, entry });
    }
    for (const id of [...this.seen.keys()]) if (!shown.has(id)) { this.seen.delete(id); changed = true; }
    for (const id of [...this.loading.keys()]) if (!shown.has(id)) this.loading.delete(id);
    if (changed) this.changedAt = now;

    // Hidden items reveal in order, starting `first` ms after the last change; nothing
    // passes an item still being read (until its hold runs out).
    const out = [];
    let at = this.changedAt + this.first, blocked = false;
    this.next = Infinity;
    for (const { item, entry } of entries) {
      if (!entry) {
        const until = this.loading.get(item.id) + this.hold;
        if (until > now) { blocked = true; this.next = Math.min(this.next, until); }
        continue;
      }
      const { element } = item;
      // Items hidden since the last change form one wave; each takes the next turn.
      if (!entry.revealed) entry.wave = this.changedAt;
      if (entry.wave === this.changedAt) {
        const turn = at;
        at += this.step;
        if (!entry.revealed) {
          // A transition starts from the current value, so hiding with one (even 1ms)
          // paints a frame of the new content fully visible: hide without it. It only
          // eases a later change if declared beforehand, so a hidden frame with it
          // ("armed", still at 0) is drawn before the reveal.
          if (!entry.hidden) {
            entry.hidden = true;
            this.next = Math.min(this.next, now + ARM_MS);
            out.push(element.opacity(0));
            continue;
          }
          if (blocked || turn > now || !entry.armed) {
            if (!blocked) this.next = Math.min(this.next, entry.armed ? turn : now + ARM_MS);
            entry.armed = true;
            out.push(element.transition("opacity", { duration: this.duration, easing: "ease-out" }).opacity(0));
            continue;
          }
          entry.revealed = true;
        }
      }
      out.push(element.transition("opacity", { duration: this.duration, easing: "ease-out" }).opacity(1));
    }
    return out;
  }

  // One-shot redraw at the next reveal or hold expiry; nothing runs when settled.
  settle(cx, now = Date.now()) {
    if (Number.isFinite(this.next)) cx.timer.after(Math.max(16, this.next - now), cx => cx.notify());
  }
}
