// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/act1/tests/helpers/act1-choice-source-inverse.mjs';
import { preAct1ChoiceSource as original } from './epochs/act1/tests/helpers/act1-choice-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
export function preAct1ChoiceSource(path,source,{readSource=live}={}){
 readSource=readers.get(readSource)??readSource;
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'act1',readSource});
 return original(path,projected,{readSource:(typeof readSource==='function'?sourceEpoch.combinedReader(readSource,'act1'):readSource)});
}
const readers=new WeakMap();
export function act1ChoiceReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preAct1ChoiceSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}
