// Local attempted-delivery receipts, not a job queue or portable preference.
// Native compare-before-write prevents two windows from claiming the same failure.
import {appHome,readTextFile,writeTextFile} from './host.js';
import {HISTORY_LIMIT as LIMIT,parseHistory} from './plugins/git/ci-history.js';
export {parseHistory};
export class CIFixHistory {
  constructor({read=readTextFile,write=writeTextFile,file=()=>`${appHome()}/.customizations/git-ci-fix-history.json`,now=Date.now}={}) {
    this.read=read;this.write=write;this.file=file;this.now=now;this.claims=new WeakMap();
  }
  async claim(keys,current) {
    if(!Array.isArray(keys)||!keys.length||keys.length>16||keys.some(key=>typeof key!=='string'||key.length>256))throw Error('Invalid CI failure keys.');
    const file=this.file();
    for(let attempt=0;attempt<3;attempt++) {
      if(!current())return [];
      const text=await this.read(file),history=parseHistory(text);
      if(!current())return [];
      const existing=new Set(history.entries.map(e=>e.key)),fresh=[...new Set(keys)].filter(key=>!existing.has(key));
      if(!fresh.length)return [];
      const token=`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      const next={version:1,entries:[...history.entries,...fresh.map(key=>({key,at:this.now(),token,outcome:'attempted'}))].slice(-LIMIT)};
      // Record BEFORE submitting: a timeout/crash must not replay a possibly
      // delivered prompt. Only a proven pre-input refusal can release ownership.
      try {
        await this.write(file,JSON.stringify(next),text);
        this.claims.set(fresh,token);
        return fresh; // Caller must release this exact handle if cancelled before send.
      }
      catch {if(attempt===2)throw Error('Could not reserve a CI request safely.');}
    }
    return [];
  }
  async finish(keys,outcome) {
    if(!['refused','delivered','unknown'].includes(outcome))throw Error('Invalid CI delivery outcome.');
    const token=this.claims.get(keys);
    if(!token)return false;
    const selected=new Set(keys),file=this.file();
    for(let attempt=0;attempt<3;attempt++) {
      const text=await this.read(file),history=parseHistory(text);
      const mine=e=>selected.has(e.key)&&e.token===token;
      if(!history.entries.some(mine))return false;
      const entries=outcome==='refused'?history.entries.filter(e=>!mine(e))
        :history.entries.map(e=>mine(e)?{...e,outcome}:e);
      try {
        await this.write(file,JSON.stringify({version:1,entries}),text);
        this.claims.delete(keys);
        return true;
      }catch {if(attempt===2)throw Error('Could not update CI delivery history safely.');}
    }
    return false;
  }
}
