import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync}from'node:fs';import {join}from'node:path';import {tmpdir}from'node:os';
import {spawnSync}from'node:child_process';import {createHash}from'node:crypto';import luaparse from 'luaparse';
const path='src/lua/abyss_treasure_source.lua',fixture='tests/helpers/treasure-source-edges.lua';
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n'),before=read('tests/fixtures/treasure-source-before.lua');
function run(source){const dir=mkdtempSync(join(tmpdir(),'treasure-source-responsibilities-'));try{
 const output=join(dir,'graphs.jsonl');const child=spawnSync(process.execPath,['tests/helpers/treasure-source-vm.mjs'],{input:JSON.stringify({source,fixture,output}),encoding:'utf8',timeout:120000,maxBuffer:8*1024**2});
 assert.ifError(child.error);assert.equal(child.signal,null,'timeout is not a semantic mutant kill');assert.equal(child.status,0,child.stderr);
 return {...JSON.parse(child.stdout),graph:readFileSync(output,'utf8')};
}finally{rmSync(dir,{recursive:true,force:true});}}
test('complete TreasureSource predecessor is the immutable develop Git blob',()=>{
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before)}\0`).update(before).digest('hex'),'59c934e1dcf59569f9d8152506aa963e2d601bba');
});
test('independent old/new VMs preserve complete reward graphs, signatures, aliases, rejection order and return arity',()=>{
 const a=run(before),b=run(read(path));assert.equal(a.status,0,a.error);assert.equal(b.status,0,b.error);assert(b.checkpoints>0);
 assert.deepEqual(b.logs,a.logs);assert.deepEqual(b.labels,a.labels);assert.equal(b.graph,a.graph);
 console.log('TREASURE_SOURCE_GRAPHS '+JSON.stringify({checkpoints:b.checkpoints,bytes:Buffer.byteLength(b.graph),logs:b.logs}));
});
for(const [name,from,to]of [
 ['duplicate slots rejected',"not item(row)or slots[row.slot]","not item(row)"],
 ['duplicate gold rejected',"if gold then return nil,nil,nil,nil,'treasure_reward_shape_unsupported'end","if false then return nil,nil,nil,nil,'treasure_reward_shape_unsupported'end"],
 ['duplicate sapphire rejected',"if key then return nil,nil,nil,nil,'treasure_reward_shape_unsupported'end","if false then return nil,nil,nil,nil,'treasure_reward_shape_unsupported'end"],
 ['duplicate base rejected',"if base then return nil,nil,nil,nil,'treasure_reward_shape_unsupported'end","if false then return nil,nil,nil,nil,'treasure_reward_shape_unsupported'end"],
 ['boss refusal precedes linked identity',"row.origin=='boss'","false "],
 ['base links sapphire slot',"base.linkedSlot~=key.slot","false "],
 ['sapphire links base slot',"key.linkedSlot~=base.slot","false "],
 ['availability identity preserved',"reward.relicUnavailable~=not base.available","false "],
 ['root sapphire identity preserved',"reward.sapphireKey.slot~=key.slot","false "],
 ['gold amount identity preserved',"reward.gold~=(gold and gold.amount or nil)","false "],
 ['extra canonical identity preserved',"canonical(row)~=canonical(extra[i])","false "],
 ['relic trace shape validated',"and trace(row.trace)","and true"],
 ['relic requested source validated',"and type(row.requestedId)=='string'","and true"],
 ['unexpected extra list rejected',"elseif reward.extraRelics~=nil then return false end","elseif false then return false end"],
])test(`semantic mutant ${name} fails a named assertion, never timeout`,()=>{
 const source=read(path);assert.equal(source.split(from).length,2);const mutated=source.replace(from,to);luaparse.parse(mutated,{luaVersion:'5.3'});
 const result=run(mutated);assert.equal(result.status,2,result.error);
 assert.match(result.error,new RegExp('tests/helpers/treasure-source-edges.lua:\\d+: '+name+'$'));
});
