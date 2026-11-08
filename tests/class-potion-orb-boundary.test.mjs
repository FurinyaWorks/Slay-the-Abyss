import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {baselineSources,potionVm} from './helpers/class-potion-orb-vm.mjs';
import {analyzeSources} from '../scripts/check-architecture.mjs';
import {discoverSources} from '../scripts/lua-quality-metrics.mjs';

test('class potion baseline binds all changed sources to exact develop blobs',()=>{
 const expected={'config/architecture.json':'d572702dc8966a1770c1c6dab67ef947e563afb8','src/lua/abyss_card_actions.lua':'a279470d0af187e7409594923aec828835166319','src/lua/abyss_class_potions.lua':'f3e45adba8610444840a2a0989a7014279778dd9','src/lua/abyss_combat_effect_dispatch.lua':'1902267938f41dc627116d5d009b0048adf1b9bd'};
 assert.deepEqual(Object.keys(baselineSources()).sort(),Object.keys(expected).sort());
 for(const [file,source]of Object.entries(baselineSources())){
  const blob=createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex');
  assert.equal(blob,expected[file],file);
 }
});

test('class potion policy has no direct or deferred route to the execution owners',()=>{
 const sources=discoverSources();
 const report=analyzeSources(Object.fromEntries(Object.entries(sources).map(([file,source])=>[file.split('/').at(-1).slice(0,-4),source])),JSON.parse(readFileSync('config/architecture.json','utf8')));
 assert.deepEqual(report.errors,[]);
 const edges=new Map();for(const e of report.edges){if(!edges.has(e.from))edges.set(e.from,new Set());edges.get(e.from).add(e.to);}
 const seen=new Set(),queue=['abyss_class_potions'];
 for(const owner of queue)if(!seen.has(owner)){seen.add(owner);queue.push(...(edges.get(owner)||[]));}
 for(const owner of ['abyss_orbs','abyss_actor','abyss_combat','abyss_card_actions','abyss_combat_effect_dispatch'])assert(!seen.has(owner),owner);
 assert(edges.get('abyss_card_actions').has('abyss_orbs'));
 assert(edges.get('abyss_combat_effect_dispatch').has('abyss_orbs'));
 assert(Object.keys(sources).length>300,'complete source inventory');
});

for(const name of readdirSync('tests/lua').filter(n=>/^class_potion_.*\.lua$/.test(n)).sort())test(`unchanged ${name} assertions and complete state graphs match both VMs`,()=>{
 const fixture='tests/lua/'+name;
 const before=potionVm({before:true,fixture}),after=potionVm({fixture});
 assert.equal(before.status,0,before.error);assert.equal(after.status,0,after.error);
 assert(before.graphs.length>0,'real owner checkpoints');assert.deepEqual(after.graphs,before.graphs);
});

test('Orb host remains lazy and preserves raw thrown objects and return arity',()=>{
 const result=potionVm({body:`
 local P=require('abyss_class_potions')
 local calls=0;local failure={kind='orb host failed'}
 local function host()calls=calls+1;error(failure)end
 local combat={applyEffects=function()end,resolvePotionActions=function()end}
 local state={player={}}
 for _,effect in ipairs({{kind='focus',value=2},{kind='miracle',value=2},{kind='divinity',value=0},{kind='stance',value=0}})do
  assert(select('#',P.apply(combat,state,effect,host))==0)
 end
 assert(calls==0)
 assert(not pcall(P.apply,combat,state,{kind='capacity',value=3},host));assert(calls==0)
 local ok,why=pcall(P.apply,combat,state,{kind='capacity',value=2},host)
 assert(not ok and why==failure and calls==1)
 state.orbs={};P.apply(combat,state,{kind='darkness',value=1},host);assert(calls==1)
 state.orbs=nil;ok,why=pcall(P.apply,combat,state,{kind='darkness',value=1},host)
 assert(not ok and why==failure and calls==2)
 ok,why=pcall(P.darkness,combat,state,{kind='bad'},nil,host)
 assert(not ok and why==failure and calls==3)
 `});assert.equal(result.status,0,result.error);
});

test('actual missing-capability mutation is rejected by the existing gameplay contract',()=>{
 const file='src/lua/abyss_card_actions.lua',source=readFileSync(file,'utf8');
 const old='item.effect,classPotionOrbHost)',replacement='item.effect,nil)';
 assert.equal(source.split(old).length,2);
 const result=potionVm({fixture:'tests/lua/class_potion_focus_capacity.lua',replace:{[file]:source.replace(old,replacement)}});
 assert.notEqual(result.status,0);assert.equal(result.error,'tests/lua/class_potion_focus_capacity.lua:23: potion_effect_failed');
});
