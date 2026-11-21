// For tests that fake a panel's imports by name: the real panel kit (src/ui/panel-kit.js)
// as a module, so menus, dialogs and messages behave as they ship. The kit's own imports
// (./ui.js, gpui-kit, gpui-base) go through the test's linker; withKitUi fills the ui.js
// names a test's fake leaves out with the real ui.js functions (built on the test's
// element), so shared basics such as iconButton and menuRow are never faked away.
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../../src/ui/panel-kit.js', import.meta.url), 'utf8');
const uiSource = fs.readFileSync(new URL('../../src/ui/ui.js', import.meta.url), 'utf8');
export function kitModule(context) {
  return new vm.SourceTextModule(source, { context, identifier: 'panel-kit.js' });
}
const chain = () => { const node = { kids: [], attrs: {} }; let p; return p = new Proxy(node, { get: (n, k) => k in n ? n[k] : k === 'when' ? (yes, fn) => yes ? fn(p) : p : k === 'child' ? c => { n.kids.push(c); return p; } : k === 'children' ? c => { n.kids.push(...c); return p; } : (...a) => { n.attrs[k] = a; return p; } }); };
// The real ui.js, evaluated with the test's element for every native element.
export function realUi(element = chain) {
  const exports = {};
  const body = uiSource.replace(/^import [^\n]*\n/gm, '').replace(/^export (function|const|let|class) (\w+)/gm, (_m, kind, name) => { exports[name] = true; return `${kind} ${name}`; });
  const names = Object.keys(exports);
  const context = { div: element, svg: element, Popover: { new: element }, Input: { new: element } };
  return vm.runInNewContext(`${body}\n({${names.join(',')}})`, context);
}
export function withKitUi(ui, element = chain) {
  const real = realUi(element);
  for (const [name, value] of Object.entries(real)) if (!(name in ui)) ui[name] = value;
  return ui;
}
