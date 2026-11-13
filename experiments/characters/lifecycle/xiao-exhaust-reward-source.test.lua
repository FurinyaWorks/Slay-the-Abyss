package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Factory=require('abyss_xiao_exhaust_reward_run');local Catalog=require('abyss_xiao_exhaust_reward_catalog');local Provider=require('abyss_xiao_exhaust_card_rewards')
local Starter=require('abyss_xiao_starter_run');local source=C.copy(D);local old=Starter.new;local calls=0
Starter.new=function(...)calls=calls+1;return old(...)end
local r=Factory.new(D,42);Starter.new=old;eq(calls,1);same(D,source)
eq(r.maxHp,70);eq(#r.deck,10);eq(#Catalog.definitions(),15)
local counts={common=0,uncommon=0,rare=0}
for _,c in ipairs(Catalog.definitions())do counts[c.rarity]=counts[c.rarity]+1;assert(c.rarity~='basic')end
eq(counts.common,4);eq(counts.uncommon,9);eq(counts.rare,2)
for _,c in ipairs(Catalog.definitions())do
 local found;for _,d in ipairs(r.data.cards.cards)do if d.id==c.id then assert(not found);same(d,c);found=true end end;assert(found)
end
local formal=require('abyss_run').new(D,42)
for _,color in ipairs({'red','green','blue','purple'})do
 local before,after=0,0;for _,c in ipairs(formal.data.cards.cards)do if c.color==color and c.type~='curse'and c.type~='status'and c.rarity~='special'then before=before+1 end end
 for _,c in ipairs(r.data.cards.cards)do if c.color==color and c.type~='curse'and c.type~='status'and c.rarity~='special'then after=after+1 end end;eq(after,before);eq(after,75)
end
assert(not pcall(Factory.new,D,42,{}));same(D,source)
local collision=C.copy(D);collision.cards.cards[#collision.cards.cards+1]=Catalog.definitions()[1];assert(not pcall(Factory.new,collision,42))
print('XIAO_EXHAUST_REWARD_FACTORY_PASS closed fifteen source catalog default starter once input and formal pools unchanged')
for _,rarity in ipairs({'common','uncommon','rare'})do
 local before=C.copy(r);local ids,rng,offset,ups=Provider.prepare(r,{rewardCount=function()return 20 end,rarity=function()return rarity end})
 eq(#ids,counts[rarity]);eq(#ups,#ids);same(r,before);assert(rng~=r.cardRng)
 local seen={};for _,id in ipairs(ids)do assert(not seen[id]);seen[id]=true end
 local ids2,rng2,off2,ups2=Provider.prepare(r,{rewardCount=function()return 20 end,rarity=function()return rarity end})
 same(ids,ids2);same(rng,rng2);same(ups,ups2);eq(offset,off2)
end
local before=C.copy(r);assert(not pcall(Provider.prepare,r,{rewardCount=function()return 0 end,rarity=function()return 'rare'end}));same(r,before)
print('XIAO_EXHAUST_REWARD_FINITE_PASS finite rarity short offers zero rejection cloned RNG and reproducibility')
for _,sourceCard in ipairs(Catalog.definitions())do
 local bad=C.copy(r);for _,c in ipairs(bad.data.cards.cards)do if c.id==sourceCard.id then c.upgrade.effects[1].value=999 end end
 before=C.copy(bad);assert(not pcall(Provider.prepare,bad,{rewardCount=function()return 3 end,rarity=function()return 'common'end}));same(bad,before)
end
local bad=C.copy(r);bad.relics[#bad.relics+1]='prismatic_shard';before=C.copy(bad);assert(not pcall(Provider.validate,bad));same(bad,before)
local B=require('abyss_xiao_play_bridge');local additional=B.additionalDefinitions
B.additionalDefinitions=function()local out=additional();out[1].cost=99;return out end
assert(not pcall(Catalog.definitions));B.additionalDefinitions=additional
print('XIAO_EXHAUST_REWARD_DRIFT_PASS every source upgraded effect drift prismatic and source Bridge mismatch reject')
for _,field in ipairs({'cost','rarity','color','sourceId','name','exhaust'})do
 local bad=C.copy(r);for _,c in ipairs(bad.data.cards.cards)do if c.id=='xiao_candidate_x17'then c[field]='drift' end end
 local before=C.copy(bad);assert(not pcall(Provider.validate,bad));same(bad,before)
end
local bad=C.copy(r);bad.data.cards.cards[#bad.data.cards.cards+1]=C.copy(bad.data.cards.cards[1]);assert(not pcall(Provider.validate,bad))
local Run=require('abyss_run');local new=Run.new;local reached=false;local input=C.copy(D)
Run.new=function(...)local out=new(...);reached=true;out.data.rules.player.maxHp=1;error('after real private constructor')end
assert(not pcall(Factory.new,D,42));Run.new=new;assert(reached);same(D,input)
print('XIAO_EXHAUST_REWARD_CLOSED_PASS metadata and duplicate drift reject actual constructor fault preserves caller graph')

local oldRun=require('abyss_xiao_resource_reward_run').new(D,42)
eq(#require('abyss_xiao_reward_catalog').definitions(),12)
eq(#require('abyss_xiao_card_rewards').validate(oldRun).uncommon,6)
assert(not pcall(Provider.validate,oldRun))
assert(not pcall(require('abyss_xiao_card_rewards').validate,r))
print('XIAO_EXHAUST_REWARD_OLD_DOMAIN_PASS')

for _,id in ipairs({'xiao_candidate_x21','xiao_candidate_x22'})do for _,up in ipairs({false,true})do
 local bad=C.copy(r);for _,c in ipairs(bad.data.cards.cards)do if c.id==id then local effects=up and c.upgrade.effects or c.effects;effects[1].cap=999 end end
 local before=C.copy(bad);assert(not pcall(Provider.validate,bad));same(bad,before)
end end
for _,n in ipairs({-1,1.5,101,false,'3'})do
 local before=C.copy(r);assert(not pcall(Provider.prepare,r,{rewardCount=function()return n end,rarity=function()return 'uncommon'end}));same(r,before)
end
print('XIAO_EXHAUST_REWARD_CAP_PASS')
