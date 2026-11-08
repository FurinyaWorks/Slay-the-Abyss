import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildLuaData} from '../scripts/build-lua-data.mjs';
import {equipVm} from './helpers/relic-equip-vm.mjs';
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const before=read('tests/fixtures/relic-equip-before.lua'),current=read('src/lua/abyss_relic_hooks.lua');
buildLuaData('data','build/relic-equip-evidence/abyss_data.lua');
test('onEquip freezes complete cbabad34 source and Git blob identity',()=>{
 assert.equal(createHash('sha256').update(before).digest('hex'),'ef04341232f139d6e60a7bb5e0595a65dd9487fe63b2a88f41012eab2f79c85e');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before)}\0`).update(before).digest('hex'),'8a56442723f77b72cc3bd081a38742dc07292a00');
 assert.equal(current.slice(0,current.indexOf('-- Admission is deliberately ordered:')),before.slice(0,before.indexOf('function M.onEquip(')));
 assert.equal(current.slice(current.indexOf('function M.onUnequip(')),before.slice(before.indexOf('function M.onUnequip(')));
});
for(const group of ['ordinary','upgrades','dynamic','integration'])test(`onEquip independent full graph VM differential: ${group}`,t=>{
 const old=equipVm(before,group),actual=equipVm(current,group);
 assert.equal(old.status,0,old.error);assert.equal(actual.status,0,actual.error);
 assert.ok(old.graphs.length>=9,'scenario matrix executed');assert.deepEqual(actual.graphs,old.graphs);
 assert.equal(actual.rawErrors.length,old.rawErrors.length);
 t.diagnostic(JSON.stringify({group,checkpoints:actual.graphs.length,errors:actual.rawErrors.length,graphBytes:JSON.stringify(actual.graphs).length}));
});
const mutations=[
 ['counter-value','ordinary',s=>s.replace("counters(run).omamori=2","counters(run).omamori=1").replace('omamori=2,maw_bank','omamori=1,maw_bank'),'counter value'],
 ['potion-capacity','ordinary',s=>s.replace('run.potionSlots=slots+2','run.potionSlots=slots+1'),'capacity delta'],
 ['boss-nil-admission','dynamic',s=>s.replace('if not ok then return false,why end','if ok==false then return false,why end'),'admission stops'],
 ['egg-claimed','dynamic',s=>s.replace('if not reward.claimed then','if reward.claimed then'),'claimed skipped'],
 ['upgrade-rng','upgrades',s=>s.replace('S.shuffle(run.miscRng,eligible)','-- removed shuffle'),'shuffle consumption'],
];
for(const [version,source]of [['before',before],['current',current]])for(const [name,group,mutate,message]of mutations)test(`onEquip real semantic negative control ${version}/${name}`,()=>{
 const mutant=mutate(source);assert.notEqual(mutant,source);const result=equipVm(mutant,group);assert.notEqual(result.status,0);assert.ok(result.error.includes('[RELIC_EQUIP]')&&result.error.includes(message),result.error);
});
