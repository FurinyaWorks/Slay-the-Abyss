-- ACCEPTANCE SPEC: requires shared Xiao opt-in gate/dispatch. Not yet executed.
-- Do not replace public C.play with a fixture when the shared gate is absent.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua')
local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Bridge=require('abyss_xiao_play_bridge')
local Dispatch=require('abyss_xiao_dispatch')
local function fresh(id,up,enemies)
 local data=C.copy(D)
 for _,def in ipairs(Bridge.definitions())do
  if def.id=='xiao_candidate_x01'or def.id=='xiao_candidate_x04'then
   def.rarity='special';def.color='colorless';data.cards.cards[#data.cards.cards+1]=def
  end
 end
 local deck={};for i=1,8 do deck[i]={cardId=id,upgraded=up}end
 local s=C.new(data,{deck=deck,enemies=enemies or {'jaw_worm'},seed=11,candidateLifecycle={kind='xiao',relicEnabled=true}})
 assert(s.xiao,'shared Xiao opt-in initialization is required')
 s.player.hp=70;s.player.maxHp=70;s.enemies[1].hp=100;s.enemies[1].maxHp=100
 return s
end
for _,up in ipairs({false,true})do
 local s=fresh('xiao_candidate_x01',up);local card=s.hand[1];local energy=s.energy;local before=C.copy(s)
 eq(C.play(s,card.uid,999),false);same(s,before)
 eq(C.play(s,999999,1),false);same(s,before)
 s.energy=0;before=C.copy(s);eq(C.play(s,card.uid,1),false);same(s,before);s.energy=energy
 assert(C.play(s,card.uid,1));eq(s.energy,energy-1);eq(s.enemies[1].hp,up and 91 or 94)
 eq(s.pendingPlay,nil);eq(s.cardInUse,nil);eq(s.discard[#s.discard],card)
 before=C.copy(s);eq(C.play(s,card.uid,1),false);same(s,before)
 local n=fresh('xiao_candidate_x04',up);local entry=n.hand[1];local handCount=#n.hand;local cost=n.energy
 n.player.hp=2;before=C.copy(n);eq(C.play(n,entry.uid,1),false);same(n,before)
 n.player.hp=70;assert(C.play(n,entry.uid,1));eq(n.energy,cost-1);eq(n.player.hp,68)
 eq(n.player.statuses.xiao_mask,up and 3 or 2);eq(n.xiao.relicUsed,true);eq(#n.hand,handCount)
 eq(n.discard[#n.discard],entry);eq(n.pendingPlay,nil);eq(n.cardInUse,nil)
 local second=n.hand[1];assert(C.play(n,second.uid,1));eq(n.player.hp,66);eq(#n.hand,handCount-1)
end
print('PASS PUBLIC Xiao x01/x04 payment life UID target discard and relic-once')
-- Inject only a failure AFTER the actual registered adapter ran. No replacement
-- implementation of play, schema, registration or payment is supplied here.
for _,up in ipairs({false,true})do
 local s=fresh('xiao_candidate_x04',up);local card=s.hand[1];local hand=s.hand;local player=s.player;local resource=s.xiao;local before=C.copy(s)
 local original=Dispatch.dispatch;local reached=false
 Dispatch.dispatch=function(combat,state,effect,queue)
  local result=original(combat,state,effect,queue)
  if effect.kind=='maskCommit'then reached=true;error('public post-mask fault')end
  return result
 end
 local ok=pcall(C.play,s,card.uid,1);Dispatch.dispatch=original
 assert(not ok and reached,'public gate must call the actual adapter before injected failure')
 same(s,before);eq(s.hand,hand);eq(s.player,player);eq(s.xiao,resource);eq(s.hand[1],card)
 assert(C.play(s,card.uid,1));eq(s.player.hp,68)
end
print('PASS PUBLIC Xiao host command restores paid card HP mask and references after adapter failure')
local Stage=require('abyss_xiao_paid_cards');local CardActions=require('abyss_card_actions')
-- Shared automatic gate rejects native bypass, missing marker and HP admission.
for _,id in ipairs({'xiao_candidate_x01','xiao_candidate_x04'})do
 for _,mode in ipairs({'normal','native','unmarked','lowHP'})do
  local s=fresh(id,false);local c=table.remove(s.hand,1);local energy=s.energy
  if mode=='native'then s.catalog.cards[id].silentFinalCard=true
  elseif mode=='unmarked'then s.catalog.cards[id].xiaoCandidate=nil
  elseif mode=='lowHP'then s.player.hp=2 end
  local hp=s.player.hp
  C.queueCard(s,c,{targetIndex=1,exhaustCards=false});CardActions.drain(C,s)
  eq(s.energy,energy)
  local accepted=mode=='normal'or mode=='lowHP'and id=='xiao_candidate_x01'
  eq(s.enemies[1].hp,accepted and id=='xiao_candidate_x01'and 94 or 100)
  eq(s.player.hp,accepted and id=='xiao_candidate_x04'and hp-2 or hp)
  eq(s.xiao.relicUsed,accepted and id=='xiao_candidate_x04')
  eq(s.discard[#s.discard],c)
 end
end
-- Real Scry selection inserted by the test between HP payment and mask commit.
do
 local s=fresh('xiao_candidate_x04',true);local c=s.hand[1];local energy=s.energy
 local dispatch=Stage.dispatch;local injected=false
 Stage.dispatch=function(combat,state,e,queue)
  if not injected then
   injected=true;queue.pushTop(state,{kind='effect',effect=e})
   queue.pushTop(state,{kind='effect',effect={op='scry',value=2}});return true
  end
  return dispatch(combat,state,e,queue)
 end
 assert(C.play(s,c.uid,1));Stage.dispatch=dispatch
 eq(s.player.hp,68);eq(s.energy,energy-1);eq(s.player.statuses.xiao_mask,nil);eq(s.xiao.relicUsed,false)
 local pending=assert(s.pendingScry);local resource=s.xiao;local queue=s.actionQueue;local before=C.copy(s)
 local original=Dispatch.dispatch
 Dispatch.dispatch=function(...)original(...);error('resumed Xiao entry failure')end
 eq(pcall(C.chooseScry,s,{},pending.token),false);Dispatch.dispatch=original
 same(s,before);eq(s.xiao,resource);eq(s.actionQueue,queue);eq(s.pendingScry,pending)
 assert(C.chooseScry(s,{},pending.token));eq(s.player.hp,68);eq(s.energy,energy-1)
 eq(s.player.statuses.xiao_mask,3);eq(s.xiao.relicUsed,true)
 local done=C.copy(s);eq(C.chooseScry(s,{},pending.token),false);same(s,done)
end
-- Source HP-loss semantics are retained; Intangible costs 1, not the JS fixed2.
do
 local s=fresh('xiao_candidate_x04',false);s.player.statuses.intangible=1
 assert(C.play(s,s.hand[1].uid,1));eq(s.player.hp,69);eq(s.player.statuses.xiao_mask,2)
end
-- Unknown/extra semantics and inactive targets fail before payment.
for _,field in ipairs({'fixed','times','condition'})do
 local s=fresh('xiao_candidate_x01',false);s.catalog.cards.xiao_candidate_x01.effects[1][field]=true
 local before=C.copy(s);local called,ok=pcall(C.play,s,s.hand[1].uid,1);assert(not called or not ok);same(s,before)
end
for _,field in ipairs({'escaped','halfDead','isDying'})do
 local s=fresh('xiao_candidate_x01',false);s.enemies[1][field]=true
 local before=C.copy(s);eq(C.play(s,s.hand[1].uid,1),false);same(s,before)
end
-- Genuine after-use Thousand Cuts still executes in the original relative order.
do
 local s=fresh('xiao_candidate_x01',false,{'jaw_worm','jaw_worm'})
 s.enemies[1].hp=1;s.enemies[2].hp=100;s.enemies[2].maxHp=100
 s.player.statuses.thousand_cuts=2;require('abyss_card_triggers').recordApplied(s,'thousand_cuts')
 local c=s.hand[1];local energy=s.energy
 assert(C.play(s,c.uid,1));eq(s.enemies[1].hp,0);eq(s.enemies[2].hp,98)
 eq(s.energy,energy-1);eq(s.discard[#s.discard],c)
end
-- Synthetic pre-stage native damage invalidates one target while another lives.
-- The real payment remains committed and the stale selected-target stage skips.
do
 local s=fresh('xiao_candidate_x01',false,{'jaw_worm','jaw_worm'})
 s.enemies[1].hp=1;s.enemies[2].hp=100;s.enemies[2].maxHp=100
 local c=s.hand[1];local energy=s.energy;local original=Stage.dispatch;local once=false
 Stage.dispatch=function(combat,state,e,queue)
  if not once then
   once=true;queue.pushTop(state,{kind='effect',effect=e})
   queue.pushTop(state,{kind='effect',effect={op='damage',value=1,targetId=state.enemies[1].id}});return true
  end
  return original(combat,state,e,queue)
 end
 assert(C.play(s,c.uid,1));Stage.dispatch=original
 eq(s.enemies[1].hp,0);eq(s.enemies[2].hp,100);eq(s.energy,energy-1);eq(s.discard[#s.discard],c)
end
print('XIAO_PAID_TRANSACTION_PASS')
