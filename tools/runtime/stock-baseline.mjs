// Read-only coverage selection. Missing review is not proof that stock matches.
import fs from 'node:fs';
import path from 'node:path';
export function stockBaseline(root, version) {
  if(typeof version!=='string'||version.length>40||!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))throw Error('Invalid App release version for stock baseline.');
  const file=path.join(root,'baselines',`${version}.json`);
  try {
    const baseline=JSON.parse(fs.readFileSync(file,'utf8'));
    if(!baseline||typeof baseline!=='object'||Array.isArray(baseline)||!Object.keys(baseline).length
      ||Object.entries(baseline).some(([name,hash])=>!name||name.includes('..')||name.startsWith('/')||name.includes('\\')||!/^[a-f0-9]{64}$/.test(hash)))throw Error('Invalid reviewed stock baseline.');
    return {reviewed:true,baseline,advisory:null};
  }catch(error){
    if(error.code!=='ENOENT')throw error;
    return {reviewed:false,baseline:{},advisory:`Herdr ${version} stock baseline unreviewed: byte coverage unavailable; independent regressions still run. No older baseline substituted.`};
  }
}
