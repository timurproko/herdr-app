// Catalog semantics reviewed against Herdr 0.1.17/0.1.18; no native file permission.
export const GROUPS = ['Recent', 'Tab', 'Pane', 'Space', 'Layout', 'Terminal', 'Agent', 'Window', 'Mod', 'App'];
const named = [
  ['tab.new', {}, 'Tab', 'New tab', 'tab agent new task'],
  ['mod.open', {name:'picker'}, 'Tab', 'Go to space or tab…', 'switch jump find'],
  ...[['rename','Rename tab','tab'],['close','Close tab','tab kill'],['next','Next tab','tab'],['prev','Previous tab','tab']].map(([v,t,w])=>[`tab.${v}`,{},'Tab',t,w]),
  ...['right','down'].map(direction=>['pane.split',{direction},'Pane',`Split ${direction}`,direction==='right'?'vertical':'horizontal']),
  ['pane.close',{},'Pane','Close pane','kill'],['pane.zoom',{},'Pane','Zoom pane','maximize fullscreen'],
  ...['go','swap'].flatMap(v=>['left','right','up','down'].map(direction=>[`pane.${v}`,{direction},'Pane',`${v==='go'?'Focus':'Swap'} pane ${direction}`,v==='go'?'move go':'move'])),
  ...[['new','New space','workspace'],['rename','Rename space','workspace'],['close','Close space','workspace kill'],['next','Next space','workspace'],['prev','Previous space','workspace']].map(([v,t,w])=>[`space.${v}`,{},'Space',t,w]),
  ['layout.switch',{},'Layout','Next layout','look switch'],['layout.reset',{},'Layout','Reset layout',"new version default restore herdr's"],
  ['layout.clone',{},'Layout','Duplicate layout','clone copy customize'],['mod.clone',{},'Layout','Duplicate mod','clone copy customize'],
  ['terminal.open',{},'Terminal','New terminal','shell'],['terminal.copy',{},'Terminal','Copy','clipboard'],['terminal.paste',{},'Terminal','Paste','clipboard'],
  ['agent.next',{},'Agent','Next agent',''],['agent.prev',{},'Agent','Previous agent',''],
  ...[['minimize','Minimize window',''],['maximize','Maximize window','restore'],['close','Close window','quit']].map(([v,t,w])=>[`window.${v}`,{},'Window',t,w]),
  ['app.settings',{},'App','Settings','preferences options config look font theme sound'],['app.help',{},'App','Keys','keybindings shortcuts help'],
  ['app.welcome',{},'App','Welcome','intro start onboarding'],['app.whats_new',{},'App',"What's new",'release changes news update'],
  ['app.reset',{},'App','Reset to the default screen','escape hatch broken restore'],
  ['app.zoom_in',{},'App','Zoom in','bigger font size'],['app.zoom_out',{},'App','Zoom out','smaller font size'],['app.zoom_reset',{},'App','Reset zoom','font size'],['app.quit',{},'App','Quit Herdr','exit'],
];
const hidden = new Set(['space.move','tab.move','space.select','tab.select','pane.focus','terminal.keep','terminal.park','terminal.kill','terminal.show','agent.focus','layout.set','layout.toggle','layout.show','layout.hide','layout.resize','layout.select','mod.open','overlay.close','tab.settle','tab.unsettle','app.palette','app.hide','app.hide_others','app.show_all','app.theme','app.settings']);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const targets = new Set(['id','pane','space','terminal','target']);
export function entryId(name,args) {
  return `${name}:${JSON.stringify(args,(_k,v)=>object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v)}`;
}
export function modEntry(p,known) {
  if(!object(p)||typeof p.title!=='string'||!p.title.trim()||typeof p.command!=='string')return null;
  const args=p.args??{};if(!object(args))return null;
  const c=known.get(p.command);
  if(c){
    const names=c.args.map(a=>a.name);
    for(const [k,v]of Object.entries(args))if(!names.includes(k)||(targets.has(k)&&v!=null&&typeof v!=='string'))return null;
    for(const {name,required}of c.args){
      if(!required||(name==='name'&&p.command.endsWith('.rename')&&args.name==null))continue;
      if(args[name]==null||(typeof args[name]==='string'&&!args[name].trim()))return null;
    }
  }else{
    const at=p.command.indexOf('.');
    if(at<1||p.command.slice(0,at)!==p.mod||!p.command.slice(at+1).trim()||Object.keys(args).length)return null;
  }
  const group=typeof p.group==='string'?p.group.trim():'';
  return {name:p.command,args,group:group&&group!=='Recent'?group:'Mod',title:p.title,words:`${typeof p.words==='string'?p.words:''} ${p.mod}`,modArgs:c?.args};
}
export function entries({commands,layouts,themes,dark,layout,platform,usage=false},mods=[]) {
  const known=new Map(commands.map(c=>[c.name,c]));
  const list=named.filter(([n])=>known.has(n)).filter(([n])=>!(platform==='macos'&&n.startsWith('window.'))).map(([name,args,group,title,words])=>({name,args,group,title,words}));
  if(usage)list.push({name:'mod.open',args:{name:'custom-usage'},group:'App',title:'Usage',words:'quota limits account credits remaining'});
  for(const l of layouts){const t={main:'Herdr',terminals:'Terminals',win98:'Herdr 98'}[l]??l.charAt(0).toUpperCase()+l.slice(1);list.push({name:'layout.switch',args:{name:l},group:'Layout',title:`Layout: ${t}`,words:`look ${l}`});}
  for(const {name,light}of themes){if(Boolean(light)===Boolean(dark)||(name!==layout&&layouts.includes(name)))continue;list.push({name:'app.theme',args:{name},group:'App',title:`Theme: ${name.replace(/-/g,' ')}`,words:'colors look'});}
  const names=new Set(named.map(([n])=>n));
  for(const c of known.values()){
    if(names.has(c.name)||hidden.has(c.name)||c.args.some(a=>a.required&&a.name!=='name'))continue;
    const [noun,verb]=c.name.split('.');if(!verb)continue;
    list.push({name:c.name,args:{},group:noun.charAt(0).toUpperCase()+noun.slice(1),title:`${verb.replace(/_/g,' ')} ${noun}`.replace(/^./,c=>c.toUpperCase()),words:c.about});
  }
  const all=list.map(e=>({...e,id:`${e.name}:${JSON.stringify(e.args)}`})),have=new Set(all.map(e=>entryId(e.name,e.args)));
  for(const p of mods){const e=modEntry(p,known),id=e&&entryId(e.name,e.args);if(!e||have.has(id))continue;have.add(id);all.push({...e,id});}
  return all;
}
export function keyOf(e,bound){
  const [first,...other]=Object.keys(e.args),value=e.args[first];let want=first===undefined?e.name:null;
  if(typeof value==='string'||typeof value==='number'){
    const numeric=e.modArgs?.some(a=>a.name==='index')&&/^\+?\d+$/.test(String(value));
    const shorthand=numeric?first==='index'&&Number.isSafeInteger(value)&&value>=0:first===e.modArgs?.[0]?.name&&typeof value==='string';
    if(!e.modArgs||(!other.length&&shorthand))want=`${e.name}:${value}`;
  }
  for(const {section,keys,action}of bound){if(section!=='global')continue;if(action===want)return keys;
    if(e.modArgs&&action.startsWith('{'))try{const {command,args={}}=JSON.parse(action);if(command===e.name&&entryId(command,args)===e.id)return keys;}catch{}
  }return null;
}
export function paletteCommand(entry){
  if(entry.name==='app.settings')return {name:'mod.open',args:{name:'custom-settings'}};
  const mod={picker:'custom-picker',settings:'custom-settings','machine-add':'custom-machine-add',worktree:'custom-worktree'}[entry.args?.name];
  if(entry.name==='mod.open'&&typeof mod==='string')return {name:'mod.open',args:{...entry.args,name:mod}};
  if(entry.name==='tab.rename'&&!Object.keys(entry.args??{}).length)return {name:'custom-tabs.rename-tab',args:{}};
  if(entry.name==='space.rename'&&!Object.keys(entry.args??{}).length)return {name:'custom-tabs.rename-space',args:{}};
  if(['pane.close','tab.close','space.close'].includes(entry.name)&&!Object.keys(entry.args??{}).length)return {name:`custom-tabs.close-${entry.name.split('.')[0]}`,args:{}};
  return {name:entry.name,args:entry.args};
}
export function activation(entry,layout){
  if(entry.name==='mod.clone'&&!entry.args.name)return {prompt:true};
  const target=paletteCommand(entry);
  return {...target,args:entry.name==='layout.clone'&&!entry.args.name?{name:layout??'main'}:target.args};
}
export const HISTORY_KEY='custom.palette.recent';
export function recentIds(value){return Array.isArray(value)?[...new Set(value.filter(v=>typeof v==='string'&&v.length<=4096))].slice(0,20):[];}
export function remember(value,id){return recentIds([id,...recentIds(value)]);}
export function fuzzy(q,text){
  const t=text.toLowerCase();let score=0,at=0,run=0;const hits=[];
  for(const ch of q){const i=t.indexOf(ch,at);if(i<0)return null;const start=i===0||/[\s:.\-_/]/.test(t[i-1]);run=i===at&&hits.length?run+1:0;score+=1+(start?6:0)+run*3-Math.min(i-at,6)*0.3;hits.push(i);at=i+1;}
  return {score:score-text.length*0.02,hits};
}
export function rows(all,query,recent){
  const q=query.trim().toLowerCase().replace(/\s+/g,'');
  if(!q){const first=recent.map(id=>all.find(e=>e.id===id)).filter(Boolean).slice(0,5),rest=GROUPS.slice(1).flatMap(g=>all.filter(e=>e.group===g&&!first.includes(e))),other=all.filter(e=>!GROUPS.includes(e.group)&&!first.includes(e));return [...first.map(e=>({e,head:'Recent'})),...[...rest,...other].map(e=>({e,head:e.group}))];}
  const rank=e=>recent.indexOf(e.id);
  return all.map(e=>{const title=fuzzy(q,e.title),more=fuzzy(q,`${e.group} ${e.title} ${e.name} ${e.words}`),best=title??(more&&{score:more.score-4,hits:[]});return best&&{e,score:best.score,hits:best.hits};}).filter(Boolean).sort((a,b)=>b.score-a.score||(rank(a.e)<0?99:rank(a.e))-(rank(b.e)<0?99:rank(b.e)));
}
