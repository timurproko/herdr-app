// Retired sidebar entrypoints and packaging stay absent; Pin/Close and tab/space naming survive.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {withKitUi} from './support/panel-kit.mjs';
const read=rel=>fs.readFileSync(new URL(`../${rel}`,import.meta.url),'utf8');
const config=JSON.parse(read('customization.json'));
assert.ok(!Object.keys(config.files).some(name=>name.endsWith('/agent-rename.js')));
assert.ok(!fs.existsSync(new URL('../src/ui/agent-rename.js',import.meta.url)));
assert.ok(!fs.existsSync(new URL('../src/plugins/a1-colors/session-name.js',import.meta.url)));
assert.doesNotMatch(read('src/features/agents/main.js'),/renameFromClick|agentRename|syncAgentRename|inlineRename/);
assert.doesNotMatch(read('src/features/menu/main.js'),/requestInlineAgentRename|inlineRename/);
assert.doesNotMatch(read('src/plugins/a1-colors/session-color.cjs'),/controlName|session\.rename/);

let props={tab:'agent',target:{terminal:'pc2/t1'},overlay:'fixture'},pinned=false;
const commands=[],closed=[];
const host={updates:()=>({app:{}}),props:()=>props,agents:()=>[{address:'pc2/t1',pinned}],terminals:()=>[],
 panes:()=>[{terminal:'pc2/t1',pane:'pc2/p1'}],spaces:()=>[],keys:()=>[],shared:()=>null,theme:()=>({}),
 closeOverlay:id=>closed.push(id),run:()=>{},openOverlay:()=>{},notify:()=>{}};
const mocks={
 'gpui-kit':{View:class{},div(){},svg(){}},'gpui-base':{v_flex(){},h_flex(){}},
 './host.js':host,'./ui.js':withKitUi({U:{},slot(){},menuSurface(){},hotkey(){},badge(){},spaceBadgeColor(){},menuHeading(){}}),
 './directory.js':{displaySpace:x=>x},'./tab-moves.js':{inspectTabMove(){},tabMoveDestinations(){},requestTabMove(){}},
 './sidebar-footer.js':{footerItems:()=>[]},'./modal-layout.js':{divider(){},dividerHeight(){}},
 './space-colors.js':{spaceColorPicker(){},setSpaceColor(){},selectedColorIndex(){},colorAt(){},COLOR_COUNT:0},
 './tab-rename.js':{requestInlineTabRename:job=>{commands.push(job.command);return true;}},
 './space-rename.js':{requestInlineSpaceRename:job=>{commands.push(job.command);return true;}},
 './close-space.js':{closeWithConfirmation:(name,args)=>commands.push({name,args})},
 './plugins.js':{pluginAllows:()=>false,pluginEvent(){},pluginMenuItems:()=>[],pluginWorkspaceLinks:()=>[]},
 './customization-updates.js':{customizationUpdateAvailable:()=>false},
};
const context=vm.createContext({}),mod=new vm.SourceTextModule(read('src/features/menu/main.js'),{context});
await mod.link(name=>{if(name==='./settings-dialog.js')return new vm.SourceTextModule(read('src/ui/settings-dialog.js'),{context});assert.ok(mocks[name],`Unexpected dependency ${name}`);return new vm.SyntheticModule(Object.keys(mocks[name]),function(){for(const [key,value]of Object.entries(mocks[name]))this.setExport(key,value);},{context});});
await mod.evaluate();
const cx={focus_handle:()=>({focus(){}})},menu=new mod.namespace.default();
menu.init({},cx);
assert.deepEqual(Array.from(menu.list(),row=>row[0]),['Pin to the top','Close']);
menu.choose(0,cx);assert.deepEqual(structuredClone(commands.at(-1)),{name:'terminal.pin',args:{terminal:'pc2/t1',pinned:true}});
menu.choose(1,cx);assert.deepEqual(structuredClone(commands.at(-1)),{name:'pane.close',args:{pane:'pc2/p1'}});
pinned=true;assert.equal(menu.list()[0][0],'Unpin');
for(const tab of ['tab','space']){
 props={tab,target:{id:'captured',space:'s'},overlay:'fixture'};menu.init({},cx);
 const index=menu.list().findIndex(row=>row[0]==='Rename');assert.ok(index>=0);
 menu.choose(index,cx);assert.deepEqual(structuredClone(commands.at(-1)),{name:`${tab}.rename`,args:{id:'captured'}});
}
assert.equal(closed.length,4);
console.log('PASS: retired sidebar code/outputs absent; clicked Pin/Close and tab/space Rename paths retained');
