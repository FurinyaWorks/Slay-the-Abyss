// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/actor/tests/helpers/actor-presence-source-inverse.mjs';
import { preActorPresenceSource as original } from './epochs/actor/tests/helpers/actor-presence-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
export function preActorPresenceSource(path,source,{readSource=live}={}){
 readSource=readers.get(readSource)??readSource;
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'actor',readSource});
 return original(path,projected,{readSource:(typeof readSource==='function'?sourceEpoch.combinedReader(readSource,'actor'):readSource)});
}
const readers=new WeakMap();
export function actorPresenceReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preActorPresenceSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}
