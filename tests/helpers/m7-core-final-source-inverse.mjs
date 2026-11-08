import {preDefectUtilitySource} from './defect-utility-source-inverse.mjs';
import {preIntegratedCapabilitySource} from './class-potion-watcher-source-inverse.mjs';
import {sevenRefactorEpoch} from './seven-refactor-source-epoch.mjs';
// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/develop/tests/helpers/m7-core-final-source-inverse.mjs';
import { preM7FinalSource as original } from './epochs/develop/tests/helpers/m7-core-final-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
export function preM7FinalSource(path,source,{readSource=live}={}){
 readSource=readers.get(readSource)??readSource;
 const utility=preDefectUtilitySource(path,source);if(utility!==source)return utility;
 const capability=preIntegratedCapabilitySource(path,source,{readSource:readSource===live?sevenRefactorEpoch.combinedReader(readSource,'localSeven'):readSource});
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
