import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync}from'node:fs';import {join}from'node:path';import {tmpdir}from'node:os';
import {spawnSync}from'node:child_process';import {createHash}from'node:crypto';import luaparse from 'luaparse';
const path='src/lua/abyss_encounter_formation.lua';const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');const before=read('tests/fixtures/encounter-formation-before.lua');
function run(source,fixture){const dir=mkdtempSync(join(tmpdir(),'formation-responsibilities-'));try{
 const output=join(dir,'graphs.jsonl');const child=spawnSync(process.execPath,['tests/helpers/encounter-formation-vm.mjs'],{input:JSON.stringify({source,fixture,output}),encoding:'utf8',timeout:120000,maxBuffer:8*1024**2});
 assert.ifError(child.error);assert.equal(child.signal,null,'timeout is not a semantic mutant kill');assert.equal(child.status,0,child.stderr);
 return {...JSON.parse(child.stdout),graph:readFileSync(output,'utf8')};
}finally{rmSync(dir,{recursive:true,force:true});}}
test('complete formation before source is the immutable fb04fd36 Git blob',()=>{
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before)}\0`).update(before).digest('hex'),'ca421d599f10c7c6271a03b4083924203733edfb');
});
for(const fixture of ['tests/helpers/encounter-formation-edges.lua','tests/lua/encounter_formations.lua'])test(`${fixture}: independent old/new complete graphs and original assertions`,()=>{
 const a=run(before,fixture),b=run(read(path),fixture);assert.equal(a.status,0,a.error);assert.equal(b.status,0,b.error);assert(b.checkpoints>0);
 assert.deepEqual(b.logs,a.logs);assert.deepEqual(b.labels,a.labels);assert.equal(b.graph,a.graph);
 console.log('FORMATION_GRAPHS '+JSON.stringify({fixture,checkpoints:b.checkpoints,bytes:Buffer.byteLength(b.graph),logs:b.logs}));
});
for(const [name,from,to]of [
 ['fixed formation positions',"make('jaw_worm_hard',-490,-5)","make('jaw_worm_hard',-491,-5)"],
 ['shapes draw without replacement','table.remove(pool,integer(#pool-1))','pool[integer(#pool-1)]'],
 ['leader draws with replacement',"make(pool[integer(7)],-170,6)","make(pool[integer(7)%8+1],-170,6)"],
 ['gang pool endpoints',"elseif source=='Gremlin Gang'then\n   local pool={'mad_gremlin','mad_gremlin','sneaky_gremlin','sneaky_gremlin','fat_gremlin','fat_gremlin','shield_gremlin','wizard_gremlin'}","elseif source=='Gremlin Gang'then\n   local pool={'mad_gremlin','mad_gremlin','sneaky_gremlin','sneaky_gremlin','fat_gremlin','fat_gremlin','shield_gremlin','mad_gremlin'}"],
 ['independent louse colors',"make(boolean() and 'red_louse' or 'green_louse',x,y)","make(boolean() and 'green_louse' or 'red_louse',x,y)"],
 ['complementary slime sizes',"make('spike_slime_s',-230,32)","make('acid_slime_s',-230,32)"],
 ['large slime color',"make(boolean() and 'acid_slime_l' or 'spike_slime_l',0,0)","make(boolean() and 'spike_slime_l' or 'acid_slime_l',0,0)"],
 ['eager candidates retain selected aliases',"return candidates[integer(2)]","return candidates[1+((integer(2))%3)]"],
 ['visual offset float32','return f32(base+f32(value))','return base+f32(value)'],
 ['full formation returned','\n return result\n',"\n if source=='Lots of Slimes'then table.remove(result)end\n return result\n"],
 ['dynamic admission rejects unknown',"assert(M.supports(source),'unsupported source formation: '..tostring(source))","assert(true,'unsupported source formation: '..tostring(source))"],
])test(`semantic mutant ${name} fails a named assertion, never timeout`,()=>{
 const source=read(path);assert(source.includes(from));const mutated=source.replaceAll(from,to);luaparse.parse(mutated,{luaVersion:'5.3'});
 const result=run(mutated,'tests/helpers/encounter-formation-edges.lua');assert.equal(result.status,2,result.error);
 assert.match(result.error,new RegExp('tests/helpers/encounter-formation-edges.lua:\\d+: '+name+'$'));
});
