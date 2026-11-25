// Irreducible native opt-in/provenance recovery, independent of deployment journals.
import fs from 'node:fs';
import path from 'node:path';
import {contained,digest,put} from './files.mjs';
const RECORD='.customizations/frame-palette.json',MARKER='.customizations/palette-retired.json',RECOVERY='.customizations/recovery/palette-retirement/';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function location(home,rel){
 const file=contained(home,rel);let current=path.resolve(home);
 for(const part of ['',...rel.split('/')]){if(part)current=path.join(current,part);let stat;try{stat=fs.lstatSync(current);}catch(error){if(error.code!=='ENOENT')throw error;}if(stat?.isSymbolicLink())throw Error('Linked palette recovery path refused');}
 return file;
}
const read=(home,rel)=>{const file=location(home,rel);return fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;};
const hash=(home,rel)=>{const file=location(home,rel);return digest(fs.existsSync(file)?fs.readFileSync(file):null);};
const validHash=v=>v===null||typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const FRAME_NAMES=new Set(['main.js','custom-ui.js','custom-look.js','custom-routing.js','custom-scroll-fade.js','identity.js','compatibility.js','host.js']);
function framePath(rel){if(!rel.startsWith('frame/palette/')||!FRAME_NAMES.has(rel.slice('frame/palette/'.length)))throw Error('Invalid palette recovery frame path');return rel;}
function frameMap(value){if(!object(value)||!Object.hasOwn(value,'frame/palette/main.js')||Object.entries(value).some(([rel,v])=>{framePath(rel);return !validHash(v);}))throw Error('Invalid palette recovery frame hashes');return value;}
function recoveryRecord(raw){
 let state;try{state=JSON.parse(raw);}catch{throw Error('Invalid previous palette opt-in');}
 if(state?.version!==1||!object(state.original)||!object(state.installed)||typeof state.original['main.js']!=='string'||!validHash(state.installed['main.js'])||state.installed['main.js']===null||Object.values(state.installed).some(v=>!validHash(v)||v===null)||Object.values(state.original).some(v=>v!==null&&typeof v!=='string'))throw Error('Invalid previous palette opt-in');
 return state;
}
export function capturePaletteRetirement(home){
 const record=read(home,RECORD);if(record===null)return null;
 const state=recoveryRecord(record),names=[...new Set([...Object.keys(state.installed),...Object.keys(state.original)])].sort(),frames={};
 for(const name of names){const rel=framePath(`frame/palette/${name}`);frames[rel]=hash(home,rel);}
 return {version:1,record,marker:read(home,MARKER),frames};
}
export function paletteReceiptPath(capture,manifestHash){
 if(capture?.version!==1||typeof capture.record!=='string'||capture.marker!==null&&typeof capture.marker!=='string'||!validHash(manifestHash)||manifestHash===null)throw Error('Invalid palette recovery identity');
 recoveryRecord(capture.record);frameMap(capture.frames);
 const signature=JSON.stringify({frames:Object.fromEntries(Object.entries(capture.frames).sort(([a],[b])=>a.localeCompare(b))),marker:capture.marker});
 return `${RECOVERY}${digest(capture.record)}-${manifestHash}-${digest(signature)}.receipt.json`;
}
export function recordPaletteRetirement(home,capture,manifestHash,after,marker){
 const rel=paletteReceiptPath(capture,manifestHash);frameMap(after);
 const receipt={version:1,recordHash:digest(capture.record),manifestHash,before:capture.frames,after,markerBefore:digest(capture.marker),markerAfter:digest(marker)};
 const text=JSON.stringify(receipt,null,2)+'\n',previous=read(home,rel);
 if(previous!==null&&previous!==text)throw Error('Palette retirement recovery receipt conflict');
 if(previous===null)put(location(home,rel),text,null);return rel;
}
// The current retirement marker identifies prior intent; no deploy-time key or
// native snapshots are consulted. Exact receipts protect what payload cannot tell.
export function nativePaletteRecoveryPlan(home){
 const marker=read(home,MARKER);if(marker===null)return null;
 let state;try{state=JSON.parse(marker);}catch{throw Error('Invalid palette retirement marker');}
 if(state.version===1&&state.retired===true&&state.status==='no-native-patch'&&state.archive===undefined)return null;
 if(state.version!==1||state.retired!==true||typeof state.archive!=='string'||!/^\.customizations\/recovery\/palette-retirement\/[a-f0-9]{64}\.json$/.test(state.archive))throw Error('Invalid palette retirement marker');
 const record=read(home,state.archive);recoveryRecord(record);
 if(`${RECOVERY}${digest(record)}.json`!==state.archive)throw Error('Palette recovery archive differs');
 let candidates;
 if(state.receipt)candidates=[state.receipt];
 else candidates=fs.readdirSync(location(home,RECOVERY.slice(0,-1))).filter(name=>name.startsWith(`${digest(record)}-`)&&name.endsWith('.receipt.json')).map(name=>RECOVERY+name); // Earlier exact-hash marker format.
 const receipts=candidates.map(rel=>{
  if(typeof rel!=='string'||!/^\.customizations\/recovery\/palette-retirement\/[a-f0-9]{64}-[a-f0-9]{64}-[a-f0-9]{64}\.receipt\.json$/.test(rel))throw Error('Invalid palette recovery receipt path');
  const raw=read(home,rel);if(raw===null)throw Error('Missing palette retirement receipt');return JSON.parse(raw);
 }).filter(value=>value.recordHash===digest(record)&&value.markerAfter===digest(marker));
 if(receipts.length!==1)throw Error('Palette ownership changed or recovery receipt unavailable');
 const receipt=receipts[0];if(receipt.version!==1)throw Error('Invalid palette retirement receipt');frameMap(receipt.before);frameMap(receipt.after);
 for(const rel of new Set([...Object.keys(receipt.before),...Object.keys(receipt.after)]))if(![receipt.before[rel]??null,receipt.after[rel]??null].includes(hash(home,rel)))throw Error('Personal or newer native palette edit; recovery refused');
 const before=read(home,RECORD);if(before!==null&&before!==record)throw Error('Palette ownership changed after retirement');
 return {record,before,marker};
}
export function restoreNativePaletteIntent(home,plan){
 if(!plan)return false;
 put(location(home,RECORD),plan.record,digest(plan.before));
 if(read(home,MARKER)!==plan.marker)throw Error('Concurrent palette retirement marker edit');
 fs.unlinkSync(location(home,MARKER));return true;
}
