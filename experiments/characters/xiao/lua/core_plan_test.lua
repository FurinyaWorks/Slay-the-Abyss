package.path='experiments/characters/xiao/lua/?.lua;'..package.path
local P=require('abyss_xiao_card_plan');local D=require('abyss_xiao_core_data')
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
for _,up in ipairs({false,true})do for _,c in ipairs(D.cards)do
 local r={hp=70,mask=0,relicUsed=false,startingRelic=true};local p=P.plan(r,{id=c.id,upgraded=up});eq(p.cost,c.cost);eq(p.exhaust,c.exhaust);eq(#p.orderedEffects,#(up and c.upgrade or c.base));eq(r.mask,0);eq(r.relicUsed,false)
end end
print('PASS all eight base/upgraded plans preserve costs effects and inputs')
local r={hp=70,mask=0,relicUsed=false,startingRelic=true};local p=P.plan(r,{id='x04',upgraded=true});eq(p.orderedEffects[1].op,'loseHp');eq(p.orderedEffects[2].op,'xiaoCard');eq(p.orderedEffects[2].kind,'maskCommit');eq(p.expectedResourceAfterIfAlive.mask,3);eq(r.relicUsed,false)
print('PASS life payment precedes guarded mask commit; planning never spends relic')
for _,hp in ipairs({0,1,2})do assert(not pcall(P.plan,{hp=hp,mask=0,relicUsed=false,startingRelic=true},{id='x04',upgraded=false}))end
assert(not pcall(P.plan,r,{id='x09',upgraded=false}));assert(not pcall(P.plan,r,{id='x01',upgraded=1}))
print('PASS life prerequisite unknown cards and nonboolean upgrade reject')
local n=P.maskCommit(r,2);eq(n.mask,2);eq(n.relicUsed,true);eq(n.effects[1].op,'draw');eq(n.effects[1].value,1)
r={hp=70,mask=2,relicUsed=true,startingRelic=true};n=P.maskCommit(r,1);eq(n.mask,2);eq(#n.effects,0);r.mask=0;n=P.maskCommit(r,1);eq(#n.effects,0)
r={hp=0,mask=0,relicUsed=false,startingRelic=true};n=P.maskCommit(r,2);eq(n.mask,0);eq(n.relicUsed,false);eq(#n.effects,0)
print('PASS actual entry relic once, refresh/reentry/death do not redraw')

local s={turn=2,xiao={reservedEnergy=3}};local actions=P.startTurnPlan(s);eq(actions[1].op,'xiaoCard');eq(actions[1].kind,'reservedEnergy');eq(actions[1].turn,2);eq(s.xiao.reservedEnergy,3);s.xiao.reservedEnergy=0;eq(#P.startTurnPlan(s),0);s.xiao.reservedEnergy=false;assert(not pcall(P.startTurnPlan,s))
print('PASS deferred turn-start proposal does not itself pay or clear stored energy')
