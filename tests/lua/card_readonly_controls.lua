local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Skin=require('abyss_card_skin')
local blocked={blockedVeil=true,blockedPill=true,blockedLock=true,blockedReason=true}
local function find(spec,name)
 if spec.name==name then return spec end
 for _,child in ipairs(spec.children or {})do local found=find(child,name);if found then return found end end
end
local layout={children=F.Layout}
local battleSpec=assert(find(find(layout,'battlePanel'),'card1'))
local definition={type='skill',rarity='common',cost=1}
local platform={imageSource='static',color=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end}
local function readonly(face)
 local original=face.GetChild
 function face:GetChild(name)
  assert(not blocked[name],'readonly paint must not query omitted blocked control '..name)
  return original(self,name)
 end
 Skin.apply(face,definition,platform,{cost=0,baseCost=1,selected=true,dim=true,blockedIndicator=false})
 assert(face:GetChild('costHalo').visible,'cost change halo still applies')
 assert(face:GetChild('costDirection').text=='↓','cost change direction still applies')
 assert(face:GetChild('skin'):GetChild('skill').visible,'type window still applies')
 local edge=face:GetChild('roundFrame'):GetChild('vertical').imageColor
 assert(edge.r==F.Theme.color.goldBright.r and edge.g==F.Theme.color.goldBright.g,'selected frame still applies')
 face.GetChild=original
end
local deckSpec=assert(find(find(layout,'characterPanel'),'deckCard1'))
readonly(F.control(deckSpec):GetChild('face'))
local legacySpec={name='legacy',kind='container',children={}}
for _,child in ipairs(battleSpec.children)do
 if child.name~='glow' and child.name~='hit' then legacySpec.children[#legacySpec.children+1]=child end
end
local legacy=F.control(legacySpec)
readonly(legacy)
for name in pairs(blocked)do assert(not legacy:GetChild(name).visible,'old readonly template stays compatible')end
Skin.apply(legacy,definition,platform,{cost=1,baseCost=1,dim=true})
for name in pairs(blocked)do assert(legacy:GetChild(name).visible,'default dim feedback remains enabled')end
Skin.apply(legacy,definition,platform,{cost=1,baseCost=1,dim=true,blockedIndicator=true,overlayCovered=true})
for name in pairs(blocked)do assert(not legacy:GetChild(name).visible,'existing overlay owner still suppresses dim feedback')end
Skin.apply(legacy,definition,platform,{cost=1,baseCost=1,dim=true,blockedIndicator=true})
for name in pairs(blocked)do assert(legacy:GetChild(name).visible,'explicit enabled blocked feedback remains enabled')end
Skin.apply(legacy,definition,platform,{cost=1,baseCost=1})
for name in pairs(blocked)do assert(not legacy:GetChild(name).visible,'recycled default face clears dim feedback')end
local apply,paints=Skin.apply,0
Skin.apply=function(face,card,options,look)
 if face:GetChild('blockedVeil')==nil then
  assert(look and look.blockedIndicator==false,'readonly host must explicitly disable omitted indicators')
  paints=paints+1
 end
 return apply(face,card,options,look)
end
local host,root=F.fixture()
assert(host:start() and host:selectCharacter('traveler') and host:selectElement('ironclad'))
local character=root:GetChild('characterPanel')
assert(character:GetChild('details'):GetChild('deckOpen'):GetChild('hit').click())
assert(paints>0 and character:GetChild('deckView'):GetChild('deckCard1'):GetChild('face'):GetChild('name').text~='',
 'starter deck paints through its real native button')
assert(character:GetChild('deckView'):GetChild('close'):GetChild('hit').click())
local before=paints
assert(host:confirmCharacter() and host:openDeck())
host:update(0)
assert(paints>before,'real dynamic deck Grid paints omitted-layer items')
assert(root:GetChild('deckPanel'):GetChild('grid').items[0]:GetChild('face'):GetChild('blockedVeil')==nil)
before=paints
dofile('tests/lua/tactical_choice_faces.lua')
assert(paints>before,'real UID/touch tactical choice paints omitted-layer faces')
Skin.apply=apply
print('CARD_READONLY_CONTROLS_PASS omitted layer, old template, selected/cost/halo, default dim, three actual hosts')
