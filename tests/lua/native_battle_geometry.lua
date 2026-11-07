package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local G=require('abyss_native_battle_geometry')
local EnemyView=require('abyss_battle_enemy_view')
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
G.configure(true)
local host,ui,panel,event,tap,drain=H.setup({'strike','strike','strike'},{'cultist','cultist'})
local battle=host.run.combat
local first,second=battle.enemies[1],battle.enemies[2]
G.bind(battle.player,{x=-410,y=35,width=130,height=230})
G.bind(first,{x=30,y=80,width=130,height=190})
local rect={x=320,y=50,width=160,height=210}
local projected=G.bind(second,rect)
rect.x=999
assert(projected.x==320,'projection inputs are copied')
assert(G.get({id=second.id})==projected,'feedback shadow resolves canonical projection by actor ID')
assert(EnemyView.geometry(second)==projected,'render and targeting share the same projection')
assert(projected.y+projected.healthY>projected.y+projected.hitHeight/2,'native HP sits above the 3D body, clear of lower hand')
assert(projected.y+projected.nameY>-100 and projected.y+projected.intentY>-100,'native labels remain above the hand area')
local small=G.bind({id='small_native'},{x=0,y=0,width=44,height=110})
assert(small.healthWidth>=100 and small.hitWidth==44,'readable HP width does not inflate physical target area')
host:refresh()
local F=H.F
local box=F.actorControl(panel,'enemy2')
local hero=panel:GetChild('hero')
assert(box.x==320 and box.y==50 and box:GetChild('hit').x==0 and box:GetChild('hit').y==0)
assert(box:GetChild('hit').sizeDeltaX==160 and box:GetChild('hit').sizeDeltaY==210)
assert(hero.x==-410 and hero.y==35 and not hero:GetChild('portrait').visible)
assert(box:GetChild('hp').text==tostring(second.hp)..'/'..tostring(second.maxHp))
local function noOldSprites()
 assert(not hero:GetChild('portrait').visible,'native player never reveals old 2D portrait')
 for i=1,2 do
  local actorBox=F.actorControl(panel,'enemy'..i)
  assert(not actorBox:GetChild('portrait').visible,'native enemy never reveals old 2D portrait')
  local oldArt=actorBox:GetChild('monsterArt')
  assert(not oldArt or not oldArt.visible,'native enemy does not build old shape artwork')
 end
end
noOldSprites()
for _=1,20 do ui:render();host:update(.05);noOldSprites()end
local before=second.hp
tap('card1',51);tap('enemy2',52)
for _=1,60 do host:update(.05);noOldSprites()end
assert(second.hp<before and first.hp==first.maxHp,'projected target click uses real Run card command for the bound actor')
drain()
-- The ordinary pointer drag performs a real second command at the projected body.
local uid=battle.hand[1].uid
before=second.hp
event('card1','down',53)
event('card1','drag',53,320,50)
event('card1','up',53,320,50)
event('card1','endDrag',53,320,50)
drain()
assert(second.hp<before,'drag onto the projected native body commits the real selected card')
for _,card in ipairs(battle.hand)do assert(card.uid~=uid,'drag must consume the actual hand UID')end
-- Potion and card target geometry are read through the same targeting service.
local Targeting=require('abyss_battle_targeting').install(ui,{}, {},{dragReady=function()return true end,aimReady=function()return true end})
local valid,target=Targeting.potionDragTarget({battle=battle,x=320,y=50})
assert(valid and target==2,'potion drag shares the projected actor hitbox')
local rebound={id=second.id}
G.bind(rebound,{x=360,y=70,width=180,height=220})
G.unbind(second)
assert(G.get(rebound).x==360,'retired canonical unbind cannot delete newer same-ID projection')
G.clear();assert(G.enabled() and not G.get(rebound),'battle cleanup clears geometry without enabling 2D art')
host:disable();G.configure(false)
print('native geometry: shadow IDs, projection ownership, player/enemy render+idle+feedback source suppression, real target click/drag commands, shared potion hitbox passed (offline bridge/UI fixture)')
