// Palette retirement recovery owns metadata, never an old native main.js image.
import fs from 'node:fs';
import {contained,digest,put} from './files.mjs';
const RECORD='.customizations/frame-palette.json',MARKER='.customizations/palette-retired.json';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const read=(home,rel)=>{const file=contained(home,rel);return fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;};
const hash=(home,rel)=>{const file=contained(home,rel);return digest(fs.existsSync(file)?fs.readFileSync(file):null);};
const validHash=v=>v===null||typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
// The retained exception's historical surface only, not a general file journal.
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
function validateCapture(capture){
 if(capture?.version!==1||typeof capture.record!=='string'||capture.marker!==null&&typeof capture.marker!=='string')throw Error('Invalid palette retirement recovery');
 recoveryRecord(capture.record);frameMap(capture.frames);return capture;
}
export function paletteReceiptPath(capture,manifestHash){
 validateCapture(capture);if(!validHash(manifestHash)||manifestHash===null)throw Error('Invalid palette recovery deployment identity');
 const signature=JSON.stringify({frames:Object.fromEntries(Object.entries(capture.frames).sort(([a],[b])=>a.localeCompare(b))),marker:capture.marker});
 return `.customizations/recovery/palette-retirement/${digest(capture.record)}-${manifestHash}-${digest(signature)}.receipt.json`;
}
export function recordPaletteRetirement(home,capture,manifestHash,after,marker){
 const rel=paletteReceiptPath(capture,manifestHash);frameMap(after);
 const receipt={version:1,recordHash:digest(capture.record),manifestHash,before:capture.frames,after,markerBefore:digest(capture.marker),markerAfter:digest(marker)};
 const text=JSON.stringify(receipt,null,2)+'\n',previous=read(home,rel);
 if(previous!==null&&previous!==text)throw Error('Palette retirement recovery receipt conflict');
 if(previous===null)put(contained(home,rel),text,null);
 return rel;
}
// Preflight before any rollback writes. Allow only captured or precisely planned
// retirement bytes, including interrupted retirement. Personal/new stock refuses.
export function paletteRollbackJobs(home,capture,manifestHash){
 validateCapture(capture);const receiptRaw=read(home,paletteReceiptPath(capture,manifestHash));let receipt=null;
 if(receiptRaw!==null){
  try{receipt=JSON.parse(receiptRaw);}catch{throw Error('Invalid palette retirement receipt');}
  if(receipt?.version!==1||receipt.recordHash!==digest(capture.record)||receipt.manifestHash!==manifestHash||receipt.markerBefore!==digest(capture.marker)||!validHash(receipt.markerAfter))throw Error('Invalid palette retirement receipt');
  frameMap(receipt.before);frameMap(receipt.after);
  for(const [rel,value]of Object.entries(capture.frames))if(receipt.before[rel]!==value)throw Error('Palette changed before retirement; rollback refused');
  for(const [rel,value]of Object.entries(receipt.before))if(!Object.hasOwn(capture.frames,rel)&&value!==null)throw Error('Uncaptured palette edit; rollback refused');
 }
 const paths=new Set([...Object.keys(capture.frames),...Object.keys(receipt?.after??{})]);
 for(const rel of paths){framePath(rel);const before=capture.frames[rel]??null,after=receipt&&Object.hasOwn(receipt.after,rel)?receipt.after[rel]:before;
  if(![before,after].includes(hash(home,rel)))throw Error('Personal or newer native palette edit; rollback refused');
 }
 const result=[];
 for(const [rel,before,allowed]of [[RECORD,capture.record,receipt?[digest(capture.record),null]:[digest(capture.record)]],[MARKER,capture.marker,receipt?[digest(capture.marker),receipt.markerAfter]:[digest(capture.marker)]]]){
  const actual=read(home,rel);if(!allowed.includes(digest(actual)))throw Error('Palette ownership changed after deployment; rollback refused');
  result.push({file:contained(home,rel),before:before===null?null:Buffer.from(before),actual:actual===null?null:Buffer.from(actual),paletteRecovery:true});
 }
 return result;
}
