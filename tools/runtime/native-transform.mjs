import { Incompatible, tree, nodes, one, method, call, text, edits, imports } from './native-ast.mjs';
const put = (node,value) => ({start:node.start,end:node.end,value});
const insert = (at,value) => ({start:at,end:at,value});
function view(ast,id) {
  if(nodes(ast,n=>n.type==='Identifier'&&n.name.startsWith('__custom')).length)throw new Incompatible('reserved Custom bridge binding collision');
  const klass=one(ast.body.filter(n=>n.type==='ExportDefaultDeclaration'&&n.declaration.type==='ClassDeclaration'),'default native view').declaration;
  const viewBinding=one(ast.body.filter(n=>n.type==='ImportDeclaration'&&n.source.value==='gpui-kit').flatMap(n=>n.specifiers.filter(s=>s.imported?.name==='View')),'native View import').local.name;
  if(klass.superClass?.name!==viewBinding)throw new Incompatible(`native ${id} view shape`);
  return klass;
}
function requireFields(init,names) {
  for(const name of names)one(init.body.body.map(n=>n.expression).filter(n=>n?.type==='AssignmentExpression'&&n.left.type==='MemberExpression'&&n.left.object.type==='ThisExpression'&&n.left.property.name===name),`native state ${name}`);
}
function hookConflicts(klass,init,names) {
  if(nodes(klass,n=>(n.type==='AssignmentExpression'&&n.left.object?.type==='ThisExpression'&&names.includes(n.left.property?.name))||(n.type==='MethodDefinition'&&names.includes(n.key?.name))).length)throw new Incompatible('native state collides with Custom lifecycle hooks');
  if(nodes(init,n=>call(n,'on')&&['focus','blur'].includes(n.arguments[0]?.value)).length)throw new Incompatible('native focus/blur hooks cannot be safely replaced');
}
// Replaced presentation may change styling, but must not hide an unrecognized
// factory, callback, sibling, computed call or wrapper. Retained nodes are copied
// verbatim (including their callbacks), so they are deliberately opaque here.
const decorators=new Set('absolute bg border_1 border_color bottom cursor_grab cursor_pointer flex flex_1 flex_none font_semibold gap h h_full id items_center items_end justify_center left max_w min_h min_w mx mb overflow_hidden p pb px py relative right rounded size text_color text_size top track_focus w_full'.split(' '));
function presentation(node,anchor,{factories=[],retained=[],extra=[],childCount=0}={}) {
  const methods=new Set([...decorators,...extra]);let children=0;
  function visit(n) {
    if(!n||typeof n!=='object'||retained.includes(n))return;
    if(['ArrowFunctionExpression','FunctionExpression','SpreadElement','AssignmentExpression','UpdateExpression','AwaitExpression','YieldExpression','NewExpression'].includes(n.type))throw new Incompatible(`${anchor}: unretained callback/spread cannot be safely replaced`);
    if(n.type==='CallExpression') {
      const c=n.callee;
      if(c.type==='Identifier') {if(!factories.includes(c.name))throw new Incompatible(`${anchor}: unrecognized factory/wrapper ${c.name}`);}
      else if(c.type!=='MemberExpression'||c.computed||!methods.has(c.property.name))throw new Incompatible(`${anchor}: unrecognized presentation operation`);
      if(c.type==='MemberExpression'&&c.property.name==='child') {children++;if(n.arguments.length!==1)throw new Incompatible(`${anchor}: child arity changed`);}
    }
    for(const [key,value]of Object.entries(n))if(!['start','end','type'].includes(key)) {
      if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);
    }
  }
  visit(node);
  if(children!==childCount)throw new Incompatible(`${anchor}: child slots changed (${children}, expected ${childCount})`);
}
const importedBinding=(ast,module,name)=>one(ast.body.filter(n=>n.type==='ImportDeclaration'&&n.source.value===module).flatMap(n=>n.specifiers.filter(s=>s.imported?.name===name)),`native ${name} import`).local.name;
function directFactory(node,name,anchor) {
  if(node.type!=='CallExpression'||node.callee.type!=='Identifier'||node.callee.name!==name||node.arguments.length)throw new Incompatible(`${anchor}: factory/wrapper shape changed`);
}
export function transformPalette(source,prefix) {
  const ast=tree(source),klass=view(ast,'palette'),init=method(klass,'init'),go=method(klass,'go'),rows=method(klass,'rows'),render=method(klass,'render'),close=method(klass,'close');method(klass,'title');
  requireFields(init,['query','input','at','scroll','recent','handle']);
  hookConflicts(klass,init,['visibleRange','pinnedHead','pendingHead','moreBelow','pendingMore','listScroll','inputFocused','headingSync','listHeight','fadeShape','fadeColor','fadeBackground','topFadeBackground']);
  const rowClick=one(nodes(render,n=>call(n,'on_click')),'palette native row action');
  const rowAction=rowClick.arguments[0]?.body;
  if(rowAction?.type!=='CallExpression'||rowAction.callee.object?.type!=='ThisExpression'||rowAction.callee.property?.name!=='go')throw new Incompatible('palette row activation shape cannot be preserved');
  if(nodes(render,n=>n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&n.callee.property.name?.startsWith('on_')&&!['on_click','on_key_down','on_scroll_wheel'].includes(n.callee.property.name)).length)throw new Incompatible('palette native render adds an unsupported interactive region');
  const nativeKeys=one(nodes(render,n=>call(n,'on_key_down')),'palette keyboard handler').arguments[0];
  if(nodes(nativeKeys,n=>n.type==='Literal'&&typeof n.value==='string'&&!['escape','down','up','pagedown','pageup'].includes(n.value)).length)throw new Incompatible('palette keyboard actions changed; Custom handler cannot preserve them');
  const entriesCall=one(nodes(rows,n=>n.type==='VariableDeclarator'&&n.init?.type==='CallExpression'&&n.init.arguments.length===0&&n.init.callee.type==='Identifier'&&ast.body.some(f=>f.type==='FunctionDeclaration'&&f.id.name===n.init.callee.name)),'rows entry supplier').init;
  const supplier=one(ast.body.filter(f=>f.type==='FunctionDeclaration'&&f.id.name===entriesCall.callee.name),'entry function');
  const result=one(supplier.body.body.filter(n=>n.type==='ReturnStatement'),'entry result');
  const keyOf=one(ast.body.filter(f=>f.type==='FunctionDeclaration'&&nodes(f,n=>call(n,'find')).length),'key binding function').id.name;
  const keyParts=one(ast.body.filter(f=>f.type==='FunctionDeclaration'&&nodes(f,n=>call(n,'endsWith')).length),'key parts function').id.name;
  const nativeImport=one(ast.body.filter(n=>n.type==='ImportDeclaration'&&n.source.value==='herdr'),'native import');
  const run=one(nativeImport.specifiers.filter(n=>n.imported?.name==='run'),'native run binding').local.name;
  const dispatch=one(nodes(go,n=>n.type==='CallExpression'&&n.callee.name===run&&n.arguments[0]?.type==='MemberExpression'&&n.arguments[0].object.name===go.params[0]?.name),'palette activation dispatch');
  if(dispatch.arguments.length!==2||dispatch.arguments[0].computed||dispatch.arguments[0].property.name!=='name')throw new Incompatible('palette command dispatch argument contract changed');
  const change=one(nodes(init,n=>call(n,'on')&&n.arguments[0]?.value==='change'),'input change callback').arguments[1];
  if(change.body.type!=='BlockStatement'||!init.params[1]?.name)throw new Incompatible('palette init callback shape');
  const placeholder=one(nodes(init,n=>n.type==='Property'&&n.key.name==='placeholder'),'palette placeholder').value;
  if(placeholder.type!=='Literal')throw new Incompatible('palette placeholder gained behavior');
  // Custom owns this rendering path, not any new native UI additions. Catalog,
  // dispatch and title helpers remain native; unfamiliar render slots fail closed.
  const root=one(render.body.body.filter(n=>n.type==='ReturnStatement'),'palette root return');
  const rootChain=chain(root.argument);directFactory(rootChain.base,importedBinding(ast,'gpui-base','v_flex'),'palette root');
  if(rootChain.ops.filter(o=>o.name==='child').length!==2||nodes(render,n=>call(n,'child')).length!==14||nodes(render,n=>call(n,'children')).length!==3||nodes(render,n=>call(n,'when')).length!==4)throw new Incompatible('palette render content slots changed; native additions cannot be safely replaced');
  const nativeCalls=new Set(['Boolean',...['theme','keys','window'].map(n=>importedBinding(ast,'herdr',n)),...['div','svg'].map(n=>importedBinding(ast,'gpui-kit',n)),...['h_flex','v_flex'].map(n=>importedBinding(ast,'gpui-base',n)),...nodes(render,n=>n.type==='VariableDeclarator'&&n.init?.type==='ArrowFunctionExpression').map(n=>n.id.name),keyOf,keyParts]);
  const nativeMethods=new Set([...decorators,'children','child','when','hover','on_click','on_key_down','on_scroll_wheel','min','max','forEach','push','map','rows','go','title','close','stop_propagation','notify','new']);
  for(const n of nodes(render,n=>n.type==='CallExpression')) {
    const c=n.callee;
    if(c.type==='MemberExpression'&&c.property.name==='new'&&c.object.name!==importedBinding(ast,'gpui-base','Input'))throw new Incompatible('palette render gained a native control factory');
    if(c.type==='Identifier'?!nativeCalls.has(c.name):c.type!=='MemberExpression'||c.computed||!nativeMethods.has(c.property.name))throw new Incompatible('palette render gained an unsupported factory/wrapper/action');
  }
  for(const name of ['rows','title','go','close'])if(nodes(render,n=>call(n,name)&&n.callee.object.type==='ThisExpression').length!==1)throw new Incompatible('palette render controller/action slots changed');
  if(nodes(render,n=>n.type==='AssignmentExpression'&&n.left.object?.type==='ThisExpression'&&!['at','maxScroll','scroll'].includes(n.left.property.name)).length)throw new Incompatible('palette render gained native state behavior');
  const ranges=[imports(source,ast,prefix),insert(nativeImport.end,`\nimport * as __customPalette from '${prefix}/palette-ui.js';`),
    put(result.argument,`__customPalette.entries(${text(source,result.argument)})`),
    insert(init.body.end-1,`\n__customPalette.init.call(this,${init.params[1].name});\n`),
    insert(change.body.end-1,';__customPalette.reset.call(this);'),
    put(placeholder,`(__customPalette.active() ? 'Search for a command…' : ${text(source,placeholder)})`),
    insert(close.body.start+1,'__customPalette.close.call(this);'),
    put(dispatch,`((__customName,__customArgs)=>__customPalette.dispatch({...${go.params[0].name},name:__customName,args:__customArgs},(name,args)=>${run}(name,args),()=>${run}(__customName,__customArgs)))(${dispatch.arguments.map(n=>text(source,n)).join(',')})`),
    insert(render.body.start+1,`if (__customPalette.active()) return __customPalette.render.call(this,{keyOf:${keyOf},keyParts:${keyParts}});`)];
  return edits(source,ranges);
}
function chain(node) {
  const ops=[];let base=node;
  while(base.type==='CallExpression'&&base.callee.type==='MemberExpression') {
    ops.unshift({name:base.callee.property.name,args:base.arguments,node:base});base=base.callee.object;
  }
  return {base,ops};
}
function replaceInside(source,node,ranges) {
  let value=text(source,node);
  for(const r of [...ranges].sort((a,b)=>b.start-a.start))value=value.slice(0,r.start-node.start)+r.value+value.slice(r.end-node.start);
  return value;
}
const literal = (node,value) => nodes(node,n=>n.type==='Literal'&&n.value===value).length>0;
const newControl = (node,name) => nodes(node,n=>call(n,'new')&&n.callee.object.name===name);
function actionless(node,anchor,divBinding,parameter=null) {
  directFactory(chain(node).base,divBinding,anchor);
  presentation(node,anchor,{factories:[divBinding],extra:['child'],childCount:1});
  const child=one(chain(node).ops.filter(o=>o.name==='child'),anchor).args[0];
  if(child.type!=='Literal'&&!(parameter&&child.type==='Identifier'&&child.name===parameter))throw new Incompatible(`${anchor}: nested child cannot be safely replaced`);
}
function feedbackWidgets(ast,shots,thumb,remove,button) {
  const divBinding=importedBinding(ast,'gpui-kit','div'),imageBinding=importedBinding(ast,'gpui-kit','image');
  const thumbDecl=one(nodes(shots,n=>n.type==='VariableDeclarator'&&n.init===thumb),'thumbnail declaration');
  const returned=one(shots.body.body.filter(n=>n.type==='ReturnStatement'),'thumbnail row return');
  if(shots.body.body.length!==2||shots.body.body[0].type!=='VariableDeclaration'||shots.body.body[0].declarations.length!==1||shots.body.body[0].declarations[0]!==thumbDecl||thumb.body.type==='BlockStatement')throw new Incompatible('feedback thumbnail setup/return region changed');
  const row=chain(returned.argument);directFactory(row.base,importedBinding(ast,'gpui-base','h_flex'),'feedback thumbnail row');
  const list=one(row.ops.filter(o=>o.name==='children'),'feedback thumbnail list');
  const map=list.args[0];
  if(list.args.length!==1||!call(map,'map')||map.callee.computed||map.callee.object.property?.name!=='shots'||map.callee.object.object?.type!=='ThisExpression'||map.arguments.length!==1||map.arguments[0].name!==thumbDecl.id.name)throw new Incompatible('feedback thumbnail list wrapper changed');
  const gate=one(row.ops.filter(o=>o.name==='when'),'feedback thumbnail add slot');
  const add=gate.args[1];
  if(gate.args.length!==2||add?.type!=='ArrowFunctionExpression'||add.params.length!==1||chain(add.body).base.name!==add.params[0].name)throw new Incompatible('feedback thumbnail add wrapper changed');
  const addChild=one(chain(add.body).ops.filter(o=>o.name==='child'),'feedback thumbnail add control');
  const addButton=addChild.args[0];
  if(addChild.args.length!==1||!call(addButton,'button')||addButton.callee.computed||addButton.callee.object.type!=='ThisExpression'||addButton.arguments.length!==4)throw new Incompatible('feedback thumbnail add control changed');
  const click=addButton.arguments[3];
  if(click.type!=='ArrowFunctionExpression'||click.params.length!==2||click.params.some(p=>p.type!=='Identifier')||!call(click.body,'pick')||click.body.callee.object.type!=='ThisExpression'||click.body.arguments.length!==1||click.body.arguments[0].type!=='Identifier'||click.body.arguments[0].name!==click.params[1].name)throw new Incompatible('feedback thumbnail Add action changed; cannot safely replace');
  presentation(add.body,'feedback thumbnail Add wrapper',{retained:[addButton],extra:['child'],childCount:1});
  presentation(returned.argument,'feedback thumbnail row',{factories:[importedBinding(ast,'gpui-base','h_flex')],retained:[map,add],extra:['children','when']});
  const thumbnail=chain(thumb.body);directFactory(thumbnail.base,divBinding,'feedback thumbnail');
  const kids=thumbnail.ops.filter(o=>o.name==='child');
  if(kids.length!==2||kids.some(o=>o.args.length!==1))throw new Incompatible('feedback thumbnail child slots changed');
  const [picture,control]=kids.map(o=>o.args[0]),pictureBase=chain(picture).base;
  if(pictureBase.type!=='CallExpression'||pictureBase.callee.name!==imageBinding||pictureBase.arguments.length!==1||pictureBase.arguments[0].name!==thumb.params[0].name)throw new Incompatible('feedback thumbnail image wrapper changed');
  presentation(picture,'feedback thumbnail image',{factories:[imageBinding]});
  directFactory(chain(control).base,divBinding,'feedback thumbnail remove control');
  presentation(control,'feedback thumbnail remove control',{factories:[divBinding],retained:[remove],extra:['child','on_click'],childCount:1});
  if(one(chain(control).ops.filter(o=>o.name==='child'),'thumbnail remove caption').args[0].type!=='Literal')throw new Incompatible('feedback thumbnail remove caption changed');
  presentation(thumb.body,'feedback thumbnail',{factories:[divBinding],retained:[picture,control],extra:['child'],childCount:2});
  const buttonReturn=one(button.body.body.filter(n=>n.type==='ReturnStatement'),'feedback button return');
  const params=button.params.map(p=>p.type==='AssignmentPattern'?p.left.name:p.name);
  if(button.body.body.length!==1||params.length!==6||params.some(p=>!p))throw new Incompatible('feedback button setup/parameter shape changed');
  const event=one(nodes(buttonReturn,n=>call(n,'on_click')),'feedback button click').arguments[0];
  const condition=event?.body?.body?.[0],invoke=condition?.consequent?.expression;
  if(event?.type!=='ArrowFunctionExpression'||event.params.length!==2||event.params.some(p=>p.type!=='Identifier')||event.body?.body?.length!==1||condition.type!=='IfStatement'||condition.alternate||condition.test.type!=='UnaryExpression'||condition.test.operator!=='!'||condition.test.argument.name!==params[5]||invoke?.type!=='CallExpression'||invoke.callee.name!==params[3]||invoke.arguments.length!==2||invoke.arguments.some((a,i)=>a.type!=='Identifier'||a.name!==event.params[i].name))throw new Incompatible('feedback button click action changed; cannot safely replace');
  directFactory(chain(buttonReturn.argument).base,divBinding,'feedback button');
  presentation(buttonReturn.argument,'feedback button',{factories:[divBinding],retained:[event],extra:['child','on_click'],childCount:1});
  const buttonChain=chain(buttonReturn.argument);
  if(one(buttonChain.ops.filter(o=>o.name==='child'),'button label').args[0].name!==params[2]||one(buttonChain.ops.filter(o=>o.name==='id'),'button id').args[0].name!==params[1])throw new Incompatible('feedback button identity/label shape changed');
  return params;
}
export function transformFeedback(source,prefix) {
  const ast=tree(source),divBinding=importedBinding(ast,'gpui-kit','div'),klass=view(ast,'feedback'),init=method(klass,'init'),render=method(klass,'render'),add=method(klass,'add'),shots=method(klass,'shots_row'),button=method(klass,'button');method(klass,'pick');method(klass,'send');
  requireFields(init,['message','email','shots','sending','sent','handle']);
  hookConflicts(klass,init,['view','viewer','previewExpanded','messageFocused','emailFocused','viewing']);
  const nativeImport=one(ast.body.filter(n=>n.type==='ImportDeclaration'&&n.source.value==='herdr'),'native import');
  const binding=name=>one(nativeImport.specifiers.filter(n=>n.imported?.name===name),`feedback ${name} import`).local.name;
  const theme=one(nodes(render,n=>n.type==='VariableDeclarator'&&n.init?.callee?.name===binding('theme')),'feedback theme');
  const preview=one(nodes(render,n=>n.type==='VariableDeclarator'&&n.init?.callee?.name===binding('feedbackPreview')),'feedback preview');
  const ret=one(render.body.body.filter(n=>n.type==='ReturnStatement'),'feedback root return');
  const root=chain(ret.argument);
  const bodyOp=one(root.ops.filter(o=>o.name==='child'&&nodes(o.args[0],n=>call(n,'id')&&n.arguments[0]?.value==='feedback-body').length),'feedback body');
  const bodyNode=bodyOp.args[0],bodyChain=chain(bodyNode);
  const form=one(bodyChain.ops.filter(o=>o.name==='when'&&o.args[0].type==='UnaryExpression'&&o.args[0].operator==='!'&&o.args[0].argument.property?.name==='sent'),'feedback form condition');
  const cb=form.args[1];if(cb.body.type==='BlockStatement')throw new Incompatible('feedback form callback expression');
  const children=chain(cb.body);if(children.base.type!=='Identifier'||children.base.name!==cb.params[0]?.name)throw new Incompatible('feedback form chain receiver');
  const controlBinding=name=>one(ast.body.filter(n=>n.type==='ImportDeclaration'&&n.source.value==='gpui-base').flatMap(n=>n.specifiers.filter(s=>s.imported?.name===name)),`native ${name} import`).local.name;
  const message=one(children.ops.filter(o=>o.name==='child'&&newControl(o.args[0],controlBinding('Textarea')).length),'feedback message field');
  const email=one(children.ops.filter(o=>o.name==='child'&&newControl(o.args[0],controlBinding('Input')).length),'feedback email field');
  const attachments=one(children.ops.filter(o=>o.name==='child'&&nodes(o.args[0],n=>call(n,'shots_row')&&n.callee.object.type==='ThisExpression').length),'feedback attachments');
  const json=one(children.ops.filter(o=>o.name==='child'&&nodes(o.args[0],n=>call(n,'stringify')&&n.callee.object.name==='JSON').length),'feedback JSON');
  for(const o of [message,email,attachments,json])if(o.args.length!==1)throw new Incompatible('feedback form child arity changed');
  const attachmentCall=attachments.args[0];
  if(!call(attachmentCall,'shots_row')||attachmentCall.callee.computed||attachmentCall.callee.object.type!=='ThisExpression'||attachmentCall.arguments.length!==1||attachmentCall.arguments[0].name!==theme.id.name)throw new Incompatible('feedback attachments: surrounding wrapper/sibling cannot be safely replaced');
  const labels=new Set();for(const o of [message,email,json]) {
    const previous=children.ops[children.ops.indexOf(o)-1];
    if(previous?.name!=='child'||previous.args[0].type!=='CallExpression'||previous.args[0].callee.type!=='Identifier'||previous.args[0].arguments.length!==1||previous.args[0].arguments[0].type!=='Literal')throw new Incompatible('feedback field caption adjacency');
    const caption=one(nodes(render,n=>n.type==='VariableDeclarator'&&n.id.name===previous.args[0].callee.name),'feedback caption renderer').init;
    if(caption?.type!=='ArrowFunctionExpression'||caption.params.length!==1||caption.body.type==='BlockStatement')throw new Incompatible('feedback caption renderer shape changed');
    actionless(caption.body,'feedback caption renderer',divBinding,caption.params[0].name);
    labels.add(previous);
  }
  const drop=one(root.ops.filter(o=>o.name==='on_drop'),'feedback drop handler').args[0];
  if(drop.type!=='ArrowFunctionExpression'||drop.async||drop.body.type!=='BlockStatement'||drop.params.length!==2)throw new Incompatible('feedback drop callback shape');
  const replacements=new Map();
  for(const [o,component,control] of [[message,'messageField','Textarea'],[email,'emailField','Input']]) {
    const leaf=one(newControl(o.args[0],controlBinding(control)),component),base=chain(o.args[0]).base;
    if(base.type!=='CallExpression'||base.callee.type!=='Identifier'||base.arguments.length!==1||base.arguments[0]!==leaf)throw new Incompatible(`${component}: field wrapper cannot be safely replaced`);
    const field=one(nodes(render,n=>n.type==='VariableDeclarator'&&n.id.name===base.callee.name),'feedback field renderer').init;
    if(field?.type!=='ArrowFunctionExpression'||field.params.length!==1||field.body.type==='BlockStatement'||chain(field.body).base.name!==field.params[0].name)throw new Incompatible(`${component}: field renderer shape changed`);
    presentation(field.body,`${component} renderer`);
    presentation(o.args[0],component,{factories:[base.callee.name],retained:[leaf]});
    replacements.set(o,`__customFeedback.${component}(this,${theme.id.name},${text(source,leaf)})`);
  }
  replacements.set(attachments,`__customFeedback.attachments(this,${theme.id.name},${text(source,drop)})`);
  replacements.set(json,`__customFeedback.preview(this,${theme.id.name},${text(source,json.args[0])})`);
  // Known fields move to the Custom order; every unknown sibling operation is retained.
  const ordered=[email,message,attachments,json];let slot=0;
  const formText=text(source,children.base)+children.ops.filter(o=>!labels.has(o)).map(o=>{
    const item=replacements.has(o)?ordered[slot++]:o;
    return `.${item.name}(${replacements.has(item)?replacements.get(item):item.args.map(n=>text(source,n)).join(',')})`;
  }).join('');
  const sent=one(bodyChain.ops.filter(o=>o.name==='when'&&o.args[0].type==='MemberExpression'&&o.args[0].property.name==='sent'),'feedback sent condition');
  const thanks=chain(sent.args[1].body).ops.find(o=>o.name==='child');if(!thanks)throw new Incompatible('feedback success text missing');actionless(thanks.args[0],'feedback success',divBinding);
  const agent=one(bodyChain.ops.filter(o=>o.name==='when'&&literal(o.args[0],'agent')),'feedback agent notice');
  const agentNotice=one(chain(agent.args[1].body).ops.filter(o=>o.name==='child'),'feedback agent caption');actionless(agentNotice.args[0],'feedback agent caption',divBinding);
  const bodySource=replaceInside(source,bodyNode,[put(agent.args[0],`(!this.sent && ${text(source,agent.args[0])})`),put(cb.body,formText),put(thanks.args[0],`__customFeedback.success(${theme.id.name})`),put(agentNotice.args[0],`__customFeedback.draftNotice(${theme.id.name})`)]);
  const derivedBody=chain(tree(bodySource).body[0].expression);
  for(const o of derivedBody.ops.filter(o=>['flex_1','flex_shrink','min_h','overflow_y_scrollbar','px','gap'].includes(o.name)))if(o.args.some(n=>n.type!=='Literal'))throw new Incompatible('feedback body layout decorator gained behavior');
  const customBody=text(bodySource,derivedBody.base)+derivedBody.ops.filter(o=>!['flex_1','flex_shrink','min_h','overflow_y_scrollbar','px','gap'].includes(o.name)).map(o=>`.${o.name}(${o.args.map(n=>text(bodySource,n)).join(',')})`).join('');
  const header=one(root.ops.filter(o=>o.name==='child'&&literal(o.args[0],'Send feedback')),'feedback header');actionless(header.args[0],'feedback header',divBinding);
  const footer=one(root.ops.filter(o=>o.name==='child'&&literal(o.args[0],'feedback-send')),'feedback footer');
  const unavailable=one(root.ops.filter(o=>o.name==='when'&&o.args[0].type==='UnaryExpression'&&o.args[0].argument.property?.name==='available'),'feedback availability notice');
  const notice=one(chain(unavailable.args[1].body).ops.filter(o=>o.name==='child'),'feedback availability caption');actionless(notice.args[0],'feedback availability caption',divBinding);
  const customRoot=replaceInside(source,ret.argument,[put(notice.args[0],`__customFeedback.unavailable(${theme.id.name})`),put(bodyNode,`__customFeedback.body(this,${customBody})`),put(header.args[0],`__customFeedback.header(this,${theme.id.name})`),put(footer.args[0],`__customFeedback.footer(${theme.id.name},${text(source,footer.args[0])})`)]);
  const sendButton=one(nodes(footer.args[0],n=>call(n,'button')&&n.arguments[1]?.value==='feedback-send'),'feedback send button');
  const disabled=one(nodes(render,n=>n.type==='VariableDeclarator'&&n.id.name===sendButton.arguments.at(-1)?.name),'feedback native disable predicate');
  const addGate=one(nodes(shots,n=>call(n,'when')),'feedback attachment add gate').arguments[0];
  if(addGate.type!=='BinaryExpression'||addGate.operator!=='<'||addGate.left.property?.name!=='length'||addGate.left.object?.property?.name!=='shots'||addGate.left.object.object?.type!=='ThisExpression'||addGate.right.type!=='Identifier')throw new Incompatible('feedback attachment add condition cannot be preserved');
  const limit=one(nodes(ast,n=>n.type==='VariableDeclarator'&&n.id.name===addGate.right.name),'feedback attachment limit');
  if(limit.init?.value!==3)throw new Incompatible('feedback attachment count contract changed');
  const shotActions=nodes(shots,n=>call(n,'on_click'));
  if(shotActions.length!==1||!nodes(shotActions[0],n=>call(n,'splice')).length)throw new Incompatible('feedback thumbnail action shape cannot preserve native actions');
  const thumb=one(nodes(shots,n=>n.type==='VariableDeclarator'&&n.init?.type==='ArrowFunctionExpression'&&n.init.params.length===2&&nodes(n.init,m=>m===shotActions[0]).length),'feedback thumbnail binding').init;
  const buttonParams=feedbackWidgets(ast,shots,thumb,shotActions[0].arguments[0],button);
  const remove=`(${thumb.params.map(p=>p.name).join(',')},event,context)=>(${text(source,shotActions[0].arguments[0])})(event,context)`;
  const cx=render.params[0]?.name,initCx=init.params[1]?.name;
  if(!cx||!initCx||drop.body.type!=='BlockStatement')throw new Incompatible('feedback lifecycle parameter shape');
  const emailInit=one(init.body.body.map(n=>n.expression).filter(n=>n?.left?.property?.name==='email'),'email initialization');
  const emailPlaceholder=one(nodes(emailInit,n=>n.type==='Property'&&n.key.name==='placeholder'),'email placeholder').value;
  if(emailPlaceholder.type!=='Literal')throw new Incompatible('feedback email placeholder gained behavior');
  const ranges=[imports(source,ast,prefix),insert(nativeImport.end,`\n// feedback-draft.json bridge; actual frame authority is unchanged.\nimport * as __customFeedback from '${prefix}/feedback-ui.js';`),
    insert(init.body.start+1,`__customFeedback.beforeInit(${initCx});`),
    put(emailPlaceholder,`(__customFeedback.active() ? 'you@example.com (optional)' : ${text(source,emailPlaceholder)})`),
    insert(init.body.end-1,`__customFeedback.init.call(this,${initCx});`),
    insert(add.body.start+1,'if (__customFeedback.active() && (this.sending || this.sent)) return;'),
    insert(shots.body.start+1,`if (__customFeedback.active()) return __customFeedback.shots_row.call(this,${shots.params[0].name},arguments[1] ?? true,${remove});`),
    insert(button.body.start+1,`if (__customFeedback.active()) return __customFeedback.button.call(this,${buttonParams.join(',')});`),
    put(theme.init,`__customFeedback.theme(${text(source,theme.init)})`),
    put(disabled.init,`(${text(source,disabled.init)}) || __customFeedback.overLimit(this)`),
    // Build a Custom branch from CURRENT native nodes, not an authored full-form copy.
    put(ret.argument,`(__customFeedback.active() ? (this.viewing != null && !this.sent && this.viewing < this.shots.length ? __customFeedback.viewerRoot(this,${theme.id.name}) : __customFeedback.root(this,${theme.id.name},${customRoot})) : ${text(source,ret.argument)})`)];
  // Drop/paste guards are inserted into both derived branches through a separate pass below.
  let output=edits(source,ranges);
  const transformed=tree(output),newKlass=transformed.body.find(n=>n.type==='ExportDefaultDeclaration').declaration;
  const guards=[];
  for(const n of nodes(method(newKlass,'render'),n=>call(n,'on_drop'))) {
    const fn=n.arguments[0];if(fn.type!=='ArrowFunctionExpression'||fn.async||fn.body.type!=='BlockStatement'||fn.params.length!==2||fn.params.some(p=>p.type!=='Identifier'))throw new Incompatible('feedback drop callback shape');
    const args=fn.params.map(n=>n.name).join(',');
    guards.push(put(fn.body,`{if (__customFeedback.active()) return __customFeedback.dropImages.call(this,${args},()=>(${text(output,fn)})(${args}));${text(output,fn.body).slice(1,-1)}}`));
  }
  const paste=one(nodes(method(newKlass,'init'),n=>call(n,'on')&&n.arguments[0]?.value==='paste_other'),'feedback paste handler').arguments[1];
  guards.push(insert(paste.body.start+1,'if (__customFeedback.active() && (this.sending || this.sent)) return;'));
  output=edits(output,guards);
  const quiet=[];
  for(const n of nodes(tree(output),n=>n.type==='AssignmentExpression'&&n.left.property?.name==='error'&&n.right.value==='Up to 3 screenshots.'))quiet.push(put(n.right,`(__customFeedback.active() ? null : ${text(output,n.right)})`));
  return edits(output,quiet);
}
export function transformNative(id,source,prefix,options) {
  if(id==='palette')return transformPalette(source,prefix,options);
  if(id==='feedback')return transformFeedback(source,prefix,options);
  throw new Incompatible(`no structural adapter for ${id}`);
}
