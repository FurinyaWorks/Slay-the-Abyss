// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/reward/tests/helpers/reward-query-boundary-source-inverse.mjs';
import { preRewardQueryBoundarySource as original } from './epochs/reward/tests/helpers/reward-query-boundary-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
export function preRewardQueryBoundarySource(path,source,{readSource=live}={}){
 readSource=readers.get(readSource)??readSource;
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'reward',readSource});
 return original(path,projected,{readSource:sourceEpoch.combinedReader(readSource,'reward')});
}
const readers=new WeakMap();
export function rewardQueryBoundaryReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preRewardQueryBoundarySource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}
