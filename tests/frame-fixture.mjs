// Disposable-home support only. Never imported by production patch workers.
import fs from 'node:fs';
import path from 'node:path';
export function seedNativeSDK(home,registry) {
  fs.mkdirSync(home,{recursive:true});
  fs.writeFileSync(path.join(home,'herdr.d.ts'),[...new Set([...registry.flatMap(p=>p.capabilities??[]),'themes','settings'])].map(n=>`export function ${n}(): unknown;`).join('\n'));
}
export function fileSnapshot(dir) {
  const out={};
  function visit(d,base='') {for(const n of fs.readdirSync(d)){const p=path.join(d,n);if(fs.statSync(p).isDirectory())visit(p,base+n+'/');else {const s=fs.statSync(p,{bigint:true});out[base+n]=[fs.readFileSync(p,'utf8'),String(s.ino),String(s.mtimeNs)];}}}
  visit(dir);return out;
}
