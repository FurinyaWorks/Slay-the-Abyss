// One exact outer continuation; immutable prior targets remain independent.
import assert from 'node:assert/strict';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function extendStsStyleEpoch(original,input){
 const prior=original.proof,outer=JSON.parse(JSON.stringify(input));
 assert.equal(outer.schemaVersion,1);assert.equal(outer.normalization,'LF');
 assert.match(outer.baseCommit,/^[a-f0-9]{40}$/);assert.match(outer.currentCommit,/^[a-f0-9]{40}$/);
 assert.deepEqual(outer.inventoryBefore,Object.keys(prior.current).sort(),'complete style predecessor inventory');
 assert.deepEqual(outer.owners,Object.keys(outer.current).sort(),'exact style owner registration');
 assert.deepEqual(Object.keys(outer.before).sort(),outer.owners,'complete style predecessor owners');
 assert.equal(new Set(outer.addedPaths).size,outer.addedPaths.length,'unique added style witnesses');
 for(const path of outer.addedPaths)assert(!Object.hasOwn(prior.current,path),'style witness must be new');
 assert.deepEqual(outer.inventoryAfter,[...outer.inventoryBefore,...outer.addedPaths].sort(),'complete current style inventory');
 for(const path of outer.owners){
  assert.deepEqual(outer.before[path],prior.current[path]??null,'exact style predecessor: '+path);
  assert(outer.current[path]!==null,'style production owner must have complete source');
 }
 for(const path of outer.addedPaths)assert(outer.owners.includes(path),'new style witness must be owned');
 const current=Object.fromEntries(outer.inventoryAfter.map(path=>[path,outer.current[path]??prior.current[path]]));
 const pad=files=>Object.fromEntries(outer.inventoryAfter.map(path=>[path,files[path]??null]));
 assert(!Object.hasOwn(prior.targets,'stsStylePrior'),'style target cannot replace an existing historical view');
 const targets=Object.fromEntries(Object.entries(prior.targets).map(([name,target])=>[name,{...target,files:pad(target.files)}]));
 targets.stsStylePrior={commit:outer.baseCommit,files:pad(prior.current)};
 const owners=outer.inventoryAfter.filter(path=>Object.values(targets).some(target=>target.files[path]?.sha256!==current[path]?.sha256));
 return createSourceEpochProjector(freeze({...prior,currentCommit:outer.currentCommit,currentTreeCommitted:false,
  currentCommitRole:'exact reviewed working StS presentation continuation; immutable predecessor and complete historical targets retained',
  sourceSliceCommit:outer.currentCommit,current,targets,owners}),{allowConfigLayout:true,reuseFrozenInput:true});
}
