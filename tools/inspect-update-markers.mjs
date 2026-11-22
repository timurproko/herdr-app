// Read-only observation of an already-running desktop. Never installs a mod,
// opens an overlay, checks for updates, deploys, or changes the live home.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { app, defaultHome } from './deploy.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function json(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch (error) { return { readError: error.code || error.message }; }
}
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
function source(home, relative, canonical) {
  try {
    const text = fs.readFileSync(path.join(home, relative), 'utf8');
    return { file: relative, sha256: hash(text), matchesCheckout: text === fs.readFileSync(path.join(root, canonical), 'utf8'),
      relevantLines: text.split(/\r?\n/).flatMap((line, index) => /customizationUpdateAvailable|custom\.customization-update|footerIcon\(|footer-menu|st-s-\$|const waiting|size\(6\)|w\(7\)/.test(line) ? [{ line: index + 1, text: line.trim() }] : []) };
  } catch (error) { return { file: relative, readError: error.code || error.message }; }
}
function footerNodes(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (node.content?.mod?.includes('workspace-chrome') || node.id === 'sidebar' || node.id === 'sidebar-footer')
    found.push({ id: node.id, size: node.size, hidden: node.hidden, content: node.content });
  for (const child of node.children ?? []) footerNodes(child, found);
  return found;
}
export function inspectUpdateMarkers(home, status) {
  const shared = json(path.join(home, 'shared.json'));
  const published = shared['custom.customization-update'] ?? null;
  const check = json(path.join(home, '.customizations/update-check.json'));
  const settings = json(path.join(home, 'settings.json'));
  const name = typeof status.layout === 'string' && /^[\w-]+$/.test(status.layout) ? status.layout : null;
  const layout = name ? json(path.join(home, 'layouts', `${name}.json`)) : null;
  const state = name ? json(path.join(home, 'layouts/.state', `${name}.json`)) : null;
  const palette = json(path.join(home, 'themes/Custom.json'));
  return {
    sampledAt: new Date().toISOString(), status,
    sharedReadError: shared.readError, published,
    persistedCheck: check,
    // These are disk evidence, NOT a claim about an in-memory render.
    customAvailableOnDisk: published?.check?.available === true,
    customContributionToFooterPredicateOnDisk: published?.check?.available === true,
    customContributionToSettingsNavPredicateOnDisk: published?.check?.available === true,
    nativeReadiness: 'Not exposed by herdr-app status; the full predicates also include native readiness.',
    lastChromeRender: 'Unknown: Herdr 0.1.16 status/ls/shot expose no mod render tree, render timestamp or in-memory shared value.',
    footerConfiguration: footerNodes(layout),
    savedLayoutState: state?.readError ? state : { theme: state?.theme,
      nodes: Object.fromEntries(Object.entries(state?.nodes ?? {}).filter(([id]) => ['sidebar', 'sidebar-footer', 'brand'].includes(id))) },
    configuredAppearance: { dark: settings.dark, theme_dark: settings.theme_dark, theme_light: settings.theme_light, zoom: settings.zoom,
      customPalette: { accent: palette.colors?.accent, chrome: palette.colors?.chrome, background: palette.colors?.background } },
    installedSources: [
      source(home, 'mods/custom-workspace-chrome/main.js', 'src/features/workspace-chrome/main.js'),
      source(home, 'mods/custom-workspace-chrome/customization-updates.js', 'src/shared/customization-updates.js'),
      source(home, 'mods/custom-workspace-chrome/customization-update-model.js', 'src/shared/customization-update-model.js'),
      source(home, 'mods/custom-settings/main.js', 'src/features/settings/main.js'),
    ],
    limitations: [
      'shared.json is asynchronously persisted state, not a read of the host in-memory shared store.',
      'Configured layout/palette and saved size overrides are not measured current runtime bounds/colors.',
      'The screenshot is the actual rendered evidence; it cannot reveal whether an absent circle was never rendered, clipped, covered or stale.',
      'Availability at the last chrome render cannot be recovered retrospectively with the supported read-only native CLI.',
      'Do not run inspect-live.mjs for this capture: it installs a temporary mod and writes into the live home.',
    ],
  };
}
export function captureUpdateMarkers(home = defaultHome(), output = '.artifacts/update-markers', { request = app } = {}) {
  const directory = path.resolve(root, output), artifacts = path.join(root, '.artifacts');
  if (!directory.startsWith(artifacts + path.sep)) throw Error('Capture output must be inside this checkout\'s .artifacts/.');
  const relative = path.relative(path.resolve(home), directory);
  if (relative === '' || (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative))) throw Error('Capture output must not be inside the Herdr home.');
  // status is a control-client command: it fails when no desktop is listening;
  // it does not fall through to launching a new native application instance.
  const status = JSON.parse(request(['status'], home));
  const before = inspectUpdateMarkers(home, status);
  fs.mkdirSync(directory, { recursive: true });
  const screenshot = path.join(directory, 'desktop.png');
  request(['shot', screenshot], home);
  const after = inspectUpdateMarkers(home, JSON.parse(request(['status'], home)));
  const report = { before, screenshot, after };
  fs.writeFileSync(path.join(directory, 'capture.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.length > 4) throw Error('Usage: node tools/inspect-update-markers.mjs [output-under-.artifacts] [home]');
  const report = captureUpdateMarkers(process.argv[3] || defaultHome(), process.argv[2]);
  console.log(JSON.stringify(report, null, 2));
}
