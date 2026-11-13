-- PENDING PUBLIC SPEC. Expected red on shared 4da6e475 (no public mask tick).
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
