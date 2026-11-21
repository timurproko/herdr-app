// "Copied N chars to clipboard" for Herdr's native copy-on-select, shown like a1's
// notice at the bottom right of the terminal area. Herdr reports selection changes
// but not the mouse release that copies, so after the selection settles this reads
// the clipboard: new text shows the notice at once; text that stays the same is
// taken as the same text copied again (Herdr skips writing identical text).
import { View, div } from 'gpui-kit';
import { Popup } from 'gpui-base';
import { terminals, panes, focused, exec, settings, theme, window, checking } from './host.js';
import { selectionSignature, selectionsByTerminal, changedTerminal, countChars, copiedLabel, copyDecision } from './model.js';
import { U } from './ui.js';

const SETTLE_MS = 300;    // selection quiet for this long: the drag has probably ended
const RETRY_MS = 400;     // clipboard not updated yet (still holding): look again
const RETRIES = 5;
const SHOW_MS = 2000;
const FADE_MS = 180;     // fade + slide in and out
const SLIDE_PX = 6;
const ARM_MS = 16;      // one frame at the start state, so the native transition runs
const READ_CLIPBOARD = "[Console]::OutputEncoding=[Text.Encoding]::UTF8;$t=Get-Clipboard -Raw;if($null -eq $t){'null'}else{ConvertTo-Json -Compress -InputObject ([string]$t)}";

export default class CopyToast extends View {
  init(_props, cx) {
    this.signature = '';
    this.clip = undefined;
    this.count = 0;
    this.phase = 'hidden'; // hidden -> armed -> in -> out -> hidden
    this.check = null;
    this.hide = null;
    this.tab = null;        // the tab the copy happened in; the notice shows only there
    this.selectionTab = null;
    this.selections = {};
    if (checking() || window()?.platform !== 'windows' || settings()?.copy_on_select === false) { this.off = true; return; }
    cx.spawn(async (cx) => { const t = await this.readClipboard(); if (this.clip === undefined) this.clip = t; });
  }

  async readClipboard() {
    try {
      const r = await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', READ_CLIPBOARD], { timeout: 5000 });
      if (r.code !== 0) return undefined;
      const out = r.stdout.trim();
      return out === 'null' || out === '' ? null : JSON.parse(out);
    } catch { return undefined; }
  }

  schedule(cx) {
    this.check?.cancel();
    this.check = cx.timer.after(SETTLE_MS, (cx) => this.poll(cx, RETRIES));
  }

  poll(cx, left, shown = false) {
    const signature = this.signature, tab = this.selectionTab;
    cx.spawn(async (cx) => {
      const text = await this.readClipboard();
      if (signature !== this.signature || !signature) return; // selection moved on or was cleared
      const decision = copyDecision(text, this.clip, RETRIES - left, shown);
      if (decision === 'show') {
        this.clip = text;
        this.show(cx, countChars(text), tab);
        return;
      }
      if (decision === 'assume') { shown = true; this.show(cx, countChars(text), tab); }
      if (left > 0) this.check = cx.timer.after(RETRY_MS, (cx) => this.poll(cx, left - 1, shown));
    });
  }

  show(cx, count, tab) {
    this.count = count;
    this.tab = tab;
    this.hide?.cancel();
    if (this.phase === 'in') this.stay(cx); // already showing: just update and keep it up
    else {
      this.phase = 'armed';
      this.hide = cx.timer.after(ARM_MS, (cx) => { this.phase = 'in'; cx.notify(); this.stay(cx); });
    }
    cx.notify();
  }

  stay(cx) {
    this.hide?.cancel();
    this.hide = cx.timer.after(SHOW_MS, (cx) => {
      this.phase = 'out';
      cx.notify();
      this.hide = cx.timer.after(FADE_MS, (cx) => { this.phase = 'hidden'; cx.notify(); });
    });
  }

  render(cx) {
    if (!this.off) {
      const list = terminals(), signature = selectionSignature(list);
      if (signature !== this.signature) {
        const next = selectionsByTerminal(list), address = changedTerminal(this.selections, next);
        this.signature = signature;
        this.selections = next;
        // The tab of the terminal whose selection changed, else the shown one.
        this.selectionTab = (address && panes().find(p => p.terminal === address)?.tab) || focused()?.tab || null;
        if (signature) this.schedule(cx);
      }
    }
    if (this.phase === 'hidden' || (this.tab && focused()?.tab !== this.tab)) return div();
    const on = this.phase === 'in';
    // The terminals' own font (settings: font_family, else font), in white.
    const s = settings() || {}, t = theme();
    const font = typeof s.font_family === 'string' ? s.font_family : typeof s.font === 'string' ? s.font : null;
    // Herdr frames a floating block and that frame can't animate, so the block stays
    // empty and anchors a popup that draws its own box: the whole box fades and slides.
    const box = div().id('copy-toast').relative().px(10).py(4).rounded(U.radius)
      .bg(t.popover).border(1).border_color(t.border)
      .transition('opacity', { duration: FADE_MS, easing: 'ease-out' })
      .transition('top', { duration: FADE_MS, easing: 'ease-out' })
      .opacity(on ? 1 : 0).top(on ? 0 : SLIDE_PX)
      .text_size(U.meta).text_color('#ffffff')
      .when(!!font, el => el.font_family(font))
      .child(copiedLabel(this.count));
    return Popup.new('copy-toast-anchor', div().size(0)).anchor('bottom_center').content(box);
  }
}
