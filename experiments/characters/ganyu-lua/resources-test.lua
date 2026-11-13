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
