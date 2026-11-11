-- Current generated official layout/theme, real Host callbacks; not a physical phone test.
local H=assert(...,'official Host fixture is required')
local T=require('abyss_theme')
local monsterControl=dofile('tests/lua/support/monster_control_fixture.lua')
assert(T.presentationProfile=='official-assets-first','official branch must actually execute')
assert(T.layout.cardDrag.aimDots==T.officialAssets.battleAim.segments)
local function near(a,b,label)assert(math.abs(a-b)<.001,(label or '')..': '..tostring(a)..' ~= '..tostring(b))end
local function find(node,name)
 if node.name==name then return node end
 for _,child in ipairs(node.children or node.controls or {})do local result=find(child,name);if result then return result end end
end
-- The lightweight fixture does not hydrate initial child offsets. Read those
-- from the actual generated layout rather than treating an unset mock y as 0.
local tipSpec=assert(find(assert(find({children=H.F.Layout},'aim20')),'tip'))
local function endpoint(head)
 local tip=head:GetChild('tip');local angle=(head.localRotationZ or 0)*math.pi/180
 local scale=head.localScaleX or 1
 local x,y=tip.x or tipSpec.position[1],(tip.y or tipSpec.position[2])+tip.sizeDeltaY/2
 return head.x+(x*math.cos(angle)-y*math.sin(angle))*scale,
  head.y+(x*math.sin(angle)+y*math.cos(angle))*scale
end
local function at(head,x,y,label)
 local tx,ty=endpoint(head);near(tx,x,label..' x');near(ty,y,label..' y')
end
local count=0
for _,touch in ipairs({false,true})do
 local h,u,p,e=H.setup({'strike','strike','defend'},nil,{touchScreen=function()return touch end})
 -- Use the real source formation; two default constructors alone overlap at x=0.
 h.run.combat=H.F.Combat.new(H.F.Data,{deck={'strike','strike','defend'},
  enemies={'fungi_beast','fungi_beast'},encounterSource='2 Fungi Beasts'})
 h:refresh()
 for _,canvas in ipairs({{1280,720},{1560,720},{1600,900}})do
  h:resize(canvas[1],canvas[2]);h:refresh()
  for _=1,20 do h:update(.05)end
  for _,fast in ipairs({false,true})do
  -- Prepared menu setting; this tests the resulting battle option, not the menu toggle.
  h.fastMode,u.fastMode=fast,fast
  local layer=p:GetChild('dragLayer');local n=T.layout.cardDrag.aimDots
  local head=layer:GetChild('aim'..n)
  assert(n==20 and head.kind=='container' and head:GetChild('tip') and head:GetChild('stem'),'test must use the official compound head')
  local first=monsterControl(p,'enemy1');local second=monsterControl(p,'enemy2')
  e('card1','down',17);e('card1','drag',17,first.x,first.y)
  assert(u.gesture and u.gesture.touchScreen==touch and u.gesture.drawnTarget==1,'pointer must lock the first live enemy touch='..tostring(touch)..' fast='..tostring(fast)..' canvas='..canvas[1]..' target='..tostring(u.gesture and u.gesture.drawnTarget)..' moving='..tostring(u.gesture and u.gesture.moving)..' aiming='..tostring(u.gesture and u.gesture.aiming)..' sx='..tostring(u.gesture and u.gesture.sx)..' sy='..tostring(u.gesture and u.gesture.sy))
  at(head,first.x,first.y,'first target tip')
  local tail=layer:GetChild('aim1')
  assert(head.x-tail.x>(touch and 100 or 20),'right-side enemy arrow collapsed into a vertical line: '..tostring(head.x-tail.x))
  local angle=(head.localRotationZ or 0)*math.pi/180
  assert(-math.sin(angle)>.5,'arrow head must face right toward the enemy, not upward')
  local previous=layer:GetChild('aim'..(n-1));local tx,ty=endpoint(head)
  local vx,vy=tx-previous.x,ty-previous.y
  assert((-math.sin(angle)*vx+math.cos(angle)*vy)/math.sqrt(vx*vx+vy*vy)>.95,'head must align with the actual drawn chain')
  assert(head:GetChild('tip').imageColor.g==T.officialAssets.battleAim.locked.g,'locked head colour')
  e('dragLayer','drag',17,second.x,second.y)
  if not(fast and touch)then for _=1,8 do h:update(.05)end end
  assert(u.gesture.drawnTarget==2,'second enemy target identity: '..tostring(u.gesture.drawnTarget)..' at '..tostring(second.x)..','..tostring(second.y)..' first='..tostring(first.x)..','..tostring(first.y)..' pointer='..tostring(u.gesture.x)..','..tostring(u.gesture.y))
  at(head,second.x,second.y,'second target tip')
  e('dragLayer','drag',17,80,120)
  assert(u.gesture.drawnTarget==nil,'empty space must remain free aim, not nearest-enemy targeting')
  at(head,80,120,'free tip')
  assert(head:GetChild('tip').imageColor.g==T.officialAssets.battleAim.idle.g,'free head colour')
  e('dragLayer','drag',17,0,T.layout.hand.y)
  e('dragLayer','up',17,0,T.layout.hand.y)
  assert(u.gesture==nil and u.carry==nil and u.selected==nil and not layer.visible,'cancel must retire the aim and return the card')
  assert(h.run.combat.energy==3 and #h.run.combat.hand==3,'aim/cancel must not submit a card')
  -- Let the existing cancel/hover return animation finish before the next
  -- independent settings case; this is not a test of opening the fast-mode menu.
  for _=1,20 do h:update(.05)end
  count=count+1
  end
 end
end
print('OFFICIAL_AIM_NATIVE_TOUCH_MATRIX '..count)
