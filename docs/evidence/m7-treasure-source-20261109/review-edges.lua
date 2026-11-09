local M=require('abyss_treasure_source')
local checks=0
local bad='treasure_reward_shape_unsupported'
local boss='boss_treasure_choice_required'
local function reward()
 local b={kind='relic',slot=1,id='a',sourceId='A',requestedId='A',tier='',available=true,origin='base',linkedSlot=2,trace={}}
 local k={kind='sapphire',slot=2,relicId='a',linkedSlot=1}
 return {items={b,k},relicId='a',relicSourceId='A',relicUnavailable=false,sapphireKey={slot=2,relicId='a',linkedSlot=1}}
end
local function row(slot,origin)
 return {kind='relic',slot=slot,id='b',sourceId='',requestedId='',tier='',available=false,origin=origin,trace={}}
end
local function check(r,reason)
 checks=checks+1
 local before=TREASURE_GRAPH(r)
 local out=table.pack(M.pair(r))
 assert(before==TREASURE_GRAPH(r),'no mutation')
 if reason then assert(out.n==2 and out[1]==nil and out[2]==reason,'rejection precedence '..checks)
 else assert(out.n==1 and type(out[1])=='table','success arity '..checks)end
 return out[1]
end
check(nil,bad)
-- Malformed earlier rows beat boss refusal, but later rows are not reached.
for _,early in ipairs({true,false})do
 local r=reward();local b=row(3,'boss');local malformed={kind='relic',slot=4}
 r.items=early and {malformed,b}or{b,malformed};check(r,early and bad or boss)
end
-- Boss refusal beats missing-pair, duplicate later rows, and bad extras.
local r=reward();r.items={row(3,'boss')};r.extraRelics=false;check(r,boss)
r=reward();r.items[3]=row(1,'boss');check(r,bad)
r=reward();r.items[3]=row(3,'boss');r.items[4]=r.items[1];check(r,boss)
r=reward();r.items={r.items[1]};r.extraRelics=false;check(r,'treasure_choice_unavailable')
-- Empty trace, identity-preserving aliases, and repeatedly returned fresh pair.
r=reward();local a=check(r);local b=check(r);assert(a~=b and a.itemsSignature==b.itemsSignature)
local e=row(3,'');e.trace=r.items[1].trace;r.items[3]=e;r.extraRelics={e};check(r)
r.sapphireKey=r.items[2];check(r,bad) -- alias adds forbidden kind field
-- Protected metatables and cyclic rejected inputs must not reach traversal.
for _,target in ipairs({'root','items','base','trace','sapphire'})do
 r=reward();local t=({root=r,items=r.items,base=r.items[1],trace=r.items[1].trace,sapphire=r.sapphireKey})[target]
 setmetatable(t,{__metatable=false,__index=function()error('unexpected index')end,__pairs=function()error('unexpected pairs')end})
 check(r,bad)
end
r=reward();r.items[1].trace={r.items[1]};check(r,bad)
r=reward();r.items[1].trace[1]={id='x',tier='y',['end']=true};r.items[1].trace[2]=r.items[1].trace[1];check(r)
-- Nontrivial slots and max gold preserve canonical signature and scalar limits.
r=reward();r.items[1].slot=2147483647;r.items[2].linkedSlot=2147483647;r.sapphireKey.linkedSlot=2147483647
r.gold=2147483647;r.items[3]={kind='gold',slot=3,amount=2147483647};check(r)
r.gold=2147483648;r.items[3].amount=r.gold;check(r,bad)
print('INDEPENDENT_REVIEW_PASS '..checks)
