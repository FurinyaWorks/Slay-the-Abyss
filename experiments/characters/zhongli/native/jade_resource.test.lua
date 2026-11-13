package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local R=require('experiments.characters.zhongli.native.jade_resource')
local function fixture(jade)return {player={hp=30,block=7,statuses={}},enemies={{hp=20}},energy=2,zhongliCandidate={jade=jade,lastOwnerEnd=0}}end
local count=0
for jade=0,20 do for amount=0,20 do
 local s=fixture(jade);local z=s.zhongliCandidate;local ok,reason=R.canApply(s,'gainJade',amount)
 assert(ok and reason==nil and z.jade==jade);assert(R.apply(s,'gainJade',amount)==math.min(20,jade+amount));assert(s.energy==2 and s.player.block==7 and s.player.hp==30)
 local s=fixture(jade);local z=s.zhongliCandidate;local ok=R.canApply(s,'spendJade',amount)
 assert(ok==(jade>=amount)and z.jade==jade)
 if ok then assert(R.apply(s,'spendJade',amount)==jade-amount)else assert(not pcall(R.apply,s,'spendJade',amount)and z.jade==jade)end
 count=count+2
end end
for _,value in ipairs({-1,21,1.5,math.huge,0/0,false,'3'})do local s=fixture(3);assert(not pcall(R.apply,s,'gainJade',value)and s.zhongliCandidate.jade==3)end
for _,field in ipairs({'escaped','halfDead','isDying'})do local s=fixture(3);s.enemies[1][field]=true;assert(not R.canApply(s,'gainJade',3))end
local s=fixture(3);s.player.hp=0;assert(not R.canApply(s,'gainJade',3))
local s=fixture(3);assert(R.canApply(s,'spendJade',3));s.zhongliCandidate.jade=2;assert(not pcall(R.apply,s,'spendJade',3)and s.zhongliCandidate.jade==2)
-- Actual Combat state, no production registration or automatic damage mutation.
local C=require('abyss_combat');local D=require('abyss_data');local L=require('experiments.characters.zhongli.native.lifecycle');local Snapshot=require('abyss_snapshot')
local s=L.start(C.new(D,{seed=42,deck={'strike'},enemies={'cultist'}}),'resources',false)
local z=s.zhongliCandidate;local restore=Snapshot.capture(s);R.apply(s,'gainJade',12);R.apply(s,'spendJade',6)
assert(z.jade==6 and s.energy==3);assert(not pcall(R.apply,s,'spendJade',7));restore();assert(s.zhongliCandidate==z and z.jade==0)
print('jade storage '..count..' scalar matrix cases + actual Combat/Snapshot, stale preflight and excluded terminal states passed; no absorption/payment integration')

for jade=0,20 do for value=0,20 do
 local s=fixture(jade);local z=s.zhongliCandidate
 assert(R.canApply(s,'emptyJade',value));assert(z.jade==jade)
 R.apply(s,'emptyJade',value);assert(z.jade==(jade==0 and value or jade))
 local after=z.jade;R.apply(s,'emptyJade',value);assert(z.jade==after)
 assert(s.energy==2 and s.player.block==7 and s.player.hp==30)
end end
for _,value in ipairs({-1,21,1.5,math.huge,0/0,false,'3'})do local s=fixture(0);assert(not pcall(R.apply,s,'emptyJade',value)and s.zhongliCandidate.jade==0)end
-- Recheck the live empty condition, not a preflight-captured boolean.
local s=fixture(0);assert(R.canApply(s,'emptyJade',9));R.apply(s,'gainJade',1);R.apply(s,'emptyJade',9);assert(s.zhongliCandidate.jade==1)
R.apply(s,'spendJade',1);R.apply(s,'emptyJade',12);assert(s.zhongliCandidate.jade==12)
print('441 empty-only rebuild cases, repeated no gain, live state recheck and malformed amount rejection passed')
