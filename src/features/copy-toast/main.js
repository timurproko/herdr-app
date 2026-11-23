// Best-effort native mouse copy-on-select feedback. The host publishes selection
// endpoints, not mouse release/copy completion. Settled selection + clipboard
// checks are inference only; unchanged-selection shortcut copies are not observed.
import { View, div } from 'gpui-kit';
import { terminals, panes, focused, settings, window, checking, notify } from './host.js';
import { selectionSignature, selectionsByTerminal, changedTerminal, countChars, copiedLabel, copyDecision } from './model.js';

const SETTLE_MS = 300;
const RETRY_MS = 400;
const RETRIES = 5;

export default class CopyToast extends View {
  init() {
    this.signature = '';
    this.selections = {};
    this.clip = undefined;
    this.observing = false;
    this.check = null;
    this.generation = 0;
    this.closed = false;
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
      // One standard toast per settled selection, including same-text inference.
      // Do not post another toast if the clipboard changes on a later retry.
      notify({ title: copiedLabel(countChars(text)), level: 'success', timeout: 3000 });
    } else if (left > 0) {
      this.check = cx.timer.after(RETRY_MS, cx => this.poll(cx, binding, left - 1));
    }
  }

  close() {
    this.closed = true;
    this.cancel();
    this.clip = undefined;
  }

  render(cx) {
    if (!this.enabled()) {
      this.cancel();
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
    // Keep the existing layout-owned observer, but let the standard toast mod
    // own all notification appearance, placement, lifetime and animation.
    return div();
  }
}
