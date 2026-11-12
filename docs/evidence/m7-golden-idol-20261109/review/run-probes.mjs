import{readFileSync,writeFileSync}from'node:fs';import{spawnSync}from'node:child_process';import assert from'node:assert/strict';import{createHash}from'node:crypto';
const dir='.artifacts/golden-idol/review';let prev;
for(const [name,path]of [['old','tests/fixtures/golden-idol-before.lua'],['new','src/lua/abyss_golden_idol_event.lua']]){
 const output=`${dir}/${name}.jsonl`;const p=spawnSync(process.execPath,['tests/helpers/golden-idol-vm.mjs'],{input:JSON.stringify({source:readFileSync(path,'utf8'),fixture:`${dir}/adversarial.lua`,output}),encoding:'utf8',timeout:30000,maxBuffer:4000000});assert.equal(p.status,0,p.stderr);const result=JSON.parse(p.stdout);assert.equal(result.status,0,result.error);writeFileSync(`${dir}/${name}-result.json`,p.stdout);const bytes=readFileSync(output);if(prev)assert.deepEqual(bytes,prev);prev=bytes;console.log(name,result.checkpoints,createHash('sha256').update(bytes).digest('hex'));
}
