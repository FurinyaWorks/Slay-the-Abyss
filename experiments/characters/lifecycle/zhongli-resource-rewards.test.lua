-- Provider/source contract only: shared CardPool dispatch is deliberately not monkey-patched.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local F=require('abyss_zhongli_resource_reward_run');local Catalog=require('abyss_zhongli_reward_catalog');local P=require('abyss_zhongli_card_rewards');local R=require('abyss_sts_random')
local expected={zl03={2,12,16},zl04={1,6,6},zl16={1,6,6},zl19={2,6,8},zl20={1,9,12},zl24={1,3,3},zl26={2,10,14},zl28={2,5,7},zl38={0,2,3},zl39={0,3,3},zl57={1,3,3},zl62={1,6,8},zl66={2,5,7},zl73={0,3,3}}
local defs=Catalog.definitions();eq(#defs,14)
for _,d in ipairs(defs)do local e=assert(expected[d.id]);eq(d.rarity,'common');eq(d.cost,e[1]);eq(d.effects[1].value,e[2]);eq(d.upgrade.effects[1].value,e[3]);eq(d.upgrade.cost,e[1]);assert(d.type~='power')end
local tails={zl04={'damage',14,18},zl16={'block',16,21},zl19={'draw',2,3},zl24={'draw',3,4},zl28={'applyStatus',2,3,'weak'},zl39={'damage',6,8},zl57={'applyStatus',3,4,'weak'},zl62={'draw',1,2},zl66={'gainStatus',3,4,'flame_barrier'},zl73={'applyStatus',1,2,'weak'}}
local exhausted={zl19=true,zl24=true,zl38=true,zl39=true,zl62=true,zl73=true}
local spend={zl04=true,zl16=true,zl24=true,zl39=true,zl57=true,zl73=true}
for _,c in ipairs(defs)do
 local tail=tails[c.id];eq(c.exhaust==true,exhausted[c.id]==true);eq(c.selfRetain==true,c.id=='zl26')
 eq(c.effects[1].op,'zhongliCard');eq(c.effects[1].kind,spend[c.id]and'spendJade'or((c.id=='zl20'or c.id=='zl62')and'emptyJade'or'gainJade'))
 eq(c.upgrade.effects[1].kind,c.effects[1].kind)
 eq(#c.effects,tail and 2 or 1);eq(#c.upgrade.effects,#c.effects)
 if tail then
  local a,b={op=tail[1],value=tail[2]},{op=tail[1],value=tail[3]};if tail[4]then a.status=tail[4];b.status=tail[4]end
  same(c.effects[2],a);same(c.upgrade.effects[2],b)
 end
end
defs[1].effects[1].value=999;eq(Catalog.definitions()[1].effects[1].value,12)
local before=C.copy(D);local Starter=require('abyss_zhongli_starter_run');local make=Starter.new;local calls=0;Starter.new=function(...)calls=calls+1;return make(...)end
local r=F.new(D,37);Starter.new=make;eq(calls,1);same(D,before);eq(r.hp,60);eq(#r.deck,10);eq(r.candidateLifecycle.relicEnabled,true)
for _,color in ipairs({'red','green','blue','purple'})do local n=0;for _,c in ipairs(r.data.cards.cards)do if c.color==color then n=n+1 end end;eq(n,75)end
-- Original closed Starter rejects caller-supplied starter IDs, even exact ones.
local d=C.copy(D);for _,x in ipairs(require('abyss_zhongli_starter_source').definitions())do d.cards.cards[#d.cards.cards+1]=x end
local installed=C.copy(d);assert(not pcall(F.new,d,37));same(d,installed)
d.cards.cards[#d.cards.cards].upgrade.effects[2].value=19;local drift=C.copy(d);assert(not pcall(F.new,d,37));same(d,drift)
assert(not pcall(F.new,D,37,{}))
local api={rewardCount=function()return 3 end}
local state=C.copy(r);local ids,rng,offset,up=P.prepare(r,api);same(r,state);eq(#ids,3);eq(#up,3);eq(offset,r.cardRarityOffset or 5)
-- Independent expected RNG sequence: identity draws precede all upgrade draws.
local wantRng=R.cloneState(r.cardRng);local pool={};for _,c in ipairs(Catalog.definitions())do pool[#pool+1]=c.id end
local wantIds={};for i=1,3 do wantIds[i]=table.remove(pool,R.randomInt(wantRng,#pool-1)+1)end
local wantUp={};local chance=require('abyss_acts').get(r.act or 1).upgradeChance;for i=1,3 do wantUp[i]=R.randomBooleanChance(wantRng,chance)end
same(ids,wantIds);same(up,wantUp);same(rng,wantRng)
for _,count in ipairs({1,14,20,100})do
 local offer,newRng,off,bits=P.prepare(r,{rewardCount=function()return count end});eq(#offer,math.min(count,14));eq(#bits,#offer);local seen={};for _,id in ipairs(offer)do assert(expected[id]and not seen[id]);seen[id]=true end;same(r,state)
end
for _,count in ipairs({0,-1,0.5,101,'3',false})do local snapshot=C.copy(r);assert(not pcall(P.prepare,r,{rewardCount=function()return count end}));same(r,snapshot)end
local mutators={
 function(x)x.candidateRewardPool='unknown'end,
 function(x)x.candidateLifecycle.kind='ganyu'end,
 function(x)x.relics[#x.relics+1]='prismatic_shard'end,
 function(x)for _,c in ipairs(x.data.cards.cards)do if c.id=='zl19'then c.upgrade.effects[2].value=2;return end end end,
 function(x)for _,c in ipairs(x.data.cards.cards)do if c.id=='zl38'then c.onExhaust={op='draw',value=1};return end end end,
 function(x)for _,c in ipairs(x.data.cards.cards)do if c.id=='zl03'then x.data.cards.cards[#x.data.cards.cards+1]=C.copy(c);return end end end
}
for _,mutate in ipairs(mutators)do local x=F.new(D,37);mutate(x);local snapshot=C.copy(x);assert(not pcall(P.prepare,x,api));same(x,snapshot)end
print('ZHONGLI_REWARD_PROVIDER_PASS closed14/source common/RNG order/short offers/zero reject/closed collision; no shared Run reward proof')
