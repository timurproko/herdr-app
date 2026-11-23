// Pure source edits for compatibility fixtures; never evaluates downloaded code.
import {tree,nodes,method,call,text,edits} from '../tools/runtime/native-ast.mjs';
export function referenceInputChange(source) {
  const ast=tree(source),klass=ast.body.find(n=>n.type==='ExportDefaultDeclaration').declaration,init=method(klass,'init');
  const registration=nodes(init,n=>call(n,'on')&&n.arguments[0]?.value==='change')[0],callback=registration.arguments[1];
  return edits(source,[{start:init.body.start+1,end:init.body.start+1,value:`\nconst onChange = ${text(source,callback)};\n`},{start:callback.start,end:callback.end,value:'onChange'}]);
}
export function sourceMutations(source) {
  const cases=[],ast=tree(source),klass=ast.body.find(n=>n.type==='ExportDefaultDeclaration').declaration;
  const add=(name,node,replacement)=>cases.push({name,source:source.slice(0,node.start)+replacement+source.slice(node.end)});
  for(const m of klass.body.body.filter(n=>n.type==='MethodDefinition')) {
    const name=m.key.name;
    add(`method ${name}:remove`,m,'');add(`method ${name}:rename`,m.key,name+'Future');
    add(`method ${name}:wrap`,m.value.body,`{return (()=>${text(source,m.value.body)})();}`);
    m.value.params.forEach((p,i)=>add(`method ${name}:destructure parameter ${i}`,p,'{nativeFuture}'));
    cases.push({name:`method ${name}:reorder`,source:source.slice(0,m.start)+source.slice(m.end,klass.body.end-1)+'\n'+text(source,m)+'\n'+source.slice(klass.body.end-1)});
  }
  for(const n of ast.body.filter(n=>n.type==='FunctionDeclaration')) {
    add(`function ${n.id.name}:remove`,n,'');add(`function ${n.id.name}:rename`,n.id,n.id.name+'Future');
    add(`function ${n.id.name}:wrap`,n.body,`{return (()=>${text(source,n.body)})();}`);
  }
  const allImports=ast.body.filter(n=>n.type==='ImportDeclaration');
  for(const n of allImports) {
    add(`import ${n.source.value}:remove`,n,'');
    add(`import ${n.source.value}:rename`,n.source,JSON.stringify(n.source.value+'-future'));
  }
  cases.push({name:'imports:reorder',source:source.slice(allImports.at(-1).end)+'\n'+[...allImports].reverse().map(n=>text(source,n)).join('\n')});
  const callbacks=nodes(klass,n=>n.type==='CallExpression').flatMap(n=>n.arguments.filter(a=>['ArrowFunctionExpression','FunctionExpression'].includes(a.type)).map((a,i)=>({call:n,node:a,index:i})));
  callbacks.forEach(({call:n,node,index},i)=>{
    const anchor=`callback ${n.callee.property?.name??n.callee.name}/${i}/${index}`;
    add(`${anchor}:remove`,node,'undefined');
    add(`${anchor}:remove argument`,{start:n.arguments[0].start,end:n.arguments.at(-1).end},n.arguments.filter(a=>a!==node).map(a=>text(source,a)).join(','));
    node.params.forEach((p,j)=>add(`${anchor}:destructure parameter ${j}`,p,'{nativeFuture}'));
    add(`${anchor}:wrap`,node,`((callback)=>callback)(${text(source,node)})`);
    if(node.type==='ArrowFunctionExpression'&&node.body.type!=='BlockStatement')add(`${anchor}:block`,node.body,`{return ${text(source,node.body)};}`);
  });
  const slots=nodes(klass,n=>call(n,'child')||call(n,'when')||call(n,'children')||call(n,'on'));
  slots.forEach((n,i)=>{
    add(`slot ${n.callee.property.name}/${i}:rename`,n.callee.property,'nativeFutureSlot');
    add(`slot ${n.callee.property.name}/${i}:computed`,{start:n.callee.object.end,end:n.callee.end},`[nativeFutureSlot]`);
    if(n.arguments.length)add(`slot ${n.callee.property.name}/${i}:wrap argument`,n.arguments[0],`nativeFutureWrapper(${text(source,n.arguments[0])})`);
    if(n.arguments.length)add(`slot ${n.callee.property.name}/${i}:remove argument`,n.arguments[0],'undefined');
    if(n.arguments.length>1)cases.push({name:`slot ${n.callee.property.name}/${i}:reorder arguments`,source:edits(source,[{start:n.arguments[0].start,end:n.arguments[0].end,value:text(source,n.arguments[1])},{start:n.arguments[1].start,end:n.arguments[1].end,value:text(source,n.arguments[0])}])});
  });
  cases.push({name:'input change:reference',source:referenceInputChange(source)});
  return cases;
}
