import{readFileSync,writeFileSync,mkdtempSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{spawnSync}from'node:child_process';import assert from'node:assert/strict';
const before=readFileSync('tests/fixtures/treasure-source-before.lua','utf8'),current=readFileSync('src/lua/abyss_treasure_source.lua','utf8'),rows=[];
for(const fixture of ['tests/lua/source_treasure_token.lua','tests/lua/source_treasure_nodes.lua','tests/lua/source_treasure_owner_guards.lua','tests/lua/sapphire_current_relics.lua']){
 const dir=mkdtempSync(join(tmpdir(),'treasure-original-')),out=[];
 try{for(const[version,source]of[['before',before],['current',current]]){
  const output=join(dir,version+'.jsonl'),start=performance.now(),r=spawnSync(process.execPath,['tests/helpers/treasure-source-vm.mjs'],{input:JSON.stringify({source,fixture,output}),encoding:'utf8',timeout:180000,maxBuffer:16*1024**2});
  assert.ifError(r.error);assert.equal(r.status,0,r.stderr);const result=JSON.parse(r.stdout);assert.equal(result.status,0,result.error);const graph=readFileSync(output,'utf8');out.push({result,graph});
  const row={fixture,version,wallMs:performance.now()-start,checkpoints:result.checkpoints,bytes:Buffer.byteLength(graph),logs:result.logs};rows.push(row);console.log(JSON.stringify(row));
 }assert.equal(out[0].graph,out[1].graph,fixture+' graphs');assert.deepEqual(out[0].result.logs,out[1].result.logs,fixture+' logs');}finally{rmSync(dir,{recursive:true,force:true});}
}writeFileSync('.artifacts/treasure-source/originals-results.json',JSON.stringify(rows,null,2)+'\n');
