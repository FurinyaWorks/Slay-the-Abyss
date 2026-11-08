// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/endTurn/tests/helpers/end-turn-responsibilities-source-inverse.mjs';
import { preEndTurnResponsibilitiesSource as original } from './epochs/endTurn/tests/helpers/end-turn-responsibilities-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(p,'utf8');
export function preEndTurnResponsibilitiesSource(path,source,{readSource=live}={}){
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'endTurn',readSource});
 return original(path,projected,{readSource:sourceEpoch.combinedReader(readSource,'endTurn')});
}
const readers=new WeakMap();
export function endTurnResponsibilitiesReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preEndTurnResponsibilitiesSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}
