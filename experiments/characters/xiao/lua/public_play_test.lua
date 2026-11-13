-- ACCEPTANCE SPEC: passed on shared 5cb61b0f; requires its Xiao opt-in gate/dispatch.
-- Do not replace public C.play with a fixture when the shared gate is absent.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua')
local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Bridge=require('abyss_xiao_play_bridge')
local Dispatch=require('abyss_xiao_dispatch')
local function fresh(id,up)
 local data=C.copy(D)
 for _,def in ipairs(Bridge.definitions())do
  if def.id=='xiao_candidate_x01'or def.id=='xiao_candidate_x04'then
   def.rarity='special';def.color='colorless';data.cards.cards[#data.cards.cards+1]=def
  end
 end
 local deck={};for i=1,8 do deck[i]={cardId=id,upgraded=up}end
 local s=C.new(data,{deck=deck,enemies={'jaw_worm'},seed=11,candidateLifecycle={kind='xiao',relicEnabled=true}})
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
