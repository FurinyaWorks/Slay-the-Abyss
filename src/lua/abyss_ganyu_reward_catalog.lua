-- Closed reviewed experimental catalog, never a formal color/provider pool.
local Copy=require('abyss_copy').copy
local M={}
function M.definitions(includeDraw,includeRetrieval,includeStormFamily,includeDefensiveStorm,includeShieldCharge,includeShotFamily)
 local cards=require('abyss_ganyu_native_cards').definitions().cards
 for _,module in ipairs({require('abyss_ganyu_paid_definitions'),require('abyss_ganyu_storm_definitions'),require('abyss_ganyu_conditional_definitions')})do
  for _,c in ipairs(module.cards)do cards[#cards+1]=Copy(c)end
 end
 if includeDraw==true then for _,c in ipairs(require('abyss_ganyu_draw_definitions').cards)do cards[#cards+1]=Copy(c)end end
 if includeRetrieval==true then for _,c in ipairs(require('abyss_ganyu_retrieval_definitions').cards)do cards[#cards+1]=Copy(c)end end
 if includeStormFamily==true then for _,c in ipairs(require('abyss_ganyu_storm_family_definitions').cards)do cards[#cards+1]=Copy(c)end end
 if includeDefensiveStorm==true then for _,c in ipairs(require('abyss_ganyu_defensive_storm_definitions').cards)do cards[#cards+1]=Copy(c)end end
 if includeShieldCharge==true then for _,c in ipairs(require('abyss_ganyu_shield_charge_definitions').cards)do cards[#cards+1]=Copy(c)end end
 if includeShotFamily==true then for _,c in ipairs(require('abyss_ganyu_shot_family_definitions').cards)do cards[#cards+1]=Copy(c)end end
 assert(#cards==((includeDraw==true and 35 or 32)+(includeRetrieval==true and 4 or 0)+(includeStormFamily==true and 3 or 0)+(includeDefensiveStorm==true and 2 or 0)+(includeShieldCharge==true and 3 or 0)+(includeShotFamily==true and 2 or 0)),'invalid reviewed Ganyu catalog')
 local seen={}
 for _,c in ipairs(cards)do
  assert(not seen[c.id],'duplicate candidate identity');seen[c.id]=true
  c.color='ganyu_candidate';c.sourceId='ganyu-'..c.id:sub(-2)
  c.ganyuSourceSHA256=require('abyss_ganyu_starter_source').sourceSHA256
  c.reviewStatus='HOLD'
 end
 return cards
end
return M
