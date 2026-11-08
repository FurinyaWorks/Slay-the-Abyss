// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/develop/tests/helpers/core-lifecycle-source-inverse.mjs';
import { preCoreLifecycleSource as original } from './epochs/develop/tests/helpers/core-lifecycle-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
export function preCoreLifecycleSource(path,source,{readSource=live}={}){
 readSource=readers.get(readSource)??readSource;
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'develop',readSource});
 return original(path,projected,{readSource:sourceEpoch.combinedReader(readSource,'develop')});
}
const readers=new WeakMap();
export function coreLifecycleReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preCoreLifecycleSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}
