import test from 'node:test';import assert from 'node:assert/strict';
import {battleStart,visibleState} from './battle.mjs';import {choose,visibleTurn} from './pressure.mjs';
test('planner stops at hidden draw, reobserves newly visible hand, and never reads hidden getters',()=>{
 const s=battleStart({deck:['zl12','zl01']});const drawKey=Object.keys(s.instances).find(k=>s.instances[k].id==='zl12'),attack=Object.keys(s.instances).find(k=>k!==drawKey);
 s.hand=[drawKey];s.draw=[attack];s.discard=[];
 const view=visibleState(s,[8]);for(const key of ['draw','rng','discard'])Object.defineProperty(view,key,{get(){throw new Error('hidden access');}});
 assert.deepEqual(choose(view,'defense'),[drawKey]);
 const result=visibleTurn(s,[8],'defense');assert.deepEqual(result.actions.map(a=>a.id),['zl12','zl01']);assert.equal(result.state.energy,1);assert.equal(result.state.enemy.hp,34);
});
test('policy projection recognizes counter-kill stopping a later lethal hit',()=>{
 const s=battleStart({deck:['zl15','zl02']});s.jade=0;s.hp=5;s.enemy.hp=3;
 const view=visibleState(s,[0,99]);const key=view.hand.find(c=>c.id==='zl15').instance;
 assert.equal(choose(view,'defense')[0],key);
});
test('one-shot access policy stops before hidden draw and resolves actual fresh hand',()=>{
 const s=battleStart({deck:['zl19','zl01'],relic:false});const key=Object.keys(s.instances).find(k=>s.instances[k].id==='zl19'),attack=Object.keys(s.instances).find(k=>k!==key);s.hand=[key];s.draw=[attack];s.discard=[];
 const view=visibleState(s,[8]);for(const hidden of ['draw','rng','discard'])Object.defineProperty(view,hidden,{get(){throw new Error('hidden access');}});
 assert.deepEqual(choose(view,'defense'),[key]);const result=visibleTurn(s,[8],'defense');assert.deepEqual(result.actions.map(a=>a.id),['zl19','zl01']);assert.equal(result.state.energy,0);assert.deepEqual(result.state.exhaust,[key]);
});
test('visible policy projects owner-end pillar kill before incoming lethal without future information',()=>{
 const s=battleStart({deck:['zl21']});s.hp=1;s.jade=0;s.enemy.hp=3;const v=visibleState(s,[99]);for(const hidden of ['rng','draw'])Object.defineProperty(v,hidden,{get(){throw new Error('hidden');}});assert.deepEqual(choose(v,'defense'),[s.hand[0]]);
});

test('zero-energy reserve then strike is finite and planner cannot repeat exhausted instances',()=>{
 const s=battleStart({deck:['zl38','zl39'],relic:false});s.energy=0;
 const gain=Object.keys(s.instances).find(k=>s.instances[k].id==='zl38');s.instances[gain].upgraded=true;
 const result=visibleTurn(s,[],'offense');assert.deepEqual(result.actions.map(a=>a.id),['zl38','zl39']);assert.equal(result.state.energy,0);assert.equal(result.state.enemy.hp,34);assert.equal(result.state.exhaust.length,2);assert.equal(result.state.hand.length,0);
});
