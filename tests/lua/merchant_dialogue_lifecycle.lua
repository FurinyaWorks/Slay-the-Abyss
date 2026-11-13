local _,control=dofile('tests/lua/support/node_ui_cases.lua')(math.huge,math.huge)
local UI,Run,Map,Nodes=require('abyss_node_ui'),require('abyss_run'),require('abyss_map'),require('abyss_nodes')
local data,Layout=require('abyss_data'),require('abyss_ui_layout')
local Theme,Narrative=require('abyss_theme'),require('abyss_narrative')
local function find(nodes,name)for _,n in ipairs(nodes)do if n.name==name then return n end local v=n.children and find(n.children,name);if v then return v end end end
local function setup()
 local run,map=Run.new(data,42),Map.generate(data,42)
 while not run.nodeFlow do
  local choices=Map.available(map);local chosen
  for _,node in ipairs(choices)do if node.type=='shop'then chosen=node;break end end
  if chosen then assert(Nodes.enter(run,map,chosen.id))else assert(Map.choose(map,choices[1].id))end
 end
 run.gold=10000
 local root=control(find(Layout,'nodePanel'))
 local presentation=require('abyss_character_presentation').prepare(require('abyss_presentation'),run.data)
 local ui=UI.new(root,run,map,presentation,'click',nil,{color=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end,imageSource='static'})
 ui:setVisible(true)
 return ui,root
end
local failures=0
local function test(name,fn)local ok,err=pcall(fn);print((ok and 'ok 'or'FAIL ')..name);if not ok then print(err);failures=failures+1 end end
test('hidden shop rejects delayed merchant tap and resumes same dialogue',function()
 local ui,root=setup();ui:update(.05)
 local merchant=ui.merchant;local old=merchant.current;local shown=old.shown
 local tap=root:GetChild('merchant'):GetChild('talk'):GetChild('hit').click
 ui:setVisible(false)
 assert(not tap(),'hidden shop consumed delayed dialogue tap')
 ui:update(1);assert(merchant.current==old and old.shown==shown,'hidden dialogue advanced')
 ui:setVisible(true);ui:update(.05)
 assert(merchant.current==old and old.shown>shown,'reopen must resume without restarting narration')
 assert(ui:press('shopView/card1'));assert(ui:press('confirm'),'dialogue must not block buying')
end)
test('new transaction replaces prior portrait gesture',function()
 local ui=setup()
 assert(ui:press('shopView/card1'));assert(ui:press('confirm'));ui:update(.05)
 assert(ui.merchant.nod~=nil)
 ui.run.gold=0;ui:render();assert(not ui:press('shopView/card2'))
 assert(ui.merchant.current.kind=='poor' and ui.merchant.shake~=nil)
 assert(ui.merchant.nod==nil,'refusal still nods for previous purchase')
 ui.run.gold=10000;ui:render();assert(ui:press('shopView/card2'));assert(ui:press('confirm'))
 assert(ui.merchant.current.kind=='buy' and ui.merchant.nod~=nil and ui.merchant.shake==nil,'purchase still shakes for previous refusal')
end)
test('reaction bubble closes without hiding the figure or preventing a second sale',function()
 local ui,root=setup();local merchant=ui.merchant;local box=root:GetChild('merchant')
 assert(ui:press('shopView/card1') and ui:press('confirm'))
 assert(merchant:tap(),'tap must still accelerate typing')
 assert(box:GetChild('line').text=='「'..Narrative.merchant.purchaseSuccess..'」')
 ui:update(Theme.layout.merchant.hold+.01)
 local bubble=box:GetChild('bubble');assert(bubble and not bubble.visible,'completed reaction remains a permanent dialogue panel')
 assert(box.visible and box:GetChild('portrait').visible,'closing dialogue must retain the independent figure')
 assert(not box:GetChild('line').visible and not box:GetChild('next').visible)
 ui:render();assert(not bubble.visible,'unrelated render resurrected the expired reaction')
 assert(merchant:tap() and bubble.visible,'clicking the figure must reopen the complete reaction')
 assert(ui:press('shopView/card2') and ui:press('confirm'),'bubble must never gate a consecutive sale')
 assert(merchant.current.kind=='buy' and bubble.visible and merchant.current.shown==0)
 ui.run.gold=0;ui:render();assert(not ui:press('shopView/card3'))
 assert(merchant.current.kind=='poor' and bubble.visible and merchant.shake~=nil)
end)
test('all encounter pages remain readable and idle waits for the long text to finish',function()
 local ui,root=setup();local merchant=ui.merchant;local pages={};local original=merchant.current
 while true do
  assert(merchant:tap());pages[#pages+1]=root:GetChild('merchant'):GetChild('line').text
  assert(utf8.len(pages[#pages])<=Theme.layout.merchant.pageCharacters)
  local last=original.page*Theme.layout.merchant.pageCharacters>=#original.chars
  if last then break end
  assert(merchant:tap())
 end
 assert(table.concat(pages)==Narrative.merchant.encounter,'long narration was truncated')
 assert(merchant:tap() and merchant.current.kind=='greet','greeting must remain queued after the full narration')
 for _=1,400 do ui:update(.1) end
 assert(merchant.current.kind=='idle' and merchant.idleUsed,'idle remark should occur once after dialogue has settled')
 local current=merchant.current
 for _=1,400 do ui:update(.1) end
 assert(merchant.current==current and not root:GetChild('merchant'):GetChild('bubble').visible,'idle repeated or stayed open')
 assert(ui:press('confirm') and ui:holding());assert(merchant.current.kind=='leave')
 assert(merchant:tap());ui:update(.1)
 assert(ui:press('confirm') and not ui:holding(),'farewell must not delay leaving')
end)
test('automatic encounter pagination is not cut short by the idle deadline',function()
 local ui=setup();local merchant=ui.merchant
 for _=1,150 do ui:update(.1) end
 assert(merchant.current.kind=='encounter' and not merchant.idleUsed,'idle interrupted the complete encounter narration')
 for _=1,500 do ui:update(.1) end
 assert(merchant.current.kind=='idle' and merchant.idleUsed,'automatic pages never reached greeting and idle')
end)
test('a hidden or map-covered shop pauses its bubble timer and pose follows the head',function()
 local ui,root=setup();local merchant=ui.merchant;local box=root:GetChild('merchant')
 merchant:react('buy');merchant:tap();ui:update(.1)
 local current,hold=merchant.current,merchant.current.hold
 ui:setVisible(false);ui:update(100)
 local tap=box:GetChild('talk'):GetChild('hit').click
 assert(current.hold==hold and not tap(),'hidden page consumed time or tap')
 ui:setVisible(true);assert(merchant.current==current and box:GetChild('bubble').visible,'return must resume the same bubble')
 local p,b=box:GetChild('portrait'),box:GetChild('bubble');local m=Theme.layout.merchant
 assert(math.abs((b.y-p.y)-(m.box[2]-m.portrait[2]))<.0001,'bubble detached from nodding head')
 assert(math.abs((b.x-p.x)-(m.box[1]-m.portrait[1]))<.0001,'bubble detached from shaking head')
end)
assert(failures==0,tostring(failures)..' merchant lifecycle failures')
