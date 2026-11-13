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
