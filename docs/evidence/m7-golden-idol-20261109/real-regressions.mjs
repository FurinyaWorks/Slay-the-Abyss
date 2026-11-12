import{readFileSync,mkdtempSync,rmSync,writeFileSync}from'node:fs';import{spawnSync}from'node:child_process';import{tmpdir}from'node:os';import{join}from'node:path';import assert from'node:assert/strict';
const before=readFileSync('tests/fixtures/golden-idol-before.lua','utf8'),current=readFileSync('src/lua/abyss_golden_idol_event.lua','utf8');const results=[];
for(const name of ['event','costs','rollback','rounding','channels','gold','natural','ui']){
 const fixture='tests/lua/golden_idol_'+name+'.lua';const logs=[];
 for(const[label,source]of[['before',before],['current',current]]){const tmp=mkdtempSync(join(tmpdir(),'golden-real-'));const start=performance.now();try{const run=spawnSync(process.execPath,['tests/helpers/golden-idol-vm.mjs'],{input:JSON.stringify({source,fixture,output:join(tmp,'graphs')}),encoding:'utf8',timeout:120000,maxBuffer:8*1024**2});assert.ifError(run.error);assert.equal(run.signal,null);assert.equal(run.status,0,run.stderr);const result=JSON.parse(run.stdout);assert.equal(result.status,0,result.error);logs.push(result.logs);results.push({fixture,label,durationMs:performance.now()-start,logs:result.logs});console.log(JSON.stringify(results.at(-1)));}finally{rmSync(tmp,{recursive:true,force:true});}}
 assert.deepEqual(logs[0],logs[1]);
}
writeFileSync('.artifacts/golden-idol/real-regressions.json',JSON.stringify(results,null,2)+'\n');
