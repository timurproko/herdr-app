import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileIconAsset, FILE_EXTENSIONS } from '../mods/custom-files/file-icons.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const helper=fs.readFileSync(path.join(root,'mods/custom-files/file-icons.js'),'utf8');
for(const mod of ['custom-tabs','custom-pane','custom-picker'])assert.equal(fs.readFileSync(path.join(root,'mods',mod,'file-icons.js'),'utf8'),helper);
for(const [name,icon]of [['package.json','json'],['index.TSX','react_ts'],['README.md','markdown'],['app.ts','typescript'],['tool.py','python'],['.gitignore','_default'],['LICENSE','_default'],['json','_default'],['file.__proto__','_default']])assert.equal(fileIconAsset(name),`mods/custom-files/icons/${icon}.svg`);
for(const ext of Object.keys(FILE_EXTENSIONS)){
 const asset=path.join(root,fileIconAsset('fixture.'+ext));assert.ok(fs.existsSync(asset));const svg=fs.readFileSync(asset,'utf8');assert.ok(svg.startsWith('<svg'));assert.ok(!/<script|<foreignObject|href=["']https?:/i.test(svg));
}
const dir=path.join(root,'mods/custom-files/icons');assert.equal(fs.readdirSync(dir).filter(f=>f.endsWith('.svg')).length,54);
for(const notice of ['NOTICE.txt','LICENSE-MATERIAL.txt','LICENSE-REFERENCE.txt'])assert.ok(fs.existsSync(path.join(dir,notice)));
const {allowedPath}=await import('./deploy.mjs');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'bundle.json'),'utf8'));
for(const name of ['mods/custom-files/icons/json.svg','mods/custom-files/icons/LICENSE-MATERIAL.txt','mods/custom-files/icons/LICENSE-REFERENCE.txt','mods/custom-files/icons/NOTICE.txt'])assert.ok(manifest.files[name],'Owned artwork and licenses are explicit build outputs');
for(const name of ['mods/custom-files/icons/../../keys.json','mods/stock/main.js','keys.json'])assert.throws(()=>allowedPath(name));
assert.ok(!manifest.files['mods/custom-files/icons/personal.txt'],'Unknown personal artwork is not managed');
console.log('PASS: 54 self-contained toned Material file icons, extension matching, sandbox-local helper equality and artwork licenses');
