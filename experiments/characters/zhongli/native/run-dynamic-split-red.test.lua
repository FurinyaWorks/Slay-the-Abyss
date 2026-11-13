package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D=H.C,H.Data;local Run=require('abyss_run')
local encounter=arg and arg[1]or'large_acid';assert(encounter=='large_acid'or encounter=='large_spike')
local r=Run.new(D,37,{experimental=true,candidateLifecycle={kind='zhongli',relicEnabled=false}})
r.data.cards.cards[#r.data.cards.cards+1]={id='zl21',name='HOLD',type='power',cost=2,target='SELF',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,effects={{op='zhongliCard',kind='installPillar',value=3}},upgrade={effects={{op='zhongliCard',kind='installPillar',value=4}}}}
r.deck[1].cardId='zl21';r.floor=4;assert(Run.startCombat(r,encounter));local s=r.combat;local card
for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.cardId=='zl21'then card=table.remove(pile,i);s.hand[#s.hand+1]=card;break end end end
assert(Run.play(r,card.uid));local e=s.enemies[1]
C.damage(s,s.player,e,math.floor(e.maxHp/2)+1,true)
assert(#s.enemies==1)
assert(Run.endTurn(r));assert(#s.enemies==3,'native split not reached')
local before=C.copy(r);local ok,why=pcall(Run.endTurn,r)
assert(not ok and tostring(why):find('single%-enemy prototype only'));H.same(r,before)
print('ZHONGLI_DYNAMIC_SPLIT_RED_CONFIRMED '..encounter..' splits; next owner-end rejects and restores unchanged Run')
