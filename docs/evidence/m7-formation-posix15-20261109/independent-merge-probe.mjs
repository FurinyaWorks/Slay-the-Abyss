// Independent, read-only candidate verification. Run from the repository root.
// Writes only the explicitly named new evidence receipt; never runs discovered tests.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,posix} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import * as current from '../../../tests/helpers/ci-complete-calibration-source-inverse.mjs';
import {prePosix15ShapeSource,posix15ShapeProof} from '../../../tests/helpers/posix15-shape-source-inverse.mjs';
import {preEncounterFormationCiSource,encounterFormationCiInventory,encounterFormationPlanningFloors} from '../../../tests/helpers/encounter-formation-ci-source-inverse.mjs';
import {discoverJs,jsShard,jsPlanningWeights,timings,partition} from '../../../scripts/ci-shards.mjs';
import {shardLuaScripts} from '../../../scripts/test-lua.mjs';
import {qualityShardMatrices,qualityShardJobs} from '../../../scripts/ci-quality-shape.mjs';
import {currentFullQualityJobs,fullQualityJobs,qualityWorkflowPath,verifyDelivery,verifyMergedDelivery} from '../../../scripts/verify-delivery.mjs';
import {fullGateErrors} from '../../../scripts/publish-full-quality.mjs';
import {queueFullErrors} from '../../../scripts/publish-merge-group.mjs';
const parents={formation:'d21be2fb2d84f68767c3b1ef827b61a2b63aa323',posix15:'841510b78172b923b1a613216b5c3dcb2c3e062e',base:'fb04fd36ab4fbdba71c0da08bf71d2899143f69b'};
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p,'utf8'),git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024**2});
const helper='tests/helpers/ci-complete-calibration-source-inverse.mjs',shape='scripts/ci-quality-shape.mjs',timing='scripts/ci-test-timings.json';
const output=process.argv[2];assert.ok(output?.startsWith('docs/evidence/m7-formation-posix15-20261109/independent-')&&output.endsWith('.json'),'choose a new independent receipt in this review evidence directory');assert.ok(!existsSync(output),'never overwrite evidence');
const touched=new Set([helper,shape,timing,'tests/ci-complete-calibration.test.mjs','tests/helpers/posix15-shape-source-inverse.mjs','tests/helpers/posix15-shape-source-epoch.json.gz','tests/helpers/encounter-formation-ci-source-inverse.mjs','tests/helpers/encounter-formation-ci-source-epoch.json.gz','scripts/ci-shards.mjs','scripts/test-lua.mjs','scripts/verify-delivery.mjs','scripts/publish-full-quality.mjs','scripts/publish-merge-group.mjs','tests/full-quality.test.mjs','tests/merge-queue.test.mjs','tests/delivery.test.mjs']);
// Import the exact parent helper logic, changing only module URL resolution.
const parentModules={},loaderProof={};
for(const [label,commit]of Object.entries(parents)){
 const source=git('show',commit+':'+helper),url=pathToFileURL(resolve(helper)).href;
 const detached=source.replace(/(\bfrom\s*['"])(\.[^'"]+)(['"])/g,(_m,a,p,z)=>a+new URL(p,url).href+z).replaceAll('import.meta.url',JSON.stringify(url));
 parentModules[label]=await import('data:text/javascript,'+encodeURIComponent(detached));
 loaderProof[label]={commit,sourceSha256:hash(source),loaderSha256:hash(detached),transform:'Relative import URLs and import.meta.url only; projection code unchanged.'};
 assert.deepEqual(Object.keys(parentModules[label]).sort(),Object.keys(current).sort());
 for(const key of Object.keys(current))if(typeof current[key]!=='function')assert.deepEqual(current[key],parentModules[label][key],label+'/'+key);
}
assert.equal(read(helper),git('show',parents.formation+':'+helper).replace("import {preEncounterFormationCiSource} from './encounter-formation-ci-source-inverse.mjs';","import {preEncounterFormationCiSource} from './encounter-formation-ci-source-inverse.mjs';\nimport {prePosix15ShapeSource} from './posix15-shape-source-inverse.mjs';").replace('export function preCurrentCiPlacementSource(path,source){','export function preCurrentCiPlacementSource(path,source){\n source=prePosix15ShapeSource(path,source);'));
assert.equal(read(shape),git('show',parents.posix15+':'+shape));
assert.equal(posix15ShapeProof.beforeSource,git('show',parents.base+':'+shape));
assert.equal(posix15ShapeProof.afterSource,read(shape));
assert.equal(read(timing),git('show',parents.formation+':'+timing));
const inputs=new Map(),add=(path,source,origin)=>{if(typeof path!=='string'||!/^(scripts|tests|src|config)\//.test(path)||typeof source!=='string')return;const key=path+'\0'+hash(source);if(!inputs.has(key))inputs.set(key,{path,source,origins:[]});inputs.get(key).origins.push(origin);};
function sourceObjects(value,path,origin){if(!value||typeof value!=='object')return;if(typeof value.path==='string')path=value.path;for(const [key,child]of Object.entries(value)){const next=/^(scripts|tests|src|config)\//.test(key)?key:path;if(typeof child==='string'&&(/^(scripts|tests|src|config)\//.test(key)||['source','beforeSource','afterSource'].includes(key))&&!/^[a-f0-9]{40,64}$/.test(child))add(next,child,origin);else if(child&&typeof child==='object')sourceObjects(child,next,origin);}}
const upstream=new Set(),archives=new Set();
function visit(path){if(upstream.has(path))return;upstream.add(path);touched.add(path);const text=read(path);for(const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.[^'"]+)['"]/g)){const p=posix.normalize(posix.join(posix.dirname(path),m[1]));if(p.endsWith('.mjs')&&existsSync(p))visit(p);}for(const m of text.matchAll(/new URL\(['"]([^'"]+\.(?:json|json\.gz))['"],\s*import\.meta\.url\)/g))archives.add(posix.normalize(posix.join(posix.dirname(path),m[1])));}
visit(helper);
for(const path of archives){touched.add(path);sourceObjects(JSON.parse(path.endsWith('.gz')?gunzipSync(readFileSync(path)):read(path)),null,path);}
for(const [label,module]of Object.entries(parentModules))for(const [key,value]of Object.entries(module))if(typeof value!=='function')sourceObjects(value,null,label+' export '+key);
const sourcePaths=[...new Set([...inputs.values()].map(x=>x.path))];
for(const path of sourcePaths){if(existsSync(path)){touched.add(path);add(path,read(path),'working candidate');}for(const [label,commit]of Object.entries(parents))try{add(path,git('show',commit+':'+path),label+' Git');}catch{}}
const inputBefore=Object.fromEntries([...touched].sort().map(p=>[p,hash(readFileSync(p))]));
const options={originalPlanningSource:[undefined,'develop','seven','unknown'],preCombinedPlanningSource:[undefined,'base','flow','silent','effects','unknown'],preCombinedGateSource:[undefined,'flow','silent','effects','unknown']};
const layered=new Set(['originalPlanningSource','preCurrentCiPlacementSource','preCiCompleteCalibrationSource','preCombinedPlanningSource','preCombinedGateSource']);
const shapeLayered=new Set(['preCurrentCiPlacementSource','preCiCompleteCalibrationSource']);
const outcome=(fn,args)=>{try{return {value:fn(...args)};}catch(e){return {error:{name:e.name,code:e.code??null,message:e.message}};}};
const resultHash=createHash('sha256');let comparisons=0,throwingComparisons=0;
function compare(path,input,label){for(const name of Object.keys(current))if(typeof current[name]==='function')for(const epoch of options[name]??[undefined]){
 const actual=outcome(current[name],[path,input,epoch]);
 for(const [parent,module]of Object.entries(parentModules)){
  let expectedInput=input;
  if(parent!=='posix15'&&shapeLayered.has(name))expectedInput=prePosix15ShapeSource(path,expectedInput);
  if(parent!=='formation'&&layered.has(name)&&path===(name==='preCombinedGateSource'?'scripts/check-lua-static.mjs':timing))expectedInput=preEncounterFormationCiSource(path,expectedInput);
  const expected=outcome(module[name],[path,expectedInput,epoch]);
  assert.deepEqual(actual,expected,`${parent}/${name}/${path}/${label}/${epoch}`);comparisons++;if(actual.error)throwingComparisons++;
  resultHash.update(JSON.stringify({parent,name,path,label,epoch:epoch??null,result:actual.error??(typeof actual.value==='string'?{sha256:hash(actual.value)}:{type:typeof actual.value,value:actual.value??null})})+'\n');
 }
}}
for(const {path,source}of inputs.values())for(const [label,value]of [['LF',source],['CRLF',source.replaceAll('\n','\r\n')],['trailing-byte drift',source+'\n'],['missing-first-byte drift',source.slice(1)]]){compare(path,value,label);if(label==='LF')compare('foreign-path',source,'foreign full source');}
for(const path of [...sourcePaths,'foreign-path','__proto__','constructor'])for(const [label,input]of [['null',null],['undefined',undefined],['number',17],['false',false],['object',{}]])compare(path,input,label);
// Direct bridge controls prevent real changes from becoming historical success.
const bridgeControls=[];
for(const [path,valid,project]of [[shape,read(shape),prePosix15ShapeSource],[timing,read(timing),preEncounterFormationCiSource]]){
 assert.notEqual(project(path,valid),valid);assert.equal(project(path,valid.replaceAll('\n','\r\n')),project(path,valid));
 const variants=[['trailing byte',valid+'\n'],['first byte missing',valid.slice(1)],['unknown path',valid,'foreign'],['prototype path',valid,'__proto__'],['null',null],['object',{}]];
 if(path===shape)variants.push(['Windows drift',valid.replace('length:17','length:18')],['POSIX drift',valid.replace('length:15','length:16')]);
 else {variants.push(['floor lowered',valid.replace('"durationMs": 17342','"durationMs": 17341')],['unknown cost lowered',valid.replace('"unknownJsMs": 10000','"unknownJsMs": 9999')]);const partial=JSON.parse(valid);delete partial.jsPlanning.localLowerBounds['tests/defect-final-execute.test.mjs'];variants.push(['older floor deleted',JSON.stringify(partial,null,2)+'\n']);}
 for(const [label,input,other]of variants){if(!other&&typeof input==='string')assert.notEqual(input,valid);assert.equal(project(other??path,input),input);bridgeControls.push(path+': '+label);}
}
const js=discoverJs().sort(),lua=readdirSync('tests/lua').filter(x=>x.endsWith('.lua')).map(x=>'tests/lua/'+x).sort();assert.equal(js.length,800);assert.equal(lua.length,1410);assert.equal(qualityShardMatrices.windows.length,17);assert.equal(qualityShardMatrices.posix.length,15);assert.equal(qualityShardJobs.length,32);assert.equal(currentFullQualityJobs.length,37);
const coverage=[];for(const [platform,count]of [['win32',17],['linux',15]]){const bins=Array.from({length:count},(_,i)=>jsShard(js,`${i+1}/${count}`,platform).files);assert.deepEqual(bins.flat().sort(),js);assert.equal(new Set(bins.flat()).size,800);coverage.push({kind:platform+' JS',count:800,bins:bins.map(x=>x.length)});}
const windowsLoads=jsShard(js,'1/17','win32').loads,windowsLua=Array.from({length:17},(_,i)=>shardLuaScripts(lua,`${i+1}/17`,{...timings,windowsJsShardMs:windowsLoads},2));assert.deepEqual(windowsLua.flat().sort(),lua);assert.equal(new Set(windowsLua.flat()).size,1410);coverage.push({kind:'Windows Lua',count:1410,bins:windowsLua.map(x=>x.length)});
const cost=f=>timings.luaShard[f]??timings.lua[f]??timings.unknownLuaMs,safety=f=>timings.lua[f]??timings.unknownLuaMs;
const combined=windowsLua.map((bin,i)=>{const pool=[0,0];for(const f of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(f);return windowsLoads[i]+bin.filter(f=>safety(f)>=10000).reduce((a,f)=>a+cost(f),0)+Math.max(...pool);});
const loads14=jsShard(js,'1/14','linux').loads,loads15=jsShard(js,'1/15','linux').loads;assert.equal(Math.max(...combined)+60000,1794163);assert.equal(Math.max(...loads14)+60000,1205156);assert.equal(Math.max(...loads15)+60000,1128812);assert.equal(loads14.reduce((a,b)=>a+b,0),16032072);assert.equal(loads15.reduce((a,b)=>a+b,0),16032072);
const historical=JSON.parse(preEncounterFormationCiSource(timing,read(timing))),historicJs=encounterFormationCiInventory.js;assert.equal(historicJs.length,797);assert.equal(Object.keys(historical.jsPlanning.localLowerBounds).length,30);assert.equal(Object.keys(timings.jsPlanning.localLowerBounds).length,32);
const historicalForecasts={};for(const count of [14,15]){const weights=Object.fromEntries(historicJs.map(f=>[f,Math.max(historical.js.linux[f]??historical.unknownJsMs,historical.jsPlanning.localLowerBounds[f]?.durationMs??0)]));const plan=partition(historicJs,`1/${count}`,weights,historical.unknownJsMs,Array.from({length:count},(_,i)=>i===0?historical.initialMs.linux[0]:0));historicalForecasts[count]=Math.max(...plan.loads)+60000;assert.equal(plan.loads.reduce((a,b)=>a+b,0),15994730);}assert.deepEqual(historicalForecasts,{14:1202485,15:1126323});
const withoutNew=structuredClone(timings);for(const [key,floor]of Object.entries(encounterFormationPlanningFloors)){assert.deepEqual(withoutNew.jsPlanning.localLowerBounds[key],floor);delete withoutNew.jsPlanning.localLowerBounds[key];}assert.deepEqual(withoutNew,historical);assert.equal(historical.jsPlanning.localLowerBounds['tests/defect-final-execute.test.mjs'].durationMs,89852);assert.equal(historical.jsPlanning.localLowerBounds['tests/defect-final-source-epoch.test.mjs'].durationMs,13784);
const fixture=(file,name,end)=>{const text=read(file),start=text.indexOf('function '+name+'(');assert.ok(start>=0);const stop=text.indexOf(end,start);assert.ok(stop>start);return Function('currentFullQualityJobs','fullQualityJobs','qualityWorkflowPath','sha','repo',text.slice(start,stop)+`;return ${name};`)(currentFullQualityJobs,fullQualityJobs,qualityWorkflowPath,c=>c.repeat(40),file.includes('merge-queue')?'FurinyaWorks/Slay-the-Abyss':'CHNISam/Slay-the-Abyss');};
const f=fixture('tests/full-quality.test.mjs','fixture',"test('"),q=fixture('tests/merge-queue.test.mjs','fixture',"test('"),m=fixture('tests/delivery.test.mjs','mergedEvidence','// GitHub rerun-failed');
const mutations={missing:e=>e.jobs=e.jobs.filter(j=>j.name!=='engineering-posix (15/15)'),extra:e=>e.jobs.push({...e.jobs.find(j=>j.name==='engineering-posix (15/15)'),id:9999,name:'engineering-posix (16/15)'}),old14:e=>{const example=e.jobs.find(j=>j.name.startsWith('engineering-posix ('));e.jobs=e.jobs.filter(j=>!j.name.startsWith('engineering-posix ('));e.jobs.push(...Array.from({length:14},(_,i)=>({...example,id:9000+i,name:`engineering-posix (${i+1}/14)`})));},wrongHead:e=>e.jobs.find(j=>j.name==='engineering-posix (15/15)').head_sha='f'.repeat(40),wrongRun:e=>e.jobs.find(j=>j.name==='engineering-posix (15/15)').run_id++,duplicate:e=>e.jobs.push({...e.jobs.find(j=>j.name==='engineering-posix (15/15)'),id:9999}),forgedCount:e=>{e.jobs=e.jobs.filter(j=>j.name!=='engineering-posix (15/15)');e.jobTotal=37;e.matrix={windows:17,posix:15};}};
for(const conclusion of ['failure','skipped','cancelled'])mutations[conclusion]=e=>e.jobs.find(j=>j.name==='engineering-posix (15/15)').conclusion=conclusion;
const validatorControls=[];for(const [name,make,check]of [['full',f,fullGateErrors],['merge-group',q,queueFullErrors],['delivery',()=>m(3).preflight,verifyDelivery],['merged-delivery',()=>m(3),e=>verifyMergedDelivery(e).errors]]){assert.deepEqual(check(make()),[],name+' positive');for(const [label,mutate]of Object.entries(mutations)){const e=make();mutate(e);const errors=check(e);assert.ok(errors.length,name+'/'+label);validatorControls.push({validator:name,mutation:label,errors});}}
const unchanged=['.github/workflows/quality.yml','.github/workflows/licenses.yml','scripts/ci-impact.mjs','scripts/ci-shards.mjs','scripts/test-lua.mjs','scripts/lua-workers.mjs','scripts/ci-timeout-policy.mjs','scripts/publish-full-quality.mjs','scripts/publish-merge-group.mjs','scripts/verify-delivery.mjs'];
for(const p of unchanged)assert.equal(read(p),git('show',parents.base+':'+p),p+' unchanged from common base');
const workflow=read('.github/workflows/quality.yml');assert.match(workflow,/max-parallel: 12/);assert.ok(workflow.includes("--workers ${{ inputs.runner_pool == 'local-special' && 1 || 2 }}"));assert.match(workflow,/timeout-minutes: \$\{\{ inputs.runner_pool == 'local-special' && 75 \|\| 45 \}\}/);assert.match(workflow,/runs-on: ubuntu-24.04\n    timeout-minutes: 30/);
const inputAfter=Object.fromEntries([...touched].sort().map(p=>[p,hash(readFileSync(p))]));assert.deepEqual(inputAfter,inputBefore,'no reviewed input changed during this probe');
const report={schemaVersion:1,reviewId:'Formation–POSIX15 independent merge review, 2026-11-09',conclusion:'PASS',scope:'Independent source preservation, three-way projection equivalence, planning and synthetic validator controls. Not hosted Full or actual execution of 800 JS/1410 Lua tests.',parents,parentTrees:Object.fromEntries(Object.entries(parents).map(([k,v])=>[k,git('rev-parse',v+'^{tree}').trim()])),executionHead:git('rev-parse','HEAD').trim(),executionTree:git('rev-parse','HEAD^{tree}').trim(),candidateCommitted:false,loaderProof,sourceProjection:{completeSourceInputs:[...inputs.values()].map(({path,source,origins})=>({path,sha256:hash(source),origins})),exportedFunctions:Object.keys(current).filter(k=>typeof current[k]==='function'),comparisons,throwingComparisons,resultSha256:resultHash.digest('hex'),bridgeControls,upstreamModules:[...upstream].sort(),sourceArchives:[...archives].sort()},coverage,budget:{reserveMs:60000,windowsTargetMs:1800000,posixTargetMs:1200000,windowsCurrentMs:Math.max(...combined)+60000,windowsHeadroomMs:1800000-Math.max(...combined)-60000,posix14CurrentMs:Math.max(...loads14)+60000,posix15CurrentMs:Math.max(...loads15)+60000,posixHeadroomMs:1200000-Math.max(...loads15)-60000,posixTotalWorkMs:16032072,prior797TotalWorkMs:15994730,addedWorkMs:37342,minRequiredPosixBins:Math.ceil(16032072/1140000),historic797Forecasts:historicalForecasts,loads14,loads15},validatorControls,unchangedExecutionContracts:unchanged.map(path=>({path,sha256:hash(readFileSync(path))})),beforeInputSha256:inputBefore,afterInputSha256:inputAfter,beforeAfterHashesMatched:true,limitations:['All probes read local source or use synthetic metadata. They do not certify actual GitHub jobs, hosted timing, current remote Rulesets or publication.','No complete test suite, production behavior, source epoch regression, CC collection or official runtime/device verification was reexecuted.','Final commit/tree attestation must independently bind this candidate after the coordinator commits; old parent green or failed results remain historical.']};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({conclusion:report.conclusion,completeSources:inputs.size,comparisons,bridgeControls:bridgeControls.length,validatorNegativeControls:validatorControls.length,inventory:{js:js.length,lua:lua.length},budget:report.budget,reviewedInputs:Object.keys(inputBefore).length,output},null,2));
