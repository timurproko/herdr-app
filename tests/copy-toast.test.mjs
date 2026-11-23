// Copy notice: selection signature, character count and label wording.
import assert from 'node:assert/strict';
import { selectionSignature, countChars, copiedLabel } from '../src/features/copy-toast/model.js';

assert.equal(selectionSignature([{ address: 't1', selection: null }]), '');
const sel = (a, r0, c0, r1, c1) => ({ address: a, selection: { start: { row: r0, col: c0 }, end: { row: r1, col: c1 } } });
assert.equal(selectionSignature([sel('t2', 1, 2, 3, 4), sel('t1', 0, 0, 0, 5)]), 't1:0,0-0,5|t2:1,2-3,4');
assert.notEqual(selectionSignature([sel('t1', 0, 0, 0, 5)]), selectionSignature([sel('t1', 0, 0, 0, 6)]));
assert.equal(countChars('questions'), 9);
assert.equal(countChars('a\r\nb'), 3);
assert.equal(countChars('ok 👍'), 4);
assert.equal(copiedLabel(9), 'Copied 9 chars to clipboard');
assert.equal(copiedLabel(1), 'Copied 1 char to clipboard');
console.log('copy-toast ok');

const { selectionsByTerminal, changedTerminal } = await import('../src/features/copy-toast/model.js');
const before = selectionsByTerminal([sel('t1', 0, 0, 0, 5)]);
assert.equal(changedTerminal(before, selectionsByTerminal([sel('t1', 0, 0, 0, 5), sel('t2', 1, 1, 1, 3)])), 't2');
assert.equal(changedTerminal(before, selectionsByTerminal([sel('t1', 0, 0, 0, 7)])), 't1');
assert.equal(changedTerminal(before, {}), null);
console.log('copy-toast tab ok');

const { copyDecision } = await import('../src/features/copy-toast/model.js');
assert.equal(copyDecision('new', 'old', 0, false), 'show');      // new text: at once
assert.equal(copyDecision('same', 'same', 0, false), 'wait');    // first check: maybe still dragging
assert.equal(copyDecision('same', 'same', 1, false), 'assume');  // re-copy of identical text
assert.equal(copyDecision('same', 'same', 2, true), 'wait');     // already shown: no repeat
assert.equal(copyDecision('late', 'same', 3, true), 'show');     // a late real change still wins
assert.equal(copyDecision(null, 'x', 4, false), 'wait');
assert.equal(copyDecision(undefined, 'x', 1, false), 'wait');    // read failed
console.log('copy-toast same-text ok');

// Actual controller + real model, synthetic host/clipboard and deterministic
// one-shot timers. No real terminal, clipboard, process or native UI is touched.
const fs = await import('node:fs');
const vm = await import('node:vm');
const model = await import('../src/features/copy-toast/model.js');

// Record the actual rendered tree, including transition declarations. Unexpected
// UI methods/imports fail rather than letting an empty render pass as a popup.
class Element {
  constructor(type = 'div') { this.type = type; this.props = {}; this.children = []; }
  when(condition, callback) { return condition ? callback(this) : this; }
  child(value) { this.children.push(value); return this; }
  content(value) { this.children.push(value); return this; }
  transition(property, options) {
    (this.props.transitions ??= {})[property] = JSON.parse(JSON.stringify(options));
    return this;
  }
}
for (const method of ['id', 'relative', 'px', 'py', 'rounded', 'bg', 'border', 'border_color',
  'opacity', 'top', 'text_size', 'text_color', 'font_family', 'size', 'anchor']) {
  Element.prototype[method] = function (value = true) { this.props[method] = value; return this; };
}
async function harness(initialWindow) {
  const state = { window: arguments.length ? initialWindow : { platform: 'windows' }, settings: {}, checking: false, list: [],
    focus: { tab: 'tab1', terminal: 't1', shown: null },
    panes: [{ tab: 'tab1', terminal: 't1' }], clipboard: 'old', unreadable: false,
    notices: [], reads: 0, windowReads: 0, redraws: 0,
    theme: { popover: '#202020', border: '#404040' } };
  const context = vm.createContext({});
  const modules = {
    'gpui-kit': { View: class {}, div: () => new Element() },
    'gpui-base': { Popup: { new: (id, trigger) => new Element('popup').id(id).child(trigger) } },
    './ui.js': { U: { meta: 12, radius: 6 } },
    './model.js': model,
    './host.js': {
      terminals: () => state.list, panes: () => state.panes, focused: () => state.focus,
      settings: () => state.settings, checking: () => state.checking,
      window: () => { state.windowReads++; return state.window; },
      theme: () => state.theme,
      notify() { assert.fail('Terminal copy must not use the standard notification system'); },
      exec() { assert.fail('Copy observer must not launch a clipboard process'); },
    },
  };
  const source = fs.readFileSync(new URL('../src/features/copy-toast/main.js', import.meta.url), 'utf8');
  const main = new vm.SourceTextModule(source, { context });
  await main.link(specifier => {
    assert.ok(modules[specifier], `Unexpected controller import: ${specifier}`);
    const values = modules[specifier];
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
  });
  await main.evaluate();
  let now = 0;
  const timers = [];
  const cx = {
    notify() { state.redraws++; },
    read_from_clipboard() {
      state.reads++;
      if (state.unreadable) throw Error('Clipboard busy');
      return state.clipboard;
    },
    write_to_clipboard() { assert.fail('Observer must leave the clipboard untouched'); },
    spawn() { assert.fail('Observer needs no background process/task'); },
    timer: { after(ms, callback) {
      const timer = { at: now + ms, callback, canceled: false, fired: false,
        cancel() { timer.canceled = true; } };
      timers.push(timer);
      return timer;
    } },
  };
  const controller = new main.namespace.default();
  controller.init({}, cx);
  function render() { return controller.render(cx); }
  const show = controller.show;
  controller.show = function (...args) {
    show.apply(this, args);
    const tree = render();
    assert.equal(tree.type, 'popup', 'Each copy decision must render the private popup');
    state.notices.push(tree.children[1].children[0]);
  };
  function advance(ms) {
    const end = now + ms;
    let runs = 0;
    for (;;) {
      const timer = timers.filter(t => !t.canceled && !t.fired && t.at <= end).sort((a,b) => a.at - b.at)[0];
      if (!timer) break;
      assert.ok(++runs < 100, 'Timer work must be bounded');
      now = timer.at;
      timer.fired = true;
      timer.callback(cx);
    }
    now = end;
  }
  const select = end => { state.list = [sel('t1', 0, 0, 0, end)]; render(); };
  return { state, controller, cx, render, advance, select, timers,
    pending: () => timers.filter(t => !t.canceled && !t.fired).length };
}
const customNotice = count => copiedLabel(count);

for (const absent of [null, undefined, {}]) {
  const h = await harness(absent);
  h.render();
  assert.ok(h.state.windowReads > 0, 'Render must read live window facts to subscribe to publication');
  assert.equal(h.state.reads, 0, 'No clipboard reads before Windows facts arrive');
  assert.equal(h.pending(), 0);
  h.state.window = { platform: 'windows' };
  h.render();
  assert.equal(h.state.reads, 1, 'Publication starts observing without reinitialization');
  // Mouse-down/drag changes the host selection. Native release writes the
  // clipboard separately, without another selection-endpoint change.
  h.select(2); h.advance(100); h.select(4); h.advance(100);
  h.state.clipboard = 'hello'; // simulated native copy-on-select on mouse release
  h.advance(199);
  assert.equal(h.state.notices.length, 0, 'Wait until the last selection change settles');
  h.advance(1);
  assert.deepEqual(h.state.notices, [customNotice(5)]);
  assert.equal(h.state.clipboard, 'hello');
  assert.equal(h.state.list[0].selection.end.col, 4, 'Feedback preserves native selection');
  h.render(); h.advance(10000);
  assert.equal(h.state.notices.length, 1, 'Unchanged render/selection must not repeat the toast');
  assert.equal(h.pending(), 0);
}
console.log('copy-toast controller: cold-start publication and mouse selection ok');

{
  const h = await harness(); h.render();
  h.select(3); h.state.clipboard = 'ok 👍'; h.advance(300);
  assert.deepEqual(h.state.notices, [customNotice(4)], 'Controller uses Unicode code-point count');
  // A new mouse gesture can reselect the same text; an unchanged shortcut copy
  // has no selection transition and cannot reliably be observed.
  h.state.list = []; h.render(); h.select(3);
  h.advance(300); assert.equal(h.state.notices.length, 1);
  h.advance(400); assert.deepEqual(h.state.notices, [customNotice(4), customNotice(4)]);
  h.state.clipboard = 'a late update'; h.advance(5000);
  assert.equal(h.state.notices.length, 2, 'A late clipboard update cannot duplicate custom feedback');
}
{
  const h = await harness(); h.render(); h.select(3);
  h.state.list = []; h.render(); h.state.clipboard = 'copied'; h.advance(5000);
  assert.equal(h.state.notices.length, 0, 'Clearing the selection cancels pending work');
  assert.equal(h.pending(), 0);
}
for (const disable of [h => { h.state.settings.copy_on_select = false; }, h => { h.state.window = {}; }, h => { h.state.checking = true; }]) {
  const h = await harness(); h.render(); h.select(2);
  disable(h); h.render(); h.state.clipboard = 'copy'; h.advance(5000);
  assert.equal(h.state.notices.length, 0, 'Eligibility changes cancel pending feedback');
  assert.equal(h.pending(), 0);
  h.state.settings = {}; h.state.window = { platform: 'windows' }; h.state.checking = false;
  h.state.list = []; h.render(); h.select(4); h.state.clipboard = 'later'; h.advance(300);
  assert.deepEqual(h.state.notices, [customNotice(5)], 'Re-enabling takes a fresh baseline and resumes');
}
for (const mutate of [h => { h.state.settings.copy_on_select = false; }, h => { h.state.list = []; }, h => { h.state.focus = { tab: 'other', terminal: 't1' }; }, h => { h.state.focus = { tab: 'tab1', terminal: 't2' }; }]) {
  const h = await harness(); h.render(); h.select(3); h.state.clipboard = 'copy';
  // The callback must check current facts even before another render occurs.
  mutate(h); h.advance(5000);
  assert.equal(h.state.notices.length, 0, 'Live callback guard rejects stale/disabled source');
  assert.equal(h.pending(), 0);
}
for (const value of ['', undefined, null]) {
  const h = await harness(); h.render(); h.select(3); h.state.clipboard = value; h.advance(5000);
  assert.equal(h.state.notices.length, 0, 'Empty/missing clipboard never produces success');
  assert.equal(h.pending(), 0, 'Retries exhaust rather than poll indefinitely');
  assert.equal(h.state.reads, 7, 'One baseline and six bounded checks');
}
{
  const h = await harness(); h.render(); h.select(3); h.state.unreadable = true; h.advance(5000);
  assert.equal(h.state.notices.length, 0); assert.equal(h.pending(), 0);
}
{
  const h = await harness(); h.render(); h.select(3);
  const stale = h.timers.at(-1); h.select(4); h.state.clipboard = 'new';
  stale.callback(h.cx); // a canceled callback already queued by the native loop
  assert.equal(h.state.notices.length, 0, 'Superseded generation cannot publish');
  h.advance(300); assert.deepEqual(h.state.notices, [customNotice(3)]);
  h.state.list = []; h.render(); h.select(4);
  const closing = h.timers.at(-1); h.controller.close(); closing.callback(h.cx); h.advance(5000);
  assert.equal(h.state.notices.length, 1, 'Close invalidates pending and already-queued callbacks');
  assert.equal(h.pending(), 0);
}
for (const options of [{ platform: 'macos' }, { platform: 'linux' }]) {
  const h = await harness(options); h.render(); h.select(3); h.advance(5000);
  assert.equal(h.state.reads, 0, 'Preserve the reviewed Windows-only support boundary');
}
{
  const h = await harness(); h.state.checking = true; h.render(); h.select(3); h.advance(5000);
  assert.equal(h.state.reads, 0, 'Native eager checks do no clipboard work');
}
console.log('copy-toast controller: custom popup, recopy inference, cancellation, bounded reads and native safety ok');

function box(h) {
  const tree = h.render();
  assert.equal(tree.type, 'popup');
  assert.deepEqual(tree.props, { id: 'copy-toast-anchor', anchor: 'bottom_center' });
  assert.deepEqual(tree.children[0].props, { size: 0 }, 'Floating block remains empty and zero-size');
  assert.deepEqual(tree.children[0].children, []);
  assert.equal(tree.children.length, 2);
  return tree.children[1];
}
function hidden(h) {
  const tree = h.render();
  assert.equal(tree.type, 'div');
  assert.deepEqual(tree.props, {});
  assert.deepEqual(tree.children, []);
}
async function copied(text = 'hello') {
  const h = await harness(); h.render(); h.select(3);
  h.state.clipboard = text; h.advance(300);
  return h;
}

// The existing layout and packaging are part of the original popup placement.
{
  const layout = JSON.parse(fs.readFileSync(new URL('../src/appearance/layouts/Custom.json', import.meta.url), 'utf8'));
  const floating = [];
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    if (value.id === 'copy-toast') floating.push(value);
    for (const child of Object.values(value)) walk(child);
  }
  walk(layout);
  assert.deepEqual(floating, [{ id: 'copy-toast', content: { mod: 'custom-copy-toast' }, edge: 'bottom', align: 'center' }]);
  const manifest = JSON.parse(fs.readFileSync(new URL('../customization.json', import.meta.url), 'utf8'));
  assert.equal(manifest.files['mods/custom-copy-toast/ui.js'], 'src/ui/ui.js');
}
{
  const h = await copied('x');
  h.state.settings = { font_family: 'Terminal Font', font: 'Fallback Font' };
  assert.equal(h.controller.phase, 'armed');
  assert.deepEqual(box(h).props, {
    id: 'copy-toast', relative: true, px: 10, py: 4, rounded: 6,
    bg: '#202020', border: 1, border_color: '#404040',
    transitions: {
      opacity: { duration: 180, easing: 'ease-out' },
      top: { duration: 180, easing: 'ease-out' },
    },
    opacity: 0, top: 6, text_size: 12, text_color: '#ffffff', font_family: 'Terminal Font',
  });
  assert.deepEqual(box(h).children, ['Copied 1 char to clipboard']);
  h.advance(15); assert.equal(h.controller.phase, 'armed');
  h.advance(1); assert.equal(h.controller.phase, 'in');
  assert.equal(box(h).props.opacity, 1); assert.equal(box(h).props.top, 0);
  h.advance(1999); assert.equal(h.controller.phase, 'in');
  h.advance(1); assert.equal(h.controller.phase, 'out');
  assert.equal(box(h).props.opacity, 0); assert.equal(box(h).props.top, 6);
  h.advance(179); assert.equal(h.controller.phase, 'out');
  h.advance(1); assert.equal(h.controller.phase, 'hidden'); hidden(h);
  assert.equal(h.pending(), 0);
  assert.equal(h.state.redraws, 4, 'One notification per presentation phase, not a frame loop');
}
for (const [settings, expected] of [
  [{ font: 'Fallback Font' }, 'Fallback Font'],
  [{ font_family: 7, font: 'Fallback Font' }, 'Fallback Font'],
  [{}, undefined], [{ font_family: null, font: false }, undefined],
]) {
  const h = await copied(); h.state.settings = settings;
  assert.equal(box(h).props.font_family, expected);
  h.state.theme = { popover: '#abcdef', border: '#fedcba' };
  assert.equal(box(h).props.bg, '#abcdef'); assert.equal(box(h).props.border_color, '#fedcba');
}
{
  const h = await copied(); h.advance(16);
  h.state.focus = { tab: 'another-tab', terminal: 't2' }; hidden(h);
  h.advance(500); hidden(h);
  h.state.focus = { tab: 'tab1', terminal: 't1' };
  assert.deepEqual(box(h).children, ['Copied 5 chars to clipboard']);
  h.advance(2000); hidden(h);
}
{
  const h = await copied();
  const armed = h.timers.at(-1); h.advance(16);
  const originalHide = h.timers.at(-1);
  h.advance(1000); h.select(4);
  assert.equal(h.pending(), 2, 'A new selection must not cancel visible feedback');
  assert.equal(box(h).props.opacity, 1);
  h.state.clipboard = 'new text'; h.advance(300);
  assert.equal(h.controller.phase, 'in', 'Another copy renews the hold without rearming');
  assert.deepEqual(box(h).children, ['Copied 8 chars to clipboard']);
  const redraws = h.state.redraws;
  armed.callback(h.cx); originalHide.callback(h.cx);
  assert.equal(h.state.redraws, redraws, 'Already-queued old phase callbacks do nothing');
  assert.equal(h.pending(), 1);
  h.advance(1999); assert.equal(h.controller.phase, 'in');
  h.advance(1); assert.equal(h.controller.phase, 'out');
  const fading = h.timers.at(-1);
  h.controller.show(h.cx, 2, 'tab1');
  assert.equal(h.controller.phase, 'armed', 'A new copy during fade restarts the reveal');
  fading.callback(h.cx); assert.equal(h.controller.phase, 'armed');
  const firstArm = h.timers.at(-1);
  h.controller.show(h.cx, 3, 'tab1'); firstArm.callback(h.cx);
  assert.equal(h.controller.phase, 'armed', 'Rearming invalidates the previous arming callback');
  h.advance(16); assert.equal(h.controller.phase, 'in');
  assert.deepEqual(box(h).children, ['Copied 3 chars to clipboard']);
  h.advance(2180); hidden(h); assert.equal(h.pending(), 0);
}
for (const delay of [0, 16, 2016]) { // armed, in, out
  for (const end of ['close', 'disable', 'platform', 'checking']) {
    const h = await copied(); h.advance(delay);
    const queued = h.timers.at(-1);
    if (end === 'close') h.controller.close();
    else {
      if (end === 'disable') h.state.settings.copy_on_select = false;
      if (end === 'platform') h.state.window = {};
      if (end === 'checking') h.state.checking = true;
      hidden(h);
    }
    assert.equal(h.controller.phase, 'hidden');
    assert.equal(h.pending(), 0);
    const redraws = h.state.redraws;
    queued.callback(h.cx); h.advance(5000); hidden(h);
    assert.equal(h.state.redraws, redraws, 'Disabled/closed animation cannot resurrect the popup');
    if (end !== 'close') {
      h.state.settings = {}; h.state.window = { platform: 'windows' }; h.state.checking = false;
      h.state.list = []; h.render(); h.select(4); h.state.clipboard = 'again'; h.advance(300);
      queued.callback(h.cx);
      assert.equal(h.controller.phase, 'armed', 'Prior eligibility generation cannot alter a new popup');
      assert.deepEqual(box(h).children, ['Copied 5 chars to clipboard']);
    }
  }
  const h = await copied(); h.advance(delay);
  h.state.settings.copy_on_select = false;
  h.advance(delay === 0 ? 16 : delay === 16 ? 2000 : 180);
  assert.equal(h.controller.phase, 'hidden', 'Live callback guard hides feedback even before render');
  assert.equal(h.pending(), 0); hidden(h);
}
console.log('copy-toast rendering: original geometry/font/colors, phase timing, tab binding and timer cleanup ok');
