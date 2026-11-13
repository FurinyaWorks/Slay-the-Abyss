package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local R=dofile('experiments/characters/ganyu-lua/resources.lua')
local C=require('abyss_combat');local E=require('abyss_effects');local data=require('abyss_data')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local r=R.initial();eq(r.charge,0)
for _,n in ipairs({0,1,2})do
 local input={charge=n};local p=R.plan(input,{op='charged_shot',direct=7,bloom=6});eq(input.charge,n);eq(p.after.charge,n==2 and 0 or n);eq(#p.effects,n==2 and 2 or 1)
 local s=C.new(data,{deck={'strike'},enemies={'jaw_worm','jaw_worm'},seed=42});s.enemies[1].hp=5;s.enemies[1].block=2;s.enemies[2].hp=50
 E.apply(C,s,p.effects,s.player,s.enemies[1]);eq(s.enemies[1].hp,0);eq(s.enemies[2].hp,n==2 and 44 or 50)
end
r=R.plan({charge=1},{op='charge',amount=9}).after;eq(r.charge,2)
r=R.plan(r,{op='storm',amount=4,turns=2}).after
local refresh=R.plan(r,{op='storm',amount=2,turns=3});eq(refresh.after.storm.amount,4);eq(refresh.after.storm.turns,3);eq(r.storm.turns,2)
local p=R.ownerEnd(r,1,2,true);eq(p.after.charge,2);eq(p.after.storm.turns,1);eq(p.energyAfter,0);eq(p.afterDiscard[1].value,4)
local s=C.new(data,{deck={'strike'},enemies={'jaw_worm'},seed=42});s.enemies[1].hp=3;E.apply(C,s,p.afterDiscard,s.player,nil);eq(C.outcome(s),'victory')
local q=R.ownerEnd(p.after,2,0,false);eq(q.after.storm,nil);eq(q.after.charge,2)
assert(not pcall(R.ownerEnd,p.after,1,3,true));eq(p.after.storm.turns,1)
for _,bad in ipairs({-1,0/0,2147483648})do assert(not pcall(R.plan,{charge=0},{op='charge',amount=bad}))end
assert(not pcall(R.plan,{charge=3},{op='charge',amount=1}))
assert(not pcall(R.plan,{charge=0},{op='storm',amount=2,turns=0}))
assert(not pcall(R.plan,{charge=0},{op='charged_shot',direct=7,bloom=6,extra=true}))
assert(not pcall(R.ownerEnd,{charge=0},1,2,'true'))
print('PASS isolated resource plans, native damage/kill, field refresh, bank/tick and invalid inputs')

for _,n in ipairs({0,1,2})do
 eq(R.plan({charge=n},{op='charge',amount=2147483647}).after.charge,2)
 eq(R.ownerEnd({charge=n},1,2147483647,true).after.charge,2)
 eq(R.ownerEnd({charge=n},1,2147483647,false).after.charge,n)
end
assert(not pcall(R.plan,{charge=0,storm=false},{op='charge',amount=1}))
assert(not pcall(R.ownerEnd,{charge=0,storm=false},1,0,true))
print('PASS saturating MAX increments and false storm rejection')

local staged={charge=0,storm={amount=4,turns=2}}
local bank=R.bankBeforeDiscard(staged,1,2,true)
eq(bank.after.charge,2);eq(bank.after.storm.turns,2);eq(bank.after.lastOwnerEnd,nil)
assert(not pcall(R.bankBeforeDiscard,bank.after,1,2,true))
assert(not pcall(R.stormAfterDiscard,staged,1))
local tick=R.stormAfterDiscard(bank.after,1);eq(tick.after.storm.turns,1)
assert(not pcall(R.stormAfterDiscard,tick.after,1));eq(bank.after.storm.turns,2)
print('PASS independent bank/discard/tick boundaries and exact-once stages')

assert(not pcall(R.bankBeforeDiscard,bank.after,2,2,true));eq(bank.after.lastBank,1);eq(bank.after.storm.turns,2)
local nextBank=R.bankBeforeDiscard(tick.after,2,0,false);eq(nextBank.after.lastBank,2)
print('PASS unfinished bank cannot skip prior storm stage')

-- Independent literal base/upgrade oracles for 17/19/35/32; not compiler-generated.
local cases={
 {op='charged_direct',a=8,b=14,upA=11,upB=17,native='damage'},
 {op='charged_block',a=5,b=8,upA=7,upB=10,native='block'},
 {op='charged_aoe',a=2,b=5,upA=3,upB=7,native='damageAll'},
 {op='storm_block',a=3,b=6,upA=4,upB=8,native='block'},
}
local count=0
for _,case in ipairs(cases)do for _,up in ipairs({false,true})do for charge=0,2 do for _,hasStorm in ipairs({false,true})do
 local input={charge=charge,storm=hasStorm and {amount=0,turns=2}or nil}
 local a,b=up and case.upA or case.a,up and case.upB or case.b
 local effect={op=case.op,bonus=b};effect[case.op=='charged_direct'and 'direct'or 'amount']=a
 local active=case.op=='storm_block'and hasStorm or(case.op~='storm_block'and charge==2)
 local expected=a+(active and b or 0)
 local p=R.plan(input,effect)
 eq(p.effects[1].op,case.native);eq(p.effects[1].value,expected)
 eq(p.after.charge,active and case.op~='storm_block'and 0 or charge)
 eq(input.charge,charge);if hasStorm then eq(input.storm.turns,2);eq(p.after.storm.turns,2);assert(input.storm~=p.after.storm)end
 local s=C.new(data,{deck={'strike'},enemies={'jaw_worm','jaw_worm'},seed=42})
 s.enemies[1].hp=100;s.enemies[1].block=2;s.enemies[2].hp=100;s.enemies[2].block=1;s.player.block=0
 E.apply(C,s,p.effects,s.player,s.enemies[1])
 eq(s.player.block,case.native=='block'and expected or 0)
 eq(s.enemies[1].hp,case.native~='block'and 100-math.max(0,expected-2)or 100)
 eq(s.enemies[2].hp,case.native=='damageAll'and 100-math.max(0,expected-1)or 100)
 count=count+1
end end end end
for _,case in ipairs(cases)do
 local input={charge=2,storm={amount=1,turns=2}};local key=case.op=='charged_direct'and 'direct'or 'amount'
 local effect={op=case.op,bonus=1};effect[key]=2147483646
 eq(R.plan(input,effect).effects[1].value,2147483647)
 effect[key]=2147483647;assert(not pcall(R.plan,input,effect));eq(input.charge,2);eq(input.storm.turns,2)
 for _,bad in ipairs({-1,false,0/0,2147483648})do effect[key]=1;effect.bonus=bad;assert(not pcall(R.plan,input,effect))end
 effect.bonus=1;effect.extra=true;assert(not pcall(R.plan,input,effect))
end
print('PASS '..count..' conditional resource/native Effects oracles and checked aggregate boundary')

-- Manual release consumes one trigger, independent of owner-end turn markers.
for _,turns in ipairs({1,2,3})do for _,amount in ipairs({0,4,6})do
 local input={charge=2,storm={amount=amount,turns=turns},lastBank=1,lastOwnerEnd=1}
 local p=R.plan(input,{op='storm_release'})
 eq(input.storm.turns,turns);eq(p.after.charge,2);eq(p.after.lastOwnerEnd,1)
 eq(p.effects[1].op,'damageAll');eq(p.effects[1].value,amount)
 if turns==1 then eq(p.after.storm,nil)else eq(p.after.storm.turns,turns-1)end
 local s=C.new(data,{deck={'strike'},enemies={'jaw_worm','jaw_worm'},seed=42})
 s.enemies[1].hp=100;s.enemies[1].block=2;s.enemies[2].hp=100;s.enemies[2].block=1
 E.apply(C,s,p.effects,s.player,nil)
 eq(s.enemies[1].hp,100-math.max(0,amount-2));eq(s.enemies[2].hp,100-math.max(0,amount-1))
end end
local absent=R.plan({charge=1},{op='storm_release'});eq(#absent.effects,0);eq(absent.after.charge,1)
local r1=R.plan({charge=0,storm={amount=4,turns=2}},{op='storm_release'})
local r2=R.plan(r1.after,{op='storm_release'});eq(r2.after.storm,nil)
eq(#R.plan(r2.after,{op='storm_release'}).effects,0)
-- Candidate 37 base/up literal oracles; stays unapproved, not registered.
for _,base in ipairs({4,7})do for _,turns in ipairs({1,2,3})do
 local input={charge=1,storm={amount=6,turns=turns}}
 local p=R.plan(input,{op='storm_focus',amount=base})
 eq(p.effects[1].value,base+6*turns);eq(p.after.storm,nil);eq(p.after.charge,1);eq(input.storm.turns,turns)
 local s=C.new(data,{deck={'strike'},enemies={'jaw_worm','jaw_worm'},seed=42})
 s.enemies[1].hp=100;s.enemies[1].block=2;s.enemies[2].hp=100
 E.apply(C,s,p.effects,s.player,s.enemies[1]);eq(s.enemies[1].hp,102-base-6*turns);eq(s.enemies[2].hp,100)
end end
local zero=R.plan({charge=0,storm={amount=0,turns=2147483647}},{op='storm_focus',amount=7});eq(zero.effects[1].value,7);eq(zero.after.storm,nil)
eq(R.plan({charge=0},{op='storm_focus',amount=7}).effects[1].value,7)
local maxInput={charge=2,storm={amount=1073741823,turns=2}}
eq(R.plan(maxInput,{op='storm_focus',amount=1}).effects[1].value,2147483647)
assert(not pcall(R.plan,maxInput,{op='storm_focus',amount=2}));eq(maxInput.storm.turns,2);eq(maxInput.charge,2)
assert(not pcall(R.plan,{charge=0,storm={amount=2147483647,turns=2147483647}},{op='storm_focus',amount=0}))
assert(not pcall(R.plan,{charge=0},{op='storm_release',amount=1}))
assert(not pcall(R.plan,{charge=0},{op='storm_focus',amount=-1}))
print('PASS storm release/focus native damage, expiry, zero field and overflow boundaries')

-- Candidate41/42/44/45 literals: single-charge payment vs holding full charge.
local tiers={
 {op='spend_one_damage',a=3,b=5,ua=4,ub=7,damage=true,spend=true},
 {op='spend_one_block',a=3,b=6,ua=4,ub=8,damage=false,spend=true},
 {op='full_charge_block',a=3,b=3,ua=4,ub=4,damage=false,spend=false},
 {op='full_charge_damage',a=4,b=4,ua=6,ub=5,damage=true,spend=false},
}
local tierCount=0
for _,v in ipairs(tiers)do for _,up in ipairs({false,true})do for charge=0,2 do
 local input={charge=charge,storm={amount=3,turns=2}}
 local active=(v.spend and charge>=1)or(not v.spend and charge==2)
 local amount=(up and v.ua or v.a)+(active and(up and v.ub or v.b)or 0)
 local p=R.plan(input,{op=v.op,amount=up and v.ua or v.a,bonus=up and v.ub or v.b})
 eq(p.effects[1].value,amount);eq(p.after.charge,v.spend and active and charge-1 or charge)
 eq(input.charge,charge);eq(input.storm.turns,2);eq(p.after.storm.turns,2);assert(input.storm~=p.after.storm)
 local s=C.new(data,{deck={'strike'},enemies={'jaw_worm','jaw_worm'},seed=42})
 s.enemies[1].hp=100;s.enemies[1].block=2;s.enemies[2].hp=100;s.player.block=0
 E.apply(C,s,p.effects,s.player,s.enemies[1]);eq(s.enemies[1].hp,v.damage and 100-math.max(0,amount-2)or 100)
 eq(s.enemies[2].hp,100);eq(s.player.block,v.damage and 0 or amount);tierCount=tierCount+1
end end end
-- Resolution ordering: spend reduces full bonus; full bonus alone preserves bloom.
local held=R.plan({charge=2},{op='full_charge_block',amount=3,bonus=3})
eq(#R.plan(held.after,{op='charged_shot',direct=7,bloom=6}).effects,2)
local spent=R.plan({charge=2},{op='spend_one_block',amount=3,bonus=6})
eq(R.plan(spent.after,{op='full_charge_block',amount=3,bonus=3}).effects[1].value,3)
eq(#R.plan(spent.after,{op='charged_shot',direct=7,bloom=6}).effects,1)
for _,v in ipairs(tiers)do
 local input={charge=2}
 eq(R.plan(input,{op=v.op,amount=2147483646,bonus=1}).effects[1].value,2147483647)
 assert(not pcall(R.plan,input,{op=v.op,amount=2147483647,bonus=1}));eq(input.charge,2)
 eq(R.plan({charge=0},{op=v.op,amount=2147483647,bonus=2147483647}).effects[1].value,2147483647)
 for _,bad in ipairs({-1,false,0/0,2147483648})do assert(not pcall(R.plan,input,{op=v.op,amount=1,bonus=bad}));eq(input.charge,2)end
 assert(not pcall(R.plan,input,{op=v.op,amount=1,bonus=1,extra=true}))
end
print('PASS '..tierCount..' tier-payment native effect cases, resolution order and bounds')
