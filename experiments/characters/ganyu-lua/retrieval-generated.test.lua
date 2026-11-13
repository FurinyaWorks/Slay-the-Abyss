package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local Q=require('abyss_action_queue');local S=require('abyss_snapshot')
local M=dofile('experiments/characters/ganyu-lua/retrieval-card.lua')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(zone,up)
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]={id='ganyu_lab_03',name='arrow retrieval fixture',type='attack',cost=1,target='ENEMY',rarity='common',effects={{op='ganyuCard',kind='chargedShot',direct=7,bloom=6}}}
 local deck={'ganyu_lab_03','ganyu_lab_03'};for i=1,13 do deck[#deck+1]='defend'end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm'},seed=42});local all={};for _,p in ipairs({s.hand,s.draw})do for _,c in ipairs(p)do all[#all+1]=c end end
 s.hand={};s.draw={};local arrows={}
 for _,c in ipairs(all)do if c.cardId=='ganyu_lab_03' then arrows[#arrows+1]=c else s.draw[#s.draw+1]=c end end
 s.cardInUse=table.remove(s.draw,1);s.pendingPlay={uid=s.cardInUse.uid};s.ganyuResource={charge=2}
 arrows[1].upgraded=up;arrows[2].upgraded=not up
 if zone=='discard'then s.discard[1]=table.remove(s.draw,1)end
 table.insert(s[zone],2,arrows[1]);s[zone][#s[zone]+1]=arrows[2]
 return s,arrows
end
local function run(s,e,fault)
 Q.start(s,{{kind='effect',effect=e}})
 return Q.run(s,{effect=function(state,a,queue)local ok=M.dispatch(C,state,a.effect,queue);if fault then error('after retrieval')end;return ok end})
end
local defs=dofile('experiments/characters/ganyu-lua/retrieval-definitions.lua').cards
local targets=dofile('experiments/characters/ganyu-lua/paid-definitions.lua').cards
for _,x in ipairs(dofile('experiments/characters/ganyu-lua/storm-definitions.lua').cards)do targets[#targets+1]=x end
for _,def in ipairs(defs)do for _,up in ipairs({false,true})do
 local zone=def.effects[1].zone;local s,a=fresh(zone,up)
 s.catalog.cards[def.id]=def;s.cardInUse.cardId=def.id;s.cardInUse.upgraded=up
 for _,target in ipairs(targets)do s.catalog.cards[target.id]=target end
 local selector=def.effects[1].selector
 local targetId=selector=='storm'and'ganyu_lab_05'or selector=='charge'and'ganyu_lab_06'or'ganyu_lab_03'
 for _,c in ipairs(a)do c.cardId=targetId end
 local card=C.cardDefinition(s,s.cardInUse);eq(card.cost,up and 0 or 1)
 local e=M.prepare(C,s,card.effects[1],s.cardInUse.uid);local before=C.copy(s);local pile=s[zone];local restore=S.capture(s)
 s.player.noDraw=true;s.energy=s.energy-card.cost
 assert(not pcall(run,s,e,true));restore();same(s,before);eq(s[zone],pile)
 s.player.noDraw=true;assert(run(s,e));eq(s.hand[1],a[1]);eq(s.hand[1].upgraded,up);eq(s[zone][#s[zone]],a[2]);eq(s.seed,before.seed)
end end
print('PASS8 generated retrieval variants/real target definitions/NoDraw and original-pile rollback retry; no public payment or source disposal')
