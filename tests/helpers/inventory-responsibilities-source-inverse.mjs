// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/inventory/tests/helpers/inventory-responsibilities-source-inverse.mjs';
import { preInventoryResponsibilitiesSource as original } from './epochs/inventory/tests/helpers/inventory-responsibilities-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(p,'utf8');
export function preInventoryResponsibilitiesSource(path,source,{readSource=live}={}){
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'inventory',readSource});
 return original(path,projected,{readSource:sourceEpoch.combinedReader(readSource,'inventory')});
}
const readers=new WeakMap();
export function inventoryResponsibilitiesReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preInventoryResponsibilitiesSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}
