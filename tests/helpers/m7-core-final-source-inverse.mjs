import {sevenRefactorEpoch} from './seven-refactor-source-epoch.mjs';
import {preDefectActorSource,defectActorEpoch} from './defect-actor-source-epoch.mjs';
import {preDefectUtilitySource} from './defect-utility-source-inverse.mjs';
import {preIntegratedCapabilitySource} from './class-potion-watcher-source-inverse.mjs';
// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/develop/tests/helpers/m7-core-final-source-inverse.mjs';
import { preM7FinalSource as original } from './epochs/develop/tests/helpers/m7-core-final-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const actorTarget=sourceEpoch.proof.targets.pr618,actorAnchor='config/architecture.json';
// This real preserved PR contains the exact three-owner Actor after-image.
// Keep the original verifier and hashes; only adapt its live input boundary.
for(const [path,binding]of Object.entries(defectActorEpoch.proof.current)){
 for(const key of ['source','sha256','gitBlob'])assert.equal(actorTarget.files[path][key],binding[key],'Actor historical target: '+path+' '+key);
}
assert.notEqual(sourceEpoch.proof.current[actorAnchor].sha256,actorTarget.files[actorAnchor].sha256,'Actor admission anchor must require current owner authentication');
function actorReader(raw){
 if(typeof raw!=='function')return raw;
 return path=>{
  // This closure is called only after the old verifier recognizes its exact
  // source. Authenticate every current raw owner on each read, before exposing
  // any old byte. Never cache permission or use a projected reader downstream.
  sourceEpoch.preCombinedSource(actorAnchor,sourceEpoch.proof.current[actorAnchor].source,{target:'pr618',readSource:raw});
  assert(Object.hasOwn(defectActorEpoch.proof.current,path),'known Actor owner');
  return actorTarget.files[path].source;
 };
}
// Explicit compatibility readers share this same full-current admission gate.
export {actorReader as currentDefectActorReader};
export function preM7FinalSource(path,source,{readSource=live}={}){
 readSource=readers.get(readSource)??readSource;
 const input=source;source=preDefectActorSource(path,source,{readSource:actorReader(readSource)});
 const utility=preDefectUtilitySource(path,source);if(utility!==source)return utility;
 // Historical capability owners need the full current closure, not only the
 // Actor predecessor. Keep raw reads for subsequent complete-epoch projection.
 const capabilityReader=(readSource===live||source!==input)&&typeof readSource==='function'
  ?sevenRefactorEpoch.combinedReader(sourceEpoch.combinedReader(readSource,'watcherFlowPrior'),'localSeven'):readSource;
 const capability=preIntegratedCapabilitySource(path,source,{readSource:capabilityReader});
 if(capability!==source)return capability;
 const projected=sourceEpoch.preCombinedSource(path,input,{target:'develop',readSource});
 return original(path,projected,{readSource:(typeof readSource==='function'?sourceEpoch.combinedReader(readSource,'develop'):readSource)});
}
const readers=new WeakMap();
export function m7FinalReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preM7FinalSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}
