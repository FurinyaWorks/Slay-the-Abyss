// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/develop/tests/helpers/m7-core-final-source-inverse.mjs';
import { preM7FinalSource as original } from './epochs/develop/tests/helpers/m7-core-final-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(p,'utf8');
export function preM7FinalSource(path,source,{readSource=live}={}){
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'develop',readSource});
 return original(path,projected,{readSource:sourceEpoch.combinedReader(readSource,'develop')});
}
const readers=new WeakMap();
export function m7FinalReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preM7FinalSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}
