// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/develop/tests/helpers/relic-query-source-inverse.mjs';
import { preRelicQuerySource as original } from './epochs/develop/tests/helpers/relic-query-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(p,'utf8');
export function preRelicQuerySource(path,source,{readSource=live}={}){
 readSource=readers.get(readSource)??readSource;
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'develop',readSource});
 return original(path,projected,{readSource:(typeof readSource==='function'?sourceEpoch.combinedReader(readSource,'develop'):readSource)});
}
const readers=new WeakMap();
export function relicQueryReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preRelicQuerySource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}
