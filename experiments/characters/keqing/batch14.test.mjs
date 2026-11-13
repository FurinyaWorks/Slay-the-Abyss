import test from 'node:test';import assert from 'node:assert/strict';import{createBattle,starterIds,useCard,finishTurn}from './battle.mjs';
const make=(id,up)=>{const s=createBattle({deckIds:[...starterIds,id],order:[10,0,1,3,4,2,5,6,7,8,9],enemies:[{hp:1000,block:0,intent:0}]});s.hand[0].upgraded=up;return s;};
for(const up of [false,true])for(const id of ['KQ024','KQ040','KQ050'])test('batch14 selection and one-boundary retain '+id+' '+up,()=>{
 const s=make(id,up),keys=id==='KQ024'?['starter-0']:id==='KQ040'?['starter-3']:up?['starter-0','starter-3','starter-4']:['starter-0','starter-3'];
 const old=structuredClone(s),r=useCard(s,'starter-10',0,{retain:keys});assert.deepEqual(s,old);assert.deepEqual(useCard(s,'starter-10',0,{retain:keys,cancel:true}),s);
 assert.equal(r.hand.filter(c=>c.retainOnce).length,keys.length);const n=finishTurn(r);assert.equal(n.hand.length,keys.length+5);for(const k of keys)assert.ok(n.hand.some(c=>c.instance===k));assert.ok(n.hand.every(c=>c.retainOnce===undefined));assert.equal(n.infusion,0);const twice=finishTurn(n);assert.equal(twice.hand.length,5);assert.equal(twice.hand.length+twice.draw.length+twice.discard.length+twice.exhaust.length,11);
});
test('batch14 wrong type duplicate self missing overcount reject atomically',()=>{
 for(const [id,retain]of [['KQ024',['starter-3']],['KQ040',['starter-0']],['KQ050',['starter-0','starter-0']],['KQ050',['starter-10']],['KQ050',['absent']],['KQ024',['starter-0','starter-1']]]){const s=make(id,false),old=structuredClone(s);assert.throws(()=>useCard(s,'starter-10',0,{retain}),/retain/);assert.deepEqual(s,old);}
});
test('batch14 explicit empty choice is legal, does not manufacture retention',()=>{const s=make('KQ050',false),r=useCard(s,'starter-10',0,{retain:[]});assert.ok(r.hand.every(c=>!c.retainOnce));assert.equal(finishTurn(r).hand.length,5);});
test('retain chosen then played does not survive discard reshuffle or exhaust',()=>{
 let s=make('KQ024',false);s=useCard(s,'starter-10',0,{retain:['starter-0']});s=useCard(s,'starter-0',0);assert.ok(s.discard.every(c=>c.retainOnce===undefined));
 for(let i=0;i<8;i++){s=finishTurn(s);assert.equal(s.hand.length,5);assert.ok([...s.hand,...s.draw,...s.discard,...s.exhaust].every(c=>c.retainOnce===undefined));}
 let t=make('KQ040',false);t.exhaust.push(t.draw.pop());t.exhaust[0].retainOnce=true;t=finishTurn(t);assert.ok(t.exhaust.every(c=>c.retainOnce===undefined));
});
