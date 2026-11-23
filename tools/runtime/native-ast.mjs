// Non-executing, range-preserving structural edits. Acorn 8.15.0 (MIT).
import { parse } from '../vendor/acorn/acorn.mjs';
export class Incompatible extends Error {}
export function tree(source) {
  if (Buffer.byteLength(source) > 1024 * 1024) throw new Incompatible('source exceeds 1 MiB');
  try { return parse(source, { ecmaVersion: 'latest', sourceType: 'module' }); }
  catch (error) { throw new Incompatible(`JavaScript parse: ${error.message}`); }
}
export function nodes(node, predicate) {
  const found = [];
  function visit(n) {
    if (!n || typeof n !== 'object') return;
    if (n.type && predicate(n)) found.push(n);
    for (const [key, value] of Object.entries(n)) if (!['start','end','type'].includes(key)) {
      if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(node); return found;
}
export function one(items, anchor) {
  if (items.length !== 1) throw new Incompatible(`${anchor}: expected one anchor, found ${items.length}`);
  return items[0];
}
export const method = (klass, name) => one(klass.body.body.filter(n => n.type === 'MethodDefinition' && n.key.name === name), `method ${name}`).value;
export const call = (n, name) => n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.property.name === name;
export const text = (source, node) => source.slice(node.start, node.end);
export function edits(source, ranges) {
  const sorted = [...ranges].sort((a,b) => a.start - b.start || a.end - b.end);
  let end = 0;
  for (const e of sorted) {
    if (e.start < end || e.start < 0 || e.end < e.start || e.end > source.length) throw new Incompatible('overlapping/invalid structural edits');
    end = e.end;
  }
  let output = source;
  for (const e of sorted.reverse()) output = output.slice(0,e.start) + e.value + output.slice(e.end);
  tree(output); return output;
}
export function imports(source, ast, prefix) {
  const native = one(ast.body.filter(n => n.type === 'ImportDeclaration' && n.source.value === 'herdr'), 'native import');
  return { start: native.source.start, end: native.source.end, value: JSON.stringify(`${prefix}/host.js`) };
}
// Imports are closed before activation, not first discovered by a live GPUI VM.
export function checkGraph(main, files) {
  const seen = new Set();
  function exported(source) {
    const names=new Set();
    for(const node of tree(source).body) {
      if(node.type==='ExportDefaultDeclaration')names.add('default');
      if(node.type==='ExportNamedDeclaration') {
        if(node.declaration?.id)names.add(node.declaration.id.name);
        for(const d of node.declaration?.declarations??[])if(d.id.name)names.add(d.id.name);
        for(const s of node.specifiers??[])names.add(s.exported.name);
      }
    }
    return names;
  }
  function visit(name, source) {
    if (seen.has(name)) return; seen.add(name);
    const ast=tree(source);
    if(nodes(ast,n=>n.type==='ImportExpression').length)throw new Incompatible(`dynamic imports cannot be self-checked: ${name}`);
    for (const n of ast.body) if (['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(n.type) && n.source) {
      const ref = n.source.value;
      if (['herdr','gpui-kit','gpui-base'].includes(ref)) continue;
      if (!ref.startsWith('./') && !ref.startsWith('../')) throw new Incompatible(`unsupported module ${ref}`);
      const parts = name.split('/').slice(0,-1);
      for (const p of ref.split('/')) { if (p === '..') { if (!parts.length) throw new Incompatible('module escapes frame'); parts.pop(); } else if (p !== '.') parts.push(p); }
      const dest = parts.join('/');
      if (!Object.hasOwn(files,dest)) throw new Incompatible(`missing module ${dest}`);
      const names=exported(files[dest]);
      for(const s of n.specifiers??[]) {
        const wanted=s.type==='ImportDefaultSpecifier'?'default':s.imported?.name;
        if(wanted&&!names.has(wanted))throw new Incompatible(`missing export ${wanted} from ${dest}`);
      }
      visit(dest,files[dest]);
    }
  }
  visit('main.js',main);
}
