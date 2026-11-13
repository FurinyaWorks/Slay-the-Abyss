-- Actual public opt-in mask owner-end and reserved-energy start lifecycle.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local B=require('abyss_xiao_play_bridge')
local function fresh(up)
 local data=C.copy(D)
 for _,d in ipairs(B.definitions())do if d.id=='xiao_candidate_x04'or d.id=='xiao_candidate_x06'then d.rarity='special';d.color='colorless';data.cards.cards[#data.cards.cards+1]=d end end
 -- Test-only no-attack enemy; actual enemy turns and public start/end still run.
 data.enemies.enemies[#data.enemies.enemies+1]={id='xiao_owner_end_fixture',name='test wait',tier='normal',hp=500,intents={{id='wait',kind='defend',effects={{op='block',value=0}}}}}
 local deck={};for i=1,8 do deck[i]={cardId='xiao_candidate_x04',upgraded=up}end
 local s=C.new(data,{deck=deck,enemies={'xiao_owner_end_fixture'},seed=11,candidateLifecycle={kind='xiao',relicEnabled=true}})
 -- Test-only ability definitions for seeded expiry/guard resource contracts.
 for _,id in ipairs({'xiao_mask_guard','xiao_expiry_energy'})do s.catalog.statuses[id]={id=id,priority=5,kind='buff',stack='intensity',decay='none'};s.player.statusDefinitions[id]=s.catalog.statuses[id]end
 s.player.maxHp=70;s.player.hp=8;assert(C.play(s,s.hand[1].uid,1));eq(s.player.hp,6);return s
end
for _,up in ipairs({false,true})do
 local s=fresh(up)
 assert(C.endTurn(s));eq(s.player.hp,4);eq(s.player.statuses.xiao_mask,up and 2 or 1)
 assert(C.endTurn(s));eq(s.player.hp,2);eq(s.player.statuses.xiao_mask,up and 1 or nil)
 assert(C.endTurn(s));eq(s.player.hp,up and 0 or 2)
 if not up then for _,entry in ipairs(require('abyss_power_schedule').list(s.player))do assert(entry.id~='xiao_mask')end end
end
print('PASS PUBLIC base expires and survives HP8; upgrade extra duration kills after three end turns')
local s=fresh(false);local before=C.copy(s);local player=s.player;local x=s.xiao
local original=C.startPlayerTurn;local reached=false
C.startPlayerTurn=function(state,...)if state==s then reached=true;error('before real next turn')end return original(state,...)end
local ok=pcall(C.endTurn,s);C.startPlayerTurn=original
assert(not ok and reached);same(s,before);eq(s.player,player);eq(s.xiao,x)
assert(C.endTurn(s));eq(s.player.hp,4)
print('PASS PUBLIC endTurn failure restores mask life resource and aliases then retries once')
local Owner=require('abyss_xiao_owner_end')
-- Explicit resource fixture, not acquired guard/expiry cards: natural expiry
-- stores energy and actual next-turn recharge consumes it before normal draw.
do
 local s=fresh(false);s.player.statuses.xiao_mask_guard=3;s.player.statuses.xiao_expiry_energy=2
 local start=C.startPlayerTurn;local ends=0
 C.startPlayerTurn=function(state,...)
  if state==s then ends=ends+1;eq(state.player.block,3);eq(state.xiao.reservedEnergy,ends==2 and 2 or 0)end
  return start(state,...)
 end
 assert(C.endTurn(s));eq(s.energy,3);eq(s.xiao.reservedEnergy,0)
 local draw=C.draw;local observed=false
 C.draw=function(state,n,...)
  if state==s then observed=true;eq(state.energy,5);eq(state.xiao.reservedEnergy,0);eq(state.xiao.startEnergyTurn,state.turn)end
  return draw(state,n,...)
 end
 local ok,result=pcall(C.endTurn,s);C.draw=draw;C.startPlayerTurn=start;assert(ok,result);assert(result);assert(observed)
 eq(ends,2);eq(s.player.statuses.xiao_mask,nil);eq(s.energy,5);eq(s.xiao.reservedEnergy,0)
 -- A third ordinary turn cannot re-claim the previous expiry.
 assert(C.endTurn(s));eq(s.energy,3)
end
-- Duplicate explicit start action fails without a second energy award.
do
 local s=fresh(false);local before=C.copy(s)
 eq(pcall(require('abyss_xiao_lifecycle_host').startEnergy,C,s,{op='xiaoStartEnergy',turn=s.turn}),false);same(s,before)
end
-- Post-payment reward overflow must restore HP/mask/events, not retain partial payment.
do
 local s=fresh(false);assert(C.endTurn(s));s.xiao.reservedEnergy=2147483647;s.player.statuses.xiao_expiry_energy=1
 local before=C.copy(s);local p=s.player;local x=s.xiao
 eq(pcall(C.endTurn,s),false);same(s,before);eq(s.player,p);eq(s.xiao,x)
end
-- Energy refill overflow at actual next start similarly restores the prior command.
do
 local s=fresh(false);s.xiao.reservedEnergy=2147483647
 local before=C.copy(s);local x=s.xiao
 eq(pcall(C.endTurn,s),false);same(s,before);eq(s.xiao,x)
end
-- Genuine Codex pause precedes mask payment; failed continuation preserves offer/RNG.
do
 local s=fresh(false);s.relics={'nilrys_codex'};assert(C.endTurn(s));local choice=assert(s.pendingChoice);eq(s.player.hp,6)
 local before=C.copy(s);local x=s.xiao;local q=s.actionQueue;local apply=Owner.apply;local hit=false
 Owner.apply=function(...)local result=apply(...);hit=true;error('after actual mask tick')end
 eq(pcall(C.chooseCard,s,choice.token,0),false);Owner.apply=apply;assert(hit)
 same(s,before);eq(s.xiao,x);eq(s.pendingChoice,choice);eq(s.actionQueue,q)
 assert(C.chooseCard(s,choice.token,0));eq(s.player.hp,4);eq(s.player.statuses.xiao_mask,1)
 local done=C.copy(s);eq(C.chooseCard(s,choice.token,0),false);same(s,done)
end
-- Real HP-loss semantics retain Intangible, rather than silently forcing JS fixed2.
do
 local s=fresh(false);s.player.statuses.intangible=1
 assert(C.endTurn(s));eq(s.player.hp,5);eq(s.player.statuses.xiao_mask,1)
end
-- Lethal payment never awards guard/expiry energy, even when hypothetical rewards overflow.
do
 local s=fresh(true);s.player.hp=2;s.player.statuses.xiao_mask_guard=2147483647;s.player.block=1;s.player.statuses.xiao_expiry_energy=2147483647;s.xiao.reservedEnergy=2147483647
 assert(C.endTurn(s));eq(s.player.hp,0);eq(s.player.block,1);eq(s.xiao.reservedEnergy,2147483647)
end
print('XIAO_PUBLIC_LIFECYCLE_TRANSACTION_PASS')
