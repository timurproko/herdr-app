// The plugin UI contract (docs/PLUGIN-UI.md): plugins declare their Settings UI, and one
// renderer draws every declaration from the shared kit. So the renderer and the kit know
// no plugin, and no plugin ships Settings UI code of its own.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const project = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const read = rel => fs.readFileSync(path.join(project, rel), 'utf8');
const plugins = fs.readdirSync(path.join(project, 'src/plugins'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
assert.ok(plugins.includes('git') && plugins.includes('crew'), 'Plugin folders were found');
const code = text => text.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''); // comments may give examples

// 1. The renderer and the kit name no plugin and use no plugin's wording.
for (const rel of ['src/features/settings/plugins-ui.js', 'src/ui/settings-kit.js', 'src/features/settings/folder-browser.js']) {
  const text = code(read(rel));
  for (const id of plugins) assert.ok(!new RegExp(`['"\`]${id}['"\`]`).test(text), `${rel} names the ${id} plugin`);
  for (const word of [/repositor/i, /\bprojects?\b/i, /github/i, /webhook/i, /\bcrew\b/i])
    assert.ok(!word.test(text), `${rel} uses a plugin's wording (${word}); take it from the declaration`);
}

// 2. Plugins draw no Settings UI: their declarations and their Settings extensions never
// import the UI toolkit. (A plugin's own panels and dialogs, in its mod/, may.)
for (const id of plugins) {
  const dir = path.join(project, 'src/plugins', id);
  const declaration = path.join(dir, 'plugin.js');
  if (fs.existsSync(declaration)) assert.ok(!/from\s+['"]gpui-(kit|base)['"]/.test(read(path.relative(project, declaration))), `${id}/plugin.js draws UI; declare it instead`);
  const panel = path.join(dir, 'panel.json');
  if (!fs.existsSync(panel)) continue;
  const settingsFiles = Object.values(JSON.parse(fs.readFileSync(panel, 'utf8')).extensions?.['custom-settings'] ?? {});
  for (const file of settingsFiles) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.ok(!/from\s+['"]gpui-(kit|base)['"]/.test(text) && !/from\s+['"]\.\/(ui|settings-kit)\.js['"]/.test(text), `${id}/${file} draws Settings UI; declare a page instead`);
  }
}

// 3. Every list section declares what the renderer needs, and nothing it no longer reads.
const sections = [];
for (const id of plugins) {
  const text = fs.existsSync(path.join(project, 'src/plugins', id, 'plugin.js')) ? read(`src/plugins/${id}/plugin.js`) : '';
  for (const retired of [/\bfolders\s*:\s*(Object\.freeze\()?\{/, /\bentries\s*:\s*\{/, /\bchecklist\s*:/, /\bsearchable\s*:/, /\bpick\s*:\s*\{/])
    assert.ok(!retired.test(text), `${id} declares a retired section kind (${retired}); use list`);
  if (/\blist\s*:/.test(text)) sections.push(id);
}
assert.deepEqual(sections.sort(), ['crew', 'git'], 'Crew Projects and Git Repositories are list sections');

// 4. Plugin panels share the panel kit's parts instead of rebuilding them: header tools,
// right-click menus, confirmations, status messages, tags and text dropdowns.
for (const rel of ['src/plugins/files/mod/main.js', 'src/plugins/git/mod/main.js', 'src/plugins/usage/mod/main.js']) {
  const text = code(read(rel));
  assert.match(text, /from\s+['"]\.\/panel-kit\.js['"]/, `${rel} uses the panel kit`);
  for (const [pattern, part] of [[/^\s*tool\(t,/m, 'a header tool'], [/menuSurface\(/, 'a menu or dropdown list'], [/dialogBody\(/, 'a confirmation'],
    [/\.text_size\(12\)\.text_color\(t\.dim\)\.child\(/, 'a status message'], [/rounded_full\(\)\.border_1\(\)/, 'a tag']])
    assert.ok(!pattern.test(text), `${rel} builds ${part} itself; use the panel kit`);
}
for (const id of ['files', 'git', 'usage']) assert.ok(JSON.parse(read(`src/plugins/${id}/panel.json`)).shared['panel-kit.js'], `The ${id} panel ships the panel kit`);

// 5. App-wide: every small icon button is ui.js's iconButton and every popup-menu row its
// menuRow (pane and panel headers, tabs, Spaces, menus, Settings rows). Allowed: the
// definitions, and controls that only look alike (the pin toggle, colour swatches, Git's
// pull-request robot with its own press handling).
const allowed = new Set(['src/ui/ui.js', 'src/ui/panel-pin.js', 'src/features/menu/space-colors.js', 'src/plugins/git/mod/main.js']);
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const sources = walk(path.join(project, 'src')).filter(f => /\.(m?js|cjs)$/.test(f) && !/\.test\./.test(f) && !/native-patches/.test(f));
for (const file of sources) {
  const rel = path.relative(project, file).replaceAll('\\', '/');
  if (allowed.has(rel)) continue;
  const text = code(fs.readFileSync(file, 'utf8'));
  assert.ok(!/size\(U\.insetControl\)[^;]{0,400}?hover\([^;]{0,120}?subtleActionFill/.test(text), `${rel} builds an icon button itself; use iconButton`);
  assert.ok(!/h\(U\.row\)[^;]{0,300}?role\(['"]button['"]\)/.test(text), `${rel} builds a menu row itself; use menuRow`);
}
console.log('PASS: plugin UI contract: one renderer and kit with no plugin knowledge; plugins declare their Settings UI and use only list sections');
