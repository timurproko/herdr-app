// Full export operation. Packaged with local dependencies, never a checkout import.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {syncPreferences} from './runtime/preferences.mjs';
import {layoutOverrides,projectLayout} from './layout-preferences.mjs';
import {read,put,json} from './files.mjs';

export function exportPreferences(home,{fallbackBase=null,...options}={}) {
  const snapshotDir=path.join(home,'preferences');
  const state=json(path.join(home,'.customizations/manifest.json'));
  const base=state?.layoutBase??fallbackBase;
  const live=json(path.join(home,'layouts/Custom.json'));
  let prefs=json(path.join(home,'.customizations/layout-preferences.json'));
  if(prefs || live) {
    if(!base || typeof base!=='object' || Array.isArray(base))throw Error('No recorded deployment layout base; deploy Custom before exporting layout preferences.');
    if(live)prefs={version:1,overrides:{...layoutOverrides(base,live),...prefs?.overrides}};
    if(prefs?.version!==1 || !prefs.overrides || Array.isArray(prefs.overrides))throw Error('Unsupported layout preference snapshot.');
    projectLayout(base,prefs.overrides);
  }
  // The existing exporter owns all host/palette filtering and ownership checks.
  const result=syncPreferences('export',home,{...options,snapshotDir});
  const themeRaw=read(path.join(home,'themes/custom-palette.json'));
  if(themeRaw!==null)put(path.join(snapshotDir,'theme.json'),themeRaw);
  if(prefs)put(path.join(snapshotDir,'layout.json'),JSON.stringify(prefs,null,2)+'\n');
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [action,home,...extra]=process.argv.slice(2);
    if(action!=='export'||!home||extra.length)throw Error('Use export <home>. This installed entrypoint is export-only.');
    console.log(exportPreferences(home));
  } catch(e){console.error(e.message);process.exitCode=1;}
}
