// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/colorless/tests/helpers/colorless-catalog-source-inverse.mjs';
import { preColorlessCatalogSource as original } from './epochs/colorless/tests/helpers/colorless-catalog-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
export function preColorlessCatalogSource(path,source,{readSource=live}={}){
 readSource=readers.get(readSource)??readSource;
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'colorless',readSource});
 return original(path,projected,{readSource:sourceEpoch.combinedReader(readSource,'colorless')});
}
const readers=new WeakMap();
export function colorlessCatalogReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preColorlessCatalogSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}
