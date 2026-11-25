// Installed metadata reader. Never import/execute discovered mods or read their code.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const LIMIT=1024*1024;
export async function manifestPalettes(home){
  const root=path.join(home,'mods'),found=[];let bytes=0;
  const names=(await fs.readdir(root,{withFileTypes:true})).filter(e=>e.isDirectory()&&!e.isSymbolicLink()&&!e.name.startsWith('.')).map(e=>e.name).sort();
  if(names.length>4096)throw Error('Palette manifest inventory exceeds 4096 mods');
  for(const mod of names){
    let list;
    try{const file=path.join(root,mod,'mod.json'),stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>LIMIT)continue;
      const text=await fs.readFile(file,'utf8');bytes+=Buffer.byteLength(text);if(bytes>8*LIMIT)throw Error('Palette manifest inventory exceeds 8 MiB');list=JSON.parse(text).palette;
    }catch(error){if(error.message.includes('exceeds 8 MiB'))throw error;continue;}
    if(!Array.isArray(list))continue;
    for(const p of list){
      if(!p||typeof p!=='object'||Array.isArray(p))continue;
      if(p.command==='mod.open'){
        const target=p.args?.name;if(!names.includes(target))continue;
        try{const stat=await fs.lstat(path.join(root,target,'main.js'));if(!stat.isFile()||stat.isSymbolicLink())continue;}catch{continue;}
      }
      found.push({...p,mod});
      if(found.length>4096||Buffer.byteLength(JSON.stringify(found))>LIMIT)throw Error('Palette contributions exceed safe output limit');
    }
  }
  return found;
}
// Read only a recognized native palette storage shape; leave all native stores intact.
export async function legacyRecent(home){
  const root=path.join(home,'data/frame-palette');let files;
  try{const stat=await fs.lstat(root);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('Unsafe legacy palette store');files=await fs.readdir(root);}catch(error){if(error.code==='ENOENT')return [];throw error;}
  const candidates=[];
  for(const name of files.filter(n=>/^store(?:-[0-9a-f]{16})?\.json$/.test(n)).slice(0,128)){
    const file=path.join(root,name),stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>LIMIT)throw Error('Unsafe legacy palette store');
    candidates.push({file,mtime:stat.mtimeMs});
  }
  candidates.sort((a,b)=>b.mtime-a.mtime||a.file.localeCompare(b.file));
  if(!candidates.length)return [];
  const store=JSON.parse(await fs.readFile(candidates[0].file,'utf8'));
  if(!store||typeof store!=='object'||Array.isArray(store))throw Error('Unrecognized legacy palette store');
  if(store.recent===undefined)return [];
  if(typeof store.recent!=='string')throw Error('Unrecognized legacy palette history');
  const ids=JSON.parse(store.recent);
  if(!Array.isArray(ids)||ids.length>20||ids.some(id=>typeof id!=='string'||id.length>4096||!id.includes(':')))throw Error('Unrecognized legacy palette history');
  return [...new Set(ids)];
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{if(!process.argv[2])throw Error('App home required');console.log(JSON.stringify({ok:true,entries:await manifestPalettes(process.argv[2])}));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
