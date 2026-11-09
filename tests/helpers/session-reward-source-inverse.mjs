// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/sessionReward/tests/helpers/session-reward-source-inverse.mjs';
import { preSessionRewardSource as original } from './epochs/sessionReward/tests/helpers/session-reward-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
export function preSessionRewardSource(path,source,{readSource=live}={}){
 readSource=readers.get(readSource)??readSource;
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'sessionReward',readSource});
 return original(path,projected,{readSource:(typeof readSource==='function'?sourceEpoch.combinedReader(readSource,'sessionReward'):readSource)});
}
const readers=new WeakMap();
export function sessionRewardReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preSessionRewardSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}
