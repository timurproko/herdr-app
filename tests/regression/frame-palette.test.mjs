import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { framePalette, framePatch } from './frame-palette.mjs';
import { frameFeedback } from './frame-feedback.mjs';
import { paletteCommand } from '../frame-patches/palette/routing.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'custom-palette-'));
const stamp=file=>{const s=fs.statSync(file,{bigint:true});return [s.ino,s.mtimeNs,s.ctimeNs];};
const previousBin=process.env.HERDR_APP_BIN;
process.env.HERDR_APP_BIN=path.join(temp,'synthetic-host');
fs.writeFileSync(process.env.HERDR_APP_BIN,Buffer.concat(['palette','feedback'].map(id=>fs.readFileSync(path.join(root,`frame-patches/${id}/original.js`)))));
try {
  const home = path.join(temp, 'home'), dir = path.join(home, 'frame/palette');
  fs.mkdirSync(dir, { recursive: true });
  const stock = fs.readFileSync(path.join(root, 'frame-patches/palette/original.js'), 'utf8');
  fs.writeFileSync(path.join(dir, 'main.js'), stock);
  fs.writeFileSync(path.join(home, 'keys.json'), 'personal shortcuts');
  framePalette('apply', home);framePalette('check', home);
  const paletteFiles=[path.join(dir,'main.js'),path.join(home,'.customizations/frame-palette.json')],paletteStamps=paletteFiles.map(stamp);
  assert.match(framePalette('apply', home),/already current/);
  assert.deepEqual(paletteFiles.map(stamp),paletteStamps,'No-change frame apply must not replace its entrypoint or record');
  const patched = fs.readFileSync(path.join(dir, 'main.js'), 'utf8');
  const skinRender=patched.slice(patched.indexOf('  renderSkin()'),patched.indexOf('  render()'));
  assert.match(skinRender, /dialogSurface\(t, v_flex\(\), \{ nativeFrame: true \}\)/,'Palette delegates decoration to its single native host frame');assert.match(skinRender, /overflow_hidden\(\)/);
  assert.match(skinRender, /child\(searchHeader/);assert.ok(!skinRender.includes('"Esc"'));
  assert.match(skinRender, /dialogScrollRow\(menuHeading\(t, r.head, h_flex\(\)\)\)\.text_color\(t\.foreground\)/);
  assert.match(skinRender, /v_virtual_list\("palette-native-rows"/);assert.match(skinRender, /dialogScrollbar\(Scrollbar.vertical\("palette-native-rows"\)\.scroll_size\(0, total\)\.viewport_from_layout\(\)\)/);
  assert.match(skinRender, /\.right\(0\)\.mb\(0\)/,'Palette viewport reaches the native frame bottom');
  assert.match(skinRender, /bottomFade\(this, 'palette-list', t.popover/);
  assert.equal(fs.readFileSync(path.join(dir,'custom-scroll-fade.js'),'utf8'),fs.readFileSync(path.join(root,'lib/scroll-fade.js'),'utf8'),'Frame uses the canonical passive fade, not a divergent copy');
  assert.match(skinRender, /on_item_click/);assert.match(skinRender, /scroll_to_item/);
  assert.match(skinRender, /\.h\(408\)/,'A definite viewport prevents the virtual list collapsing');
  assert.match(patched, /gap: items.length \? 8 : 0/,'Later sections have top spacing');
  assert.match(patched, /if \(k === "escape"\) return this.close\(\)/);
  assert.match(skinRender, /e.key === "escape"/);
  assert.match(patched, /paletteCommand\(e, isCustom\(\)\)/);
  assert.match(skinRender,/\.absolute\(\)\.top\(0\)\.left\(0\)\.right\(0\)\.h\(57\)/,'Search header is pinned outside the scrolling list');
  assert.match(skinRender,/dialogScrollFrame\(div\(\)\)\.id\("palette-list-frame"\)\.absolute\(\)\.top\(57\)\.bottom\(0\)/,'Only the bounded list occupies the scroll viewport');
  assert.match(skinRender,/on_scroll_wheel\(\(_e, cx\) => cx.stop_propagation\(\)\)/,'List wheel does not scroll the surrounding native frame');
  assert.match(patched, /id: "palette-search-header"/);
  assert.match(skinRender, /id\('palette-pinned-heading'\)\.absolute\(\)\.top\(0\)/, 'Group/results heading stays fixed outside the native scrolling list');
  assert.match(skinRender, /right\(8\)\.h\(HEAD_H\)/, 'Pinned heading leaves the native scrollbar rail free');
  assert.match(skinRender, /emptyState\(t, \{ id: 'palette-empty'/, 'Palette shares the centered Jump empty-state component');
  assert.ok(!skinRender.includes('Nothing matches'), 'Do not echo arbitrarily long queries into the empty state');
  assert.match(skinRender, /onClear: \(\) => \{ this.query = '';/, 'Clear resets filtering, selection and native list scroll');
  framePalette('restore', home);
  assert.equal(fs.readFileSync(path.join(dir, 'main.js'), 'utf8'), stock);
  assert.equal(fs.existsSync(path.join(dir, 'custom-ui.js')), false);
  assert.equal(fs.readFileSync(path.join(home, 'keys.json'), 'utf8'), 'personal shortcuts');
  fs.writeFileSync(path.join(dir, 'custom-ui.js'), 'personal dependency');
  assert.throws(() => framePalette('apply', home), /conflict/);
  assert.equal(fs.readFileSync(path.join(dir, 'main.js'), 'utf8'), stock);
  fs.unlinkSync(path.join(dir, 'custom-ui.js'));
  framePalette('apply', home);
  fs.writeFileSync(path.join(dir, 'main.js'), 'newer stock after app update');
  assert.throws(() => framePalette('apply', home), /unsupported original/);
  framePalette('restore', home);
  assert.equal(fs.readFileSync(path.join(dir, 'main.js'), 'utf8'), 'newer stock after app update');
  const settings = { name: 'app.settings', args: {} };
  assert.deepEqual(paletteCommand(settings, true), { name: 'mod.open', args: { name: 'custom-settings' } });
  assert.deepEqual(paletteCommand(settings, false), settings);
  for (const mod of ['picker', 'settings', 'machine-add', 'worktree']) {
    const entry = { name: 'mod.open', args: { name: mod, extra: 'preserved' } };
    assert.deepEqual(paletteCommand(entry, true), { name: 'mod.open', args: { name: `custom-${mod}`, extra: 'preserved' } });
    assert.deepEqual(paletteCommand(entry, false), entry);
  }
  for(const name of ['constructor','toString','__proto__','my-personal-mod']) {
    const entry={name:'mod.open',args:{name}};assert.deepEqual(paletteCommand(entry,true),entry);
  }
  for (const name of ['layout.clone', 'tab.new', 'app.feedback']) {
    const entry = { name, args: {} };assert.deepEqual(paletteCommand(entry, true), entry);
  }
  for (const [name, command] of [['tab.rename', 'rename-tab'], ['space.rename', 'rename-space']]) {
    const entry = { name, args: {} };
    assert.deepEqual(paletteCommand(entry, true), { name: `custom-tabs.${command}`, args: {} });
    assert.deepEqual(paletteCommand(entry, false), entry);
  }
  for (const noun of ['pane', 'tab', 'space']) {
    const entry = { name: `${noun}.close`, args: {} };
    assert.deepEqual(paletteCommand(entry, true), { name: `custom-tabs.close-${noun}`, args: {} });
    assert.deepEqual(paletteCommand(entry, false), entry, 'Other layouts retain native close commands');
    const targeted = { name: entry.name, args: { [noun === 'pane' ? 'pane' : 'id']: `pc2/${noun}` } };
    assert.deepEqual(paletteCommand(targeted, true), targeted, 'Explicit targets are never dropped for an implicit close');
  }
  const feedbackDir=path.join(home,'frame/feedback');fs.mkdirSync(feedbackDir,{recursive:true});
  const feedbackStock=fs.readFileSync(path.join(root,'frame-patches/feedback/original.js'),'utf8');fs.writeFileSync(path.join(feedbackDir,'main.js'),feedbackStock);
  frameFeedback('apply',home);frameFeedback('check',home);
  const feedbackFile=path.join(feedbackDir,'main.js'),feedbackStamp=stamp(feedbackFile);
  assert.match(frameFeedback('apply',home),/already current/);assert.deepEqual(stamp(feedbackFile),feedbackStamp);
  const feedbackPatched=fs.readFileSync(path.join(feedbackDir,'main.js'),'utf8');
  assert.match(feedbackPatched,/dialogHeader\(t, this\.sent \? "Feedback sent" : "Send feedback"/);assert.match(feedbackPatched,/textButton\(t, "feedback-add", "Add image"/);
  const sendBlock=text=>text.slice(text.indexOf('  send(body, cx)'),text.indexOf('  render(cx)')).replace(/\r\n/g,'\n');
  assert.equal(sendBlock(feedbackPatched),sendBlock(feedbackStock),'Protected sending code is unchanged');
  for(const api of ['feedbackPasteImage','feedbackPickImages','feedbackAttachImages','feedbackClearImages']) assert.ok(feedbackPatched.includes(api));
  frameFeedback('restore',home);assert.equal(fs.readFileSync(path.join(feedbackDir,'main.js'),'utf8'),feedbackStock);
  for(const name of ['palette']){
    const legacyHome=path.join(temp,`legacy-${name}`),modDir=path.join(legacyHome,'frame',name),main=path.join(modDir,'main.js');fs.mkdirSync(modDir,{recursive:true});const oldStock=fs.readFileSync(path.join(root,`frame-patches/${name}/original-0.1.13.js`),'utf8'),newStock=fs.readFileSync(path.join(root,`frame-patches/${name}/original.js`),'utf8');
    fs.writeFileSync(main,oldStock);framePatch('apply',legacyHome,root,name);framePatch('restore',legacyHome,root,name);assert.equal(fs.readFileSync(main,'utf8'),oldStock,'Reviewed old stock remains supported');
    framePatch('apply',legacyHome,root,name);fs.writeFileSync(main,newStock);framePatch('apply',legacyHome,root,name);const record=JSON.parse(fs.readFileSync(path.join(legacyHome,`.customizations/frame-${name}.json`),'utf8'));assert.equal(record.original['main.js'],newStock,'App update rebases the restore backup to reviewed new stock');framePatch('restore',legacyHome,root,name);assert.equal(fs.readFileSync(main,'utf8'),newStock,'Removing the skin never downgrades reviewed updated stock');
  }
  console.log('PASS: scoped modal routing, reversible palette/feedback patches, native feedback API preservation, conflict guards and unchanged shortcuts');
} finally { if(previousBin===undefined)delete process.env.HERDR_APP_BIN;else process.env.HERDR_APP_BIN=previousBin; fs.rmSync(temp, { recursive: true, force: true }); }
