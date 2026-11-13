package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local P=require('experiments.characters.zhongli.native.power_plan');local Copy=require('abyss_copy').copy
local expected={zl21={2,'zlInstall',3,4},zl31={2,'zlInstall',2,3},zl48={3,'zlInstall',3,4},zl51={3,'zlInstall',2,3},zl55={3,'zlInstall',1,2},zl67={3,'zlInstall',3,4}}
for id,e in pairs(expected)do for _,up in ipairs({false,true})do
 local s={energy=0,hand={{uid=8,cardId=id,upgraded=up}}};local p=P.plan(s,8)
 assert(p.baseCost==e[1]and p.actions[1].effect.op==e[2]and p.actions[1].effect.value==e[up and 4 or 3])
 assert(s.energy==0 and #s.hand==1 and s.hand[1].uid==8)
 if id=='zl48'then assert(p.actions[2].effect.op=='applyStatus'and p.actions[2].effect.status=='weak')end
 if id=='zl51'then assert(p.actions[2].effect.op=='block')end
 if id=='zl55'then assert(p.actions[2].effect.power=='repair')end
 if id=='zl67'then assert(p.actions[2].effect.op=='damage')end
 p.actions[1].effect.value=99;assert(P.plan(s,8).actions[1].effect.value==e[up and 4 or 3])
end end
local s={hand={{uid=8,cardId='zl21'}}}
for _,field in ipairs({'pendingChoice','pendingPotionChoice','actionQueue','pendingPlay','pendingHandChoice','pendingPileChoice','pendingScry','pendingDiscard'})do local b=Copy(s);b[field]={marker=field};local hand=b.hand;local card=hand[1];local pending=b[field];assert(not pcall(P.plan,b,8));assert(b.hand==hand and hand[1]==card and card.uid==8 and card.cardId=='zl21' and b[field]==pending and pending.marker==field)end
assert(not pcall(P.plan,s,9));s.hand[2]=Copy(s.hand[1]);assert(not pcall(P.plan,s,8));s.hand[2]=nil;s.hand[1].upgraded='false';assert(not pcall(P.plan,s,8))
print('six Power plans base/upgrade and ordered intents; no payment mutation, pending/identity rejection passed')
