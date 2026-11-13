import test from 'node:test';import assert from 'node:assert/strict';import{initial,play,endTurn}from './mechanics.mjs';import{createBattle,starterIds,useCard,playerView,previewVisible}from './battle.mjs';
const make=(ids,up)=>initial(ids.map((id,i)=>({id,instance:String(i),upgraded:up})),[{hp:1000,block:0}]);
for(const up of [false,true]){
 test('batch20 rearm exactly once, consumption power counted before refill '+up,()=>{let s=make(['KQ017','KQ026'],up);s.wedgeUntil=1;s.powers={wedgeBlock:2};s=play(s,'0',0);assert.equal(s.block,up?4:0);s=play(s,'1',0);assert.equal(s.wedgeUntil,2);assert.equal(s.rearmWedge,undefined);assert.equal(s.wedgePowerUsed,true);assert.equal(s.block,(up?4:0)+2);});
 test('batch20 discount pays zero only next attack not skill and does not stack '+up,()=>{let s=make(['KQ033','KQ002','KQ001'],up);s.wedgeUntil=2;s=play(s,'0',0);assert.equal(s.attackDiscount,1);assert.equal(s.wedgeUntil,null);s=play(s,'1',0);assert.equal(s.attackDiscount,1);const energy=s.energy;s=play(s,'2',0);assert.equal(s.energy,energy);assert.equal(s.attackDiscount,undefined);});
}
test('batch20 no resource no discount, cancel and expiry atomic',()=>{let s=make(['KQ033'],false);assert.equal(play(s,'0',0).attackDiscount,undefined);s.wedgeUntil=2;assert.deepEqual(play(s,'0',0,{cancel:true}),s);s=play(s,'0',0);assert.equal(endTurn(s).attackDiscount,undefined);});
test('batch20 full battle free attack at zero energy and visible cost agree',()=>{const s=createBattle({deckIds:[...starterIds,'KQ033'],order:[10,0,1,2,3,4,5,6,7,8,9]});s.wedgeUntil=2;let r=useCard(s,'starter-10',0);r.energy=0;const p=previewVisible(playerView(r),'starter-0',0),n=useCard(r,'starter-0',0);assert.equal(n.energy,0);assert.deepEqual(n.enemies,p.enemies);assert.equal(n.attackDiscount,undefined);});
test('batch20 full API rejects malformed single-use states atomically',()=>{
 for(const [key,values]of [['attackDiscount',[NaN,99,'1',null,-1]],['rearmWedge',['false',1,null,{}]]])for(const value of values){const s=createBattle();s[key]=value;const old=structuredClone(s);assert.throws(()=>useCard(s,s.hand[0].instance,0));assert.deepEqual(s,old);}
});
