// Private durable snapshots live in the selected Herdr home, never in source.
import path from 'node:path';
import cp from 'node:child_process';
import {project} from './build.mjs';
import {syncPreferences} from './runtime/preferences.mjs';
import {defaultHome,layoutOverrides,projectLayout} from './deploy.mjs';
import {read,put,json,digest} from './files.mjs';
const [action,home=defaultHome()]=process.argv.slice(2);
const snapshotDir=path.join(home,'preferences');
try {
 if(!['export','import'].includes(action))throw Error('Use export or import.');
 const sidecar=path.join(home,'.customizations/layout-preferences.json'),snapshot=path.join(snapshotDir,'layout.json');
 const theme=path.join(home,'themes/custom-palette.json'),savedTheme=path.join(snapshotDir,'theme.json');
 if(action==='import') {
  // Check before any write, including first-install palette seeding.
  const running=cp.execFileSync('powershell.exe',['-NoProfile','-Command',"if (Get-Process herdr-app -ErrorAction SilentlyContinue) {'running'} else {'closed'}"],{encoding:'utf8',timeout:10000}).trim();
  if(running!=='closed')throw Error('Close Herdr Desktop before preference import. Keep core/terminals running.');
  const saved=read(savedTheme),current=read(theme);
  if(saved!==null&&current!==null&&saved!==current)throw Error('Personal palette conflict; export/reconcile it before import.');
  const prefs=json(snapshot);if(prefs){if(prefs.version!==1)throw Error('Unsupported layout preference snapshot.');projectLayout(json(path.join(project,'src/appearance/layouts/Custom.json')),prefs.overrides);}
  if(saved!==null)put(theme,saved,digest(current));
  console.log(syncPreferences(action,home,{snapshotDir}));
  if(prefs)put(sidecar,JSON.stringify(prefs,null,2)+'\n');
 } else {
  // Existing exporter verifies palette ownership and filters account/session data.
  console.log(syncPreferences(action,home,{snapshotDir}));
  const themeRaw=read(theme);if(themeRaw!==null)put(savedTheme,themeRaw);
  const state=json(path.join(home,'.customizations/manifest.json')),live=json(path.join(home,'layouts/Custom.json'));
  let prefs=json(sidecar);
  if(state?.layoutBase&&live)prefs={version:1,overrides:{...layoutOverrides(state.layoutBase,live),...prefs?.overrides}};
  if(prefs){projectLayout(json(path.join(project,'src/appearance/layouts/Custom.json')),prefs.overrides);put(snapshot,JSON.stringify(prefs,null,2)+'\n');}
 }
} catch(e){console.error(e.message);process.exitCode=1;}
