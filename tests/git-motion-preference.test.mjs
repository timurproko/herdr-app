import assert from 'node:assert/strict';
import {rowHarness,nodes,t} from './support/git-row.mjs';
for(const platform of ['windows','macos','linux'])for(const enabled of [false,true]) {
 const calls=[],jobs=[];
 const h=await rowHarness({host:{window:()=>({platform}),exec:async(...args)=>{calls.push(args);return {code:0,stdout:platform==='linux'?String(!enabled):String(enabled)};}}}),p=h.panel;
 p.shown=()=>true;const cx={spawn:fn=>jobs.push(fn(cx)),notify(){}};
 p.syncMotionPreference(cx);assert.equal(p.motionReduced,true,'Static until OS preference resolves');
 await Promise.all(jobs);assert.equal(p.motionReduced,enabled);
 const animation=nodes(p.loadingLine(t)).some(n=>n.attrs.loop);assert.equal(animation,!enabled);
 p.syncMotionPreference(cx);assert.equal(calls.length,1,'Read once per shown lifetime, not per frame');
 assert.equal(calls[0][2].on,undefined,'Read local accessibility, never selected remote machine');
 p.shown=()=>false;p.syncMotionPreference(cx);assert.equal(p.motionObserved,false);
}
console.log('PASS local reduced-motion reads, calm unknown default, no per-frame IO and native static/opacity-only projection');
