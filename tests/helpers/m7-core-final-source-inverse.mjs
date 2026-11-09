import {sevenRefactorEpoch} from './seven-refactor-source-epoch.mjs';
import {preDefectUtilitySource} from './defect-utility-source-inverse.mjs';
import {preIntegratedCapabilitySource} from './class-potion-watcher-source-inverse.mjs';
// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/develop/tests/helpers/m7-core-final-source-inverse.mjs';
import { preM7FinalSource as original } from './epochs/develop/tests/helpers/m7-core-final-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
export function preM7FinalSource(path,source,{readSource=live}={}){
 readSource=readers.get(readSource)??readSource;
 const utility=preDefectUtilitySource(path,source);if(utility!==source)return utility;
 // Individual capability Lua owners survive later epochs unchanged. Project
 // their linked config through the complete current closure, never Seven alone.
 // Keep caller readers explicit so mixed historical inputs cannot be unwrapped.
 const capabilityRead=typeof readSource==='function'?m7LocalSevenReader(readSource):readSource;
 const capability=preIntegratedCapabilitySource(path,source,{readSource:capabilityRead});
 if(capability!==source)return capability;
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'develop',readSource});
 return original(path,projected,{readSource:(typeof readSource==='function'?sourceEpoch.combinedReader(readSource,'develop'):readSource)});
}
const readers=new WeakMap();
export function m7FinalReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preM7FinalSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}

// Authenticate current bytes to Seven's exact collected base first. Neither
// projector rewrites unknown or already-historical inputs, and caller readers
// are not unwrapped through another target's ownership metadata.
export function m7LocalSevenReader(readSource=live){
 const prior=p=>sourceEpoch.preCombinedSource(p,readSource(p),{target:'silentPotionPrior',readSource});
 return p=>sevenRefactorEpoch.preCombinedSource(p,prior(p),{target:'localSeven',readSource:prior});
}
