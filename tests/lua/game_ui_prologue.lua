-- Current short interstitial, exercised through the real composed GameUI host.
local F = dofile('tests/lua/support/game_ui_fixture.lua')
local Prologue = require('abyss_prologue')
local Narrative = require('abyss_narrative')
local P = require('abyss_theme').layout.prologue
local count=0
local function test(name,fn)fn();count=count+1;print('ok prologue '..count..' - '..name)end
local function panel(root)return root:GetChild('prologuePanel')end
local function selected(ui)
    assert(ui:start() and ui:selectCharacter('traveler') and ui:selectElement('ironclad'))
end
local function host(sound)
    local canvas=F.control({children=F.Layout})
    local root=F.Viewport.apply(canvas,1280,720)
    local ui=F.GameUI.new(root,F.Data,F.Presentation,'click',{
        seed=42,prologue=true,campaign=true,campaignProfile='competition-two-act',
        characterProfile='production',imageSource='static',sound=sound,
        color=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end})
    root.ui=ui;return ui,root
end
local function finish(ui)
    for _=1,80 do if not ui.prologue:covering() then return end;ui:update(0.05) end
    assert(not ui.prologue:covering(),'opening failed to complete after preparation')
end

test('shared approved sentence helpers remain intact',function()
    local beats=Prologue.beats(Narrative.flow.intro.full)
    assert(#beats==3 and table.concat(beats)==Narrative.flow.intro.full)
    for i,beat in ipairs(beats)do F.preview('intro'..i,beat)end
    assert(table.concat(Prologue.chars('岩脉A……'))=='岩脉A……' and #Prologue.chars('岩脉A……')==5)
end)

test('confirmation fades over the selected character before creating any run',function()
    local ui,root=host();selected(ui)
    assert(not panel(root).visible and ui:confirmCharacter())
    assert(ui.prologue:covering() and ui.characterOpen and not ui.run and ui.starting)
    assert(panel(root).visible and panel(root):GetChild('fade').imageColor.a==0)
    ui:update(P.fadeIn/2)
    assert(panel(root):GetChild('fade').imageColor.a>0 and panel(root):GetChild('fade').imageColor.a<255)
    assert(root:GetChild('characterPanel').visible and not ui.run)
end)

test('fully covered frame commits once and reveals the existing Neow page',function()
    local ui,root=host();selected(ui);assert(ui:confirmCharacter())
    ui:update(P.fadeIn)
    local run=ui.run
    assert(run and run.nodeFlow.event.id=='neow' and ui.prologue:opaque())
    assert(panel(root):GetChild('fade').imageColor.a==255 and not root:GetChild('nodePanel').visible)
    ui:update(P.markIn+0.01)
    assert(panel(root):GetChild('scene').visible and panel(root):GetChild('fade').imageColor.a==0 and ui.run==run)
    ui:update(1)
    ui:update(P.markOut+0.01)
    assert(ui.prologue:covering() and not ui.prologue:opaque() and root:GetChild('nodePanel').visible)
    assert(ui.nodeUI.visible==false,'revealing page must stay inert')
    finish(ui)
    assert(ui.run==run and not panel(root).visible and ui.nodeUI.visible)
    assert(F.click(root,'nodePanel','eventView/option1'))
    assert(ui.run.nodeFlow.event.stage=='neow_blessing')
end)

test('transparent shield and admission reject duplicate confirmation and stale page commands',function()
    local ui,root=host();selected(ui);assert(ui:confirmCharacter())
    assert(panel(root):GetChild('blocker').click())
    assert(not root:GetChild('exitEntry').visible and not ui:openMenu() and not ui:openExit())
    local oldMenu=root:GetChild('exitEntry'):GetChild('open'):GetChild('hit').click
    assert(not oldMenu(),'stale utility callbacks must not pause the short transition')
    assert(not ui:confirmCharacter() and not ui:closeCharacters() and not ui:selectElement('ironclad'))
    assert(not ui:openDeck('draw'))
    ui:update(P.fadeIn)
    local run=ui.run
    assert(not root:GetChild('exitEntry').visible and not ui:openMenu())
    assert(not ui:confirmCharacter() and not ui.nodeUI:press('eventView/option1'))
    assert(ui.run.nodeFlow.event.stage=='neow_intro')
    ui:update(1);ui:update(P.markOut+0.01)
    local option=root:GetChild('nodePanel'):GetChild('eventView'):GetChild('option1'):GetChild('hit')
    assert(not option.click() and ui.run.nodeFlow.event.stage=='neow_intro')
    finish(ui);assert(ui.run==run and not panel(root).visible)
end)

test('cancel before cover discards pending run and reopens selection input',function()
    local ui,root=host();selected(ui);assert(ui:confirmCharacter())
    assert(ui.prologue:cancel());ui:refresh();ui:update(5)
    assert(not ui.run and not ui.starting and not panel(root).visible and ui.characterOpen)
    assert(ui:confirmCharacter());finish(ui);assert(ui.run and ui.nodeUI.visible)
end)

test('disable clears the shield and pending commit',function()
    local ui,root=host();selected(ui);assert(ui:confirmCharacter())
    ui:disable();assert(not panel(root).visible and not ui.prologue:covering())
    ui.prologue:update(10);assert(not ui.run and not ui.starting)
end)

test('large frames cannot bypass post-commit readiness or repeat creation',function()
    local ui,root=host();selected(ui);assert(ui:confirmCharacter());ui:update(20)
    assert(ui.run and ui.prologue:covering() and ui.prologue.target==0)
    ui:update(20);ui:update(20);ui:update(20)
    assert(ui.run and not panel(root).visible and not ui.prologue:covering() and ui.nodeUI.visible)
    local run=ui.run;ui:update(20);assert(ui.run==run)
end)

test('resize covers wide and tall canvases without enlarging the central mark',function()
    local ui,root=host();selected(ui);assert(ui:confirmCharacter())
    for _,size in ipairs({{2560,1080},{720,1280},{1920,1080}})do
        ui:resize(size[1],size[2]);local scale=math.min(size[1]/1280,size[2]/720)
        local fade=panel(root):GetChild('fade');local blocker=panel(root):GetChild('blocker')
        assert(math.abs(fade.sizeDeltaX*scale-size[1])<0.01 and math.abs(fade.sizeDeltaY*scale-size[2])<0.01)
        assert(blocker.sizeDeltaX==fade.sizeDeltaX and blocker.sizeDeltaY==fade.sizeDeltaY)
    end
    finish(ui);assert(not panel(root).visible)
end)

test('a retry from defeat plays again and preserves one-run ownership',function()
    local ui,root=host();selected(ui);assert(ui:confirmCharacter());finish(ui)
    local old=ui.run;old.phase='defeat';ui:refresh();ui:update(2)
    selected(ui);assert(ui:confirmCharacter() and ui.prologue:covering())
    finish(ui);assert(ui.run~=old and not panel(root).visible and ui.nodeUI.visible)
end)

test('rule-only hosts retain immediate start without enabling the old camera',function()
    local ui,root=F.fixture();assert(F.start(ui))
    assert(ui.prologue==nil and ui.mode=='map' and not panel(root).visible)
    assert(not panel(root):GetChild('skip') and not panel(root):GetChild('vista'))
end)

test('completed preparation stages light in order and fast starts do not wait eight seconds',function()
    local ui,root=host();selected(ui);assert(ui:confirmCharacter())
    local scene=panel(root):GetChild('scene')
    local function lights(count)
        for i=1,7 do
            local c=scene:GetChild('element'..i).imageColor
            local expected=i<=count and P.ink or P.dim
            assert(c.r==expected.r and c.g==expected.g and c.b==expected.b,'wrong reference element '..i)
        end
    end
    ui:update(P.fadeIn);lights(0)
    assert(ui.openingPrepared==6 and ui.prologue.target==0,'commit must render before the next readiness update')
    ui:update(0);assert(ui.prologue.target==7);lights(0)
    for i=1,7 do
        ui:update(P.elementStep);lights(i)
    end
    assert(scene.visible and panel(root):GetChild('fade').imageColor.a==0 and ui.prologue.phase=='close')
    ui:update(P.markOut/2);local alpha=panel(root):GetChild('fade').imageColor.a
    assert(scene.visible and alpha>0 and alpha<255 and ui.prologue:opaque())
    ui:update(P.markOut/2+0.001);assert(not scene.visible and root:GetChild('nodePanel').visible and not ui.nodeUI.visible)
    ui:update(P.reveal+0.001);assert(not panel(root).visible and ui.nodeUI.visible and root:GetChild('exitEntry').visible)
    assert(ui.prologue.elapsed<2.1 and ui.prologue.elapsed>1,'short readable animation only; no fixed eight-second hold')
end)

test('unfinished preparation never advances a light or uncovers the destination',function()
    local ui,root=host();selected(ui);assert(ui:confirmCharacter());ui:update(P.fadeIn)
    -- Inject a stalled preparation checkpoint; no game-rule state is changed.
    ui.openingPrepared=4;ui:update(12)
    local scene=panel(root):GetChild('scene')
    assert(ui.prologue:opaque() and ui.prologue.target==4 and ui.prologue.lit==4)
    assert(scene:GetChild('element5').imageColor.r==P.dim.r and not root:GetChild('nodePanel').visible)
    ui.openingPrepared=6;finish(ui)
    assert(ui.nodeUI.visible and not panel(root).visible)
end)

test('transition stays silent on entry, completion and cancellation',function()
    local cues={}
    local ui=host(function(cue)cues[#cues+1]=cue end)
    selected(ui);assert(ui:confirmCharacter());assert(not ui:confirmCharacter());finish(ui);ui:update(1)
    assert(#cues==0,'transition must not play audio on entry or completion')
    local cancelled=host(function(cue)cues[#cues+1]=cue end)
    selected(cancelled);assert(cancelled:confirmCharacter());cancelled.prologue:cancel();cancelled:refresh();cancelled:update(10)
    assert(#cues==0,'cancelled transition must stay silent')
    local silent=host(function()error('unavailable sound device')end)
    selected(silent);assert(silent:confirmCharacter());finish(silent);assert(silent.nodeUI.visible)
end)
print('LUA_GAME_UI_PROLOGUE_PASS '..count)
