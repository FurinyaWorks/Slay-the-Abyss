local F=dofile('tests/lua/support/game_ui_fixture.lua')
local focus
local api={events={Confirm='confirm',Cancel='cancel',Focus='focus'},directions={Left='left',Right='right'},
    modes={Specified='specified'},getFocus=function()return focus end,setFocus=function(value)focus=value end,
    isController=function()return true end}
local h,root=F.fixture(nil,nil,nil,nil,false,nil,nil,api)
assert(F.start(h))
h.run.relics={}
for i=1,42 do h.run.relics[i]='anchor' end
h:refresh()
local open,close=h.openRelics,h.closeDeck
local opens,closes=0,0
h.openRelics=function(self,...)opens=opens+1;return open(self,...)end
h.closeDeck=function(self,...)closes=closes+1;return close(self,...)end
local bar=root:GetChild('relicBar'):GetChild('slot1'):GetChild('hit')
local panel=root:GetChild('relicPanel')
local function confirm(hit)
    h:syncController();api.setFocus(hit)
    assert(hit.navigationListeners.confirm())
end
confirm(bar)
assert(opens==1 and h.relicUI.visible and h.relicUI.page==1)
bar.click();assert(opens==1,'same-frame native Click repeated bar action')
h:update(.01);bar.click();assert(opens==2,'fresh-frame bar Click was blocked')
for _,case in ipairs({{'next',2,3},{'previous',2,1}})do
    local hit=panel:GetChild(case[1]):GetChild('hit')
    confirm(hit);assert(h.relicUI.page==case[2])
    hit.click();assert(h.relicUI.page==case[2],'same-frame Click double-turned '..case[1])
    h:update(.01);assert(hit.click());assert(h.relicUI.page==case[3],'fresh Click lost '..case[1])
end
local closeHit=panel:GetChild('close'):GetChild('hit')
confirm(closeHit)
assert(closes==1 and not h.relicUI.visible and not h.deckUI.visible and h.mode=='map')
closeHit.click();assert(closes==1,'same-frame close action repeated')
h:update(.01);assert(bar.click());assert(h.relicUI.visible and opens==3)
assert(closeHit.click());assert(closes==2 and not h.deckUI.visible and not h.relicUI.visible)
print('RELIC_CONTROLLER_CLICK_PASS next previous close bar; same-frame blocked, next-frame live')

-- Combat clicks select the exact owned identity; other pages keep the list.
do
    local h2,r2=F.fixture(nil,nil,nil,nil,false,nil,nil,api)
    assert(F.start(h2))
    assert(require('abyss_run').startCombat(h2.run,'cultist_solo'))
    h2.run.relics={'anchor','burning_blood','maw_bank'}
    h2.run.combat.relicCounters.maw_bank=-2
    h2:refresh()
    local p=r2:GetChild('relicPanel')
    local run,combat=h2.run,h2.run.combat
    local turn,energy,hp,hand=combat.turn,combat.energy,run.hp,#combat.hand
    assert(r2:GetChild('relicBar'):GetChild('slot2'):GetChild('hit').click())
    assert(h2.relicUI.selectedIndex==2,'combat must select exact clicked relic')
    local single=assert(p:GetChild('single'),'missing single relic view')
    assert(single.visible and not p:GetChild('row1').visible)
    -- RELIC_NAMING.md: approved display name; stable burning_blood identity below.
    assert(single:GetChild('name').text=='岩脉残晶','single detail must show the approved starter relic name')
    assert(single:GetChild('rarity').text=='初始遗物')
    assert(single:GetChild('description').text=='每场战斗胜利后，回复6点生命。',
        'single detail must retain the approved trigger and 6-point healing description')
    assert(h2.relicUI.selected.id=='burning_blood')
    assert(h2.relicUI:turn(1) and h2.relicUI.selectedIndex==3)
    assert(single:GetChild('status').text=='已失效')
    assert(not p:GetChild('next').visible and not h2.relicUI:turn(1),'single view must stop at owned boundary')
    assert(h2.relicUI:turn(-1) and h2.relicUI.selectedIndex==2)
    -- Clicking content consumes the event, while outside closes exactly once.
    assert(p:GetChild('contentBlocker').click() and h2.relicUI.visible)
    assert(p:GetChild('blocker').click())
    assert(not h2.deckUI.visible and not h2.relicUI.visible)
    assert(not p:GetChild('blocker').click(),'retired outside click must not close another owner')
    assert(h2:openRelics(1));h2:syncController()
    local close2=p:GetChild('close'):GetChild('hit')
    api.setFocus(close2)
    assert(close2.navigationListeners.cancel(),'existing deck Cancel must close single view')
    assert(not h2.deckUI.visible and not h2.relicUI.visible)
    close2.click();assert(not h2.deckUI.visible,'same-frame native Click after Cancel stays consumed')
    assert(run==h2.run and combat==run.combat and combat.turn==turn and combat.energy==energy and run.hp==hp and #combat.hand==hand)
    assert(run.relics[1]=='anchor' and run.relics[2]=='burning_blood' and run.relics[3]=='maw_bank')
end
do
    local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
    local h3,_,_,emit,_,_,_,r3=H.setup()
    local combat=h3.run.combat
    emit('endTurn','down',7)
    assert(r3:GetChild('relicBar'):GetChild('slot1'):GetChild('hit').click())
    assert(h3.relicUI.selectedIndex==1)
    assert(r3:GetChild('relicPanel'):GetChild('blocker').click())
    emit('endTurn','up',7);emit('endTurn','click',7)
    assert(combat.turn==1 and not h3.deckUI.visible,'outside close must not revive an older battle input')
end
print('RELIC_SINGLE_COMBAT_PASS exact identity owned navigation outside cancel readonly')

if require('abyss_theme').presentationProfile=='official-assets-first' then
    local Theme=require('abyss_theme')
    local events={CursorEnter='nativeRelicEnter',CursorExit='nativeRelicExit'}
    local h4,r4=F.fixture(nil,nil,nil,events)
    assert(F.start(h4));assert(require('abyss_run').startCombat(h4.run,'cultist_solo'))
    h4.run.relics={'anchor','ancient_tea_set','maw_bank','omamori'}
    h4.run.relicCounters={anchor=1,ancient_tea_set=-2,maw_bank=-2,omamori=0}
    h4.run.combat.relicCounters={anchor=3}
    h4:refresh()
    local bar4=r4:GetChild('relicBar')
    local slot1,slot2=bar4:GetChild('slot1'),bar4:GetChild('slot2')
    local icon1,hit1=slot1:GetChild('icon'),slot1:GetChild('hit')
    local battleStyle=Theme.officialAssets.battleRelicBar
    assert(slot1.x==battleStyle.origin[1] and slot1.y==battleStyle.origin[2])
    assert(icon1.sizeDeltaX==battleStyle.icon and hit1.sizeDeltaX==battleStyle.hit and hit1.sizeDeltaY==battleStyle.hit)
    assert(not slot1:GetChild('rim').visible and not slot1:GetChild('face').visible)
    assert(slot1:GetChild('counter').visible and slot1:GetChild('counter').text=='3','HUD must prefer raw combat count')
    assert(not slot2:GetChild('counter').visible,'charged tea set has no numeric count')
    assert(slot2:GetChild('icon').imageColor.r==255,'tea set -2 is charged, never dimmed')
    assert(bar4:GetChild('slot3'):GetChild('icon').imageColor.r<255,'maw bank -2 must be visibly spent')
    assert(bar4:GetChild('slot4'):GetChild('counter').text=='0','zero is still a visible raw count')
    assert(bar4:GetChild('slot4'):GetChild('icon').imageColor.r<255,'omamori zero is exhausted')
    local width,height=hit1.sizeDeltaX,hit1.sizeDeltaY
    hit1.listeners[events.CursorEnter]()
    assert(icon1.localScaleX==1.25 and hit1.localScaleX==nil and hit1.sizeDeltaX==width and hit1.sizeDeltaY==height,'hover enlarges icon only')
    hit1.listeners[events.CursorExit]();assert(icon1.localScaleX==1)
    hit1.listeners[events.CursorEnter]();assert(h4:openRelics(1))
    assert(icon1.localScaleX==1,'modal opening resets the HUD hover')
    hit1.listeners[events.CursorEnter]();assert(icon1.localScaleX==1,'covered HUD cannot acquire hover')
    assert(h4:closeDeck());hit1.listeners[events.CursorEnter]();assert(icon1.localScaleX==1.25)
    h4.relicUI:refreshBar(h4.run,false);assert(icon1.localScaleX==1,'hidden HUD resets hover')
    -- Leaving combat restores the shared map/node strip, including backgrounds.
    local base=Theme.layout.relicView.bar
    h4.run.phase='map';h4.relicUI:refreshBar(h4.run,true)
    assert(slot1.x==base.origin[1] and slot1.y==base.origin[2])
    assert(icon1.sizeDeltaX==base.icon and hit1.sizeDeltaX==base.step and hit1.sizeDeltaY==44)
    assert(slot1:GetChild('rim').visible and slot1:GetChild('face').visible)
    assert(not slot1:GetChild('counter').visible)
    for i=base.count+1,Theme.officialAssets.battleRelicBar.count do assert(not bar4:GetChild('slot'..i).visible)end
    print('RELIC_HUD_FEEDBACK_PASS native hover raw counters charged and exhausted states')
end
