import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';
import {runStatic,reviewResponsibilityComplexity} from '../scripts/check-lua-static.mjs';
import {discoverSources,measureSources} from '../scripts/lua-quality-metrics.mjs';
import {preEndTurnResponsibilitiesSource as prior,endTurnResponsibilitiesReader as reader} from './helpers/end-turn-responsibilities-source-inverse.mjs';
import {preRelicQuerySource,relicQueryReader} from './helpers/relic-query-source-inverse.mjs';
import {sourceEpoch} from './helpers/combined-epoch/source-epoch.mjs';
import {relicQuerySourceProof} from './helpers/epochs/develop/tests/helpers/relic-query-source-inverse.mjs';
const file='src/lua/abyss_end_turn_powers.lua',read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n'),hash=s=>createHash('sha256').update(s).digest('hex');
const before=read('tests/fixtures/end-turn-responsibilities-before.lua');
function replay(source,fixture){mkdirSync('build/end-turn-responsibilities',{recursive:true});const root=mkdtempSync(join('build/end-turn-responsibilities','vm-'));
 try{const output=join(root,'graph.txt');const r=spawnSync(process.execPath,['--max-old-space-size=512','tests/helpers/end-turn-responsibilities-vm.mjs',output],{input:JSON.stringify({source,fixture}),encoding:'utf8',timeout:30000,maxBuffer:1048576});assert.equal(r.error,undefined,r.error?.message);assert.equal(r.status,0,r.stderr);return {...JSON.parse(r.stdout),graph:readFileSync(output)};
 }finally{rmSync(root,{recursive:true,force:true});}}
test('EndTurn retains the complete develop original source and Git blob',()=>{
 assert.equal(hash(before),'0f8881d917f93efb26c7b53f67545c05e6c4f39b43b1694bc3d3d6080173ebda');
 assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(before)+'\0'+before).digest('hex'),'aba3f7fdbf7b675b84fc330ac1d4d3a14fe1362c');
});
for(const fixture of ['matrix',...['powers','retention','rollback','orb_callbacks'].map(n=>'tests/lua/owner_end_'+n+'.lua')])test(`EndTurn fresh old/new complete action, state and return graph: ${fixture}`,t=>{
 const old=replay(before,fixture),now=replay(read(file),fixture);assert.equal(old.status,0,old.error);assert.equal(now.status,0,now.error);assert(old.checkpoints>1);assert(now.graph.includes('complete '));assert.equal(now.checkpoints,old.checkpoints);
 if(!now.graph.equals(old.graph)){const a=old.graph.toString(),b=now.graph.toString();let i=0;while(i<a.length&&a[i]===b[i])i++;assert.fail('graph differs '+i+' before='+a.slice(i-70,i+180)+' current='+b.slice(i-70,i+180));}
 assert.deepEqual(old.relocatedErrors,[]);if(fixture!=='matrix')assert.deepEqual(now.relocatedErrors,[]);
 t.diagnostic(JSON.stringify({fixture,checkpoints:now.checkpoints,bytes:now.graph.length,sha256:hash(now.graph),relocatedErrors:now.relocatedErrors}));
});
test('EndTurn full module includes every callback and initialization under unchanged CC15',()=>{
 const sources=discoverSources(),diagnostics=runStatic(['--max-cyclomatic-complexity','0','--only','561']).diagnostics,measured=measureSources(sources,diagnostics);assert.deepEqual(measured.errors,[]);
 const module=measured.modules.find(m=>m.file===file);assert.equal(module.functions.length,38);assert(module.functions.every(f=>f.complexity<=15));const report=reviewResponsibilityComplexity(diagnostics,sources);assert.deepEqual(report.errors,[]);assert.equal(report.functions.filter(f=>f.file===file).length,38);
 const source='local function future() return function() end end',row=(column,subject)=>({file,line:1,column,code:'W561',message:`cyclomatic complexity of ${subject} is too high (16 > 0)`});
 const rows=[row(1,'main chunk'),row(7,"function 'future'"),row(source.indexOf('function()')+1,'function')];assert.equal(reviewResponsibilityComplexity(rows,{[file]:source}).errors.filter(e=>e.file===file&&e.message.includes('16 exceeds 15')).length,3);assert(reviewResponsibilityComplexity([],{[file]:source}).errors.some(e=>e.file===file&&e.message.includes('Incomplete')));
});
test('EndTurn exact outer source bridge freshly rechecks owner, CRLF and wrapper forms',()=>{
 const current=read(file);for(const wrap of [r=>r,reader,r=>reader(reader(r))]){let count=0,live=current;const r=wrap(p=>{assert.equal(p,file);count++;return live;});assert.equal(prior(file,current,{readSource:r}),before);assert.equal(count,1);live='foreign';assert.throws(()=>prior(file,current,{readSource:r}),/EndTurn current owner identity/);assert.equal(count,2);}
 assert.equal(prior(file,current.replaceAll('\n','\r\n'),{readSource:()=>current.replaceAll('\n','\r\n')}),before);
 for(const s of [current+'\n',current.replace('return top','return bottom'),before,null])assert.equal(prior(file,s,{readSource:()=>{throw Error('must not read unmatched epoch');}}),s);
 assert.throws(()=>prior(file,current,{readSource:()=>{throw Error('missing owner');}}),/missing owner/);
});
test('EndTurn original source composes into frozen N35 without replacing its prior source or oracle',async()=>{
 // #560 split the branch epochs. Preserve the actual EndTurn chain, not the
 // different Act1 chain, and run its original error contract on its own inputs.
 const bytes=readFileSync('tests/fixtures/end-turn-original-chain-3c8b0fbb.json.gz');
 assert.equal(hash(bytes),'9ba393732275c8b932b3ee3aba8b196b2bee28d1ea63c6bc1b527adbdd26a45c');
 const validate=archive=>{
  assert.equal(archive.schemaVersion,1);assert.equal(archive.sourceCommit,'3c8b0fbba73332354e1f030662fcf3169f03e8d6','original EndTurn chain commit');
  return Object.fromEntries(Object.entries(archive.files).map(([path,binding])=>{
   assert.match(path,/^tests\/(helpers|fixtures)\/[A-Za-z0-9._-]+$/);
   assert.notEqual(Object.hasOwn(binding,'existing'),Object.hasOwn(binding,'source'),'one complete original source per path');
   if(binding.existing)assert.match(binding.existing,/^tests\/helpers\/epochs\/(develop|endTurn)\/tests\/(helpers|fixtures)\/[A-Za-z0-9._-]+$/);
   const source=binding.existing?readFileSync(binding.existing):Buffer.from(binding.source);
   assert.equal(hash(source),binding.sha256,'original complete helper: '+path);
   assert.equal(createHash('sha1').update(`blob ${source.length}\0`).update(source).digest('hex'),binding.gitBlob,'original helper Git blob: '+path);
   return [path,source];
  }));
 };
 const archive=JSON.parse(gunzipSync(bytes)),inputs=validate(archive),target=sourceEpoch.proof.targets.endTurn;
 assert.equal(target.commit,archive.sourceCommit);assert.equal(target.files[file].sha256,'3124970981b679dd4964a7805a6b28277a286cf83b1dc0601e1e0e79ca4de527');
 for(const [key,value,message]of [['sourceCommit','0'.repeat(40),/original EndTurn chain commit/],['sha256','0'.repeat(64),/original complete helper/],['gitBlob','0'.repeat(40),/original helper Git blob/]]){
  const invalid=structuredClone(archive);
  if(key==='sourceCommit')invalid[key]=value;else invalid.files['tests/helpers/relic-query-source-inverse.mjs'][key]=value;
  assert.throws(()=>validate(invalid),message,'metadata cannot relabel an original helper');
 }
 const corrupt=structuredClone(archive);corrupt.files['tests/helpers/relic-query-source-inverse.mjs'].source+='\n';
 assert.throws(()=>validate(corrupt),/original complete helper/);
 const root=mkdtempSync(join(tmpdir(),'end-turn-original-chain-'));
 try{
  for(const [path,source]of Object.entries(inputs)){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);}
  const {preRelicQuerySource,relicQueryReader,relicQuerySourceProof:proof}=await import(pathToFileURL(join(root,'tests/helpers/relic-query-source-inverse.mjs')).href);
  const {preEndTurnResponsibilitiesSource:prior}=await import(pathToFileURL(join(root,'tests/helpers/end-turn-responsibilities-source-inverse.mjs')).href);
  const raw=p=>target.files[p]?.source,current=raw(file),old=preRelicQuerySource(file,before,{readSource:p=>prior(p,raw(p),{readSource:raw})});
  assert.equal(preRelicQuerySource(file,current,{readSource:raw}),old);assert.equal(relicQueryReader(raw)(file),old);assert.notEqual(old,current);
  assert.throws(()=>preRelicQuerySource(file,current,{readSource:p=>p===file?'foreign':raw(p)}),/EndTurn current owner identity/);
  assert.equal(old,relicQuerySourceProof.files[file].beforeSource);assert.equal(hash(old),'f4a6f2bb22d0b26c0011278105c85d61d22edca86202f21d9668157f024939bf');
  assert.deepEqual(proof,relicQuerySourceProof);const owners=Object.keys(proof.files);assert.equal(owners.length,35);
  const order=[file,...owners.flatMap(p=>p===file?[p,p]:p==='src/lua/abyss_combat.lua'?[p,'src/lua/abyss_original_v4.lua',p,'src/lua/abyss_codex_relic.lua']:[p])];
  assert.equal(order.length,40,'original EndTurn, N35 and M7 read order');
  let live=current,reads=[];const observed=p=>{reads.push(p);return p===file?live:raw(p);};
  const wrapped=relicQueryReader(observed);assert.equal(relicQueryReader(wrapped),wrapped);
  for(const readSource of [observed,wrapped]){
   live=current;reads=[];assert.equal(preRelicQuerySource(file,current,{readSource}),old);assert.deepEqual(reads,order);
   for(live of [current+'\n',before,old,null,undefined]){
    reads=[];assert.throws(()=>preRelicQuerySource(file,current,{readSource}),{message:'EndTurn current owner identity'});assert.deepEqual(reads,[file]);
   }
   live=current;reads=[];assert.equal(preRelicQuerySource(file,current,{readSource}),old);assert.deepEqual(reads,order);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('EndTurn current source composes into frozen N35 and freshly authenticates every raw owner',()=>{
 const current=read(file),old=relicQuerySourceProof.files[file].beforeSource,owners=sourceEpoch.proof.owners;
 assert.equal(hash(old),'f4a6f2bb22d0b26c0011278105c85d61d22edca86202f21d9668157f024939bf');
 assert.notEqual(old,current);assert.notEqual(old,before);assert(owners.includes(file));assert(owners.includes('config/architecture.json'));
 let changed,mode,reads=[];
 const raw=p=>{
  reads.push(p);if(p!==changed)return read(p);
  if(mode==='throw')throw Error('owner sentinel');
  if(mode==='missing')return undefined;if(mode==='null')return null;if(mode==='foreign')return 'foreign';
  if(mode==='old')return Object.values(sourceEpoch.proof.targets).find(target=>target.files[p]?.sha256!==sourceEpoch.proof.current[p]?.sha256).files[p]?.source;
  return read(p)+'\n';
 };
 const wrapped=relicQueryReader(raw);assert.equal(relicQueryReader(wrapped),wrapped);
 assert.equal(preRelicQuerySource(file,current),old);assert.equal(wrapped(file),old);
 let validReads;
 for(const readSource of [raw,wrapped]){
  changed=undefined;reads=[];assert.equal(preRelicQuerySource(file,current,{readSource}),old);
  assert.deepEqual(reads.slice(0,owners.length),owners);if(validReads)assert.deepEqual(reads,validReads);else validReads=[...reads];
  for(const owner of owners){
   for(mode of ['drift','foreign','old','null','missing','throw']){
    changed=owner;reads=[];
    const message=mode==='throw'?'combined linked owner missing: '+owner+': owner sentinel':'combined linked owner identity: '+owner;
    assert.throws(()=>preRelicQuerySource(file,current,{readSource}),{message});
    assert.deepEqual(reads,owners.slice(0,owners.indexOf(owner)+1),'fresh reads stop at the actual bad owner');
   }
   changed=undefined;reads=[];assert.equal(preRelicQuerySource(file,current,{readSource}),old);assert.deepEqual(reads,validReads,'recovery must reread the whole chain');
  }
 }
 for(const variant of [current+'\n',old,null,undefined]){
  reads=[];assert.equal(preRelicQuerySource(file,variant,{readSource:raw}),variant);assert.deepEqual(reads,[]);
 }
 assert.throws(()=>preRelicQuerySource(file,current,{readSource:null}),{code:'ERR_ASSERTION',actual:'object',expected:'function',message:/^linked owner reader(?:\n|$)/});
 assert.equal(preRelicQuerySource(file,current.replaceAll('\n','\r\n'),{readSource:p=>read(p).replaceAll('\n','\r\n')}),old);
 const config='config/architecture.json';
 assert.throws(()=>preRelicQuerySource(file,current,{readSource:p=>p===config?JSON.stringify(JSON.parse(read(p))):read(p)}),{message:'combined linked owner identity: '+config});
 let configReads=0;
 assert.throws(()=>preRelicQuerySource(file,current,{readSource:p=>read(p)+(p===config&&++configReads>1?'\n':'')}),
  /relic query linked owner missing: .*: combined linked owner identity: config\/architecture\.json$/,'inner validation cannot reuse an earlier outer success');
 assert.equal(configReads,2);
});
for(const [name,from,to]of [
 ['negative Ritual guard',"if n>0 then add(bottom,{op='gainStatus',status='strength',value=n})end","if n>=0 then add(bottom,{op='gainStatus',status='strength',value=n})end"],
 ['retaining Ethereal cards','if not combat.cardDefinition(state,c).ethereal then c.retain=true end','if combat.cardDefinition(state,c).ethereal then c.retain=true end'],
 ['Regen decay','p.statuses.regen=math.max(0,(p.statuses.regen or 0)-1)','p.statuses.regen=math.max(0,(p.statuses.regen or 0)-2)'],
])test(`EndTurn real semantic mutant is killed: ${name}`,()=>{const source=read(file);assert.equal(source.split(from).length,2);const r=replay(source.replace(from,to),'matrix');assert.notEqual(r.status,0,'mutant survived');assert.match(r.error,/\[END_TURN_RESPONSIBILITY\]/);});
