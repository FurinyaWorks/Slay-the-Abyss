package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local Data=require('abyss_data')
local C=require('abyss_combat')
local Bridge=require('experiments.characters.zhongli.native.bridge')
local Inventory=require('experiments.characters.zhongli.native.catalog')
local function same(a,b)
 assert(type(a)==type(b),'type changed')
 if type(a)~='table'then assert(a==b,'value changed');return end
 for k,v in pairs(a)do same(v,b[k])end
 for k in pairs(b)do assert(a[k]~=nil,'extra field')end
end
-- Independent expectations, not computed from generated effect arrays.
local expected={
 zl01={{6,0,0,0,0,0},{9,0,0,0,0,0}},zl02={{0,5,0,0,0,0},{0,8,0,0,0,0}},
 zl05={{24,0,0,0,0,0},{32,0,0,0,0,0}},zl07={{5,5,0,0,0,0},{7,7,0,0,0,0}},
 zl09={{5,0,1,0,0,0},{7,0,2,0,0,0}},zl10={{0,20,0,0,0,0},{0,26,0,0,0,0}},
 zl12={{0,3,0,0,0,1},{0,4,0,0,0,2}},zl13={{0,0,0,2,0,0},{0,0,0,3,0,0}},
 zl14={{13,0,0,0,0,0},{18,0,0,0,0,0}},zl15={{0,8,0,0,3,0},{0,11,0,0,4,0}},
 zl34={{0,0,1,0,0,0},{0,0,2,0,0,0}},zl37={{0,10,0,0,0,1},{0,14,0,0,0,2}},
 zl45={{0,3,1,1,0,0},{0,5,2,2,0,0}},zl59={{0,0,0,1,0,0},{0,0,0,2,0,0}},
 zl61={{0,4,0,0,2,0},{0,6,0,0,3,0}},zl69={{0,0,0,0,2,0},{0,0,0,0,3,0}}
}
local before=C.copy(Data)
local ready=0
for _,entry in ipairs(Inventory)do
 if entry.ready then
  ready=ready+1
  local data=Bridge.prepare(Data,{entry.id})
  for _,up in ipairs({false,true})do
   local s=C.new(data,{seed=42,deck={{cardId=entry.id,upgraded=up},'strike','defend'},enemies={'cultist'}})
   local card
   for i=#s.hand,1,-1 do if s.hand[i].cardId==entry.id then card=s.hand[i]else s.draw[#s.draw+1]=table.remove(s.hand,i)end end
   assert(card,'opening card missing')
   local def=C.cardDefinition(s,card)
   assert(def.id==entry.id and def.cost==entry.definition.cost)
   local hp=s.enemies[1].hp
   assert(C.canPlay(s,card.uid,1),'native canPlay failed '..entry.id)
   assert(C.play(s,card.uid,1),'native play failed '..entry.id)
   assert(s.energy==3-def.cost,'native payment mismatch '..entry.id)
   local e=assert(expected[entry.id])[up and 2 or 1]
   assert(hp-s.enemies[1].hp==e[1],'damage '..entry.id)
   assert(s.player.block==e[2],'block '..entry.id)
   assert((s.enemies[1].statuses.weak or 0)==e[3],'weak '..entry.id)
   assert((s.enemies[1].statuses.vulnerable or 0)==e[4],'vulnerable '..entry.id)
   assert((s.player.statuses.flame_barrier or 0)==e[5],'counter '..entry.id)
   assert(#s.hand==e[6],'draw '..entry.id)
   assert(#s.exhaust==(entry.definition.exhaust and 1 or 0),'exhaust '..entry.id)
   assert(#s.discard==(entry.definition.exhaust and 0 or 1),'discard '..entry.id)
   local saved=C.copy(s)
   assert(not C.play(s,card.uid,1),'duplicate native play accepted')
   same(s,saved)
  end
 else
  assert(not pcall(Bridge.prepare,Data,{entry.id}),'unsupported card admitted '..entry.id)
 end
end
same(Data,before)
assert(not pcall(Bridge.prepare,Data,{'zl01','zl03'}),'partial unsupported batch accepted')
assert(not pcall(Bridge.prepare,Data,{'zl01','zl01'}),'duplicate accepted')
assert(not pcall(Bridge.prepare,Data,{}),'empty accepted')
print('native admitted '..ready..' cards, base+upgrade real Combat.new/canPlay/play, blocked '..(75-ready)..', source unchanged')
for _,id in ipairs({'zl14','zl34','zl59','zl69'})do
 local s=C.new(Bridge.prepare(Data,{id}),{seed=42,deck={id},enemies={'cultist'}})
 local uid=s.hand[1].uid
 assert(C.endTurn(s),'native end turn rejected')
 local found=false;for _,card in ipairs(s.hand)do if card.uid==uid then found=true end end
 assert(found,'native selfRetain lost '..id)
end
for _,entry in ipairs(Inventory)do if entry.ready then
 local s=C.new(Bridge.prepare(Data,{entry.id}),{seed=42,deck={entry.id},enemies={'cultist'}})
 local uid=s.hand[1].uid;s.energy=0;local before=C.copy(s)
 assert(not C.play(s,uid,1),'zero energy accepted '..entry.id);same(s,before)
 if entry.definition.target=='ENEMY' then
  s.energy=3;before=C.copy(s)
  assert(not C.play(s,uid,99),'invalid target accepted '..entry.id);same(s,before)
 end
end end
local collision=Bridge.prepare(Data,{'zl01'})
assert(not pcall(Bridge.prepare,collision,{'zl01'}),'collision accepted')
print('native retention4, insufficient-energy16, invalid-target and collision rejection verified')
