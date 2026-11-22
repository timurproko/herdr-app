// Disposable fixture UI only. No real terminal, credential, worker or switch action.
import {temporaryMod} from '../../tools/temporary-mod.mjs';
import fs from 'node:fs';
import path from 'node:path';
export function checkClaudeAccountStates(home,app) {
  const original=path.join(home,'mods/custom-workspace-status'),dir=path.join(home,'mods/custom-claude-account-fixture');
  const dispose=temporaryMod(home,path.basename(dir));
  let checked=0;
  try {
  fs.cpSync(original,dir,{recursive:true});
  fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
  fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';
export const terminals=()=>[{address:'t42',program:{key:'claude'},labels:{
 'custom.claude.email':'one@example.test','custom.claude.account':'one','custom.claude.organization':'org',
 'custom.claude.at':String(Date.now()),'custom.claude.state':'ok','custom.claude.session':'fixture-instance-12345',
 'custom.claude.control':globalThis.fixtureControl?'1':''}}];
export const exec=()=>{throw Error('Fixture must not execute processes');};
`);
  for(const state of ['cold','error','empty','accounts','shared','pending']) {
    fs.writeFileSync(path.join(dir,'main.js'),`import {View} from 'gpui-kit';
import {theme} from './host.js';
import {ClaudeAccount,sessionAccount} from './claude-account.js';
export default class Fixture extends View {
 init(_p,cx){globalThis.fixtureControl=${!state.startsWith('shared')};this.account=new ClaudeAccount();this.account.init(cx);
 const target={terminal:'t42',on:null},a=sessionAccount(target);this.account.opening={...a,machine:null};
 this.account.opened=${state!=='cold'};this.account.index=0;this.account.error=${state==='error'?JSON.stringify('Fixture: unavailable'): 'null'};
 this.account.rows=${JSON.stringify(state==='cold'||state==='error'?null:state==='empty'?[]:[{email:'one@example.test',account:'one',organization:'org'},{email:'two.longer@example.test',account:'two',organization:'other'}])};
 ${state==='pending'?"this.account.pending={opening:this.account.opening};":''}}
 render(cx){return this.account.render({terminal:'t42',on:null},theme(),cx);}
}
`);
    app(['check',dir],home);checked++;
  }
  return checked;
  } finally {dispose();}
}
