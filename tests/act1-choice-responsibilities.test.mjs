import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runStatic,reviewResponsibilityComplexity} from '../scripts/check-lua-static.mjs';
import {discoverSources,measureSources} from '../scripts/lua-quality-metrics.mjs';
const file='src/lua/abyss_act1_events.lua';
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const handlers=['sssserpent','big_fish','accursed_blacksmith','scrap_ooze','transmogrifier','bonfire'];
test('Act1 local choices have a CC15 dispatcher and event-owned handlers',()=>{
 const sources=discoverSources();const rows=runStatic(['--max-cyclomatic-complexity','0','--only','561']).diagnostics;
 const measured=measureSources(sources,rows);assert.deepEqual(measured.errors,[]);
 const functions=measured.modules.find(m=>m.file===file).functions;
 assert.equal(functions.find(f=>f.name==='M.choose').complexity<=15,true,'M.choose must remain at CC15 or less');
 for(const name of handlers)assert(functions.some(f=>f.name==='choiceHandlers.'+name),'event-owned handler '+name);
 const report=reviewResponsibilityComplexity(rows,sources);assert.deepEqual(report.errors,[]);
});

import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {act1ChoiceBefore as before,preAct1ChoiceSource,act1ChoiceReader} from './helpers/act1-choice-source-inverse.mjs';
import {copyCurrentSourceFixture} from './helpers/isolated-current-source.mjs';
function replay(source,fixture,group){
 mkdirSync('build/act1-choice',{recursive:true});
 const dir=mkdtempSync('build/act1-choice/vm-');
 try{
  const output=join(dir,'graph.jsonl');
  const result=spawnSync(process.execPath,['--max-old-space-size=768','tests/helpers/act1-choice-vm.mjs'],{
   input:JSON.stringify({source,fixture,output,group}),encoding:'utf8',timeout:30000,maxBuffer:1024**2,
  });
  assert.equal(result.error,undefined,result.error?.message);assert.equal(result.status,0,result.stderr);
  return {...JSON.parse(result.stdout),graph:readFileSync(output)};
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('Act1 graph framing preserves original complete bytes for escaped labels and graph values',()=>{
 mkdirSync('build/act1-choice',{recursive:true});
 const dir=mkdtempSync('build/act1-choice/framing-'),fixture=join(dir,'probe.lua');
 try{
  writeFileSync(fixture,String.raw`local label='label "quote" \\ backslash\n\t\0 中文 😀'
local owner={value='中文\0😀',words={'0000000000000000','0000000000000063'},counter=0}
local key={};local callback=function()end
local thread=coroutine.create(function()end)
local root=setmetatable({owner=owner,alias=owner,[key]=key,[true]=false,[0]='zero',[-1]='negative',callback=callback,thread=thread,returns=table.pack(false,nil,'error \"body\"\nline',nil)}, {__index={meta='kept'}})
root.self=root
ACT1_GRAPH_WRITE(root,label)
owner.counter=1;owner.words[2]='0000000000000064';root.alias={value=owner.value};root.returns=table.pack(false,nil,'error \"body\"\nline')
ACT1_GRAPH_WRITE(root,'mutation')
ACT1_GRAPH_WRITE(nil,'empty')
`);
  const result=replay(read(file),fixture);
  assert.equal(result.status,0,result.error);assert.equal(result.checkpoints,3);assert.deepEqual(result.logs,[]);
  // Captured from the unmodified 5a16da0a VM before removing its JSON roundtrip.
  // Covers label escaping, full definitions, aliases, RNG words and return arity.
  assert.equal(result.bytes,2180);assert.equal(result.graph.length,2180);
  assert.equal(createHash('sha256').update(result.graph).digest('hex'),'e17ea907c393e5d4e29df9ff781b989309f4dc2a8ae42ccfd36997707cab0d24');
  for(const line of result.graph.toString().trimEnd().split('\n')){
   const {label,graph}=JSON.parse(line);assert.equal(line,JSON.stringify({label,graph}),'original JSON framing');
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
for(const fixture of ['tests/lua/act1_event_content.lua','tests/lua/scrap_ooze.lua','tests/lua/transmogrifier.lua'])test(`${fixture}: old/current VMs retain complete graphs, aliases, RNG, returns and assertions`,t=>{
 const old=replay(before,fixture),current=replay(read(file),fixture);
 assert.equal(old.status,0,old.error);assert.equal(current.status,0,current.error);
 assert(current.checkpoints>0);assert.equal(current.checkpoints,old.checkpoints);
 assert.deepEqual(current.logs,old.logs);assert(current.graph.equals(old.graph),'complete graph bytes differ');
 const proof={fixture,checkpoints:current.checkpoints,bytesPerSide:current.graph.length,sha256:createHash('sha256').update(current.graph).digest('hex'),logs:current.logs};
 writeFileSync('build/act1-choice/'+fixture.split('/').at(-1)+'.json',JSON.stringify(proof,null,2)+'\n');t.diagnostic(JSON.stringify(proof));
});
test('Act1 source inverse authenticates fresh current bytes with exact LF and Git identity',()=>{
 const current=read(file);let live=current,reads=0;const raw=p=>{assert.equal(p,file);reads++;return live;};
 const reader=act1ChoiceReader(raw);assert.equal(act1ChoiceReader(reader),reader);
 assert.equal(preAct1ChoiceSource(file,current,{readSource:reader}),before);assert.equal(reads,1);
 assert.equal(preAct1ChoiceSource(file,current.replaceAll('\n','\r\n'),{readSource:raw}),before);
 for(live of [current+'\n',before,null,undefined])assert.throws(()=>preAct1ChoiceSource(file,current,{readSource:reader}),/linked owner/);
 assert.throws(()=>preAct1ChoiceSource(file,current,{readSource(){throw Error('missing');}}),/linked owner missing/);
 assert.throws(()=>preAct1ChoiceSource(file,current,{readSource:null}),/linked reader/);
 reads=0;for(const unknown of [null,undefined,'',current+'\n',before])assert.equal(preAct1ChoiceSource(file,unknown,{readSource:raw}),unknown);
 assert.equal(preAct1ChoiceSource('foreign/'+file,current,{readSource:raw}),current);assert.equal(reads,0);
});

import {analyzeSources} from '../scripts/check-architecture.mjs';
import {dependencyCycles} from '../scripts/lua-quality-metrics.mjs';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import luaparse from 'luaparse';
test('Act1 responsibilities preserve every require edge and SCC member',()=>{
 const sources=Object.fromEntries(Object.entries(discoverSources()).map(([p,s])=>[p.slice(8,-4).replaceAll('/','.'),s]));
 const policy=JSON.parse(read('config/architecture.json'));
 const old=analyzeSources({...sources,abyss_act1_events:before},policy),current=analyzeSources(sources,policy);
 assert.deepEqual(old.errors,[]);assert.deepEqual(current.errors,[]);
 const edges=g=>g.edges.map(({from,to,reviewedDeferred})=>JSON.stringify({from,to,reviewedDeferred})).sort();
 assert.deepEqual(edges(current),edges(old));
 assert.deepEqual(dependencyCycles(current.nodes,current.edges).map(c=>c.members),dependencyCycles(old.nodes,old.edges).map(c=>c.members));
});
test('every extracted Act1 root and nested callback keeps the existing CC15 hard gate',()=>{
 for(const name of ['M.choose','bonfireReward','bonfireCurseReward',...handlers.map(n=>'choiceHandlers.'+n)]){
  const source=`function ${name}() return function() end end`;
  const row=(column,subject)=>({file,line:1,column,code:'W561',message:`cyclomatic complexity of ${subject} is too high (16 > 0)`});
  const errors=reviewResponsibilityComplexity([row(1,'main chunk'),row(1,`function '${name}'`),row(source.indexOf('function()')+1,'function')],{[file]:source}).errors;
  assert(errors.some(e=>e.message===`Responsibility complexity 16 exceeds 15: function '${name}'`));
  assert(errors.some(e=>e.message==='Responsibility complexity 16 exceeds 15: function'));
 }
 assert(reviewResponsibilityComplexity([],{[file]:'function M.choose()end'}).errors.some(e=>e.message.includes('missing or duplicated')));
});
test('actual CRLF source and helper checkout retain the frozen LF Git identity',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'act1-crlf-'));
 try{
  const readSource=copyCurrentSourceFixture(dir,{crlf:true});
  const module=await import(pathToFileURL(join(dir,'tests/helpers/act1-choice-source-inverse.mjs')).href);
  assert.equal(module.act1ChoiceBefore,before);
  const source=readSource(file);
  assert.equal(module.preAct1ChoiceSource(file,source,{readSource}),before);
  writeFileSync(join(dir,file),source+'\r\n');
  assert.throws(()=>module.preAct1ChoiceSource(file,source,{readSource}),/linked owner/);
  rmSync(join(dir,file));
  assert.throws(()=>module.preAct1ChoiceSource(file,source,{readSource}),/linked owner missing/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('original Act1 chain preserves exact Git sources, reader unwrapping and one-owner read order',async()=>{
 // #560 separated branch epochs. Run the original #546 chain on its own
 // authenticated inputs, never on a facade's projected current configuration.
 const bytes=readFileSync('tests/fixtures/act1-original-chain-35d392bc.json.gz');
 const hash=source=>createHash('sha256').update(source).digest('hex');
 assert.equal(hash(bytes),'26cc10419f2685b19fcf24d6d01a878f3914b485e0c4d49f8165d25bf1da3200');
 const validate=archive=>{
  assert.equal(archive.schemaVersion,1);assert.equal(archive.sourceCommit,'35d392bcf3049a214970127dbf587a4adae8fd9e','original chain commit');
  return Object.fromEntries(Object.entries(archive.files).map(([path,binding])=>{
   assert.match(path,/^tests\/(helpers|fixtures)\/[A-Za-z0-9._-]+$/);
   assert.notEqual(Object.hasOwn(binding,'existing'),Object.hasOwn(binding,'source'),'one complete original source per path');
   if(binding.existing)assert.match(binding.existing,/^tests\/helpers\/epochs\/[A-Za-z0-9]+\/tests\/(helpers|fixtures)\/[A-Za-z0-9._-]+$/);
   const source=binding.existing?readFileSync(binding.existing):Buffer.from(binding.source);
   assert.equal(hash(source),binding.sha256,'original complete helper: '+path);
   assert.equal(createHash('sha1').update(`blob ${source.length}\0`).update(source).digest('hex'),binding.gitBlob,'original helper Git blob: '+path);
   return [path,source];
  }));
 };
 const archive=JSON.parse(gunzipSync(bytes)),inputs=validate(archive);
 for(const [key,value,message]of [['sourceCommit','0'.repeat(40),/original chain commit/],['sha256','0'.repeat(64),/original complete helper/],['gitBlob','0'.repeat(40),/original helper Git blob/]]){
  const invalid=structuredClone(archive);
  if(key==='sourceCommit')invalid[key]=value;else invalid.files['tests/helpers/relic-query-source-inverse.mjs'][key]=value;
  assert.throws(()=>validate(invalid),message,'metadata cannot relabel an original helper');
 }
 const corrupt=structuredClone(archive);corrupt.files['tests/helpers/relic-query-source-inverse.mjs'].source+='\n';
 assert.throws(()=>validate(corrupt),/original complete helper/);
 const {sourceEpoch}=await import('./helpers/combined-epoch/source-epoch.mjs');
 const target=sourceEpoch.proof.targets.act1;assert.equal(target.commit,archive.sourceCommit);
 const dir=mkdtempSync(join(tmpdir(),'act1-original-chain-')),cwd=process.cwd();
 try{
  for(const [path,source]of Object.entries(inputs)){
   mkdirSync(dirname(join(dir,path)),{recursive:true});writeFileSync(join(dir,path),source);
  }
  const source=target.files[file].source;assert.equal(source,read(file));
  for(const path of [file,'config/architecture.json']){
   mkdirSync(dirname(join(dir,path)),{recursive:true});writeFileSync(join(dir,path),target.files[path].source);
  }
  const {preRelicQuerySource:original}=await import(pathToFileURL(join(dir,'tests/helpers/relic-query-source-inverse.mjs')).href);
  const {act1ChoiceReader:wrap}=await import(pathToFileURL(join(dir,'tests/helpers/act1-choice-source-inverse.mjs')).href);
  process.chdir(dir);assert.equal(original(file,source),before);
  let live=source,reads=[];const raw=p=>{reads.push(p);assert.equal(p,file);return live;};
  const wrapped=wrap(raw);assert.equal(wrap(wrapped),wrapped);
  for(const readSource of [raw,wrapped]){
   live=source;reads=[];assert.equal(original(file,source,{readSource}),before);assert.deepEqual(reads,[file]);
   for(live of [source+'\n',before,null,undefined]){
    reads=[];assert.throws(()=>original(file,source,{readSource}),/Act1 choice linked owner identity/);assert.deepEqual(reads,[file]);
   }
   live=source;reads=[];assert.equal(original(file,source,{readSource}),before);assert.deepEqual(reads,[file]);
   for(const unknown of [source+'\n',before,null,undefined]){
    reads=[];assert.equal(original(file,unknown,{readSource}),unknown);assert.deepEqual(reads,[]);
   }
  }
  assert.throws(()=>original(file,source,{readSource(){throw Error('missing');}}),/Act1 choice linked owner missing/);
  writeFileSync(file,source+'\n');assert.throws(()=>original(file,source),/Act1 choice linked owner identity/);
  writeFileSync(file,source);assert.equal(original(file,source),before);
  rmSync(file);assert.throws(()=>original(file,source),/Act1 choice linked owner missing/);
 }finally{process.chdir(cwd);rmSync(dir,{recursive:true,force:true});}
});
test('Act1 current source enters the unchanged historical chain and rereads every raw owner',async()=>{
 const {preRelicQuerySource,relicQueryReader}=await import('./helpers/relic-query-source-inverse.mjs');
 const {sourceEpoch}=await import('./helpers/combined-epoch/source-epoch.mjs');
 const source=read(file),owners=sourceEpoch.proof.owners;
 // Forty-five belongs to the frozen #562 union, not the evolving live tree.
 const {sevenRefactorEpoch}=await import('./helpers/seven-refactor-source-epoch.mjs');
 const archived=readFileSync('tests/helpers/combined-epoch/source-epoch.json.gz');
 assert.equal(createHash('sha256').update(archived).digest('hex'),'2085260a5aabde4476411172eb0b2e6fd3afcaa991a3cafc52f3ab0e98755c73');
 const packed=JSON.parse(gunzipSync(archived)),digest=key=>packed.bindings[key]?.sha256;
 const combinedOwners=packed.owners.filter(path=>Object.values(packed.targets).some(target=>digest(target.files[path])!==digest(packed.current[path])));
 const historicalOwners=[...new Set([...combinedOwners,...sevenRefactorEpoch.proof.owners])];
 assert.equal(historicalOwners.length,45,'unchanged authenticated #562 owner union');
 assert.deepEqual(historicalOwners.filter(owner=>!owners.includes(owner)),[],'current coverage retains every original owner');
 assert.equal(preRelicQuerySource(file,source),before);
 let changed,reads=[],replacement;
 const raw=p=>{reads.push(p);return p===changed?replacement:read(p);};
 const wrapped=relicQueryReader(raw);assert.equal(relicQueryReader(wrapped),wrapped);
 for(const readSource of [raw,wrapped]){
  changed=undefined;reads=[];assert.equal(preRelicQuerySource(file,source,{readSource}),before);assert.deepEqual(reads,owners);
  for(const owner of owners)for(replacement of [read(owner)+'\n',null,undefined]){
   changed=owner;reads=[];assert.throws(()=>preRelicQuerySource(file,source,{readSource}),/combined linked owner identity/);
   assert.deepEqual(reads,owners.slice(0,owners.indexOf(owner)+1),'fresh reads stop at the actual bad owner');
  }
  changed=file;replacement=before;reads=[];
  assert.throws(()=>preRelicQuerySource(file,source,{readSource}),/combined linked owner identity/,'original Act1 bytes cannot authorize a current raw owner');
  assert.deepEqual(reads,owners.slice(0,owners.indexOf(file)+1));
  // Layout tolerance is for the input argument only, never a real raw owner.
  changed='config/architecture.json';replacement=JSON.stringify(JSON.parse(read(changed)));
  assert.throws(()=>preRelicQuerySource(file,source,{readSource}),/combined linked owner identity: config\/architecture.json/);
  changed=undefined;reads=[];assert.equal(preRelicQuerySource(file,source,{readSource}),before);assert.deepEqual(reads,owners);
 }
 assert.throws(()=>preRelicQuerySource(file,source,{readSource:p=>{if(p===file)throw Error('missing');return read(p);}}),/combined linked owner missing/);
 // A reader for another target is projected data, not this facade's raw owner.
 // Accepting it would silently combine #546 architecture with the current tree.
 const act1Reader=act1ChoiceReader(p=>read(p));
 assert.equal(act1Reader('config/architecture.json'),sourceEpoch.proof.targets.act1.files['config/architecture.json'].source);
 assert.throws(()=>preRelicQuerySource(file,source,{readSource:act1Reader}),/combined linked owner identity: config\/architecture.json/);
});
for(const [name,from,to,fixture,expected] of [
 ['serpent gold',"Run.gainGold(staged,175)","Run.gainGold(staged,176)",'tests/lua/act1_event_content.lua','275.0 ~= 274'],
 ['blacksmith upgrade count',"(instance.upgraded and 1 or 0))+1","(instance.upgraded and 1 or 0))+2",'tests/helpers/act1-choice-boundaries.lua','2 ~= 1'],
 ['inclusive ooze threshold',"if roll>=99-event.chance then","if roll>99-event.chance then",'tests/lua/scrap_ooze.lua','nil ~= result'],
])test(`existing behavior assertions reject parsed ${name} semantic mutation`,()=>{
 const source=read(file);assert.equal(source.split(from).length,2,'one actual mutation site');
 const mutant=source.replace(from,to);luaparse.parse(mutant,{luaVersion:'5.3'});
 const result=replay(mutant,fixture,fixture.includes('boundaries')?1:undefined);assert.equal(result.status,2,'actual assertion failure');
 assert.match(result.error,new RegExp('^'+fixture.replaceAll('.','\\.')+':'+(fixture.includes('boundaries')?'13':'4')+': '));
 // Exact failures are recorded rather than accepting a harness timeout as evidence.
 assert(result.error.endsWith(expected),result.error);
});

for(const group of [1,2,3,4])test(`Act1 failure boundaries ${group}/4 preserve all original values and aliases`,t=>{
 const fixture='tests/helpers/act1-choice-boundaries.lua',old=replay(before,fixture,group),current=replay(read(file),fixture,group);
 assert.equal(old.status,0,old.error);assert.equal(current.status,0,current.error);
 assert(current.checkpoints>0);assert.equal(current.checkpoints,old.checkpoints);assert.deepEqual(current.logs,old.logs);
 if(!current.graph.equals(old.graph)){
  const a=old.graph.toString().split('\n'),b=current.graph.toString().split('\n');const i=a.findIndex((x,i)=>x!==b[i]);
  writeFileSync('build/act1-choice/mismatch-'+group+'.json',JSON.stringify({checkpoint:i,before:JSON.parse(a[i]),after:JSON.parse(b[i])}));
 }
 assert(current.graph.equals(old.graph),'complete graph bytes differ');
 const proof={group,checkpoints:current.checkpoints,bytesPerSide:current.graph.length,sha256:createHash('sha256').update(current.graph).digest('hex'),logs:current.logs};
 writeFileSync('build/act1-choice/boundary-'+group+'.json',JSON.stringify(proof,null,2)+'\n');t.diagnostic(JSON.stringify(proof));
});


test('error observation maps only the verified moved damage site and preserves foreign errors',async()=>{
 const {comparableAct1ChoiceError:compare,verifyAct1ChoiceErrorSite:verify}=await import('./helpers/act1-choice-source-inverse.mjs');
 verify(read(file));
 const body="attempt to call a nil value (field 'eventDamage')";
 assert.equal(compare(`${file}:174: ${body}`),`${file}:177: ${body}`);
 for(const value of [null,{},new Error('sentinel'),`${file}:175: ${body}`,`${file}:174: changed body`,`foreign.lua:174: ${body}`])assert.equal(compare(value),value);
 assert.throws(()=>verify(read(file).replace('local damaged,damageReason=Run.eventDamage(run,event.damage)','local damaged,damageReason=false')),/moved unguarded damage site/);
});
