import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { captureUpdateMarkers } from '../tools/inspect-update-markers.mjs';
const artifacts = path.resolve('.artifacts'); fs.mkdirSync(artifacts, { recursive: true });
const fixture = fs.mkdtempSync(path.join(artifacts, 'marker-inspection-'));
const home = path.join(fixture, 'home'), output = path.join(fixture, 'capture');
const put = (file, value) => { const target = path.join(home, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, JSON.stringify(value)); };
function files(dir) {
  return Object.fromEntries(fs.readdirSync(dir, { recursive: true }).filter(rel => fs.statSync(path.join(dir, rel)).isFile()).map(rel => [rel, fs.readFileSync(path.join(dir, rel), 'utf8')]));
}
try {
  put('shared.json', { 'custom.customization-update': { check: { checked: 1234, available: true } }, private: 'must not appear' });
  put('.customizations/update-check.json', { checked: 1234, available: true });
  put('settings.json', { theme_dark: 'Custom', zoom: 1.3, private: 'must not appear' });
  put('themes/Custom.json', { colors: { accent: '#cccccc', chrome: '#111111' } });
  put('layouts/Custom.json', { id: 'sidebar', size: { px: 268 }, children: [{ id: 'sidebar-footer', content: { mod: 'custom-workspace-chrome', props: { footer: true } } }] });
  put('layouts/.state/Custom.json', { nodes: { sidebar: { size: { px: 250 } }, unrelated: { private: 'must not appear' } } });
  const before = files(home), calls = [];
  const request = (args, selectedHome) => {
    assert.equal(selectedHome, home); calls.push(args);
    if (args[0] === 'status') return JSON.stringify({ layout: 'Custom', zoom: 1.3, errors: [] });
    assert.equal(args[0], 'shot'); assert.equal(args.length, 2);
    fs.writeFileSync(args[1], 'fixture screenshot'); return args[1];
  };
  const report = captureUpdateMarkers(home, output, { request });
  assert.deepEqual(calls.map(call => call[0]), ['status', 'shot', 'status']);
  assert.equal(report.before.customAvailableOnDisk, true);
  assert.equal(report.before.footerConfiguration[1].content.props.footer, true);
  assert.equal(report.before.savedLayoutState.nodes.sidebar.size.px, 250);
  assert.equal(report.before.configuredAppearance.customPalette.accent, '#cccccc');
  assert.match(report.before.lastChromeRender, /^Unknown:/, 'disk evidence never masquerades as the last render');
  assert.ok(report.before.limitations.some(line => line.includes('asynchronously persisted')));
  assert.ok(report.before.installedSources.every(file => file.readError), 'missing source reports unknown rather than fabricating predicates');
  assert.ok(!JSON.stringify(report).includes('must not appear'), 'unrelated private settings/state excluded');
  assert.deepEqual(files(home), before, 'capture never writes into the fixture home');
  assert.ok(fs.existsSync(path.join(output, 'capture.json'))); assert.ok(fs.existsSync(path.join(output, 'desktop.png')));
  assert.throws(() => captureUpdateMarkers(home, path.join(home, 'capture'), { request }), /must not be inside/);
  assert.throws(() => captureUpdateMarkers(home, '../outside', { request }), /must be inside/);
  const reportFile = path.join(output, 'capture.json'), original = fs.readFileSync(reportFile, 'utf8');
  assert.throws(() => captureUpdateMarkers(home, output, { request: () => { throw Error('no desktop listening'); } }), /no desktop/);
  assert.equal(fs.readFileSync(reportFile, 'utf8'), original, 'absent desktop fails before creating/replacing capture files');
} finally { fs.rmSync(fixture, { recursive: true, force: true }); }
console.log('PASS: marker inspector samples selected evidence and existing desktop only; no live-home writes, temporary mods, launches or invented last-render facts.');
