package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local F=require('abyss_zhongli_twentyfive_run');local Catalog=require('abyss_zhongli_twentyfive_catalog');local P=require('abyss_zhongli_twentyfive_rewards');local R=require('abyss_sts_random')
local defs=Catalog.definitions();eq(#defs,25);local expected={};for _,c in ipairs(defs)do assert(not expected[c.id]);expected[c.id]=true;eq(c.rarity,'common')end
local old=require('abyss_zhongli_twentyone_catalog').definitions();for i=1,21 do same(defs[i],old[i])end
local before=C.copy(D);local Starter=require('abyss_zhongli_starter_run');local make=Starter.new;local calls=0;Starter.new=function(...)calls=calls+1;return make(...)end
local r=F.new(D,37);Starter.new=make;eq(calls,1);same(D,before);eq(r.hp,60);eq(#r.deck,10)
for _,color in ipairs({'red','green','blue','purple'})do local n=0;for _,c in ipairs(r.data.cards.cards)do if c.color==color then n=n+1 end end;eq(n,75)end
local state=C.copy(r);local ids,rng,offset,up=P.prepare(r,{rewardCount=function()return 3 end});same(r,state)
local wantRng=R.cloneState(r.cardRng);local pool={};for _,c in ipairs(defs)do pool[#pool+1]=c.id end
local wantIds={};for i=1,3 do wantIds[i]=table.remove(pool,R.randomInt(wantRng,#pool-1)+1)end
local wantUp={};local chance=require('abyss_acts').get(r.act or 1).upgradeChance;for i=1,3 do wantUp[i]=R.randomBooleanChance(wantRng,chance)end
same(ids,wantIds);same(up,wantUp);same(rng,wantRng)
for _,count in ipairs({1,21,25,100})do local offer=P.prepare(r,{rewardCount=function()return count end});eq(#offer,math.min(count,25));local seen={};for _,id in ipairs(offer)do assert(expected[id]and not seen[id]);seen[id]=true end;same(r,state)end
for _,count in ipairs({0,-1,0.5,101,'3',false})do assert(not pcall(P.prepare,r,{rewardCount=function()return count end}));same(r,state)end
local mutations={function(x)x.candidateRewardPool='unknown'end,function(x)x.candidateLifecycle.kind='ganyu'end,function(x)x.relics[#x.relics+1]='prismatic_shard'end,
 function(x)x.data.cards.cards[#x.data.cards.cards+1]=C.copy(x.data.cards.cards[1])end,
 function(x)for _,c in ipairs(x.data.cards.cards)do if c.id=='zl14'then c.selfRetain=false end end end,
 function(x)for _,c in ipairs(x.data.cards.cards)do if c.id=='zl07'then c.upgrade.effects[1].value=8 end end end}
for _,mutate in ipairs(mutations)do local x=F.new(D,37);mutate(x);local b=C.copy(x);assert(not pcall(P.prepare,x,{rewardCount=function()return 3 end}));same(x,b)end
assert(not pcall(F.new,D,37,{}))
local oldRun=require('abyss_zhongli_twentyone_run').new(D,37);eq(#require('abyss_zhongli_twentyone_rewards').validate(oldRun),21);assert(not pcall(P.validate,oldRun));assert(not pcall(require('abyss_zhongli_twentyone_rewards').validate,r))
print('ZHONGLI_TWENTYFIVE_PROVIDER_PASS source/old21/closed starter/RNG order/scarcity/drift')
