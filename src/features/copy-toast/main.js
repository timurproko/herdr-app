// Best-effort native mouse copy-on-select feedback. The host publishes selection
// endpoints, not mouse release/copy completion. Settled selection + clipboard
// checks are inference only; unchanged-selection shortcut copies are not observed.
import { View, div } from 'gpui-kit';
import { Popup } from 'gpui-base';
import { terminals, panes, focused, settings, theme, window, checking } from './host.js';
import { selectionSignature, selectionsByTerminal, changedTerminal, countChars, copiedLabel, copyDecision } from './model.js';
import { U } from './ui.js';

const SETTLE_MS = 300;
const RETRY_MS = 400;
const RETRIES = 5;
const SHOW_MS = 2000;
const FADE_MS = 180;
const SLIDE_PX = 6;
const ARM_MS = 16;

export default class CopyToast extends View {
  init() {
    this.signature = '';
    this.selections = {};
    this.clip = undefined;
    this.observing = false;
    this.check = null;
    this.generation = 0;
    this.closed = false;
    this.count = 0;
    this.phase = 'hidden'; // hidden -> armed -> in -> out -> hidden
    this.hide = null;
    this.popupGeneration = 0;
    this.tab = null;
  }

  enabled() {
    // window() can be empty at cold startup. Reading it during render subscribes
    // to its later publication; never latch transient missing facts in init().
    return !this.closed && !checking() && window()?.platform === 'windows' && settings()?.copy_on_select !== false;
  }

  readClipboard(cx) {
    try { return cx.read_from_clipboard(); }
    catch { return undefined; }
  }

  cancel() {
    this.check?.cancel();
    this.check = null;
    this.generation++;
  }

  poll(cx, binding, left) {
    const focus = focused();
    if (binding.generation !== this.generation || !this.enabled()
      || binding.signature !== selectionSignature(terminals())
      || focus?.tab !== binding.tab || (focus?.shown || focus?.terminal) !== binding.terminal) return;
    this.check = null;
    const text = this.readClipboard(cx);
    const decision = copyDecision(text, this.clip, RETRIES - left, false);
    if (decision === 'show' || decision === 'assume') {
      this.clip = text;
      // One popup per settled selection, including same-text inference.
      // Do not show another if the clipboard changes on a later retry.
      this.show(cx, countChars(text), binding.tab);
    } else if (left > 0) {
      this.check = cx.timer.after(RETRY_MS, cx => this.poll(cx, binding, left - 1));
    }
  }

  dismiss() {
    this.hide?.cancel();
    this.hide = null;
    this.popupGeneration++;
    this.phase = 'hidden';
    this.tab = null;
  }

  // Separate from selection-check generations: a new selection must not cancel
  // an already-visible copy. Guard callbacks even if cancellation was too late.
  animate(cx, ms, update) {
    this.hide?.cancel();
    const generation = ++this.popupGeneration;
    this.hide = cx.timer.after(ms, cx => {
      if (generation !== this.popupGeneration) return;
      this.hide = null;
      if (!this.enabled()) this.dismiss();
      else update(cx);
      cx.notify();
    });
  }

  show(cx, count, tab) {
    this.count = count;
    this.tab = tab;
    if (this.phase === 'in') this.stay(cx);
    else {
      this.phase = 'armed';
      this.animate(cx, ARM_MS, cx => { this.phase = 'in'; this.stay(cx); });
    }
    cx.notify();
  }

  stay(cx) {
    this.animate(cx, SHOW_MS, cx => {
      this.phase = 'out';
      this.animate(cx, FADE_MS, () => { this.phase = 'hidden'; this.tab = null; });
    });
  }

  close() {
    this.closed = true;
    this.cancel();
    this.dismiss();
    this.clip = undefined;
  }

  render(cx) {
    if (!this.enabled()) {
      this.cancel();
      this.dismiss();
      this.observing = false;
      this.signature = '';
      this.selections = {};
      this.clip = undefined;
      return div();
    }
    if (!this.observing) {
      this.clip = this.readClipboard(cx);
      this.observing = true;
    }
    const list = terminals(), signature = selectionSignature(list);
    if (signature !== this.signature) {
      this.cancel();
      const next = selectionsByTerminal(list), terminal = changedTerminal(this.selections, next);
      this.signature = signature;
      this.selections = next;
      const focus = focused();
      const tab = (terminal && panes().find(p => p.terminal === terminal)?.tab) || focus?.tab || null;
      if (terminal && tab && (focus?.shown || focus?.terminal) === terminal && focus?.tab === tab) {
        const binding = { signature, terminal, tab, generation: this.generation };
        this.check = cx.timer.after(SETTLE_MS, cx => this.poll(cx, binding, RETRIES));
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
