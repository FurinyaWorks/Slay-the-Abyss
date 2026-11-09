import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync}from'node:fs';import {join}from'node:path';import {tmpdir}from'node:os';
import {spawnSync}from'node:child_process';import {createHash}from'node:crypto';import luaparse from 'luaparse';
const path='src/lua/abyss_ending_history.lua';const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');const before=read('tests/fixtures/ending-terminal-before.lua');
function run(source,fixture){const dir=mkdtempSync(join(tmpdir(),'ending-terminal-responsibilities-'));try{
 const output=join(dir,'graphs.jsonl');const child=spawnSync(process.execPath,['tests/helpers/ending-terminal-vm.mjs'],{input:JSON.stringify({source,fixture,output}),encoding:'utf8',timeout:120000,maxBuffer:8*1024**2});
 assert.ifError(child.error);assert.equal(child.signal,null,'timeout is not a semantic mutant kill');assert.equal(child.status,0,child.stderr);
 return {...JSON.parse(child.stdout),graph:readFileSync(output,'utf8')};
}finally{rmSync(dir,{recursive:true,force:true});}}
test('complete ending history before source is the immutable 1eb2884 Git blob',()=>{
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before)}\0`).update(before).digest('hex'),'2bf97e45231cd57821a0fef3ec15e55f57671964');
});
for(const fixture of ['tests/helpers/ending-terminal-edges.lua','tests/lua/ending_history.lua','tests/lua/ending_history_host.lua'])test(`${fixture}: independent old/new complete graphs and original assertions`,()=>{
 const a=run(before,fixture),b=run(read(path),fixture);assert.equal(a.status,0,a.error);assert.equal(b.status,0,b.error);assert(b.checkpoints>0);
 assert.deepEqual(b.logs,a.logs);assert.deepEqual(b.labels,a.labels);assert.equal(b.graph,a.graph);
 console.log('ENDING_GRAPHS '+JSON.stringify({fixture,checkpoints:b.checkpoints,bytes:Buffer.byteLength(b.graph),logs:b.logs}));
});
for(const [name,from,to]of [
 ['registered run identity',"run.runSeed~=entry.seed","false"],
 ['terminal event completion',"flow.complete~=true","false"],
 ['boss result identity',"result.encounterId~=run.encounterId","false"],
 ['escaped enemies cannot win',"result.allEnemiesEscaped","false"],
 ['authenticated map signature',"flow.mapSignature~=map.sourceSignature","false"],
 ['authenticated map seed',"flow.mapSeed~=entry.seed","false"],
 ['current path endpoint',"map.path[#map.path]~=flow.id","false"],
 ['unique ending node',"return matches==1","return matches>=1"],
 ['ending node provenance',"node.roomKind~='ending'","false "],
 ['capture flow before identity reads',"local flow,result=run.nodeFlow,run.lastResult\n if not terminalRun(run,entry)then return false end", "if not terminalRun(run,entry)then return false end\n local flow,result=run.nodeFlow,run.lastResult"],
])test(`semantic mutant ${name} fails a named assertion, never timeout`,()=>{
 const source=read(path);assert(source.includes(from));const mutated=source.replaceAll(from,to);luaparse.parse(mutated,{luaVersion:'5.3'});
 const result=run(mutated,'tests/helpers/ending-terminal-edges.lua');assert.equal(result.status,2,result.error);
 assert.match(result.error,new RegExp('tests/helpers/ending-terminal-edges.lua:\\d+: '+name+'$'));
});
