import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),load=p=>import(pathToFileURL(root+'/'+p));
const {sourceEpoch}=await load('tests/helpers/combined-epoch/source-epoch.mjs');
const p=sourceEpoch.proof,path='config/architecture.json',owners=['config/architecture.json','src/lua/abyss_run.lua','src/lua/abyss_uncommon_relics.lua','src/lua/abyss_run_health.lua'];
const raw=q=>p.current[q]?.source??null;
let checks=0,facades=0;
for(const file of readdirSync('tests/helpers').filter(f=>f.endsWith('.mjs'))){
 const body=readFileSync('tests/helpers/'+file,'utf8');if(!body.includes("import {sourceEpoch} from './combined-epoch/source-epoch.mjs'"))continue;
 const exports=await load('tests/helpers/'+file),names=[...body.matchAll(/export function (pre\w+Source)\(/g)].map(m=>m[1]);
 for(const name of names){facades++;const fn=exports[name];let corrupt=null;const readSource=q=>q===corrupt?raw(q)+'\n':raw(q);
  fn(path,raw(path),{readSource});
  for(const owner of owners){corrupt=owner;assert.throws(()=>fn(path,raw(path),{readSource}),/linked owner identity/,file+' '+owner);checks++;}corrupt=null;
  let reads=0;const foreign=raw(path)+'\n-- foreign';assert.equal(fn(path,foreign,{readSource(){reads++;throw Error('unexpected');}}),foreign);assert.equal(reads,0);checks++;
  for(const reader of [null,false,0,{},[]]){assert.throws(()=>fn(path,raw(path),{readSource:reader}),/reader/);checks++;}
  const crlf=q=>raw(q)?.replaceAll('\n','\r\n')??null;assert.equal(fn(path,raw(path).replaceAll('\n','\r\n'),{readSource:crlf}),fn(path,raw(path),{readSource:raw}));checks++;
 }
}
for(const target of Object.keys(p.targets)){
 const added=owners[3],input=raw(added).replaceAll('\n','\r\n');assert.equal(sourceEpoch.preCombinedSource(added,input,{target,readSource:null}),input);checks++;
 for(const value of [null,false,0,{},[]]){const foreign='foreign';assert.equal(sourceEpoch.preCombinedSource(path,foreign,{target,readSource:value}),foreign);checks++;}
}
console.log(JSON.stringify({facades,checks,paths:Object.keys(p.current).length,owners:p.owners.length,status:'PASS'}));
