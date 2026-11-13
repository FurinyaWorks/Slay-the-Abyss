-- Explicit isolated dataset preparation; never registers a character or rewards.
local Copy=require('abyss_copy');local M={}
local function equal(a,b)
 if type(a)~=type(b)then return false end;if type(a)~='table'then return a==b end
 for k,v in pairs(a)do if not equal(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end;return true
end
function M.install(data,definition)
 assert(type(data)=='table'and data.cards and data.cards.cards and data.statuses and data.statuses.statuses,'invalid dataset')
 assert(type(definition)=='table'and definition.id=='KQ039'and definition.type=='skill'and definition.cost==1,'expected exported KQ039')
 local source=require('abyss_silent_attack_cards').withCardDefinitions({cards={cards={}},statuses={statuses={}}})
 local canonical;for _,v in ipairs(source.statuses.statuses)do if v.id=='next_turn_block'then canonical=v end end;assert(canonical,'missing native dependency')
 local found=false;for _,v in ipairs(data.statuses.statuses)do if v.id=='next_turn_block'then assert(not found and v.kind==canonical.kind and v.stack==canonical.stack and v.decay==canonical.decay,'conflicting native dependency');found=true end end
 for _,v in ipairs(data.cards.cards)do assert(v.id~='KQ039','candidate id collision')end
 local out=Copy.copy(data);out.experimentalKeqingNative=true;out.cards.cards[#out.cards.cards+1]=Copy.copy(definition)
 if not found then out.statuses.statuses[#out.statuses.statuses+1]=Copy.copy(canonical)end
 return out
end
return M
