local Theme=require('abyss_theme')
Theme.presentationProfile='official-assets-first'
local V25=require('abyss_v25_menu_view')
local function control(name)
 local c={name=name,children={},visible=true,writes=0}
 function c:GetChild(k)return self.children[k]end
 function c:SetVisible(v)self.visible=v end
 function c:SetAnchoredPosition(x,y)self.x,self.y=x,y;self.writes=self.writes+1 end
 function c:SetSizeDelta(w,h)self.w,self.h=w,h end
 return c
end
local function button()
 local c=control('start')
 for _,name in ipairs({'label','hit','v25MenuFace','menuAccent'})do c.children[name]=control(name)end
 for _,name in ipairs({'normal','hover','pressed','disabled'})do c.children.v25MenuFace.children[name]=control(name)end
 c.children.menuAccent.children.line=control('line')
 c.children.hit.x=0;c.children.hit.w=280
 return c
end
local start,quit,resume=button(),button(),button()
local ctx={start=start,menu=control('menu'),owner={mode='menu',motion={}},platform={color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end}}
ctx.menu.children.titleQuit=quit
ctx.menu.children.continueRun=resume
V25.button(start,true);V25.button(quit,true)
V25.animateMenu(ctx,0)
local line=start.children.menuAccent.children.line
local alpha=line.imageColor.a
V25.pointer(start,'enter',true)
assert(line.imageColor.a==alpha,'pointer event must not jump to the hover endpoint')
V25.animateMenu(ctx,1/60)
local entering=line.imageColor.a
assert(entering>alpha and entering<255,'first frame interpolates')
V25.pointer(start,'exit',true)
assert(line.imageColor.a==entering,'reversal starts from the current value')
V25.animateMenu(ctx,1/60)
assert(line.imageColor.a<entering and line.imageColor.a>alpha,'exit interpolates without restart')
for _=1,20 do V25.animateMenu(ctx,1/60)end
local idle=start.children.label.writes
for _=1,120 do V25.animateMenu(ctx,1/60)end
assert(start.children.label.writes==idle,'settled buttons stop writing controls')
V25.pointer(start,'down',true);V25.animateMenu(ctx,1/60)
V25.pointer(start,'exit',true);V25.animateMenu(ctx,.2)
assert(start.children.label.y==0,'press then exit releases visual depression')
V25.pointer(start,'enter',true);V25.animateMenu(ctx,.2)
ctx.owner.characterOpen=true;V25.animateMenu(ctx,1/60)
assert(line.imageColor.a==alpha,'selection resets menu hover')
assert(start.children.hit.x==0 and start.children.hit.w==280,'visual feedback must not move the hit target')
ctx.owner.characterOpen=false;V25.button(start,false);V25.animateMenu(ctx,1/60)
assert(line.imageColor.a==alpha,'disabled state clears stale hover')
for _,mode in ipairs({'victory','defeat'})do
 Theme.presentationProfile='v25-reference'
 V25.pointer(start,'down',true);V25.animateMenu(ctx,1/60)
 ctx.owner.mode=mode
 start.children.label:SetAnchoredPosition(28,0)
 start.children.label.fontColor={r=255,g=255,b=255,a=255}
 V25.animateMenu(ctx,1/60)
 assert(start.children.label.x==28 and start.children.label.fontColor.r==255,
     'menu feedback must not overwrite result typography')
 ctx.owner.mode='menu';V25.button(start,true);V25.animateMenu(ctx,1/60)
 assert(start.children.label.y==0,'return from result clears the old press')
end
-- All three minimal entries share feedback and lose stale presses off-page.
ctx.owner.mode='menu';ctx.owner.sessionPaused=true
for _,box in ipairs({start,quit,resume})do
 V25.button(box,true);V25.animateMenu(ctx,0)
 V25.pointer(box,'enter',true);V25.animateMenu(ctx,.2)
 assert(box.children.menuAccent.children.line.imageColor.a==255,'each entry animates hover')
 V25.pointer(box,'down',true);V25.animateMenu(ctx,0)
 assert(box.children.label.y==-Theme.menuPresentation.pressOffset,'each entry depresses')
 V25.pointer(box,'cancel',true);V25.animateMenu(ctx,.2)
 assert(box.children.label.y==0 and box.children.menuAccent.children.line.imageColor.a==alpha,'cancel resets each entry')
 V25.pointer(box,'down',true);V25.animateMenu(ctx,0)
 ctx.owner.mode='battle';V25.animateMenu(ctx,0)
 ctx.owner.mode='menu';V25.button(box,true);V25.animateMenu(ctx,0)
 assert(box.children.label.y==0 and box.children.menuAccent.children.line.imageColor.a==alpha,'return clears each stale press')
end
V25.pointer(resume,'down',true);V25.animateMenu(ctx,0)
ctx.owner.sessionPaused=false;V25.animateMenu(ctx,0)
assert(resume.children.label.y==0 and resume.children.menuAccent.children.line.imageColor.a==alpha,'unavailable Continue clears feedback')
local Foreground=require('abyss_game_ui_view')
ctx.owner.mode='menu';ctx.owner.characterOpen=false
assert(not Foreground.exitEntryVisible(ctx.owner)(),'minimal menu hides the legacy utility entry')
ctx.owner.characterOpen=true
assert(Foreground.exitEntryVisible(ctx.owner)(),'selection retains its existing utility entry')
ctx.owner.characterOpen=false;ctx.owner.mode='battle'
assert(Foreground.exitEntryVisible(ctx.owner)(),'in-run exit discovery remains available')
Theme.presentationProfile=nil;ctx.owner.mode='menu'
assert(Foreground.exitEntryVisible(ctx.owner)(),'legacy menus retain their original exit discovery')
print('MENU_HOVER_CONTINUITY_PASS')
