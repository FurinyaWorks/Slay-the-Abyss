
-- OFFLINE FIXTURE: real starter deck, legal ten-card cap, two enemies.
local createPreviewHost=M.new
function M.new(root,data,presentation,event,platform)
 local previewPlatform={}
 for key,value in pairs(platform)do previewPlatform[key]=value end
 -- Bypass only the campaign opening through the existing full-source Host
 -- option. Combat definitions and all input/feedback controllers are unchanged.
 previewPlatform.campaign=false
 local host=createPreviewHost(root,data,presentation,event,previewPlatform)
 host.seed=42
 assert(host:start())
 assert(host:selectCharacter('traveler'))
 assert(host:selectElement('ironclad'))
 assert(host:confirmCharacter())
 host.run.potions={'fire_potion','dexterity_potion','block_potion'}; local R=require('abyss_run');assert(R.removeCard(host.run,host.run.deck[1].uid));assert(R.obtainCard(host.run,'offering'));assert(R.obtainRelic(host.run,'kunai'));assert(R.obtainRelic(host.run,'ink_bottle'))
 assert(require('abyss_run').startCombat(host.run,'small_slimes'))
 -- The explicit replay entry omits map-room formation. Restore only the
 -- presentation offsets from the existing Small Slimes source formation.
 local positions={{x=-230,y=32},{x=35,y=8}}
 for index,actor in ipairs(host.run.combat.enemies)do actor.sourcePosition=positions[index] end
 require('abyss_combat').draw(host.run.combat,20)
 -- No synthetic status setup.
 host:refresh()
 print('BATTLE_PREVIEW_FIXTURE ready hand='..#host.run.combat.hand..' enemies='..#host.run.combat.enemies)
 return host
end
return M
