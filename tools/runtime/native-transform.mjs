import { Incompatible, tree, nodes, one, method, call, text, edits, imports } from './native-ast.mjs';
const put = (node,value) => ({start:node.start,end:node.end,value});
const insert = (at,value) => ({start:at,end:at,value});
function view(ast,id) {
  if(nodes(ast,n=>n.type==='Identifier'&&n.name.startsWith('__custom')).length)throw new Incompatible('reserved Custom bridge binding collision');
  const klass=one(ast.body.filter(n=>n.type==='ExportDefaultDeclaration'&&n.declaration.type==='ClassDeclaration'),'default native view').declaration;
  if(klass.id?.name.toLowerCase()!==id||klass.superClass?.name!=='View')throw new Incompatible(`native ${id} view shape`);
  return klass;
}
export function transformPalette(source,prefix) {
  const ast=tree(source),klass=view(ast,'palette'),init=method(klass,'init'),go=method(klass,'go'),rows=method(klass,'rows'),render=method(klass,'render'),close=method(klass,'close');method(klass,'title');
  const entriesCall=one(nodes(rows,n=>n.type==='VariableDeclarator'&&n.init?.type==='CallExpression'&&n.init.arguments.length===0&&n.init.callee.type==='Identifier'&&ast.body.some(f=>f.type==='FunctionDeclaration'&&f.id.name===n.init.callee.name)),'rows entry supplier').init;
  const supplier=one(ast.body.filter(f=>f.type==='FunctionDeclaration'&&f.id.name===entriesCall.callee.name),'entry function');
  const result=one(supplier.body.body.filter(n=>n.type==='ReturnStatement'),'entry result');
  const keyOf=one(ast.body.filter(f=>f.type==='FunctionDeclaration'&&nodes(f,n=>call(n,'find')).length),'key binding function').id.name;
  const keyParts=one(ast.body.filter(f=>f.type==='FunctionDeclaration'&&nodes(f,n=>call(n,'endsWith')).length),'key parts function').id.name;
  const nativeImport=one(ast.body.filter(n=>n.type==='ImportDeclaration'&&n.source.value==='herdr'),'native import');
  const run=one(nativeImport.specifiers.filter(n=>n.imported?.name==='run'),'native run binding').local.name;
  const dispatch=one(nodes(go,n=>n.type==='CallExpression'&&n.callee.name===run&&n.arguments[0]?.type==='MemberExpression'&&n.arguments[0].object.name===go.params[0]?.name),'palette activation dispatch');
  const change=one(nodes(init,n=>call(n,'on')&&n.arguments[0]?.value==='change'),'input change callback').arguments[1];
  if(change.body.type!=='BlockStatement'||!init.params[1]?.name)throw new Incompatible('palette init callback shape');
  const placeholder=one(nodes(init,n=>n.type==='Property'&&n.key.name==='placeholder'),'palette placeholder').value;
  const ranges=[imports(source,ast,prefix),insert(nativeImport.end,`\nimport * as __customPalette from '${prefix}/palette-ui.js';`),
    put(result.argument,`__customPalette.entries(${text(source,result.argument)})`),
    insert(init.body.end-1,`\n__customPalette.init.call(this,${init.params[1].name});\n`),
    insert(change.body.end-1,';__customPalette.reset.call(this);'),
    put(placeholder,`(__customPalette.active() ? 'Search for a command…' : ${text(source,placeholder)})`),
    insert(close.body.start+1,'__customPalette.close.call(this);'),
    put(dispatch,`__customPalette.dispatch(${go.params[0].name},(name,args)=>${run}(name,args),()=>${text(source,dispatch)})`),
    insert(render.body.start+1,`if (__customPalette.active()) return __customPalette.render.call(this,{keyOf:${keyOf},keyParts:${keyParts}});`)];
  return edits(source,ranges);
}
export function transformNative(id,source,prefix,options) {
  if(id==='palette')return transformPalette(source,prefix,options);
  throw new Incompatible(`no structural adapter for ${id}`);
}
