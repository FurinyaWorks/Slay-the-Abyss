-- Real draw/discard/recharge cycling of all ten starter instances; fixed harmless enemy.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Launcher=require('abyss_xiao_starter_run');local Run=require('abyss_run')
local data=C.copy(D);local original=C.copy(D)
data.enemies.enemies[#data.enemies.enemies+1]={id='xiao_cycle_fixture',name='test wait',tier='normal',hp=9999,intents={{id='wait',kind='defend',effects={{op='block',value=0}}}}}
data.enemies.encounters[#data.enemies.encounters+1]={id='xiao_cycle_room',tier='normal',enemies={'xiao_cycle_fixture'},minFloor=1,maxFloor=14}
local r=Launcher.new(data,11);same(D,original);eq(r.hp,70);eq(r.maxHp,70);eq(#r.relics,0);assert(Run.startCombat(r,'xiao_cycle_room'))
local seen={};local count=0
for turn=1,10 do
 local s=r.combat;assert(s.player.hp>0)
 while s.energy>0 and #s.hand>0 do
  local c=s.hand[1];local energy=s.energy;assert(Run.play(r,c.uid,1));eq(s.energy,energy-1)
  if not seen[c.deckUid]then seen[c.deckUid]=true;count=count+1 end
  eq(s.cardInUse,nil)
 end
 if count==10 then break end
 assert(Run.endTurn(r))
end
eq(count,10);for _,c in ipairs(r.deck)do assert(seen[c.uid])end
print('XIAO_STARTER_CYCLE_PASS all ten deck UIDs naturally drawn and paid with real recharge discard reshuffle; fixed no-attack enemy')

assert(not pcall(Launcher.new,D,11,{}))
local a=Launcher.new(D,11);a.data.rules.player.maxHp=1;local b=Launcher.new(D,11);eq(b.maxHp,70);same(D,original)
print('XIAO_STARTER_LAUNCHER_PASS private manifest no caller options independent data copies')
local Bridge=require('abyss_xiao_play_bridge');local definitions=Bridge.definitions
Bridge.definitions=function()local cards=definitions();cards[1].effects[1].value=999;return cards end
local before=C.copy(D);assert(not pcall(Launcher.new,D,11));Bridge.definitions=definitions;same(D,before)
local duplicate=C.copy(D);duplicate.cards.cards[#duplicate.cards.cards+1]=definitions()[1];before=C.copy(duplicate);assert(not pcall(Launcher.new,duplicate,11));same(duplicate,before)
print('XIAO_STARTER_LAUNCHER_SOURCE_PASS canonical drift and duplicate candidate fail without caller mutation')
local altered=C.copy(D);altered.rules.player.maxHp=80;altered.rules.player.energyPerTurn=9;altered.rules.player.drawPerTurn=9;altered.rules.player.maxHand=20
local input=C.copy(altered);local fixed=Launcher.new(altered,11);same(altered,input)
eq(fixed.hp,70);eq(fixed.maxHp,70);eq(fixed.data.rules.player.energyPerTurn,3);eq(fixed.data.rules.player.drawPerTurn,5);eq(fixed.data.rules.player.maxHand,10)
assert(Run.startCombat(fixed,'cultist_solo'));eq(fixed.combat.energy,3);eq(#fixed.combat.hand,5);eq(fixed.combat.rules.player.maxHand,10)
C.applyEffects(fixed.combat,{{op='draw',value=20}},fixed.combat.player,fixed.combat.player);eq(#fixed.combat.hand,10)
assert(Run.endTurn(fixed));eq(fixed.combat.energy,3);eq(#fixed.combat.hand,5)
print('XIAO_STARTER_RULES_PASS nondefault caller 80HP 9energy 9draw 20hand becomes source70/3/5/10 with real initial draw cap and recharge')
-- Supply an actual eleventh instance: native draw must leave it in the draw pile.
local capped=Launcher.new(D,11);assert(Run.startCombat(capped,'cultist_solo'))
local cs=capped.combat;cs.draw[#cs.draw+1]={uid='cap-extra-11',uuid='cap-extra-11',cardId='xiao_candidate_x02',upgraded=false}
C.applyEffects(cs,{{op='draw',value=20}},cs.player,cs.player);eq(#cs.hand,10);eq(#cs.draw,1)
-- Preserve formal provider contracts and whole input graph after constructor fault.
for _,color in ipairs({'red','green','blue','purple'})do local n=0;for _,card in ipairs(capped.data.cards.cards)do if card.color==color and card.type~='curse'and card.type~='status'and card.rarity~='special'then n=n+1 end end;eq(n,75)end
local new=Run.new;local inputBefore=C.copy(D);local reached=false
Run.new=function(...)local created=new(...);reached=true;created.data.rules.player.maxHp=1;error('after actual launcher constructor')end
assert(not pcall(Launcher.new,D,11));Run.new=new;assert(reached);same(D,inputBefore);eq(Launcher.new(D,11).maxHp,70)
print('XIAO_STARTER_INTEGRATION_PASS real eleventh-instance hand cap/formal75/constructor fault source preservation')
