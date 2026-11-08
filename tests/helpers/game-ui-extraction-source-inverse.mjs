// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/develop/tests/helpers/game-ui-extraction-source-inverse.mjs';
import { preGameUiExtractionSource as original } from './epochs/develop/tests/helpers/game-ui-extraction-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(p,'utf8');
export function preGameUiExtractionSource(path,source,{readSource=live}={}){
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'develop',readSource});
 return original(path,projected,{readSource:sourceEpoch.combinedReader(readSource,'develop')});
}
const readers=new WeakMap();
export function gameUiExtractionReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preGameUiExtractionSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}

import {preNativePageSource as nativeOriginal} from './epochs/native/tests/helpers/game-ui-extraction-source-inverse.mjs';
export function preNativePageSource(path,source,{readSource=live}={}){
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'native',readSource});
 return nativeOriginal(path,projected,{readSource:sourceEpoch.combinedReader(readSource,'native')});
}
