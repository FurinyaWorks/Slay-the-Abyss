package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local L=require('experiments.characters.zhongli.native.lifecycle');local R=require('experiments.characters.zhongli.native.resource_cards');local Q=require('abyss_action_queue')
for _,id in ipairs({'zl26','zl38'})do for _,up in ipairs({false,true})do for jade=0,20 do
 local s=L.start(C.new(D,{seed=42,deck={'strike'},enemies={'cultist'}}),'reserve',false)
 s.hand[1].cardId=id;s.hand[1].upgraded=up;s.zhongliCandidate.jade=jade;s.energy=0
 local p=R.prepare(s,s.hand[1].uid);assert(p.baseCost==(id=='zl26'and 2 or 0))
 assert((id=='zl26'and p.definition.selfRetain and not p.definition.exhaust)or(id=='zl38'and p.definition.exhaust and not p.definition.selfRetain))
 Q.start(s,{{kind='effect',effect=p.effects[1]}});assert(Q.run(s,{effect=function(st,a,q)return R.dispatch(C,st,a.effect,q)end}))
 local gain=id=='zl26'and(up and 14 or 10)or(up and 3 or 2)
 assert(s.zhongliCandidate.jade==math.min(20,jade+gain));assert(s.energy==0 and #s.hand==1) -- host cost deliberately not validated by role
end end end
-- Real native retain lifecycle without pretending unsupported gain opcode was paid.
for _,up in ipairs({false,true})do
 local data=C.copy(D);for _,d in ipairs(R.definitions())do if d.id=='zl26'then data.cards.cards[#data.cards.cards+1]=d end end
 local s=L.start(C.new(data,{seed=42,deck={{cardId='zl26',upgraded=up}},enemies={'cultist'}}),'retain',false)
 local c=s.hand[1];s.zhongliCandidate.jade=5;assert(C.endTurn(s));assert(s.hand[1]==c and #s.hand==1 and s.zhongliCandidate.jade==5)
end
print('RESOURCE_RESERVE_CONTRACT_PASS 84 gain/version/cap cases plus2 actual native retain cases; payment/exhaust pending')
