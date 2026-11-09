// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/potion/tests/helpers/potion-callback-source-inverse.mjs';
import { prePotionCallbackSource as original } from './epochs/potion/tests/helpers/potion-callback-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
export function prePotionCallbackSource(path,source,{readSource=live}={}){
 readSource=readers.get(readSource)??readSource;
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'potion',readSource});
 return original(path,projected,{readSource:(typeof readSource==='function'?sourceEpoch.combinedReader(readSource,'potion'):readSource)});
}
const readers=new WeakMap();
export function potionCallbackReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>prePotionCallbackSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}
