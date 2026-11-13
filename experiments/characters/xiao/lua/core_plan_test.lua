package.path='experiments/characters/xiao/lua/?.lua;'..package.path
local P=require('abyss_xiao_card_plan');local D=require('abyss_xiao_core_data')
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
for _,up in ipairs({false,true})do for _,c in ipairs(D.cards)do
 local r={hp=70,mask=0,relicUsed=false,startingRelic=true};local p=P.plan(r,{id=c.id,upgraded=up});eq(p.cost,c.cost);eq(p.exhaust,c.exhaust);eq(#p.orderedEffects,#(up and c.upgrade or c.base));eq(r.mask,0);eq(r.relicUsed,false)
end end
print('PASS all sixteen base/upgraded plans preserve costs effects and inputs')
local r={hp=70,mask=0,relicUsed=false,startingRelic=true};local p=P.plan(r,{id='x04',upgraded=true});eq(p.orderedEffects[1].op,'loseHp');eq(p.orderedEffects[2].op,'xiaoCard');eq(p.orderedEffects[2].kind,'maskCommit');eq(p.expectedResourceAfterIfAlive.mask,3);eq(r.relicUsed,false)
print('PASS life payment precedes guarded mask commit; planning never spends relic')
for _,hp in ipairs({0,1,2})do assert(not pcall(P.plan,{hp=hp,mask=0,relicUsed=false,startingRelic=true},{id='x04',upgraded=false}))end
assert(not pcall(P.plan,r,{id='x17',upgraded=false}));assert(not pcall(P.plan,r,{id='x01',upgraded=1}))
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
