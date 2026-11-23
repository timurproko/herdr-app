import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {build,project} from '../tools/build.mjs';
import {framePatch,inspectFramePatch} from '../tools/runtime/frame-patch.mjs';
import {restoreStartupFrames} from '../tools/runtime/startup-frames.mjs';
import {Incompatible,checkGraph,tree} from '../tools/runtime/native-ast.mjs';
import {transformNative} from '../tools/runtime/native-transform.mjs';
import {digest} from '../tools/runtime/native-frame.mjs';
import {seedNativeSDK} from './frame-fixture.mjs';
import {sourceMutations} from './native-mutations.mjs';
const snapshot=home=>Object.fromEntries(fs.readdirSync(home,{recursive:true}).filter(n=>fs.statSync(path.join(home,n)).isFile()).map(n=>[n,fs.readFileSync(path.join(home,n)).toString('base64')]));
export function runNativeFuzz(id,versions=['0.1.16','0.1.17']) {
 const {output}=build(),registry=JSON.parse(fs.readFileSync(path.join(output,'frame-patches/registry.json'))).patches;
 const temp=fs.mkdtempSync(path.join(project,`.artifacts/native-fuzz-${id}-`));let verified=0,skipped=0,index=0;
 try {
  for(const version of versions) {
   const stock=fs.readFileSync(path.join(project,'tests/fixtures/native-stock',version,`${id}.js`),'utf8');
   for(const variant of sourceMutations(stock)) {
    const label=`${version} ${id} ${variant.name}`,home=path.join(temp,String(index++)),target=path.join(home,`frame/${id}`),record=path.join(home,`.customizations/frame-${id}.json`);
    fs.mkdirSync(target,{recursive:true});seedNativeSDK(home,registry);fs.mkdirSync(path.dirname(record),{recursive:true});
    fs.writeFileSync(path.join(target,'main.js'),variant.source);
    fs.writeFileSync(record,JSON.stringify({version:1,original:{'main.js':stock},installed:{'main.js':digest(stock+'// previous owned output')}}));
    const options={binary:Buffer.from(`${id}/main.js${variant.source}${id}/mod.json{}`)},before=snapshot(home);
    try{tree(transformNative(id,variant.source,'./custom-test'));}catch(error){assert.ok(error instanceof Incompatible,`${label}: total transform boundary`);assert.match(error.message,/anchor/,label);}
    let inspected;assert.doesNotThrow(()=>{inspected=inspectFramePatch(home,output,id,options);},`${label}: no source-shape exception may escape inspection`);
    assert.deepEqual(snapshot(home),before,`${label}: inspection is read-only`);
    if(inspected.status==='skipped') {
      assert.match(framePatch('apply',home,output,id,options),/Optional .* patch skipped:.*anchor/,`${label}: explicit apply also skips safely`);
      assert.deepEqual(snapshot(home),before,`${label}: explicit apply advisory writes nothing`);
      let startup;assert.doesNotThrow(()=>{startup=restoreStartupFrames(home,output,options);},`${label}: startup boundary`);
      assert.equal(startup.ok,true,`${label}: ${JSON.stringify(startup)}`);
      skipped++;assert.equal(startup.frames[id].status,'skipped',label);assert.match(inspected.advisory,/anchor|shape|parse|source|callback|import|method|dependency|module|field|slot|native/i,label);
      assert.deepEqual(snapshot(home),before,`${label}: advisory skip writes nothing`);
    } else {
      verified++;assert.equal(inspected.status,'ready',label);assert.match(framePatch('apply',home,output,id,options),/frame applied/,label);
      const state=JSON.parse(fs.readFileSync(record));assert.equal(state.version,2,label);
      for(const [n,hash]of Object.entries(state.installed))assert.equal(digest(fs.readFileSync(path.join(target,n))),hash,`${label}: complete installed ownership graph`);
      const main=fs.readFileSync(path.join(target,'main.js'),'utf8'),files=Object.fromEntries(fs.readdirSync(target,{recursive:true}).filter(n=>n!=='main.js'&&fs.statSync(path.join(target,n)).isFile()).map(n=>[n.replaceAll('\\','/'),fs.readFileSync(path.join(target,n),'utf8')]));
      tree(main);checkGraph(main,files);framePatch('restore',home,output,id,options);assert.equal(fs.readFileSync(path.join(target,'main.js'),'utf8'),variant.source,`${label}: restore exact mutated stock`);
    }
    fs.rmSync(home,{recursive:true,force:true});
   }
  }
  assert.ok(verified>0&&skipped>0);
  console.log(`PASS ${id} AST mutation matrix: ${index} variants, ${verified} verified apply/graph/restore, ${skipped} read-only advisory skips; no escaped source-shape errors`);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
