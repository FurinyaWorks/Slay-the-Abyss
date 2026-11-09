import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=process.cwd(),base='fb04fd36ab4fbdba71c0da08bf71d2899143f69b';
const imp=p=>import(root+'/'+p),read=p=>readFileSync(p,'utf8'),hash=x=>createHash('sha256').update(x).digest('hex');
const {qualityShardMatrices,qualityShardJobs}=await imp('scripts/ci-quality-shape.mjs');
const {currentFullQualityJobs,fullQualityJobs,qualityWorkflowPath,verifyDelivery,verifyMergedDelivery}=await imp('scripts/verify-delivery.mjs');
const {fullGateErrors}=await imp('scripts/publish-full-quality.mjs');
const {queueFullErrors}=await imp('scripts/publish-merge-group.mjs');
const {discoverJs,jsShard,timings}=await imp('scripts/ci-shards.mjs');
const {shardLuaScripts}=await imp('scripts/test-lua.mjs');
assert.equal(qualityShardMatrices.posix.length,15);assert.equal(qualityShardMatrices.windows.length,17);assert.equal(qualityShardJobs.length,32);assert.equal(currentFullQualityJobs.length,37);
const js=discoverJs(),lua=readdirSync('tests/lua').filter(x=>x.endsWith('.lua')).map(x=>'tests/lua/'+x);
assert.equal(js.length,797);assert.equal(lua.length,1410);
const coverage=[];
for(const [name,files,count,fn] of [['windows-js',js,17,(x,s)=>jsShard(x,s,'win32').files],['posix-js',js,15,(x,s)=>jsShard(x,s,'linux').files],['windows-lua',lua,17,(x,s)=>shardLuaScripts(x,s,timings,2)]]) {
 const bins=Array.from({length:count},(_,i)=>fn(files,`${i+1}/${count}`)),flat=bins.flat();assert.equal(new Set(flat).size,flat.length);assert.deepEqual(flat.sort(),[...files].sort());coverage.push({name,files:files.length,bins:bins.map(x=>x.length)});
}
function fixture(file,name,end){const source=read(file),part=source.slice(source.indexOf('function '+name+'('),source.indexOf(end,source.indexOf('function '+name+'(')));return Function('currentFullQualityJobs','fullQualityJobs','qualityWorkflowPath','sha','repo',part+`;return ${name};`)(currentFullQualityJobs,fullQualityJobs,qualityWorkflowPath,c=>c.repeat(40),file.includes('merge-queue')?'FurinyaWorks/Slay-the-Abyss':'CHNISam/Slay-the-Abyss');}
const f=fixture('tests/full-quality.test.mjs','fixture',"test('"),q=fixture('tests/merge-queue.test.mjs','fixture',"test('"),m=fixture('tests/delivery.test.mjs','mergedEvidence','// GitHub rerun-failed');
const controls=[];
const mutations={missing:e=>e.jobs=e.jobs.filter(j=>j.name!=='engineering-posix (15/15)'),extra:e=>e.jobs.push({...e.jobs.find(j=>j.name==='engineering-posix (15/15)'),id:9999,name:'engineering-posix (16/15)'}),old14:e=>{const example=e.jobs.find(j=>j.name.startsWith('engineering-posix ('));e.jobs=e.jobs.filter(j=>!j.name.startsWith('engineering-posix ('));e.jobs.push(...Array.from({length:14},(_,i)=>({...example,id:9000+i,name:`engineering-posix (${i+1}/14)`})));},oldSHA:e=>e.jobs.find(j=>j.name==='engineering-posix (15/15)').head_sha='f'.repeat(40),duplicate:e=>e.jobs.push({...e.jobs.find(j=>j.name==='engineering-posix (15/15)'),id:9999})};
for(const conclusion of ['failure','skipped','cancelled'])mutations[conclusion]=e=>e.jobs.find(j=>j.name==='engineering-posix (15/15)').conclusion=conclusion;
for(const [name,make,check] of [['full',f,fullGateErrors],['merge-group',q,queueFullErrors],['delivery',()=>m(3).preflight,verifyDelivery],['merged-delivery',()=>m(3),e=>verifyMergedDelivery(e).errors]]){
 assert.deepEqual(check(make()),[],name+' positive');for(const [caseName,mutate] of Object.entries(mutations)){const e=make();mutate(e);assert.ok(check(e).length,name+'/'+caseName);controls.push(name+'/'+caseName);}
}
const unchanged=['.github/workflows/quality.yml','scripts/ci-impact.mjs','scripts/ci-shards.mjs','scripts/test-lua.mjs','scripts/ci-test-timings.json','scripts/ci-timeout-policy.mjs','scripts/publish-full-quality.mjs','scripts/publish-merge-group.mjs','scripts/verify-delivery.mjs'];
const unchangedProof=unchanged.map(path=>{const before=execFileSync('git',['show',base+':'+path]);const after=readFileSync(path);assert.ok(before.equals(after),path+' must remain byte-identical');return {path,sha256:hash(after),byteIdenticalToBase:true};});
const loads14=jsShard(js,'1/14','linux').loads,loads15=jsShard(js,'1/15','linux').loads;
assert.equal(loads14.reduce((a,b)=>a+b,0),15994730);assert.equal(Math.max(...loads15)+60000,1126323);
// Inputs are resolved from the repository root; output is a separate local build artifact.
const args=process.argv.slice(2);
assert.ok(args.length===0||(args.length===2&&args[0]==='--output'),'Usage: node docs/evidence/m7-defect-cost-20261109/independent-reproduce.mjs [--output build/result.json]');
const output=resolve(args[1]??'build/m7-defect-cost-independent-review.json');
const reviewed=JSON.parse(readFileSync(new URL('./independent-review.json',import.meta.url),'utf8'));
assert.notEqual(output,fileURLToPath(new URL('./independent-review.json',import.meta.url)),'do not overwrite the committed review receipt');
for(const binding of reviewed.reviewedFiles)assert.equal(hash(readFileSync(binding.path)),binding.sha256,binding.path+' exact reviewed candidate');
const history=await (async()=>{
const {prePosix15ShapeSource:project,posix15ShapeProof:proof}=await import(process.cwd()+'/tests/helpers/posix15-shape-source-inverse.mjs');
const path='scripts/ci-quality-shape.mjs',source=readFileSync(path,'utf8'),base=execFileSync('git',['show','fb04fd36ab4fbdba71c0da08bf71d2899143f69b:'+path],{encoding:'utf8'});
assert.equal(proof.beforeSource,base);assert.equal(proof.afterSource,source);assert.equal(project(path,source),base);assert.equal(project(path,source.replaceAll('\n','\r\n')),base);
const mutations=[source+'\n',source.slice(1),source.replace('length:17','length:18'),source.replace('length:15','length:16'),undefined,null,{},42,base];for(const mutated of mutations)assert.equal(project(path,mutated),mutated);
assert.equal(project('scripts/ci-test-timings.json',source),source);
const originalPaths=execFileSync('git',['ls-tree','-r','--name-only','fb04fd36ab4fbdba71c0da08bf71d2899143f69b','--','tests/fixtures','docs/evidence','src/lua','scripts/ci-test-timings.json'],{encoding:'utf8'}).trim().split('\n');
for(const original of originalPaths){const before=execFileSync('git',['show','fb04fd36ab4fbdba71c0da08bf71d2899143f69b:'+original],{maxBuffer:64*1024*1024});assert.ok(before.equals(readFileSync(original)),original+' original bytes preserved');}
const loads=15994730;assert.ok(loads>14*(1200000-60000));
const result={historicalSourceExactBase:true,authenticatedProjection:true,negativeProjectionControls:10,oldHistoricalFixturesAndEvidenceUnchanged:true,productionLuaUnchanged:true,minimalBinsProof:{sumMs:loads,perBinAvailableMs:1140000,minimumBins:Math.ceil(loads/1140000),fourteenBinDeficitMs:loads-14*1140000}};return result;
})();
const report={schemaVersion:1,baseSHA:base,reviewedCandidate:reviewed.reviewedFiles,executionHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),conclusion:'pass',unresolved:[],coverage,negativeControls:controls,unchangedProof,history,budget:{reserveMs:60000,targetMs:1200000,old14Loads:loads14,new15Loads:loads15,newPeakWithReserveMs:Math.max(...loads15)+60000,headroomMs:1200000-Math.max(...loads15)-60000},limitations:reviewed.limitations};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({conclusion:report.conclusion,validatorNegativeControls:controls.length,projectionNegativeControls:history.negativeProjectionControls,output},null,2));
