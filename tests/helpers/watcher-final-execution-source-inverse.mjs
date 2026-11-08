// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/watcher/tests/helpers/watcher-final-execution-source-inverse.mjs';
import { preWatcherExecutionSource as original } from './epochs/watcher/tests/helpers/watcher-final-execution-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
export function preWatcherExecutionSource(path,source,{readSource=live}={}){
 readSource=readers.get(readSource)??readSource;
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'watcher',readSource});
 return original(path,projected,{readSource:(typeof readSource==='function'?sourceEpoch.combinedReader(readSource,'watcher'):readSource)});
}
const readers=new WeakMap();
export function watcherExecutionReader(readSource=live){
 if(readers.has(readSource))return readSource;
 const reader=path=>preWatcherExecutionSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}
