import test from 'node:test';
import assert from 'node:assert/strict';
import { cards } from './mechanics.mjs';
import { starterIds,createBattle,useCard,finishTurn } from './battle.mjs';
import {rewardPool,acceptReward} from './rewards.mjs';
test('every implemented reward candidate is offered and appended, specification-only IDs excluded',()=>{
  assert.deepEqual(new Set(rewardPool),new Set(Object.keys(cards).filter(id=>cards[id].channel==='reward_candidate')));
  assert.equal(rewardPool.length,13);
  for(const id of rewardPool) {
    const other=rewardPool.find(x=>x!==id);
    const deck=acceptReward(starterIds,[id,other],id);
    assert.equal(deck.length,11);assert.equal(deck[10],id);
    let s=createBattle({deckIds:deck,order:[10,0,1,2,3,4,5,6,7,8,9],enemies:[{hp:1000,block:0,intent:0}]});
    assert.equal(s.hand[0].id,id); // declared order fixture, not a lucky seed
    s=useCard(s,'starter-10',0);
    assert.equal(s.discard.find(x=>x.instance==='starter-10').id,id);
    s=finishTurn(s);
    assert.equal(s.hand.length+s.draw.length+s.discard.length,11);
  }
  assert.ok(!rewardPool.includes('KQ011'));
  assert.throws(()=>acceptReward(starterIds,['KQ011','KQ005'],'KQ011'),/offer/);
});
