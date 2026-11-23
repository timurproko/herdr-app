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
export function transformPalette(source,prefix) {
  const ast=tree(source),klass=view(ast,'palette'),init=method(klass,'init'),go=method(klass,'go'),rows=method(klass,'rows'),render=method(klass,'render'),close=method(klass,'close');method(klass,'title');
  requireFields(init,['query','input','at','scroll','recent','handle']);
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
function actionless(node,anchor) {
  if(nodes(node,n=>n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&(/^(on_|spawn|run$)/.test(n.callee.property.name)||(n.callee.property.name==='child'&&n.arguments[0]?.type!=='Literal'))).length)throw new Incompatible(`${anchor}: nested action/child cannot be safely replaced`);
}
export function transformFeedback(source,prefix) {
  const ast=tree(source),klass=view(ast,'feedback'),init=method(klass,'init'),render=method(klass,'render'),add=method(klass,'add'),shots=method(klass,'shots_row'),button=method(klass,'button');method(klass,'pick');method(klass,'send');
  requireFields(init,['message','email','shots','sending','sent','handle']);
  if(klass.body.body.some(n=>['view','viewer'].includes(n.key?.name)))throw new Incompatible('feedback viewer hook collision');
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
  const labels=new Set();for(const o of [message,email,json]) {
    const previous=children.ops[children.ops.indexOf(o)-1];
    if(previous?.name!=='child'||previous.args[0].type!=='CallExpression'||previous.args[0].callee.type!=='Identifier'||previous.args[0].arguments.length!==1||previous.args[0].arguments[0].type!=='Literal')throw new Incompatible('feedback field caption adjacency');
    labels.add(previous);
  }
  const replacements=new Map();
  for(const [o,component,control] of [[message,'messageField','Textarea'],[email,'emailField','Input']]) {
    actionless(o.args[0],component);
    const leaf=one(newControl(o.args[0],controlBinding(control)),component);
    const unknown=nodes(o.args[0],n=>n.type==='CallExpression'&&n!==leaf&&n.callee.type==='MemberExpression'&&!['h','w','h_full','w_full','text_size','text_color','rounded','p','px','py','border_1','border_color','bg','tooltip','accessibility_label'].includes(n.callee.property.name));
    if(unknown.length)throw new Incompatible(`${component}: unknown field decorator`);
    replacements.set(o,`__customFeedback.${component}(this,${theme.id.name},${text(source,leaf)})`);
  }
  replacements.set(attachments,`__customFeedback.attachments(this,${theme.id.name})`);
  replacements.set(json,`__customFeedback.preview(this,${theme.id.name},${text(source,json.args[0])})`);
  // Known fields move to the Custom order; every unknown sibling operation is retained.
  const ordered=[email,message,attachments,json];let slot=0;
  const formText=text(source,children.base)+children.ops.filter(o=>!labels.has(o)).map(o=>{
    const item=replacements.has(o)?ordered[slot++]:o;
    return `.${item.name}(${replacements.has(item)?replacements.get(item):item.args.map(n=>text(source,n)).join(',')})`;
  }).join('');
  const sent=one(bodyChain.ops.filter(o=>o.name==='when'&&o.args[0].type==='MemberExpression'&&o.args[0].property.name==='sent'),'feedback sent condition');
  const thanks=chain(sent.args[1].body).ops.find(o=>o.name==='child');if(!thanks)throw new Incompatible('feedback success text missing');actionless(thanks.args[0],'feedback success');
  const agent=one(bodyChain.ops.filter(o=>o.name==='when'&&literal(o.args[0],'agent')),'feedback agent notice');
  const agentNotice=one(chain(agent.args[1].body).ops.filter(o=>o.name==='child'),'feedback agent caption');actionless(agentNotice.args[0],'feedback agent caption');
  const bodySource=replaceInside(source,bodyNode,[put(agent.args[0],`(!this.sent && ${text(source,agent.args[0])})`),put(cb.body,formText),put(thanks.args[0],`__customFeedback.success(${theme.id.name})`),put(agentNotice.args[0],`__customFeedback.draftNotice(${theme.id.name})`)]);
  const derivedBody=chain(tree(bodySource).body[0].expression);
  const customBody=text(bodySource,derivedBody.base)+derivedBody.ops.filter(o=>!['flex_1','flex_shrink','min_h','overflow_y_scrollbar','px','gap'].includes(o.name)).map(o=>`.${o.name}(${o.args.map(n=>text(bodySource,n)).join(',')})`).join('');
  const header=one(root.ops.filter(o=>o.name==='child'&&literal(o.args[0],'Send feedback')),'feedback header');actionless(header.args[0],'feedback header');
  const footer=one(root.ops.filter(o=>o.name==='child'&&literal(o.args[0],'feedback-send')),'feedback footer');
  const unavailable=one(root.ops.filter(o=>o.name==='when'&&o.args[0].type==='UnaryExpression'&&o.args[0].argument.property?.name==='available'),'feedback availability notice');
  const notice=one(chain(unavailable.args[1].body).ops.filter(o=>o.name==='child'),'feedback availability caption');actionless(notice.args[0],'feedback availability caption');
  const customRoot=replaceInside(source,ret.argument,[put(notice.args[0],`__customFeedback.unavailable(${theme.id.name})`),put(bodyNode,`__customFeedback.body(this,${customBody})`),put(header.args[0],`__customFeedback.header(this,${theme.id.name})`),put(footer.args[0],`__customFeedback.footer(${theme.id.name},${text(source,footer.args[0])})`)]);
  const sendButton=one(nodes(footer.args[0],n=>call(n,'button')&&n.arguments[1]?.value==='feedback-send'),'feedback send button');
  const disabled=one(nodes(render,n=>n.type==='VariableDeclarator'&&n.id.name===sendButton.arguments.at(-1)?.name),'feedback native disable predicate');
  const drop=one(root.ops.filter(o=>o.name==='on_drop'),'feedback drop handler').args[0];
  const dropCalls=nodes(drop,n=>n.type==='CallExpression');
  if(dropCalls.some(n=>!(n.callee.name===binding('feedbackAttachImages')||(n.callee.type==='MemberExpression'&&['add','slice','notify'].includes(n.callee.property.name)))))throw new Incompatible('feedback drop action shape cannot preserve native additions');
  const addGate=one(nodes(shots,n=>call(n,'when')),'feedback attachment add gate').arguments[0];
  if(addGate.type!=='BinaryExpression'||addGate.operator!=='<'||addGate.left.property?.name!=='length'||addGate.left.object?.property?.name!=='shots'||addGate.right.type!=='Identifier')throw new Incompatible('feedback attachment add condition cannot be preserved');
  const limit=one(nodes(ast,n=>n.type==='VariableDeclarator'&&n.id.name===addGate.right.name),'feedback attachment limit');
  if(limit.init?.value!==3)throw new Incompatible('feedback attachment count contract changed');
  const shotActions=nodes(shots,n=>call(n,'on_click'));
  if(shotActions.length!==1||!nodes(shotActions[0],n=>call(n,'splice')).length)throw new Incompatible('feedback thumbnail action shape cannot preserve native actions');
  const thumb=one(nodes(shots,n=>n.type==='VariableDeclarator'&&n.init?.type==='ArrowFunctionExpression'&&n.init.params.length===2&&nodes(n.init,m=>m===shotActions[0]).length),'feedback thumbnail binding').init;
  const remove=`(${thumb.params.map(p=>p.name).join(',')},event,context)=>(${text(source,shotActions[0].arguments[0])})(event,context)`;
  const cx=render.params[0]?.name,initCx=init.params[1]?.name;
  if(!cx||!initCx||drop.body.type!=='BlockStatement')throw new Incompatible('feedback lifecycle parameter shape');
  const emailInit=one(init.body.body.map(n=>n.expression).filter(n=>n?.left?.property?.name==='email'),'email initialization');
  const emailPlaceholder=one(nodes(emailInit,n=>n.type==='Property'&&n.key.name==='placeholder'),'email placeholder').value;
  const ranges=[imports(source,ast,prefix),insert(nativeImport.end,`\n// feedback-draft.json bridge; actual frame authority is unchanged.\nimport * as __customFeedback from '${prefix}/feedback-ui.js';`),
    insert(init.body.start+1,`__customFeedback.beforeInit(${initCx});`),
    put(emailPlaceholder,`(__customFeedback.active() ? 'you@example.com (optional)' : ${text(source,emailPlaceholder)})`),
    insert(init.body.end-1,`__customFeedback.init.call(this,${initCx});`),
    insert(add.body.start+1,'if (__customFeedback.active() && (this.sending || this.sent)) return;'),
    insert(shots.body.start+1,`if (__customFeedback.active()) return __customFeedback.shots_row.call(this,${shots.params[0].name},arguments[1] ?? true,${remove});`),
    insert(button.body.start+1,'if (__customFeedback.active()) return __customFeedback.button.apply(this,arguments);'),
    put(theme.init,`__customFeedback.theme(${text(source,theme.init)})`),
    put(disabled.init,`(${text(source,disabled.init)}) || __customFeedback.overLimit(this)`),
    // Build a Custom branch from CURRENT native nodes, not an authored full-form copy.
    put(ret.argument,`(__customFeedback.active() ? (this.viewing != null && !this.sent && this.viewing < this.shots.length ? __customFeedback.viewerRoot(this,${theme.id.name}) : __customFeedback.root(this,${theme.id.name},${customRoot})) : ${text(source,ret.argument)})`)];
  // Drop/paste guards are inserted into both derived branches through a separate pass below.
  let output=edits(source,ranges);
  const transformed=tree(output),newKlass=transformed.body.find(n=>n.type==='ExportDefaultDeclaration').declaration;
  const guards=[];
  for(const n of nodes(method(newKlass,'render'),n=>call(n,'on_drop'))) {
    const fn=n.arguments[0];if(fn.body.type!=='BlockStatement'||fn.params.length!==2)throw new Incompatible('feedback drop callback shape');
    guards.push(insert(fn.body.start+1,`if (__customFeedback.active()) return __customFeedback.dropImages.call(this,${fn.params.map(n=>n.name).join(',')});`));
  }
  const paste=one(nodes(method(newKlass,'init'),n=>call(n,'on')&&n.arguments[0]?.value==='paste_other'),'feedback paste handler').arguments[1];
  guards.push(insert(paste.body.start+1,'if (__customFeedback.active() && (this.sending || this.sent)) return;'));
  for(const n of nodes(newKlass,n=>n.type==='AssignmentExpression'&&n.left.property?.name==='error'&&n.right.value==='Up to 3 screenshots.'))guards.push(put(n.right,`(__customFeedback.active() ? null : ${text(output,n.right)})`));
  return edits(output,guards);
}
export function transformNative(id,source,prefix,options) {
  if(id==='palette')return transformPalette(source,prefix,options);
  if(id==='feedback')return transformFeedback(source,prefix,options);
  throw new Incompatible(`no structural adapter for ${id}`);
}
