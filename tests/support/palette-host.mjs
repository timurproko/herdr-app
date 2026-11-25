// Synthetic host facts for disposable palette installs, including child CLIs.
// No downloaded/native host is executed. SDK files are real reviewed fixtures;
// the compact GPUI symbol declaration is explicitly synthetic.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const paletteHostFacts={version:'0.1.18',commands:[{name:'mod.open',args:[{name:'name',required:true}]},{name:'overlay.close',args:[]}]};
export const paletteGpui='InputState Input VirtualListScrollHandle Scrollbar v_virtual_list focus_handle on_key_down';
export function seedPaletteSdk(home,version='0.1.18'){
  fs.mkdirSync(home,{recursive:true});
  fs.copyFileSync(path.join(source,`tests/fixtures/palette/herdr-${version}.d.ts`),path.join(home,'herdr.d.ts'));
  fs.writeFileSync(path.join(home,'gpui-kit.d.ts'),paletteGpui);
}
export function mockPaletteExecutable(root){
  const previous={bin:process.env.HERDR_APP_BIN,options:process.env.NODE_OPTIONS},exec=cp.execFileSync;
  const bin=path.join(root,'unavailable-palette-host'),preload=path.join(root,'palette-host-preload.cjs');
  const facts=JSON.stringify(paletteHostFacts);
  fs.writeFileSync(preload,`const cp=require('node:child_process'),original=cp.execFileSync,facts=${facts};cp.execFileSync=function(program,args,options){if(program===process.env.HERDR_APP_BIN){if(args[0]==='--version')return 'herdr-app '+facts.version;if(args[0]==='commands')return JSON.stringify(facts.commands);throw Error('Unapproved synthetic host operation');}return original(program,args,options);};`);
  process.env.HERDR_APP_BIN=bin;process.env.NODE_OPTIONS=`${previous.options??''} --require ${JSON.stringify(preload.replaceAll('\\','/'))}`.trim();
  cp.execFileSync=function(program,args,options){if(program===bin){if(args[0]==='--version')return 'herdr-app '+paletteHostFacts.version;if(args[0]==='commands')return JSON.stringify(paletteHostFacts.commands);throw Error('Unapproved synthetic host operation');}return exec(program,args,options);};
  return ()=>{cp.execFileSync=exec;for(const [key,value]of [['HERDR_APP_BIN',previous.bin],['NODE_OPTIONS',previous.options]])if(value===undefined)delete process.env[key];else process.env[key]=value;};
}
