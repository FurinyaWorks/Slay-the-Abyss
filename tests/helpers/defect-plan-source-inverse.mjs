// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/defect/tests/helpers/defect-plan-source-inverse.mjs';
import { preDefectPlanSource as original } from './epochs/defect/tests/helpers/defect-plan-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(p,'utf8');
export function preDefectPlanSource(path,source,{readSource=live}={}){
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'defect',readSource});
 return original(path,projected,{readSource:sourceEpoch.combinedReader(readSource,'defect')});
}
const readers=new WeakMap();
export function defectPlanReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preDefectPlanSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}
