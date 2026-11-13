package.path='experiments/characters/xiao/lua/?.lua;'..package.path
local P=require('abyss_xiao_card_plan');local D=require('abyss_xiao_core_data')
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
for _,up in ipairs({false,true})do for _,c in ipairs(D.cards)do
 local r={hp=70,mask=0,relicUsed=false,startingRelic=true};local p=P.plan(r,{id=c.id,upgraded=up});eq(p.cost,c.cost);eq(p.exhaust,c.exhaust);eq(#p.orderedEffects,#(up and c.upgrade or c.base));eq(r.mask,0);eq(r.relicUsed,false)
end end
print('PASS all fifty-two base/upgraded plans preserve costs effects and inputs')
local r={hp=70,mask=0,relicUsed=false,startingRelic=true};local p=P.plan(r,{id='x04',upgraded=true});eq(p.orderedEffects[1].op,'loseHp');eq(p.orderedEffects[2].op,'xiaoCard');eq(p.orderedEffects[2].kind,'maskCommit');eq(p.expectedResourceAfterIfAlive.mask,3);eq(r.relicUsed,false)
print('PASS life payment precedes guarded mask commit; planning never spends relic')
for _,hp in ipairs({0,1,2})do assert(not pcall(P.plan,{hp=hp,mask=0,relicUsed=false,startingRelic=true},{id='x04',upgraded=false}))end
assert(not pcall(P.plan,r,{id='x53',upgraded=false}));assert(not pcall(P.plan,r,{id='x01',upgraded=1}))
print('PASS life prerequisite unknown cards and nonboolean upgrade reject')
local n=P.maskCommit(r,2);eq(n.mask,2);eq(n.relicUsed,true);eq(n.effects[1].op,'draw');eq(n.effects[1].value,1)
r={hp=70,mask=2,relicUsed=true,startingRelic=true};n=P.maskCommit(r,1);eq(n.mask,2);eq(#n.effects,0);r.mask=0;n=P.maskCommit(r,1);eq(#n.effects,0)
r={hp=0,mask=0,relicUsed=false,startingRelic=true};n=P.maskCommit(r,2);eq(n.mask,0);eq(n.relicUsed,false);eq(#n.effects,0)
print('PASS actual entry relic once, refresh/reentry/death do not redraw')

local s={turn=2,xiao={reservedEnergy=3}};local actions=P.startTurnPlan(s);eq(actions[1].op,'xiaoCard');eq(actions[1].kind,'reservedEnergy');eq(actions[1].turn,2);eq(s.xiao.reservedEnergy,3);s.xiao.reservedEnergy=0;eq(#P.startTurnPlan(s),0);s.xiao.reservedEnergy=false;assert(not pcall(P.startTurnPlan,s))
print('PASS deferred turn-start proposal does not itself pay or clear stored energy')

for _,up in ipairs({false,true})do
 local r={hp=3,mask=2,relicUsed=true,startingRelic=true}
 local p=P.plan(r,{id='x09',upgraded=up});eq(p.orderedEffects[1].kind,'maskCommit');eq(p.orderedEffects[1].value,0);eq(p.orderedEffects[2].op,'draw');eq(p.orderedEffects[2].value,up and 3 or 2)
 p=P.plan(r,{id='x10',upgraded=up});eq(p.orderedEffects[1].op,'loseHp');eq(p.orderedEffects[2].kind,'maskCommit');eq(p.expectedResourceAfterIfAlive.mask,2);eq(p.orderedEffects[3].value,up and 11 or 8)
 r.hp=2;assert(not pcall(P.plan,r,{id='x10',upgraded=up}));r.hp=3
 p=P.plan(r,{id='x11',upgraded=up});eq(p.orderedEffects[1].kind,'damage');eq(p.orderedEffects[1].value,up and 14 or 10);eq(p.orderedEffects[2].kind,'maskCommit')
 p=P.plan(r,{id='x12',upgraded=up});eq(p.orderedEffects[1].kind,'damageAll');eq(p.orderedEffects[1].value,up and 9 or 6)
 p=P.plan(r,{id='x15',upgraded=up});eq(p.orderedEffects[1].kind,'breakBlock');eq(p.orderedEffects[2].kind,'damage');eq(p.orderedEffects[2].value,up and 9 or 6)
 p=P.plan(r,{id='x16',upgraded=up});eq(p.orderedEffects[1].kind,'recoverExit');eq(p.orderedEffects[2].op,'block');eq(p.orderedEffects[2].value,up and 6 or 3);eq(p.exhaust,true)
end
print('PASS x09-x16 base/up ordered exit payment damage break and recovery proposals')
for _,value in ipairs({8,12})do eq(P.maskBlock(0,value),value/2);for mask=1,3 do eq(P.maskBlock(mask,value),value)end end
for _,value in ipairs({3,4})do eq(P.addMaskGuard(2147483647-value,value),2147483647);assert(not pcall(P.addMaskGuard,2147483648-value,value))end
for _,v in ipairs({false,-1,0/0,1.5})do assert(not pcall(P.maskBlock,v,8));assert(not pcall(P.addMaskGuard,v,3))end
print('PASS execution-time mask defense and guard accumulation exact bounds')

for _,up in ipairs({false,true})do
 local r={hp=4,mask=2,relicUsed=true,startingRelic=true}
 local p=P.plan(r,{id='x17',upgraded=up});eq(p.cost,0);eq(p.lifePrerequisite,3);eq(p.orderedEffects[1].op,'loseHp');eq(p.orderedEffects[2].op,'energy');eq(p.orderedEffects[2].value,up and 3 or 2);eq(p.exhaust,true)
 r.hp=3;assert(not pcall(P.plan,r,{id='x17',upgraded=up}));r.hp=4
 p=P.plan(r,{id='x18',upgraded=up});eq(p.cost,2);eq(p.orderedEffects[1].kind,'damageAll');eq(p.orderedEffects[1].value,up and 24 or 18);eq(p.orderedEffects[2].kind,'maskCommit');eq(p.exhaust,true)
 local expects={x19={'burnSkillsBlock',up and 6 or 4},x20={'unmaskedDraw',up and 3 or 2},x21={'exhaustDamage',3,up and 24 or 18},x22={'exhaustBlock',2,up and 14 or 10},x23={'spendEnergyBlock',up and 7 or 5},x24={'discardAttacksDraw',up and 1 or 0}}
 for id,e in pairs(expects)do p=P.plan(r,{id=id,upgraded=up});eq(p.orderedEffects[1].kind,e[1]);eq(p.orderedEffects[1].value,e[2]);eq(p.orderedEffects[1].cap,e[3])end
end
print('PASS x17-x24 retain payment order caps and upgraded structured parameters')
eq(P.scaledCount(0,3,18),0);eq(P.scaledCount(5,3,18),15);eq(P.scaledCount(6,3,18),18);eq(P.scaledCount(2147483647,3,18),18)
eq(P.scaledCount(306783378,7),2147483646);assert(not pcall(P.scaledCount,306783379,7));eq(P.scaledCount(2147483647,0),0)
for _,v in ipairs({false,-1,0/0,1.5})do assert(not pcall(P.scaledCount,v,3,18));assert(not pcall(P.scaledCount,1,3,v))end
print('PASS capped public count saturation and uncapped spending overflow reject')

for _,up in ipairs({false,true})do
 local r={hp=70,mask=2,relicUsed=true,startingRelic=true}
 local p=P.plan(r,{id='x25',upgraded=up});eq(p.orderedEffects[1].kind,'threatDamage');eq(p.orderedEffects[1].value,up and 11 or 8);eq(p.orderedEffects[1].bonus,4)
 p=P.plan(r,{id='x27',upgraded=up});eq(p.orderedEffects[1].kind,'shortenMask');eq(p.orderedEffects[2].op,'block');eq(p.expectedResourceAfterIfAlive.mask,1);eq(r.mask,2)
 p=P.plan(r,{id='x28',upgraded=up});eq(p.orderedEffects[1].bonus,up and 12 or 10)
 p=P.plan(r,{id='x29',upgraded=up});eq(p.kind,'power');eq(p.orderedEffects[1].kind,'exitGuard');eq(p.orderedEffects[1].value,up and 6 or 4)
 p=P.plan(r,{id='x30',upgraded=up});eq(p.orderedEffects[1].kind,'damage');eq(p.orderedEffects[2].kind,'unmaskedDraw')
 p=P.plan(r,{id='x31',upgraded=up});eq(p.orderedEffects[1].kind,'damage');eq(p.orderedEffects[2].kind,'suppress')
 p=P.plan(r,{id='x32',upgraded=up});eq(p.orderedEffects[1].op,'block');eq(p.orderedEffects[2].kind,'coveredDraw')
end
print('PASS x25-x32 preserve bonuses shortened preview and defense-before-draw order')
for mask=0,3 do local r=P.shortenMask(mask,1);eq(r.mask,math.max(mask-1,0));eq(r.exited,mask==1);eq(P.lastMaskDamage(mask,10,10),mask==1 and 20 or 10)end
eq(P.threatDamage(0,8,4),8);eq(P.threatDamage(1,8,4),12);eq(P.coveredDraw(7,8,1),0);eq(P.coveredDraw(8,8,1),1);eq(P.coveredDraw(0,0,1),1)
eq(P.threatDamage(1,2147483643,4),2147483647);assert(not pcall(P.threatDamage,1,2147483644,4));assert(not pcall(P.lastMaskDamage,1,2147483647,1))
for _,v in ipairs({false,-1,0/0,1.5,{}})do assert(not pcall(P.threatDamage,v,8,4));assert(not pcall(P.coveredDraw,8,v,1))end
print('PASS certified threat and shortened mask reducers boundaries reject unknown intent')

for _,up in ipairs({false,true})do
 local r={hp=70,mask=2,relicUsed=true,startingRelic=true}
 local kinds={x33='calmDraw',x34='exitEnergy',x35='damageHits',x36='maskedAttackDraw',x37='blockDamage',x38='spendBlockDraw',x39='topdeckAttack',x40='enemyCountBlock'}
 for id,kind in pairs(kinds)do local p=P.plan(r,{id=id,upgraded=up});eq(p.orderedEffects[1].kind,kind)end
 local p=P.plan(r,{id='x35',upgraded=up});eq(p.orderedEffects[1].hits,2);eq(p.orderedEffects[1].value,up and 6 or 4)
 p=P.plan(r,{id='x37',upgraded=up});eq(p.orderedEffects[1].cap,up and 20 or 14)
 p=P.plan(r,{id='x38',upgraded=up});eq(p.orderedEffects[1].cap,up and 3 or 2);eq(p.exhaust,true)
 p=P.plan(r,{id='x39',upgraded=up});eq(p.orderedEffects[2].op,'block');eq(p.orderedEffects[2].value,up and 7 or 4)
end
print('PASS x33-x40 retain per-hit count cap meaning and topdeck-before-block order')
for _,cap in ipairs({2,3})do for _,block in ipairs({0,4,5,9,10,15,21,2147483647})do local p=P.spendBlockDraw(block,5,cap);eq(p.block,0);eq(p.draw,math.min(math.floor(block/5),cap))end end
for _,value in ipairs({4,6})do for n=0,5 do eq(P.enemyCountBlock(n,value,3),math.min(n,3)*value)end end
for mask=0,3 do local p=P.exitEnergy(mask,2);eq(p.mask,0);eq(p.energy,mask>0 and 2 or 0);eq(p.exited,mask>0)end
assert(not pcall(P.spendBlockDraw,10,0,2));eq(P.enemyCountBlock(1,2147483647,3),2147483647);assert(not pcall(P.enemyCountBlock,2,2147483647,3))
for _,v in ipairs({false,-1,0/0,1.5})do assert(not pcall(P.spendBlockDraw,v,5,2));assert(not pcall(P.enemyCountBlock,v,4,3));assert(not pcall(P.exitEnergy,v,2))end
print('PASS whole-block spend count cap and exit refund reducers enforce boundaries')
